//Personna Service -
/**
 * PersonaService - Persona management and chat functionality
 * Includes webhook communication, circuit breaker, and encryption
 */

const prisma = require("../utils/prisma");
const axios = require("axios");
const logger = require("../utils/logger");
const ApiError = require("../utils/apiError");
const { encrypt, decrypt } = require("../utils/encrypt");
const { getCircuitBreaker } = require("../utils/circuitBreaker");
const authService = require("./authService");
const chatSessionService = require("./chatSessionService");
const { generateConversationTitle } = require("./titleService");
const { validateChatWebhookUrl } = require("../utils/webhookUrlValidators");
// prisma singleton imported

// Webhook timeout and retry configuration
const WEBHOOK_TIMEOUT = 30000; // 30 seconds
const WEBHOOK_RETRIES = 2;
const WEBHOOK_RETRY_DELAY = 1000; // 1 second base delay

/**
 * Extract title from n8n response (multiple possible shapes)
 * @param {object} data - n8n response data
 * @returns {string|null} Extracted title or null
 */
function extractTitleFromN8nResponse(data) {
  if (!data) return null;

  // Direct properties
  if (data.suggestedTitle && typeof data.suggestedTitle === 'string') {
    return data.suggestedTitle.trim();
  }
  if (data.title && typeof data.title === 'string') {
    return data.title.trim();
  }

  // Nested in data
  if (data.data?.suggestedTitle && typeof data.data.suggestedTitle === 'string') {
    return data.data.suggestedTitle.trim();
  }
  if (data.data?.title && typeof data.data.title === 'string') {
    return data.data.title.trim();
  }

  // Nested in metadata
  if (data.metadata?.suggestedTitle && typeof data.metadata.suggestedTitle === 'string') {
    return data.metadata.suggestedTitle.trim();
  }
  if (data.metadata?.title && typeof data.metadata.title === 'string') {
    return data.metadata.title.trim();
  }

  // Array responses: [{json:{...}}] style (common n8n format)
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (first.json?.suggestedTitle && typeof first.json.suggestedTitle === 'string') {
      return first.json.suggestedTitle.trim();
    }
    if (first.json?.title && typeof first.json.title === 'string') {
      return first.json.title.trim();
    }
  }

  return null;
}

/**
 * Get all personas with optional favourites filter
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<Array>}
 */
async function getPersonas(userId, options = {}) {
  try {
    // Validate required parameter
    if (!userId || typeof userId !== "string") {
      throw new ApiError(400, "Valid userId is required");
    }

    const { favouritesOnly = false } = options;

    const where = {
      isActive: true,
    };

    const include = {
      _count: {
        select: {
          conversations: true,
          messages: true,
        },
      },
    };

    if (favouritesOnly) {
      include.favourites = {
        where: { userId },
      };
      where.favourites = {
        some: { userId },
      };
    } else {
      include.favourites = {
        where: { userId },
      };
    }

    const personas = await prisma.persona.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
    });

    // Transform to hide webhook URLs and format favourites
    return personas.map((persona) => ({
      id: persona.id,
      name: persona.name,
      personalName: persona.personalName,
      personaRole: persona.personaRole,
      about: persona.about,
      traits: persona.traits,
      painPoints: persona.painPoints,
      coreExpertise: persona.coreExpertise,
      communicationStyle: persona.communicationStyle,
      keyResponsibility: persona.keyResponsibility,
      description: persona.description, // Keep for backward compatibility
      avatarUrl: persona.avatarUrl,
      isActive: persona.isActive,
      createdAt: persona.createdAt,
      updatedAt: persona.updatedAt,
      _count: persona._count,
      isFavourited: persona.favourites.length > 0,
    }));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error fetching personas:", error);
    throw new ApiError(500, "Failed to fetch personas");
  }
}

/**
 * Get persona by ID
 * @param {string} personaId - Persona ID
 * @param {string} userId - User ID
 * @returns {Promise<object>}
 */
async function getPersonaById(personaId, userId) {
  try {
    // Validate required parameters
    if (!personaId || typeof personaId !== "string") {
      throw new ApiError(400, "Valid personaId is required");
    }

    if (!userId || typeof userId !== "string") {
      throw new ApiError(400, "Valid userId is required");
    }

    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
      include: {
        _count: {
          select: {
            conversations: true,
            messages: true,
          },
        },
        favourites: {
          where: { userId },
        },
      },
    });

    if (!persona) {
      throw new ApiError(404, "Persona not found");
    }

    // Check circuit breaker status
    const circuitBreaker = getCircuitBreaker(personaId);
    const isAvailable = !circuitBreaker.isOpen();

    return {
      id: persona.id,
      name: persona.name,
      personalName: persona.personalName,
      personaRole: persona.personaRole,
      about: persona.about,
      traits: persona.traits,
      painPoints: persona.painPoints,
      coreExpertise: persona.coreExpertise,
      communicationStyle: persona.communicationStyle,
      keyResponsibility: persona.keyResponsibility,
      description: persona.description, // Keep for backward compatibility
      avatarUrl: persona.avatarUrl,
      isActive: persona.isActive,
      isAvailable,
      createdAt: persona.createdAt,
      updatedAt: persona.updatedAt,
      _count: persona._count,
      isFavourited: persona.favourites.length > 0,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error fetching persona:", error);
    throw new ApiError(500, "Failed to fetch persona");
  }
}

