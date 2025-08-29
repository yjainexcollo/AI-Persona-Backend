/**
 * WebhookRoutes - Webhook endpoints for external integrations
 * Includes authentication, admin role checks, and comprehensive logging
 */

const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const { personaLimiter } = require("../middlewares/rateLimiter");
const {
  validateWebhookTraits,
} = require("../middlewares/validationMiddleware");
const logger = require("../utils/logger");

// All webhook routes require authentication and ADMIN role
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")];

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

// GET /api/webhooks/health - Health check (no authentication required)
router.get(
  "/health",
  (req, res, next) => {
    try {
      const clientInfo = getClientInfo(req);
      logger.info("GET /api/webhooks/health accessed", { ...clientInfo });
      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in GET /api/webhooks/health logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  webhookController.getWebhookHealth
);

// POST /api/webhooks/traits - Process persona traits update webhook
router.post(
  "/traits",
  adminOnly,
  personaLimiter,
  (req, res, next) => {
    try {
      const { personaName } = req.body;
      const clientInfo = getClientInfo(req);

      logger.info("POST /api/webhooks/traits accessed", {
        personaName,
        payloadSize: JSON.stringify(req.body).length,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in POST /api/webhooks/traits logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateWebhookTraits,
  webhookController.processTraitsWebhook
);

// POST /api/webhooks/traits/forward - Forward payload to n8n, then update DB from its response
router.post(
  "/traits/forward",
  adminOnly,
  personaLimiter,
  (req, res, next) => {
    try {
      const { personaName } = req.body;
      const clientInfo = getClientInfo(req);
      logger.info("POST /api/webhooks/traits/forward accessed", {
        personaName,
        payloadSize: JSON.stringify(req.body).length,
        ...clientInfo,
      });
      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in POST /api/webhooks/traits/forward logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateWebhookTraits,
  webhookController.forwardTraitsToN8n
);

module.exports = router;
