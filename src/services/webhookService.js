/**
 * WebhookService - Handles incoming webhook requests from n8n
 * Processes persona traits updates and manages webhook authentication
 */

const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");
const ApiError = require("../utils/apiError");
const authService = require("./authService");
const axios = require("axios");
const { decrypt } = require("../utils/encrypt");

const prisma = new PrismaClient();

// Heuristic check for a metadata-like object
function looksLikeMetadata(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.about === "string" &&
    Array.isArray(obj.coreExpertise) &&
    typeof obj.communicationStyle === "string" &&
    Array.isArray(obj.traits) &&
    Array.isArray(obj.painPoints) &&
    Array.isArray(obj.keyResponsibilities)
  );
}

// Best-effort deep extractor for metadata from common n8n shapes
function extractMetadataDeep(value, depth = 0) {
  if (value == null || depth > 6) return null;

  // String that might be JSON
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return extractMetadataDeep(parsed, depth + 1);
    } catch (_) {
      return null;
    }
  }

  // If array, scan items
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractMetadataDeep(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  // Objects
  if (typeof value === "object") {
    // Direct metadata key
    if (value.metadata) {
      const m = value.metadata;
      if (typeof m === "string") {
        try {
          return JSON.parse(m);
        } catch (_) {
          return null;
        }
      }
      if (typeof m === "object") return m;
    }

    // Object itself looks like metadata
    if (looksLikeMetadata(value)) return value;

    // Common n8n containers
    const candidates = [
      value.json,
      value.data,
      value.result,
      value.body,
      value.payload,
      value.response,
      value.output,
    ];
    for (const c of candidates) {
      const found = extractMetadataDeep(c, depth + 1);
      if (found) return found;
    }

    // Fallback: scan all properties
    for (const key of Object.keys(value)) {
      const found = extractMetadataDeep(value[key], depth + 1);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Webhook payload validation schema
 * @param {Object} payload - The webhook payload
 * @returns {Object} Validation result
 */
function validateWebhookPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { isValid: false, error: "Invalid payload format" };
  }

  if (!payload.personaName || typeof payload.personaName !== "string") {
    return {
      isValid: false,
      error: "personaName is required and must be a string",
    };
  }

  if (!payload.metadata || typeof payload.metadata !== "object") {
    return {
      isValid: false,
      error: "metadata is required and must be an object",
    };
  }

  const requiredFields = [
    "about",
    "coreExpertise",
    "communicationStyle",
    "traits",
    "painPoints",
    "keyResponsibilities",
  ];
  const missingFields = requiredFields.filter(
    (field) => !payload.metadata[field]
  );

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(", ")}`,
    };
  }

  // Validate array fields
  const arrayFields = [
    "coreExpertise",
    "traits",
    "painPoints",
    "keyResponsibilities",
  ];
  for (const field of arrayFields) {
    if (!Array.isArray(payload.metadata[field])) {
      return { isValid: false, error: `${field} must be an array` };
    }
  }

  // Validate string fields
  const stringFields = ["about", "communicationStyle"];
  for (const field of stringFields) {
    if (typeof payload.metadata[field] !== "string") {
      return { isValid: false, error: `${field} must be a string` };
    }
  }

  return { isValid: true };
}

/**
 * Find persona by exact name
 * @param {string} personaName - The exact name of the persona
 * @returns {Promise<Object|null>} The persona object or null if not found
 */
async function findPersonaByName(personaName) {
  try {
    const persona = await prisma.persona.findFirst({
      where: {
        name: personaName,
        isActive: true,
      },
    });

    return persona;
  } catch (error) {
    logger.error("Error finding persona by name:", error);
    throw new ApiError(500, "Failed to find persona");
  }
}

/**
 * Update persona traits from webhook
 * @param {Object} payload - The webhook payload
 * @param {string} userId - The user ID who triggered the webhook
 * @returns {Promise<Object>} The updated persona
 */
async function updatePersonaTraits(payload, userId) {
  try {
    const { personaName, metadata } = payload;

    // Find the persona by exact name
    const persona = await findPersonaByName(personaName);
    if (!persona) {
      throw new ApiError(404, `Persona with name "${personaName}" not found`);
    }

    // Prepare update data
    const updateData = {
      about: metadata.about,
      coreExpertise: metadata.coreExpertise,
      communicationStyle: metadata.communicationStyle,
      traits: metadata.traits,
      painPoints: metadata.painPoints,
      keyResponsibility: metadata.keyResponsibilities,
      updatedAt: new Date(),
    };

    // Update the persona
    const updatedPersona = await prisma.persona.update({
      where: { id: persona.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        personaRole: true,
        about: true,
        traits: true,
        painPoints: true,
        coreExpertise: true,
        communicationStyle: true,
        keyResponsibility: true,
        avatarUrl: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Create audit event for successful webhook update
    await authService.createAuditEvent(userId, "WEBHOOK_SUCCESS", {
      personaId: persona.id,
      personaName: persona.name,
      updatedFields: Object.keys(updateData),
      webhookSource: "n8n",
      operation: "traits_update",
    });

    logger.info("Persona traits updated successfully via webhook", {
      personaId: persona.id,
      personaName: persona.name,
      userId,
      updatedFields: Object.keys(updateData),
    });

    return updatedPersona;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    logger.error("Error updating persona traits via webhook:", error);
    throw new ApiError(500, "Failed to update persona traits");
  }
}

/**
 * Forward traits payload to n8n webhook and update DB from its response
 *
 * Resolution order for target URL:
 * 1) process.env.N8N_TRAITS_WEBHOOK_URL (global endpoint)
 * 2) Persona-specific encrypted webhookUrl (decrypted)
 *
 * @param {Object} payload - Incoming payload (must contain personaName, metadata)
 * @param {string} userId - User ID triggering the forward
 * @returns {Promise<Object>} Updated persona after applying n8n response
 */
async function forwardTraitsToN8n(payload, userId) {
  const { personaName } = payload || {};
  if (!personaName || typeof personaName !== "string") {
    throw new ApiError(400, "personaName is required and must be a string");
  }

  // Find persona to resolve webhook URL
  const persona = await findPersonaByName(personaName);
  if (!persona) {
    throw new ApiError(404, `Persona with name "${personaName}" not found`);
  }

  // Resolve target URL
  // 1) Persona-specific traits URL mapping (preferred)
  const traitsUrlByPersona = {
    "HR Ops / Payroll Manager":
      "https://n8n-excollo.azurewebsites.net/webhook/traits/hr-payroll",
    "HRIS Lead and Finance Ops/Controller":
      "https://n8n-excollo.azurewebsites.net/webhook/traits/hris-payroll",
  };

  let targetUrl =
    traitsUrlByPersona[personaName] ||
    process.env.N8N_TRAITS_WEBHOOK_URL ||
    null;
  if (!targetUrl) {
    // 3) Fallback to persona's own webhook (typically used for chat); keeps backward compat
    if (!persona.webhookUrl) {
      throw new ApiError(400, "No n8n webhook URL configured for this persona");
    }
    try {
      targetUrl = decrypt(persona.webhookUrl, process.env.ENCRYPTION_KEY);
    } catch (e) {
      logger.error("Failed to decrypt persona webhookUrl", e);
      throw new ApiError(500, "Failed to resolve webhook URL");
    }
  }

  logger.info("Forwarding traits payload to n8n", {
    personaId: persona.id,
    personaName,
    targetUrl,
  });

  let n8nResponse;
  try {
    n8nResponse = await axios.post(targetUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
    });
  } catch (err) {
    logger.error("n8n webhook call failed", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw new ApiError(502, "Failed to reach n8n webhook");
  }

  // Normalize response into an object
  let responseData = n8nResponse?.data;
  const contentType = n8nResponse?.headers?.["content-type"] || "";
  if (typeof responseData === "string") {
    try {
      responseData = JSON.parse(responseData);
    } catch (e) {
      logger.error("n8n response is not valid JSON string", {
        contentType,
        preview: String(responseData).slice(0, 200),
      });
      throw new ApiError(502, "Invalid response from n8n webhook");
    }
  }
  if (!responseData || typeof responseData !== "object") {
    throw new ApiError(502, "Invalid response from n8n webhook");
  }

  // Try to extract metadata robustly (handles nested arrays/objects and JSON strings)
  let metadata = extractMetadataDeep(responseData);

  // If metadata is a JSON string, parse it
  if (metadata && typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch (e) {
      logger.error("metadata returned as non-JSON string", {
        metadataPreview: String(metadata).slice(0, 200),
      });
      throw new ApiError(422, "n8n metadata must be an object");
    }
  }

  if (!metadata || typeof metadata !== "object") {
    logger.error("n8n response missing metadata", {
      responsePreview: JSON.stringify(responseData)?.slice(0, 500),
    });
    throw new ApiError(422, "n8n response missing metadata object");
  }

  // Now apply update using the returned metadata
  const updated = await updatePersonaTraits({ personaName, metadata }, userId);
  return updated;
}

/**
 * Process incoming webhook request
 * @param {Object} payload - The webhook payload
 * @param {string} userId - The user ID who triggered the webhook
 * @returns {Promise<Object>} The result of the webhook processing
 */
async function processWebhook(payload, userId) {
  try {
    // Validate the webhook payload
    const validation = validateWebhookPayload(payload);
    if (!validation.isValid) {
      throw new ApiError(400, `Webhook validation failed: ${validation.error}`);
    }

    // Update persona traits
    const updatedPersona = await updatePersonaTraits(payload, userId);

    return {
      success: true,
      message: "Persona traits updated successfully",
      persona: updatedPersona,
    };
  } catch (error) {
    // Create audit event for failed webhook
    if (error instanceof ApiError && error.statusCode !== 400) {
      try {
        await authService.createAuditEvent(userId, "WEBHOOK_FAILED", {
          error: error.message,
          payload: payload,
          webhookSource: "n8n",
          operation: "traits_update",
        });
      } catch (auditError) {
        logger.error(
          "Failed to create audit event for webhook failure:",
          auditError
        );
      }
    }

    throw error;
  }
}

module.exports = {
  processWebhook,
  validateWebhookPayload,
  findPersonaByName,
  updatePersonaTraits,
  forwardTraitsToN8n,
};