/**
 * Toggle persona favourite status
 * @param {string} personaId - Persona ID
 * @param {string} userId - User ID
 * @returns {Promise<object>}
 */
async function toggleFavourite(personaId, userId) {
  try {
    // Validate required parameters
    if (!personaId || typeof personaId !== "string") {
      throw new ApiError(400, "Valid personaId is required");
    }

    if (!userId || typeof userId !== "string") {
      throw new ApiError(400, "Valid userId is required");
    }

    // Check if persona exists
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      throw new ApiError(404, "Persona not found");
    }

    // Check if already favourited
    const existingFavourite = await prisma.personaFavourite.findUnique({
      where: {
        userId_personaId: {
          userId,
          personaId,
        },
      },
    });

    let isFavourited;
    let eventType;

    if (existingFavourite) {
      // Remove from favourites
      await prisma.personaFavourite.delete({
        where: {
          userId_personaId: {
            userId,
            personaId,
          },
        },
      });
      isFavourited = false;
      eventType = "PERSONA_UNFAVOURITED";
    } else {
      // Add to favourites
      await prisma.personaFavourite.create({
        data: {
          userId,
          personaId,
        },
      });
      isFavourited = true;
      eventType = "PERSONA_FAVOURITED";
    }

    // Create audit event
    await authService.createAuditEvent(userId, eventType, {
      personaId,
      personaName: persona.name,
    });

    return { isFavourited };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error toggling favourite:", error);
    throw new ApiError(500, "Failed to toggle favourite");
  }
}

/**
 * Send message to persona webhook
 * @param {string} personaId - Persona ID
 * @param {string} message - Message content
 * @param {string} conversationId - Conversation ID (optional)
 * @param {string} userId - User ID
 * @param {string} workspaceId - Workspace ID (for isolation)
 * @param {string} fileId - File ID (optional)
 * @param {object} metadata - Additional metadata for session tracking
 * @returns {Promise<object>}
 */
