/**
 * WebhookRoutes - Webhook endpoints for external integrations
 * Includes authentication, admin role checks, signature verification, and comprehensive logging
 */

const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const { verifyWebhookSignature } = require("../middlewares/webhookSignatureMiddleware");
const { webhookLimiter } = require("../middlewares/rateLimiter");
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
// Middleware order: rate limit → signature → auth → validation → handler
router.post(
  "/traits",
  webhookLimiter,              // 1. Rate limit first (cheap protection)
  verifyWebhookSignature,      // 2. Verify signature (block forged traffic)
  adminOnly,                   // 3. Authenticate and authorize
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
  validateWebhookTraits,       // 4. Validate payload structure
  webhookController.processTraitsWebhook  // 5. Process request
);

// POST /api/webhooks/traits/forward - Forward payload to n8n, then update DB from its response
// Middleware order: rate limit → signature → auth → validation → handler
router.post(
  "/traits/forward",
  webhookLimiter,              // 1. Rate limit first
  verifyWebhookSignature,      // 2. Verify signature
  adminOnly,                   // 3. Authenticate and authorize
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
  validateWebhookTraits,       // 4. Validate payload structure
  webhookController.forwardTraitsToN8n  // 5. Process request
);

module.exports = router;
