/**
 * PersonaController - Persona management and chat functionality
 * Handles persona listing, details, favourites, and chat messages
 */

const personaService = require("../services/personaService");
const apiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

/**
 * Extract client information from request for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Client information
 */
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.get("User-Agent") || null,
  traceId: req.headers["x-trace-id"] || null,
  requestId: req.headers["x-request-id"] || null,
});

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result with isValid and missingFields
 */
const validateRequiredFields = (body, requiredFields) => {
  const missingFields = requiredFields.filter((field) => !body[field]);
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Validate string field is not empty
 * @param {string} value - Value to validate
 * @returns {boolean} Whether value is valid
 */
const validateNonEmptyString = (value) => {
  return typeof value === "string" && value.trim().length > 0;
};

/**
 * Get all personas with optional favourites filter
 * GET /api/personas
 */
const getPersonas = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { favouritesOnly } = req.query;
    const userId = req.user.id;

    logger.info("Personas retrieval requested", {
      userId,
      favouritesOnly: favouritesOnly === "true",
      ipAddress,
      userAgent,
      traceId,
    });

    const options = {
      favouritesOnly: favouritesOnly === "true",
    };

    const personas = await personaService.getPersonas(userId, options);

    logger.info("Personas retrieved successfully", {
      userId,
      count: personas.length,
      favouritesOnly: options.favouritesOnly,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: personas,
        message: "Personas retrieved successfully",
      })
    );
  } catch (error) {
    logger.error("Personas retrieval failed", {
      userId: req.user.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

/**
 * Get persona by ID
 * GET /api/personas/:id
 */
const getPersonaById = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id || !validateNonEmptyString(id)) {
      logger.warn("Persona retrieval failed: invalid ID", {
        userId,
        personaId: id,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error("Invalid persona ID");
    }

    logger.info("Persona retrieval requested", {
      userId,
      personaId: id,
      ipAddress,
      userAgent,
      traceId,
    });

    const persona = await personaService.getPersonaById(id, userId);

    logger.info("Persona retrieved successfully", {
      userId,
      personaId: id,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: persona,
        message: "Persona retrieved successfully",
      })
    );
  } catch (error) {
    logger.error("Persona retrieval failed", {
      userId: req.user.id,
      personaId: req.params.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

/**
 * Toggle persona favourite status
 * POST /api/personas/:id/favourite
 */
const toggleFavourite = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id || !validateNonEmptyString(id)) {
      logger.warn("Favourite toggle failed: invalid persona ID", {
        userId,
        personaId: id,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error("Invalid persona ID");
    }

    logger.info("Favourite toggle requested", {
      userId,
      personaId: id,
      ipAddress,
      userAgent,
      traceId,
    });

    const result = await personaService.toggleFavourite(id, userId);

    logger.info("Favourite toggle completed", {
      userId,
      personaId: id,
      isFavourited: result.isFavourited,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: result,
        message: result.isFavourited
          ? "Persona added to favourites"
          : "Persona removed from favourites",
      })
    );
  } catch (error) {
    logger.error("Favourite toggle failed", {
      userId: req.user.id,
      personaId: req.params.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

/**
 * Send message to persona
 * POST /api/personas/:id/chat
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { id } = req.params;
    const { message, conversationId, fileId } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!id || !validateNonEmptyString(id)) {
      logger.warn("Message send failed: invalid persona ID", {
        userId,
        personaId: id,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error("Invalid persona ID");
    }

    if (!message || !validateNonEmptyString(message)) {
      logger.warn("Message send failed: missing or invalid message", {
        userId,
        personaId: id,
        hasMessage: !!message,
        messageLength: message ? message.length : 0,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error("Message is required and must not be empty");
    }

    // Validate message length
    if (message.length > 10000) {
      logger.warn("Message send failed: message too long", {
        userId,
        personaId: id,
        messageLength: message.length,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error("Message is too long (maximum 10,000 characters)");
    }

    logger.info("Message send requested", {
      userId,
      personaId: id,
      conversationId: conversationId || "new",
      hasFile: !!fileId,
      messageLength: message.length,
      ipAddress,
      userAgent,
      traceId,
    });

    // Extract metadata for session tracking
    const metadata = {
      userAgent: req.get("User-Agent") || null,
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      deviceInfo: req.headers["sec-ch-ua"] || null,
      requestId: req.headers["x-request-id"] || null,
    };

    const result = await personaService.sendMessage(
      id,
      message.trim(),
      conversationId,
      userId,
      fileId,
      metadata
    );

    logger.info("Message sent successfully", {
      userId,
      personaId: id,
      conversationId: result.conversation?.id || conversationId,
      messageLength: message.length,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: result,
        message: "Message sent successfully",
      })
    );
  } catch (error) {
    logger.error("Message send failed", {
      userId: req.user.id,
      personaId: req.params.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

/**
 * Get user's conversations
 * GET /api/conversations
 */
const getConversations = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const userId = req.user.id;
    const workspaceId = req.user.workspaceId;
    const { archived } = req.query;

    logger.info("Conversations retrieval requested", {
      userId,
      workspaceId,
      archived: archived === "true",
      ipAddress,
      userAgent,
      traceId,
    });

    const options = {
      archived: archived === "true",
    };

    const conversations = await personaService.getConversations(
      userId,
      workspaceId,
      options
    );

    logger.info("Conversations retrieved successfully", {
      userId,
      workspaceId,
      count: Array.isArray(conversations) ? conversations.length : 0,
      archived: options.archived,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: conversations,
        message: "Conversations retrieved successfully",
      })
    );
  } catch (error) {
    logger.error("Conversations retrieval failed", {
      userId: req.user.id,
      workspaceId: req.user.workspaceId,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

/**
 * Update conversation visibility
 * PATCH /api/conversations/:id/visibility
 */
const updateConversationVisibility = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { id } = req.params;
    const { visibility } = req.body;
    const userId = req.user.id;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ["visibility"]);
    if (!validation.isValid) {
      logger.warn("Visibility update failed: missing required fields", {
        userId,
        conversationId: id,
        missingFields: validation.missingFields,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error(
        `Missing required fields: ${validation.missingFields.join(", ")}`
      );
    }

    if (!id || !validateNonEmptyString(id)) {
      logger.warn("Visibility update failed: invalid conversation ID", {
        userId,
        conversationId: id,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error("Invalid conversation ID");
    }

    // Validate visibility values (must match ConversationVisibility enum)
    const validVisibilities = ["PRIVATE", "SHARED"];
    if (!validVisibilities.includes(visibility)) {
      logger.warn("Visibility update failed: invalid visibility value", {
        userId,
        conversationId: id,
        visibility,
        validOptions: validVisibilities,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error(
        `Invalid visibility. Must be one of: ${validVisibilities.join(", ")}`
      );
    }

    logger.info("Conversation visibility update requested", {
      userId,
      conversationId: id,
      visibility,
      ipAddress,
      userAgent,
      traceId,
    });

    const result = await personaService.updateConversationVisibility(
      id,
      userId,
      visibility
    );

    logger.info("Conversation visibility updated successfully", {
      userId,
      conversationId: id,
      visibility,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: result,
        message: "Conversation visibility updated successfully",
      })
    );
  } catch (error) {
    logger.error("Conversation visibility update failed", {
      userId: req.user.id,
      conversationId: req.params.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

/**
 * Request file upload URL
 * POST /api/conversations/:id/files
 */
const requestFileUpload = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { id } = req.params;
    const { filename, mimeType, sizeBytes } = req.body;
    const userId = req.user.id;

    // Validate required fields
    const validation = validateRequiredFields(req.body, [
      "filename",
      "mimeType",
      "sizeBytes",
    ]);
    if (!validation.isValid) {
      logger.warn("File upload request failed: missing required fields", {
        userId,
        conversationId: id,
        missingFields: validation.missingFields,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error(
        `Missing required fields: ${validation.missingFields.join(", ")}`
      );
    }

    if (!id || !validateNonEmptyString(id)) {
      logger.warn("File upload request failed: invalid conversation ID", {
        userId,
        conversationId: id,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error("Invalid conversation ID");
    }

    // Validate file size (max 100MB)
    const maxSizeBytes = 100 * 1024 * 1024;
    if (
      typeof sizeBytes !== "number" ||
      sizeBytes <= 0 ||
      sizeBytes > maxSizeBytes
    ) {
      logger.warn("File upload request failed: invalid file size", {
        userId,
        conversationId: id,
        sizeBytes,
        maxSizeBytes,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error(
        `File size must be between 1 byte and ${maxSizeBytes / (1024 * 1024)}MB`
      );
    }

    // Validate MIME type
    if (!validateNonEmptyString(mimeType)) {
      logger.warn("File upload request failed: invalid MIME type", {
        userId,
        conversationId: id,
        mimeType,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error("Valid MIME type is required");
    }

    logger.info("File upload URL requested", {
      userId,
      conversationId: id,
      filename,
      mimeType,
      sizeBytes,
      ipAddress,
      userAgent,
      traceId,
    });

    const result = await personaService.requestFileUpload(id, userId, {
      filename: filename.trim(),
      mimeType: mimeType.trim(),
      sizeBytes,
    });

    logger.info("File upload URL generated successfully", {
      userId,
      conversationId: id,
      filename,
      sizeBytes,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: result,
        message: "File upload URL generated successfully",
      })
    );
  } catch (error) {
    logger.error("File upload URL generation failed", {
      userId: req.user.id,
      conversationId: req.params.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

/**
 * Toggle message reaction
 * POST /api/messages/:id/reactions
 */
const toggleReaction = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { id } = req.params;
    const { type } = req.body;
    const userId = req.user.id;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ["type"]);
    if (!validation.isValid) {
      logger.warn("Reaction toggle failed: missing required fields", {
        userId,
        messageId: id,
        missingFields: validation.missingFields,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error(
        `Missing required fields: ${validation.missingFields.join(", ")}`
      );
    }

    if (!id || !validateNonEmptyString(id)) {
      logger.warn("Reaction toggle failed: invalid message ID", {
        userId,
        messageId: id,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error("Invalid message ID");
    }

    // Validate reaction type
    const validReactionTypes = ["like", "love", "laugh", "wow", "sad", "angry"];
    if (!validReactionTypes.includes(type.toLowerCase())) {
      logger.warn("Reaction toggle failed: invalid reaction type", {
        userId,
        messageId: id,
        type,
        validOptions: validReactionTypes,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error(
        `Invalid reaction type. Must be one of: ${validReactionTypes.join(
          ", "
        )}`
      );
    }

    logger.info("Message reaction toggle requested", {
      userId,
      messageId: id,
      type: type.toLowerCase(),
      ipAddress,
      userAgent,
      traceId,
    });

    const result = await personaService.toggleReaction(
      id,
      userId,
      type.toLowerCase()
    );

    logger.info("Message reaction toggled successfully", {
      userId,
      messageId: id,
      type: type.toLowerCase(),
      action: result.action,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: result,
        message: `Reaction ${result.action} successfully`,
      })
    );
  } catch (error) {
    logger.error("Message reaction toggle failed", {
      userId: req.user.id,
      messageId: req.params.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

/**
 * Archive or unarchive conversation
 * PATCH /api/conversations/:id/archive
 */
const toggleArchive = asyncHandler(async (req, res) => {
  try {
    console.log("=== CONTROLLER: Archive toggle request ===");

    const { id } = req.params;
    const { archived } = req.body;
    const userId = req.user.id;

    console.log("Request data:", { id, archived, userId });

    // Basic validation
    if (!id) {
      throw new Error("Conversation ID is required");
    }

    if (typeof archived !== "boolean") {
      throw new Error("Archived value must be a boolean");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log("Validation passed, calling service...");

    // Call service
    const result = await personaService.toggleArchive(id, userId, archived);

    console.log("Service returned:", result);

    // Send response
    res.status(200).json(
      apiResponse({
        data: result,
        message: `Conversation ${
          result.archived ? "archived" : "unarchived"
        } successfully`,
      })
    );

    console.log("=== CONTROLLER: Archive toggle success ===");
  } catch (error) {
    console.error("=== CONTROLLER: Archive toggle error ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);

    // Send error response
    res.status(500).json(
      apiResponse({
        success: false,
        message: error.message || "Failed to toggle archive status",
        error: error.message,
      })
    );
  }
});

/**
 * Create or refresh shareable link
 * POST /api/conversations/:id/share
 */
const createShareableLink = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { id } = req.params;
    const { expiresInDays } = req.body;
    const userId = req.user.id;

    if (!id || !validateNonEmptyString(id)) {
      logger.warn("Shareable link creation failed: invalid conversation ID", {
        userId,
        conversationId: id,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error("Invalid conversation ID");
    }

    // Validate expiresInDays if provided
    if (expiresInDays !== undefined) {
      if (
        typeof expiresInDays !== "number" ||
        expiresInDays <= 0 ||
        expiresInDays > 365
      ) {
        logger.warn("Shareable link creation failed: invalid expiration days", {
          userId,
          conversationId: id,
          expiresInDays,
          ipAddress,
          userAgent,
          traceId,
        });
        throw new Error("Expiration days must be between 1 and 365");
      }
    }

    logger.info("Shareable link creation requested", {
      userId,
      conversationId: id,
      expiresInDays: expiresInDays || "default",
      ipAddress,
      userAgent,
      traceId,
    });

    const result = await personaService.createShareableLink(
      id,
      userId,
      expiresInDays
    );

    logger.info("Shareable link created successfully", {
      userId,
      conversationId: id,
      expiresInDays: expiresInDays || "default",
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: result,
        message: "Shareable link created successfully",
      })
    );
  } catch (error) {
    logger.error("Shareable link creation failed", {
      userId: req.user.id,
      conversationId: req.params.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

/**
 * Get shared conversation (public endpoint)
 * GET /p/:token
 */
const getSharedConversation = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { token } = req.params;

    if (!token || !validateNonEmptyString(token)) {
      logger.warn("Shared conversation retrieval failed: invalid token", {
        token: token ? "present" : "missing",
        ipAddress,
        userAgent,
        traceId,
      });
      throw new Error("Invalid or missing token");
    }

    logger.info("Shared conversation retrieval requested", {
      token: token.substring(0, 8) + "***",
      ipAddress,
      userAgent,
      traceId,
    });

    const result = await personaService.getSharedConversation(token);

    logger.info("Shared conversation retrieved successfully", {
      token: token.substring(0, 8) + "***",
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: result,
        message: "Shared conversation retrieved successfully",
      })
    );
  } catch (error) {
    logger.error("Shared conversation retrieval failed", {
      token: req.params.token
        ? req.params.token.substring(0, 8) + "***"
        : "missing",
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

/**
 * Get a specific conversation with all messages
 * GET /api/conversations/:id
 */
const getConversationById = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { id } = req.params;
    const userId = req.user.id;
    const workspaceId = req.user.workspaceId;

    logger.info("Conversation by ID retrieval requested", {
      conversationId: id,
      userId,
      workspaceId,
      ipAddress,
      userAgent,
      traceId,
    });

    const conversation = await personaService.getConversationById(
      id,
      userId,
      workspaceId
    );

    logger.info("Conversation by ID retrieved successfully", {
      conversationId: id,
      userId,
      workspaceId,
      messageCount: conversation.messageCount,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: conversation,
        message: "Conversation retrieved successfully",
      })
    );
  } catch (error) {
    logger.error("Conversation by ID retrieval failed", {
      conversationId: req.params.id,
      userId: req.user.id,
      workspaceId: req.user.workspaceId,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

module.exports = {
  getPersonas,
  getPersonaById,
  toggleFavourite,
  sendMessage,
  getConversations,
  updateConversationVisibility,
  requestFileUpload,
  toggleReaction,
  toggleArchive,
  createShareableLink,
  getSharedConversation,
  getClientInfo,
  validateRequiredFields,
  validateNonEmptyString,
  getConversationById,
};