async function sendMessage(
  personaId,
  message,
  conversationId,
  userId,
  workspaceId,
  fileId = null,
  metadata = {}
) {
  let chatSession = null;

  try {
    // Validate required parameters
    if (!personaId || typeof personaId !== "string") {
      throw new ApiError(400, "Valid personaId is required");
    }

    if (!userId || typeof userId !== "string") {
      throw new ApiError(400, "Valid userId is required");
    }

    if (!workspaceId || typeof workspaceId !== "string") {
      throw new ApiError(400, "Valid workspaceId is required");
    }

    if (!message || typeof message !== "string" || message.trim() === "") {
      throw new ApiError(400, "Valid message is required");
    }

    // Validate persona exists and is active
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      throw new ApiError(404, "Persona not found");
    }

    if (!persona.isActive) {
      throw new ApiError(400, "Persona is not active");
    }

    // Check circuit breaker
    const circuitBreaker = getCircuitBreaker(personaId);
    if (circuitBreaker.isOpen()) {
      throw new ApiError(503, "Persona is temporarily unavailable");
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      // Try to find existing conversation that matches userId, personaId, and workspaceId
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
          personaId, // CRITICAL: must match current persona
          isActive: true,
          user: {
            workspaceId,
          },
        },
      });

      if (!conversation) {
        // Conversation not found or doesn't match current persona
        // This happens when UI switches personas but reuses old conversationId
        // Solution: Create new conversation instead of throwing 404
        logger.warn("Conversation mismatch, creating new conversation", {
          oldConversationId: conversationId,
          personaId,
          userId,
          workspaceId,
          reason: "conversation_not_found_or_persona_mismatch",
        });

        conversation = await prisma.conversation.create({
          data: {
            userId,
            personaId,
            title: null, // Let AI generate title
          },
        });

        logger.info("Created new conversation due to mismatch", {
          newConversationId: conversation.id,
          personaId,
          userId,
        });
      }
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          userId,
          personaId,
          // Do not set a default title; let AI generate one
          title: null,
        },
      });
    }


    // Validate file if provided
    let file = null;
    if (fileId) {
      file = await prisma.file.findFirst({
        where: {
          id: fileId,
          conversationId: conversation.id,
          userId,
          uploadedAt: { not: null },
        },
      });

      if (!file) {
        throw new ApiError(400, "Invalid file ID or file not uploaded");
      }
    }

    // Create chat session for this interaction
    chatSession = await chatSessionService.createChatSession(
      conversation.id,
      personaId,
      userId,
      metadata
    );

    // Insert user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        personaId,
        userId,
        content: message,
        fileId: fileId,
        role: "USER",
        chatSessionId: chatSession.id,
      },
    });

    // Chat MUST use persona.webhookUrl (which contains chat URLs)
    // DO NOT use traits registry or any other source
    if (!persona.webhookUrl) {
      logger.error("Persona webhook URL not configured", {
        personaId,
        personaSlug: persona.slug,
        personaName: persona.name,
        userId,
      });

      // Create audit event for misconfigured persona
      await authService.createAuditEvent(userId, "WEBHOOK_FAILED", {
        personaId,
        personaSlug: persona.slug,
        personaName: persona.name,
        reason: "chat_webhook_not_configured",
        ipAddress: metadata?.ipAddress || null,
        userAgent: metadata?.userAgent || null,
      });

      throw new ApiError(
        422,
        `Chat webhook not configured for persona "${persona.name}"`
      );
    }

    // Decrypt webhook URL
    let webhookUrl;
    try {
      webhookUrl = decrypt(persona.webhookUrl, process.env.ENCRYPTION_KEY);
    } catch (decryptError) {
      logger.error("Failed to decrypt persona webhook URL", {
        personaId,
        personaSlug: persona.slug,
        personaName: persona.name,
        userId,
        error: decryptError.message,
      });

      await authService.createAuditEvent(userId, "WEBHOOK_FAILED", {
        personaId,
        personaSlug: persona.slug,
        personaName: persona.name,
        reason: "webhook_url_decryption_failed",
        error: decryptError.message,
        ipAddress: metadata?.ipAddress || null,
        userAgent: metadata?.userAgent || null,
      });

      throw new ApiError(
        500,
        "Persona webhook configuration error. Please contact support."
      );
    }

    // STRICT VALIDATION: Ensure it's a chat URL (not traits)
    try {
      validateChatWebhookUrl(webhookUrl, persona.name);
    } catch (validationError) {
      logger.error("Chat webhook URL validation failed", {
        personaId,
        personaSlug: persona.slug,
        personaName: persona.name,
        webhookUrl,
        error: validationError.message,
        userId,
      });

      // Create audit event for validation failure
      await authService.createAuditEvent(userId, "WEBHOOK_FAILED", {
        personaId,
        personaSlug: persona.slug,
        personaName: persona.name,
        reason: "chat_webhook_validation_failed",
        error: validationError.message,
        ipAddress: metadata?.ipAddress || null,
        userAgent: metadata?.userAgent || null,
      });

      throw new ApiError(
        422,
        `Chat webhook not configured correctly for persona "${persona.name}": ${validationError.message}`
      );
    }

    // Log the webhook URL being called (for debugging)
    logger.info("Calling chat webhook URL for persona", {
      personaId,
      personaSlug: persona.slug,
      personaName: persona.name,
      webhookUrl,
      domain: new URL(webhookUrl).hostname,
      path: new URL(webhookUrl).pathname,
      workflowType: "CHAT",
    });

    // Prepare webhook payload
    const webhookPayload = {
      message,
      conversationId: conversation.id,
      personaId,
      userId,
      sessionId: chatSession.sessionId,
    };

    // Generate HMAC signature for webhook verification (if secret is configured)
    let signature = null;
    if (process.env.WEBHOOK_SECRET) {
      const crypto = require('crypto');
      signature = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');
    }


    // Send to webhook with retries
    let webhookResponse;
    let success = false;
    let lastError = null; // Capture last error for better error messages

    for (let attempt = 1; attempt <= WEBHOOK_RETRIES + 1; attempt++) {
      try {
        const headers = {
          "Content-Type": "application/json",
          "User-Agent": "AI-Persona-Backend/1.0",
        };

        // Add signature header if available
        if (signature) {
          headers["X-Webhook-Signature"] = signature;
        }

        webhookResponse = await axios.post(
          webhookUrl,
          webhookPayload,
          {
            timeout: WEBHOOK_TIMEOUT,
            headers,
          }
        );

        // Log successful webhook response
        logger.info('Webhook request successful', {
          personaId,
          personaName: persona.name,
          attempt,
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          responseDataKeys: Object.keys(webhookResponse.data || {}),
          hasReply: !!webhookResponse.data?.reply,
        });

        success = true;
        break;
      } catch (error) {
        lastError = error; // Capture for error message generation

        // Extract detailed error information from axios error
        const errorDetails = {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          code: error.code, // ECONNREFUSED, ETIMEDOUT, etc.
        };

        logger.warn(
          `Webhook attempt ${attempt} failed for persona ${personaId}`,
          errorDetails
        );

        // Log detailed error on final attempt
        if (attempt === WEBHOOK_RETRIES + 1) {
          logger.error('All webhook attempts exhausted', {
            personaId,
            personaName: persona.name,
            webhookUrl,
            totalAttempts: WEBHOOK_RETRIES + 1,
            finalError: errorDetails,
            stack: error.stack,
          });
        }

        if (attempt <= WEBHOOK_RETRIES) {
          // Exponential backoff
          const delay = WEBHOOK_RETRY_DELAY * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!success) {
      // Record failure in circuit breaker
      circuitBreaker.onFailure();

      // Determine user-friendly error message based on last error
      let errorMessage = "Failed to get response from persona";

      if (lastError) {
        const status = lastError.response?.status;
        const code = lastError.code;

        if (status === 404) {
          errorMessage = "Persona webhook not found. Please contact support.";
        } else if (status === 405) {
          errorMessage = "Persona webhook method not allowed. Please contact support.";
        } else if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
          errorMessage = "Persona response timeout. Please try again.";
        } else if (code === 'ECONNREFUSED') {
          errorMessage = "Persona service unavailable. Please try again later.";
        }
      }

      // Create audit event
      await authService.createAuditEvent(userId, "WEBHOOK_FAILED", {
        personaId,
        conversationId: conversation.id,
        sessionId: chatSession.sessionId,
        message,
      });

      throw new ApiError(502, errorMessage);
    }

    // Record success in circuit breaker
    circuitBreaker.onSuccess();

    // Extract reply from webhook response
    const reply =
      webhookResponse.data?.reply ||
      webhookResponse.data?.message ||
      webhookResponse.data?.response ||
      webhookResponse.data?.output ||
      webhookResponse.data?.data ||
      (typeof webhookResponse.data === "string"
        ? webhookResponse.data
        : "No response received");

    // Insert assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        personaId,
        content: reply,
        role: "ASSISTANT",
        chatSessionId: chatSession.id,
      },
    });

    // Extract title from n8n response (multiple possible shapes)
    let extractedTitle = extractTitleFromN8nResponse(webhookResponse.data);

    // If n8n didn't provide a title, try generating one with LLM
    if (!extractedTitle) {
      try {
        extractedTitle = await generateConversationTitle(message, reply);
      } catch (titleError) {
        logger.warn("Failed to generate conversation title", {
          error: titleError.message,
          conversationId: conversation.id,
        });
      }
    }

    // Update conversation title if currently null/empty/"Untitled"
    if (
      extractedTitle &&
      (!conversation.title ||
        conversation.title.trim() === "" ||
        conversation.title === "Untitled" ||
        /^Chat with\s/i.test(conversation.title))
    ) {
      try {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { title: extractedTitle },
        });

        // Update the conversation object for the response
        conversation.title = extractedTitle;

        logger.info("Updated conversation title", {
          conversationId: conversation.id,
          title: extractedTitle,
          source: webhookResponse.data?.suggestedTitle ? "n8n" : "llm",
        });
      } catch (titleError) {
        // Log error but don't fail the message - title update is optional
        logger.warn("Failed to update conversation title", {
          error: titleError.message,
          conversationId: conversation.id,
        });
      }
    }

    // Update session status to completed - REMOVED: updateChatSessionStatus function
    // await chatSessionService.updateChatSessionStatus(
    //   chatSession.sessionId,
    //   "COMPLETED"
    // );

    // Create audit event
    await authService.createAuditEvent(userId, "CHAT_MESSAGE_SENT", {
      personaId,
      conversationId: conversation.id,
      sessionId: chatSession.sessionId,
      messageLength: message.length,
    });

    return {
      reply,
      conversationId: conversation.id,
      messageId: assistantMessage.id, // kept for backward compatibility (assistant message ID)
      assistantMessageId: assistantMessage.id,
      userMessageId: userMessage.id,
      sessionId: chatSession.sessionId,
      suggestedTitle: extractedTitle || null, // Include suggested title if available
    };
  } catch (error) {
    // Update session status to failed if session was created - REMOVED: updateChatSessionStatus function
    // if (chatSession) {
    //   try {
    //     await chatSessionService.updateChatSessionStatus(
    //       chatSession.sessionId,
    //       "FAILED",
    //       error.message
    //   );
    //   } catch (sessionError) {
    //     logger.error("Failed to update session status:", sessionError);
    //   }
    // }

    if (error instanceof ApiError) throw error;
    logger.error("Error sending message:", error.message, error.stack);
    throw new ApiError(500, "Failed to send message");
  }
}

