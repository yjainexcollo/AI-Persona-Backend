/**
 * PersonaRoutes - Enhanced persona management and chat functionality routes
 * Includes rate limiting, validation, authentication, and comprehensive logging
 */

const express = require("express");
const router = express.Router();
const personaController = require("../controllers/personaController");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  validatePersonaId,
  validateChatMessage,
  validateFavouriteToggle,
} = require("../middlewares/validationMiddleware");
const { chatLimiter, personaLimiter } = require("../middlewares/rateLimiter");
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

// GET /api/personas - List all personas
router.get(
  "/",
  authenticatedOnly,
  personaLimiter,
  (req, res, next) => {
    try {
      const clientInfo = getClientInfo(req);
      logger.info("GET /api/personas accessed", { ...clientInfo });
      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in GET /api/personas logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  personaController.getPersonas
);

// GET /api/personas/:id - Get persona details
router.get(
  "/:id",
  authenticatedOnly,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id } = req.params;
      const clientInfo = getClientInfo(req);

      logger.info("GET /api/personas/:id accessed", {
        personaId: id,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in GET /api/personas/:id logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validatePersonaId,
  personaController.getPersonaById
);

// POST /api/personas/:id/favourite - Toggle favourite
router.post(
  "/:id/favourite",
  authenticatedOnly,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id } = req.params;
      const clientInfo = getClientInfo(req);

      logger.info("POST /api/personas/:id/favourite accessed", {
        personaId: id,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in POST /api/personas/:id/favourite logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateFavouriteToggle,
  personaController.toggleFavourite
);

// POST /api/personas/:id/chat - Send message
router.post(
  "/:id/chat",
  authenticatedOnly,
  chatLimiter,
  (req, res, next) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const clientInfo = getClientInfo(req);

      logger.info("POST /api/personas/:id/chat accessed", {
        personaId: id,
        messageLength: message ? message.length : 0,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in POST /api/personas/:id/chat logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateChatMessage,
  personaController.sendMessage
);

module.exports = router;
