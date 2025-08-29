/**
 * ChatSessionController - Simplified chat session operations
 * Provides only the three required endpoints
 */

const chatSessionService = require("../services/chatSessionService");
const apiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

/**
 * Get user's chat sessions
 * GET /api/chat-sessions
 */
const getUserChatSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, limit = "50", offset = "0" } = req.query;

  // Validate and sanitize query parameters
  const parsedLimit = parseInt(limit);
  const parsedOffset = parseInt(offset);

  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new ApiError(400, "Limit must be a number between 1 and 100");
  }

  if (isNaN(parsedOffset) || parsedOffset < 0) {
    throw new ApiError(400, "Offset must be a non-negative number");
  }

  // Validate status if provided
  if (status && typeof status !== "string") {
    throw new ApiError(400, "Status must be a string");
  }

  const options = {
    status: status || undefined,
    limit: parsedLimit,
    offset: parsedOffset,
  };

  const chatSessions = await chatSessionService.getUserChatSessions(
    userId,
    options
  );

  res.status(200).json(
    apiResponse({
      data: chatSessions,
      message: "User chat sessions retrieved successfully",
    })
  );
});

/**
 * Get chat session by session ID
 * GET /api/chat-sessions/:sessionId
 */
const getChatSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  // Validate sessionId parameter
  if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
    throw new ApiError(
      400,
      "Session ID is required and must be a non-empty string"
    );
  }

  const chatSession = await chatSessionService.getChatSession(sessionId.trim());

  // Ensure user can only access their own sessions
  if (chatSession.userId !== userId) {
    throw new ApiError(403, "You can only access your own chat sessions");
  }

  res.status(200).json(
    apiResponse({
      data: chatSession,
      message: "Chat session retrieved successfully",
    })
  );
});

/**
 * Delete a chat session
 * DELETE /api/chat-sessions/:sessionId
 */
const deleteChatSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  // Validate sessionId parameter
  if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
    throw new ApiError(
      400,
      "Session ID is required and must be a non-empty string"
    );
  }

  const result = await chatSessionService.deleteChatSession(
    sessionId.trim(),
    userId
  );

  res.status(200).json(
    apiResponse({
      data: result,
      message: "Chat session deleted successfully",
    })
  );
});

module.exports = {
  getUserChatSessions,
  getChatSession,
  deleteChatSession,
};