/**
 * Get user's conversations with visibility support
 * @param {string} userId - User ID
 * @param {string} workspaceId - Workspace ID
 * @param {object} options - Query options
 * @returns {Promise<Array>}
 */
async function getConversations(userId, workspaceId, options = {}) {
  try {
    // Validate required parameters
    if (!userId || typeof userId !== "string") {
      throw new ApiError(400, "Valid userId is required");
    }

    if (!workspaceId || typeof workspaceId !== "string") {
      throw new ApiError(400, "Valid workspaceId is required");
    }

    const { archived = false } = options;

    // Build where clause for visibility logic
    const where = {
      isActive: true,
      OR: [
        // User's private conversations
        {
          userId,
          visibility: "PRIVATE",
        },
        // Shared conversations in user's workspace
        {
          user: {
            workspaceId,
          },
          visibility: "SHARED",
        },
      ],
    };

    // Handle archived filter
    if (archived) {
      // Include archived conversations
      where.archivedAt = { not: null };
    } else {
      // Exclude archived conversations
      where.archivedAt = null;
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get last message for preview
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      personaId: conversation.personaId,
      persona: conversation.persona,
      user: conversation.user,
      visibility: conversation.visibility,
      archivedAt: conversation.archivedAt,
      lastMessage: conversation.messages[0]?.content || null,
      messageCount: conversation._count.messages,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    }));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error fetching conversations:", error);
    throw new ApiError(500, "Failed to fetch conversations");
  }
}

