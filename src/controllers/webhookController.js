/**
 * WebhookController - Handles webhook endpoints for external integrations
 * Processes incoming webhook requests from n8n and other services
 */

const webhookService = require("../services/webhookService");
const apiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

/**
 * Extract client information from request for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Client information
 */
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.get("User-Agent") || null,
  traceId: req.headers["x-trace-id"] || null,
  requestId: req.headers["x-request-id"] || null,
});

/**
 * Process webhook for persona traits update
 * POST /api/webhooks/traits
 */
const processTraitsWebhook = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);
  const userId = req.user.id;

  try {
    logger.info("Webhook traits update requested", {
      userId,
      ipAddress,
      userAgent,
      traceId,
      payloadSize: JSON.stringify(req.body).length,
    });

    // Process the webhook
    const result = await webhookService.processWebhook(req.body, userId);

    logger.info("Webhook traits update processed successfully", {
      userId,
      personaName: req.body.personaName,
      ipAddress,
      userAgent,
      traceId,
    });

    // Return success response
    res.status(200).json(
      apiResponse({
        data: result,
        message: "Webhook processed successfully",
      })
    );
  } catch (error) {
    logger.error("Webhook traits update failed", {
      userId,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });

    // Return appropriate error response
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal server error";

    res.status(statusCode).json(
      apiResponse({
        error: message,
        status: "error",
      })
    );
  }
});

/**
 * Health check for webhook endpoint
 * GET /api/webhooks/health
 */
const getWebhookHealth = asyncHandler(async (req, res) => {
  res.status(200).json(
    apiResponse({
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "webhook-service",
      },
      message: "Webhook service is healthy",
    })
  );
});

module.exports = {
  processTraitsWebhook,
  getWebhookHealth,
  // New handler to forward payload to n8n and then persist returned traits
  forwardTraitsToN8n: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const result = await webhookService.forwardTraitsToN8n(req.body, userId);
    return res.status(200).json(
      apiResponse({
        data: { success: true, persona: result },
        message: "Traits forwarded to n8n and updated successfully",
      })
    );
  }),
};
