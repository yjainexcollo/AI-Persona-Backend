/**
 * ChatSessionRoutes - Enhanced chat session routes
 * Provides chat session management with validation, logging, and security
 */

const express = require("express");
const router = express.Router();
const chatSessionController = require("../controllers/chatSessionController");
const authMiddleware = require("../middlewares/authMiddleware");
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

// Helper function to validate session ID parameter
const validateSessionId = (sessionId) => {
  return !!(
    sessionId &&
    typeof sessionId === "string" &&
    sessionId.trim().length > 0
  );
};

// GET /api/chat-sessions - Get user's chat sessions
router.get(
  "/",
  authenticatedOnly,
  personaLimiter,
  (req, res, next) => {
    try {
      const clientInfo = getClientInfo(req);
      logger.info("GET /api/chat-sessions accessed", { ...clientInfo });

      // Validate query parameters
      const { limit, offset, status } = req.query;

      if (
        limit &&
        (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)
      ) {
        return res.status(400).json({
          success: false,
          message: "Limit must be a number between 1 and 100",
        });
      }

      if (offset && (isNaN(offset) || parseInt(offset) < 0)) {
        return res.status(400).json({
          success: false,
          message: "Offset must be a non-negative number",
        });
      }

      if (status && typeof status !== "string") {
        return res.status(400).json({
          success: false,
          message: "Status must be a string",
        });
      }

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in GET /api/chat-sessions validation", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  chatSessionController.getUserChatSessions
);

// GET /api/chat-sessions/:sessionId - Get specific chat session
router.get(
  "/:sessionId",
  authenticatedOnly,
  personaLimiter,
  (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const clientInfo = getClientInfo(req);

      logger.info("GET /api/chat-sessions/:sessionId accessed", {
        sessionId,
        ...clientInfo,
      });

      if (!validateSessionId(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required and must be a non-empty string",
        });
      }

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in GET /api/chat-sessions/:sessionId validation", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  chatSessionController.getChatSession
);

// DELETE /api/chat-sessions/:sessionId - Delete chat session
router.delete(
  "/:sessionId",
  authenticatedOnly,
  personaLimiter,
  (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const clientInfo = getClientInfo(req);

      logger.info("DELETE /api/chat-sessions/:sessionId accessed", {
        sessionId,
        ...clientInfo,
      });

      if (!validateSessionId(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required and must be a non-empty string",
        });
      }

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in DELETE /api/chat-sessions/:sessionId validation", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  chatSessionController.deleteChatSession
);

module.exports = router;