/**
 * Update conversation visibility
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @param {string} visibility - New visibility (PRIVATE or SHARED)
 * @returns {Promise<object>}
 */
async function updateConversationVisibility(
  conversationId,
  userId,
  visibility
) {
  try {
    // Get conversation with user info to check permissions
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: {
          select: {
            id: true,
            workspaceId: true,
            role: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    // Check if conversation is archived
    if (conversation.archivedAt) {
      throw new ApiError(
        422,
        "Cannot change visibility of archived conversation"
      );
    }

    // Check permissions: owner or workspace admin (current user's role)
    const isOwner = conversation.userId === userId;
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    const isAdmin =
      currentUser &&
      currentUser.role === "ADMIN" &&
      currentUser.workspaceId === conversation.user.workspaceId;

    if (!isOwner && !isAdmin) {
      throw new ApiError(
        403,
        "Insufficient permissions to change conversation visibility"
      );
    }

    // Check if visibility is already set to the requested value
    if (conversation.visibility === visibility) {
      return {
        id: conversation.id,
        visibility: conversation.visibility,
      };
    }

    // Update visibility
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { visibility },
    });

    // Create audit event
    await authService.createAuditEvent(
      userId,
      "CONVERSATION_VISIBILITY_CHANGED",
      {
        conversationId,
        oldVisibility: conversation.visibility,
        newVisibility: visibility,
      }
    );

    return {
      id: updatedConversation.id,
      visibility: updatedConversation.visibility,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error updating conversation visibility:", error);
    throw new ApiError(500, "Failed to update conversation visibility");
  }
}

/**
 * Edit a user message and branch the conversation
 * @param {string} messageId - Message ID to edit
 * @param {string} userId - User ID
 * @param {string} newContent - New message content
 * @returns {Promise<object>}
 */
async function editMessage(messageId, userId, newContent) {
  try {
    // Get the message with conversation and persona info
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
        persona: true,
      },
    });

    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    // Check ownership
    if (message.userId !== userId) {
      throw new ApiError(403, "You can only edit your own messages");
    }

    // Check if message is editable (USER role)
    if (message.role !== "USER") {
      throw new ApiError(422, "Only user messages can be edited");
    }

    // Check time limit (configurable)
    const limitMinutesRaw = process.env.EDIT_TIME_LIMIT_MINUTES;
    const limitMinutes = Number.isFinite(Number(limitMinutesRaw))
      ? Number(limitMinutesRaw)
      : 0; // default: no limit
    if (limitMinutes > 0) {
      const timeDiff = Date.now() - message.createdAt.getTime();
      const limitMs = limitMinutes * 60 * 1000;
      if (timeDiff > limitMs) {
        throw new ApiError(
          422,
          `Messages can only be edited within ${limitMinutes} minutes`
        );
      }
    }

    // Check if message is deleted
    if (message.deleted) {
      throw new ApiError(422, "Cannot edit deleted message");
    }

    // Create a new chat session for this edit to track webhook interaction
    let chatSession = null;
    try {
      chatSession = await chatSessionService.createChatSession(
        message.conversationId,
        message.personaId,
        userId,
        { isEdit: true, editedMessageId: messageId }
      );
    } catch (sessionErr) {
      logger.warn("Failed to create chat session for edit", {
        messageId,
        error: sessionErr?.message,
      });
    }

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create MessageEdit record
      await tx.messageEdit.create({
        data: {
          messageId: message.id,
          oldContent: message.content,
        },
      });

      // 2. Update the message
      const updatedMessage = await tx.message.update({
        where: { id: messageId },
        data: {
          content: newContent,
          edited: true,
        },
      });

      // 3. Soft-delete all messages after the edited message
      await tx.message.updateMany({
        where: {
          conversationId: message.conversationId,
          createdAt: { gt: message.createdAt },
          deleted: false,
        },
        data: { deleted: true },
      });

      // 4. Get conversation history up to the edited message
      const conversationHistory = await tx.message.findMany({
        where: {
          conversationId: message.conversationId,
          createdAt: { lte: message.createdAt },
          deleted: false,
        },
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          content: true,
        },
      });

      // 5. Call webhook with conversation history
      let replyText = null;
      try {
        const webhookUrl = decrypt(
          message.persona.webhookUrl,
          process.env.ENCRYPTION_KEY
        );

        if (webhookUrl) {
          let webhookResponse;
          let success = false;

          for (let attempt = 1; attempt <= WEBHOOK_RETRIES + 1; attempt++) {
            try {
              webhookResponse = await axios.post(
                webhookUrl,
                {
                  message: newContent,
                  conversationId: message.conversationId,
                  personaId: message.personaId,
                  userId,
                  history: conversationHistory,
                  isEdit: true,
                  editedMessageId: messageId,
                  sessionId: chatSession?.sessionId || undefined,
                },
                {
                  timeout: WEBHOOK_TIMEOUT,
                  headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "AI-Persona-Backend/1.0",
                  },
                }
              );

              success = true;
              break;
            } catch (error) {
              logger.warn(
                `Webhook attempt ${attempt} failed for message edit ${messageId}:`,
                error.message
              );

              if (attempt <= WEBHOOK_RETRIES) {
                const delay = WEBHOOK_RETRY_DELAY * Math.pow(2, attempt - 1);
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          }

          if (success) {
            // Extract reply from various possible keys
            replyText =
              webhookResponse.data?.reply ||
              webhookResponse.data?.message ||
              webhookResponse.data?.response ||
              webhookResponse.data?.output ||
              webhookResponse.data?.data ||
              (typeof webhookResponse.data === "string"
                ? webhookResponse.data
                : null);
          }
        }
      } catch (err) {
        // Swallow webhook errors; we'll fall back below
        logger.warn(
          "Webhook processing failed during edit; using fallback reply",
          {
            messageId,
            error: err?.message,
          }
        );
      }

      // 6. Insert new assistant message (use fallback if webhook had no reply)
      const assistantMessage = await tx.message.create({
        data: {
          conversationId: message.conversationId,
          personaId: message.personaId,
          content: replyText || "",
          role: "ASSISTANT",
          chatSessionId: chatSession?.id || null,
        },
      });

      return {
        editedMessageId: updatedMessage.id,
        assistantMessageId: assistantMessage.id,
        assistantMessageContent: assistantMessage.content,
        conversationId: message.conversationId,
        sessionId: chatSession?.sessionId || null,
      };
    });

    // Create audit event
    await authService.createAuditEvent(userId, "MESSAGE_EDITED", {
      messageId,
      conversationId: message.conversationId,
      oldContent: message.content,
      newContent,
    });

    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error editing message:", error);
    throw new ApiError(500, "Failed to edit message");
  }
}

