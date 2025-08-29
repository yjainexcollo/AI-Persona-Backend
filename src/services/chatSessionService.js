/**
 * ChatSessionService - Simplified chat session management
 * Provides only the essential functions for the three required endpoints
 */

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

const prisma = new PrismaClient();

/**
 * Create a new chat session for a user message
 * @param {string} conversationId - Conversation ID
 * @param {string} personaId - Persona ID
 * @param {string} userId - User ID
 * @param {object} metadata - Additional session metadata
 * @returns {Promise<object>} Created chat session
 */
async function createChatSession(
  conversationId,
  personaId,
  userId,
  metadata = {}
) {
  try {
    // Validate required parameters and types
    if (
      !conversationId ||
      typeof conversationId !== "string" ||
      conversationId.trim() === ""
    ) {
      throw new ApiError(400, "conversationId must be a non-empty string");
    }

    if (
      !personaId ||
      typeof personaId !== "string" ||
      personaId.trim() === ""
    ) {
      throw new ApiError(400, "personaId must be a non-empty string");
    }

    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      throw new ApiError(400, "userId must be a non-empty string");
    }

    // Validate metadata if provided (null is acceptable)
    if (
      metadata !== null &&
      metadata !== undefined &&
      typeof metadata !== "object"
    ) {
      throw new ApiError(400, "metadata must be an object");
    }

    // Sanitize inputs
    conversationId = conversationId.trim();
    personaId = personaId.trim();
    userId = userId.trim();

    // Generate unique session ID
    const sessionId = crypto.randomBytes(16).toString("hex");

    // Create chat session
    const chatSession = await prisma.chatSession.create({
      data: {
        conversationId,
        personaId,
        userId,
        sessionId,
        metadata: metadata
          ? {
              userAgent: metadata.userAgent,
              ipAddress: metadata.ipAddress,
              deviceInfo: metadata.deviceInfo ?? null,
              ...metadata,
            }
          : {
              userAgent: undefined,
              ipAddress: undefined,
              deviceInfo: null,
            },
      },
      include: {
        conversation: true,
        persona: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    logger.info(
      `Chat session created: ${sessionId} for conversation ${conversationId}`
    );

    return chatSession;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error creating chat session:", error);
    throw new ApiError(500, "Failed to create chat session");
  }
}

/**
 * Get chat session by session ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<object>} Chat session
 */
async function getChatSession(sessionId) {
  try {
    // Validate required parameter and type
    if (
      !sessionId ||
      typeof sessionId !== "string" ||
      sessionId.trim() === ""
    ) {
      throw new ApiError(400, "sessionId must be a non-empty string");
    }

    // Sanitize input
    sessionId = sessionId.trim();

    const chatSession = await prisma.chatSession.findUnique({
      where: { sessionId },
      include: {
        conversation: true,
        persona: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!chatSession) {
      throw new ApiError(404, "Chat session not found");
    }

    return chatSession;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error getting chat session:", error);
    throw new ApiError(500, "Failed to get chat session");
  }
}

/**
 * Update a chat session's status and timestamps
 * @param {string} sessionId - Session ID
 * @param {"ACTIVE"|"COMPLETED"|"FAILED"|"TIMEOUT"} status - New status
 * @param {string|null} errorMessage - Optional error message
 * @returns {Promise<object>} Updated chat session
 */
async function updateChatSessionStatus(sessionId, status, errorMessage = null) {
  try {
    // Validate required parameters and types
    if (
      !sessionId ||
      typeof sessionId !== "string" ||
      sessionId.trim() === ""
    ) {
      throw new ApiError(400, "sessionId must be a non-empty string");
    }

    if (!status || typeof status !== "string" || status.trim() === "") {
      throw new ApiError(400, "status must be a non-empty string");
    }

    // Validate error message type if provided
    if (errorMessage !== null && typeof errorMessage !== "string") {
      throw new ApiError(400, "errorMessage must be a string or null");
    }

    // Sanitize inputs
    sessionId = sessionId.trim();
    status = status.trim().toUpperCase();

    // Validate status enum
    const validStatuses = [
      "ACTIVE",
      "COMPLETED",
      "FAILED",
      "TIMEOUT",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
      throw new ApiError(
        400,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    const now = new Date();
    const isTerminal =
      status === "COMPLETED" ||
      status === "FAILED" ||
      status === "TIMEOUT" ||
      status === "CANCELLED";

    const chatSession = await prisma.chatSession.update({
      where: { sessionId },
      data: {
        status,
        lastActivityAt: now,
        endedAt: isTerminal ? now : undefined,
        ...(status === "FAILED" && errorMessage ? { errorMessage } : {}),
      },
      include: {
        conversation: true,
        persona: true,
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return chatSession;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error updating chat session status:", error);
    throw new ApiError(500, "Failed to update chat session status");
  }
}

/**
 * Get chat sessions for a user
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} Chat sessions
 */
async function getUserChatSessions(userId, options = {}) {
  try {
    // Validate required parameter and type
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      throw new ApiError(400, "userId must be a non-empty string");
    }

    // Validate options parameter
    if (options && typeof options !== "object") {
      throw new ApiError(400, "options must be an object");
    }

    // Sanitize input
    userId = userId.trim();

    const { status, limit = 50, offset = 0 } = options;

    // Validate limit and offset types and values
    if (
      typeof limit !== "number" ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new ApiError(400, "Limit must be an integer between 1 and 100");
    }
    if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0) {
      throw new ApiError(400, "Offset must be a non-negative integer");
    }

    const where = { userId };
    if (status !== undefined && status !== null) {
      // Validate status type and value if provided
      if (typeof status !== "string" || status.trim() === "") {
        throw new ApiError(400, "status must be a non-empty string");
      }

      const normalizedStatus = status.trim().toUpperCase();
      const validStatuses = [
        "ACTIVE",
        "COMPLETED",
        "FAILED",
        "TIMEOUT",
        "CANCELLED",
      ];
      if (!validStatuses.includes(normalizedStatus)) {
        throw new ApiError(
          400,
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
      where.status = normalizedStatus;
    }

    const chatSessions = await prisma.chatSession.findMany({
      where,
      include: {
        conversation: true,
        persona: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
      skip: offset,
    });

    return chatSessions;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error getting user chat sessions:", error);
    throw new ApiError(500, "Failed to get user chat sessions");
  }
}

/**
 * Mark sessions as timed out if inactive beyond the provided hours
 * @param {number} inactiveHours - Hours of inactivity threshold
 * @returns {Promise<number>} Number of sessions updated
 */
async function cleanupExpiredSessions(inactiveHours = 24) {
  try {
    // Validate inactiveHours parameter
    if (
      typeof inactiveHours !== "number" ||
      inactiveHours <= 0 ||
      !Number.isFinite(inactiveHours)
    ) {
      throw new ApiError(400, "inactiveHours must be a positive number");
    }

    const cutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000);
    const result = await prisma.chatSession.updateMany({
      where: {
        status: "ACTIVE",
        lastActivityAt: { lt: cutoff },
      },
      data: {
        status: "TIMEOUT",
        endedAt: new Date(),
        errorMessage: "Session timed out due to inactivity",
      },
    });

    return result.count;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error cleaning up expired chat sessions:", error);
    throw new ApiError(500, "Failed to cleanup expired chat sessions");
  }
}

/**
 * Get chat session statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<{ total: number, active: number, byStatus: Record<string, number> }>} Stats
 */
async function getChatSessionStats(userId) {
  try {
    // Validate required parameter and type
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      throw new ApiError(400, "userId must be a non-empty string");
    }

    // Sanitize input
    userId = userId.trim();

    const [byStatusRaw, total, active] = await Promise.all([
      prisma.chatSession.groupBy({
        by: ["status"],
        where: { userId },
        _count: { id: true },
      }),
      prisma.chatSession.count({ where: { userId } }),
      prisma.chatSession.count({ where: { userId, status: "ACTIVE" } }),
    ]);

    const byStatus = {};
    for (const row of byStatusRaw) {
      byStatus[row.status] = row._count.id;
    }

    return { total, active, byStatus };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error getting chat session stats:", error);
    throw new ApiError(500, "Failed to get chat session stats");
  }
}

/**
 * Delete a chat session and all associated messages
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID for ownership verification
 * @returns {Promise<object>} Deletion result
 */
async function deleteChatSession(sessionId, userId) {
  try {
    // Validate required parameters and types
    if (
      !sessionId ||
      typeof sessionId !== "string" ||
      sessionId.trim() === ""
    ) {
      throw new ApiError(400, "sessionId must be a non-empty string");
    }

    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      throw new ApiError(400, "userId must be a non-empty string");
    }

    // Sanitize inputs
    sessionId = sessionId.trim();
    userId = userId.trim();

    // Get session and verify ownership
    const chatSession = await prisma.chatSession.findUnique({
      where: { sessionId },
      include: {
        messages: true,
      },
    });

    if (!chatSession) {
      throw new ApiError(404, "Chat session not found");
    }

    if (chatSession.userId !== userId) {
      throw new ApiError(403, "You can only delete your own chat sessions");
    }

    // Delete session and all associated messages
    await prisma.$transaction(async (tx) => {
      // Delete all messages in this session
      await tx.message.deleteMany({
        where: { chatSessionId: chatSession.id },
      });

      // Delete the session
      await tx.chatSession.delete({
        where: { id: chatSession.id },
      });
    });

    logger.info(`Chat session ${sessionId} deleted by user ${userId}`);

    return {
      sessionId,
      deletedAt: new Date(),
      messageCount: chatSession.messages.length,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Error deleting chat session:", error);
    throw new ApiError(500, "Failed to delete chat session");
  }
}

module.exports = {
  createChatSession,
  getChatSession,
  getUserChatSessions,
  updateChatSessionStatus,
  cleanupExpiredSessions,
  getChatSessionStats,
  deleteChatSession,
};
