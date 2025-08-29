/**
 * MessageController - Message editing functionality
 * Handles message editing and conversation branching
 */

const personaService = require("../services/personaService");
const apiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");
const ApiError = require("../utils/apiError");

/**
 * Extract client information from request for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Client information
 */
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.get("User-Agent") || null,
  traceId: req.headers["x-trace-id"] || null,
});

/**
 * Edit a user message and branch the conversation
 * PATCH /api/messages/:id
 */
const editMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  // Comprehensive input validation
  if (!id) {
    throw new ApiError(400, "Message ID is required");
  }

  if (typeof id !== "string") {
    throw new ApiError(400, "Message ID must be a string");
  }

  if (id.trim() === "") {
    throw new ApiError(400, "Message ID cannot be empty");
  }

  if (!content) {
    throw new ApiError(400, "Message content is required");
  }

  if (typeof content !== "string") {
    throw new ApiError(400, "Message content must be a string");
  }

  if (content.trim() === "") {
    throw new ApiError(400, "Message content cannot be empty");
  }

  // Validate content length (reasonable limits)
  if (content.length > 10000) {
    throw new ApiError(400, "Message content cannot exceed 10,000 characters");
  }

  // Sanitize inputs
  const sanitizedId = id.trim();
  const sanitizedContent = content.trim();

  try {
    const result = await personaService.editMessage(
      sanitizedId,
      userId,
      sanitizedContent
    );

    logger.info(`Message edited successfully`, {
      messageId: sanitizedId,
      userId,
      conversationId: result.conversationId,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: result,
        message: "Message edited successfully",
      })
    );
  } catch (error) {
    logger.warn(`Message edit failed`, {
      messageId: sanitizedId,
      userId,
      error: error.message,
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
  const { id } = req.params;
  const { type } = req.body;
  const userId = req.user.id;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  // Comprehensive input validation
  if (!id) {
    throw new ApiError(400, "Message ID is required");
  }

  if (typeof id !== "string") {
    throw new ApiError(400, "Message ID must be a string");
  }

  if (id.trim() === "") {
    throw new ApiError(400, "Message ID cannot be empty");
  }

  if (!type) {
    throw new ApiError(400, "Reaction type is required");
  }

  if (typeof type !== "string") {
    throw new ApiError(400, "Reaction type must be a string");
  }

  if (type.trim() === "") {
    throw new ApiError(400, "Reaction type cannot be empty");
  }

  // Validate reaction type
  const validTypes = ["LIKE", "DISLIKE"];
  const normalizedType = type.trim().toUpperCase();
  if (!validTypes.includes(normalizedType)) {
    throw new ApiError(
      400,
      `Invalid reaction type. Must be one of: ${validTypes.join(", ")}`
    );
  }

  // Sanitize inputs
  const sanitizedId = id.trim();

  try {
    const result = await personaService.toggleReaction(
      sanitizedId,
      userId,
      normalizedType
    );

    logger.info(`Message reaction ${result.action} successfully`, {
      messageId: sanitizedId,
      userId,
      reactionType: normalizedType,
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
    logger.warn(`Message reaction toggle failed`, {
      messageId: sanitizedId,
      userId,
      reactionType: normalizedType,
      error: error.message,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

module.exports = {
  editMessage,
  toggleReaction,
};