/**
 * Request presigned upload URL for file
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @param {object} fileData - File data (filename, mimeType, sizeBytes)
 * @returns {Promise<object>}
 */
async function requestFileUpload(conversationId, userId, fileData) {
  try {
    // Validate conversation exists and user has access
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { userId },
          {
            user: {
              workspaceId: {
                equals: (
                  await prisma.user.findUnique({ where: { id: userId } })
                ).workspaceId,
              },
            },
            visibility: "SHARED",
          },
        ],
      },
    });

    if (!conversation) {
      throw new ApiError(404, "Conversation not found or access denied");
    }

    // Validate file data
    const uploadUtils = require("../utils/upload");
    const validatedData = uploadUtils.validateFileUpload(fileData);

    // Generate file ID and presigned URL
    const fileId = uploadUtils.generateFileId();
    const presignedData = uploadUtils.generatePresignedUrl(
      fileId,
      validatedData.filename,
      validatedData.mimeType
    );

    // Create file record
    await prisma.file.create({
      data: {
        id: fileId,
        conversationId,
        userId,
        filename: validatedData.filename,
        mimeType: validatedData.mimeType,
        sizeBytes: validatedData.sizeBytes,
      },
    });

    return {
      presignedUrl: presignedData.presignedUrl,
      fileId: fileId,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error requesting file upload:", error);
    throw new ApiError(500, "Failed to request file upload");
  }
}

/**
 * Add or toggle reaction to message
 * @param {string} messageId - Message ID
 * @param {string} userId - User ID
 * @param {string} type - Reaction type (LIKE or DISLIKE)
 * @returns {Promise<object>}
 */
async function toggleReaction(messageId, userId, type) {
  try {
    // Validate message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    let toggled = false;
    let action = "added";

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Remove reaction if same type
        await prisma.reaction.delete({
          where: {
            messageId_userId: {
              messageId,
              userId,
            },
          },
        });
        action = "removed";
        toggled = true;
      } else {
        // Update reaction type
        await prisma.reaction.update({
          where: {
            messageId_userId: {
              messageId,
              userId,
            },
          },
          data: { type },
        });
        action = "updated";
        toggled = true;
      }
    } else {
      // Create new reaction
      await prisma.reaction.create({
        data: {
          messageId,
          userId,
          type,
        },
      });
      action = "added";
    }

    // Create audit event
    await authService.createAuditEvent(userId, "REACTION_ADDED", {
      messageId,
      type,
      action,
      toggled,
    });

    return {
      messageId,
      type,
      action,
      toggled,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error toggling reaction:", error);
    throw new ApiError(500, "Failed to toggle reaction");
  }
}

/**
 * Archive or unarchive conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @param {boolean} archived - Archive status
 * @returns {Promise<object>}
 */
async function toggleArchive(conversationId, userId, archived) {
  try {
    console.log("=== ARCHIVE TOGGLE START ===");
    console.log("Input:", { conversationId, userId, archived });

    // Simple validation
    if (!conversationId || !userId || typeof archived !== "boolean") {
      throw new Error("Invalid input parameters");
    }

    // Get user's workspace for validation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true }
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Find conversation with workspace validation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
        user: {
          workspaceId: user.workspaceId
        }
      },
      include: { user: true },
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    console.log("Found conversation:", {
      id: conversation.id,
      userId: conversation.userId,
      archivedAt: conversation.archivedAt,
    });

    // Update archive status
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        archivedAt: archived ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    console.log("Updated conversation:", {
      id: updatedConversation.id,
      archivedAt: updatedConversation.archivedAt,
    });

    const result = {
      id: updatedConversation.id,
      archived: !!updatedConversation.archivedAt,
      archivedAt: updatedConversation.archivedAt,
    };

    console.log("=== ARCHIVE TOGGLE SUCCESS ===");
    console.log("Result:", result);
    return result;
  } catch (error) {
    console.error("=== ARCHIVE TOGGLE ERROR ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);

    // Re-throw as ApiError
    if (error.message.includes("not found")) {
      throw new ApiError(404, error.message);
    } else if (error.message.includes("not authorized")) {
      throw new ApiError(403, error.message);
    } else {
      throw new ApiError(500, `Archive operation failed: ${error.message}`);
    }
  }
}

