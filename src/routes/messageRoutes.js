/**
 * MessageRoutes - Enhanced message editing routes
 * Includes message editing, conversation branching, and comprehensive logging
 */

const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  validateMessageEdit,
  validateReaction,
} = require("../middlewares/validationMiddleware");
const { personaLimiter } = require("../middlewares/rateLimiter");
const logger = require("../utils/logger");

// All routes require authentication
const authenticatedOnly = [authMiddleware];

// Helper function to get client information for logging
const getClientInfo = (req) => {
  return {
    ip:
      req.ip ||
      req.connection?.remoteAddress ||
      req.headers["x-forwarded-for"] ||
      "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
    userId: req.user?.id || "unauthenticated",
    traceId: req.headers["x-trace-id"] || "unknown",
    requestId: req.headers["x-request-id"] || "unknown",
  };
};

// PATCH /api/messages/:id - Edit message
router.patch(
  "/:id",
  authenticatedOnly,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const clientInfo = getClientInfo(req);

      logger.info("PATCH /api/messages/:id accessed", {
        messageId: id,
        contentLength: content ? content.length : 0,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in PATCH /api/messages/:id logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateMessageEdit,
  messageController.editMessage
);

// POST /api/messages/:id/reactions - Toggle message reaction
router.post(
  "/:id/reactions",
  authenticatedOnly,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id } = req.params;
      const { type } = req.body;
      const clientInfo = getClientInfo(req);

      logger.info("POST /api/messages/:id/reactions accessed", {
        messageId: id,
        reactionType: type,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in POST /api/messages/:id/reactions logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateReaction,
  messageController.toggleReaction
);

module.exports = router;
