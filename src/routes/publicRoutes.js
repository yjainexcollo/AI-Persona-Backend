/**
 * PublicRoutes - Public endpoints that don't require authentication
 * Includes shared conversation links and other public features
 *
 * Security Note: These routes are publicly accessible and should be monitored
 * for potential abuse and security threats. All access is logged for security analysis.
 */

const express = require("express");
const router = express.Router();
const personaController = require("../controllers/personaController");
const { validateSharedToken } = require("../middlewares/validationMiddleware");
const { publicLimiter } = require("../middlewares/rateLimiter");
const logger = require("../utils/logger");

// Helper function to get client information for logging
const getClientInfo = (req) => {
  return {
    ip:
      req.ip ||
      req.connection?.remoteAddress ||
      req.headers["x-forwarded-for"] ||
      "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
    traceId: req.headers["x-trace-id"] || "unknown",
    requestId: req.headers["x-request-id"] || "unknown",
    referer: req.headers["referer"] || "unknown",
    origin: req.headers["origin"] || "unknown",
  };
};

// GET /p/:token - Get shared conversation (public)
// This endpoint allows public access to shared conversations without authentication
// Rate limiting is applied to prevent abuse and potential security threats
router.get(
  "/:token",
  publicLimiter,
  (req, res, next) => {
    try {
      const { token } = req.params;
      const clientInfo = getClientInfo(req);

      logger.info("GET /p/:token accessed (public route)", {
        token: token ? `${token.substring(0, 8)}...` : "undefined", // Partially mask token for security
        tokenLength: token ? token.length : 0,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in GET /p/:token logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateSharedToken,
  (req, res, next) => {
    try {
      const { token } = req.params;
      const clientInfo = getClientInfo(req);

      logger.info("Shared token validation passed", {
        token: token ? `${token.substring(0, 8)}...` : "undefined",
        tokenLength: token ? token.length : 0,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in shared token validation logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  personaController.getSharedConversation
);

module.exports = router;