/**
 * Create or refresh shareable link for conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @param {number} expiresInDays - Days until expiration (optional)
 * @returns {Promise<object>}
 */
async function createShareableLink(conversationId, userId, expiresInDays = 30) {
  try {
    // Validate conversation exists and user has access
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { userId },
          {
            user: {
              workspaceId: {
                equals: (
                  await prisma.user.findUnique({ where: { id: userId } })
                ).workspaceId,
              },
            },
            visibility: "SHARED",
          },
        ],
      },
      include: {
        user: true,
      },
    });

    if (!conversation) {
      throw new ApiError(404, "Conversation not found or access denied");
    }

    // Check if user is owner or admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isOwner = conversation.userId === userId;
    const isAdmin =
      user.role === "ADMIN" &&
      user.workspaceId === conversation.user.workspaceId;

    if (!isOwner && !isAdmin) {
      throw new ApiError(
        403,
        "Only conversation owner or workspace admin can share"
      );
    }

    // Check if conversation is archived
    if (conversation.archivedAt) {
      throw new ApiError(422, "Cannot share archived conversations");
    }

    // Check if conversation is shared
    if (conversation.visibility !== "SHARED") {
      throw new ApiError(
        422,
        "Only SHARED conversations can have shareable links"
      );
    }

    // Generate token and expiration
    const tokenUtils = require("../utils/token");
    const token = tokenUtils.generateConversationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create or update shared link
    const sharedLink = await prisma.sharedLink.upsert({
      where: { conversationId },
      update: {
        token,
        expiresAt,
      },
      create: {
        conversationId,
        token,
        expiresAt,
      },
    });

    // Create audit event
    await authService.createAuditEvent(userId, "SHARED_LINK_CREATED", {
      conversationId,
      token: sharedLink.token,
      expiresAt: sharedLink.expiresAt,
    });

    const baseUrl = process.env.APP_BASE_URL;
    if (!baseUrl) {
      throw new ApiError(
        500,
        "APP_BASE_URL env is required to build share link URLs"
      );
    }

    return {
      url: `${baseUrl}/p/${sharedLink.token}`,
      expiresAt: sharedLink.expiresAt,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error creating shareable link:", error);
    throw new ApiError(500, "Failed to create shareable link");
  }
}

/**
 * Get shared conversation by token
 * @param {string} token - Share token
 * @returns {Promise<object>}
 */
async function getSharedConversation(token) {
  try {
    // Validate token
    const tokenUtils = require("../utils/token");
    if (!tokenUtils.validateToken(token)) {
      throw new ApiError(400, "Invalid token format");
    }

    // Find shared link
    const sharedLink = await prisma.sharedLink.findUnique({
      where: { token },
      include: {
        conversation: {
          include: {
            persona: true,
            messages: {
              where: {
                role: { in: ["USER", "ASSISTANT"] },
                deleted: false,
              },
              orderBy: { createdAt: "asc" },
              select: {
                role: true,
                content: true,
                file: {
                  select: {
                    url: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sharedLink) {
      throw new ApiError(404, "Shared link not found");
    }

    // Check if expired
    if (sharedLink.expiresAt < new Date()) {
      throw new ApiError(410, "Shared link has expired");
    }

    // Create audit event
    await authService.createAuditEvent(null, "SHARED_LINK_ACCESSED", {
      conversationId: sharedLink.conversationId,
      token,
    });

    return {
      conversationId: sharedLink.conversation.id,
      persona: {
        name: sharedLink.conversation.persona.name,
        personaRole: sharedLink.conversation.persona.personaRole,
        about: sharedLink.conversation.persona.about,
        traits: sharedLink.conversation.persona.traits,
        painPoints: sharedLink.conversation.persona.painPoints,
        coreExpertise: sharedLink.conversation.persona.coreExpertise,
        communicationStyle: sharedLink.conversation.persona.communicationStyle,
        keyResponsibility: sharedLink.conversation.persona.keyResponsibility,
        description: sharedLink.conversation.persona.description, // Keep for backward compatibility
      },
      messages: sharedLink.conversation.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        fileUrl: msg.file?.url || null,
      })),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error getting shared conversation:", error);
    throw new ApiError(500, "Failed to get shared conversation");
  }
}

/**
 * Get a specific conversation with all messages
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<object>}
 */
async function getConversationById(conversationId, userId, workspaceId) {
  try {
    // Validate required parameters
    if (!conversationId || typeof conversationId !== "string") {
      throw new ApiError(400, "Valid conversationId is required");
    }

    if (!userId || typeof userId !== "string") {
      throw new ApiError(400, "Valid userId is required");
    }

    if (!workspaceId || typeof workspaceId !== "string") {
      throw new ApiError(400, "Valid workspaceId is required");
    }

    // Build where clause for visibility logic
    const where = {
      id: conversationId,
      isActive: true,
      OR: [
        // User's private conversations
        {
          userId,
          visibility: "PRIVATE",
        },
        // Shared conversations in user's workspace
        {
          user: {
            workspaceId,
          },
          visibility: "SHARED",
        },
      ],
    };

    const conversation = await prisma.conversation.findFirst({
      where,
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          where: {
            deleted: false,
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            role: true,
            userId: true,
            edited: true,
            createdAt: true,
            reactions: {
              select: {
                id: true,
                type: true,
                userId: true,
                createdAt: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new ApiError(404, "Conversation not found or access denied");
    }

    return {
      id: conversation.id,
      title: conversation.title,
      personaId: conversation.personaId,
      persona: conversation.persona,
      user: conversation.user,
      visibility: conversation.visibility,
      archivedAt: conversation.archivedAt,
      messages: conversation.messages,
      messageCount: conversation._count.messages,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error fetching conversation by ID:", error);
    throw new ApiError(500, "Failed to fetch conversation");
  }
}

/**
 * Update conversation title with AI suggestion
 * @param {string} conversationId - Conversation ID
 * @param {string} suggestedTitle - AI suggested title
 * @param {string} userId - User ID for audit
 * @returns {Promise<object>}
 */
async function updateConversationTitle(conversationId, suggestedTitle, userId) {
  try {
    // Validate parameters
    if (!conversationId || typeof conversationId !== "string") {
      throw new ApiError(400, "Valid conversationId is required");
    }

    if (!suggestedTitle || typeof suggestedTitle !== "string") {
      throw new ApiError(400, "Valid suggestedTitle is required");
    }

    if (!userId || typeof userId !== "string") {
      throw new ApiError(400, "Valid userId is required");
    }

    // Sanitize title (trim, limit length)
    const cleanTitle = suggestedTitle.trim().substring(0, 200);

    // Update conversation title
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        title: cleanTitle,
        updatedAt: new Date(),
      },
      include: {
        persona: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Create audit event for title update
    await authService.createAuditEvent(userId, "CONVERSATION_TITLE_UPDATED", {
      conversationId,
      oldTitle: "Chat with " + updatedConversation.persona.name,
      newTitle: cleanTitle,
      personaId: updatedConversation.personaId,
    });

    logger.info(
      `Updated conversation title: ${conversationId} -> "${cleanTitle}"`
    );

    return updatedConversation;
  } catch (error) {
    logger.error("Error updating conversation title:", error.message);
    throw error;
  }
}

async function clearUserConversations(userId) {
  try {
    if (!userId || typeof userId !== "string") {
      throw new ApiError(400, "Valid userId is required");
    }

    // Find all conversation IDs owned by the user
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      select: { id: true },
    });

    if (conversations.length === 0) {
      return { deletedConversations: 0, deletedMessages: 0 };
    }

    const conversationIds = conversations.map((c) => c.id);

    const result = await prisma.$transaction(async (tx) => {
      // Delete reactions linked to messages in these conversations
      await tx.reaction.deleteMany({
        where: { message: { conversationId: { in: conversationIds } } },
      });

      // Delete message edits for messages in these conversations
      await tx.messageEdit.deleteMany({
        where: { message: { conversationId: { in: conversationIds } } },
      });

      // Delete files linked to these conversations
      await tx.file.deleteMany({
        where: { conversationId: { in: conversationIds } },
      });

      // Delete messages
      const deleteMessages = await tx.message.deleteMany({
        where: { conversationId: { in: conversationIds } },
      });

      // Delete chat sessions
      await tx.chatSession.deleteMany({
        where: { conversationId: { in: conversationIds } },
      });

      // Delete shared links
      await tx.sharedLink.deleteMany({
        where: { conversationId: { in: conversationIds } },
      });

      // Finally delete conversations owned by user
      const deleteConversations = await tx.conversation.deleteMany({
        where: { id: { in: conversationIds }, userId },
      });

      return {
        deletedConversations: deleteConversations.count,
        deletedMessages: deleteMessages.count,
      };
    });

    // Audit event
    await authService.createAuditEvent(userId, "CONVERSATION_ARCHIVED", {
      action: "clear_all_user_conversations",
      conversationCount: result.deletedConversations,
      messageCount: result.deletedMessages,
    });

    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error clearing user conversations:", error);
    throw new ApiError(500, "Failed to clear conversations");
  }
}

module.exports = {
  getPersonas,
  getPersonaById,
  toggleFavourite,
  sendMessage,
  getConversations,
  updateConversationVisibility,
  editMessage,
  requestFileUpload,
  toggleReaction,
  toggleArchive,
  createShareableLink,
  getSharedConversation,
  getConversationById,
  updateConversationTitle,
  clearUserConversations,
};
