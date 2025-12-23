/**
 * Webhook Signature Verification Middleware
 * Verifies HMAC-SHA256 signatures on incoming webhook requests
 */

const crypto = require("crypto");
const logger = require("../utils/logger");
const authService = require("../services/authService");

/**
 * Verify webhook signature using HMAC-SHA256
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function verifyWebhookSignature(req, res, next) {
    const signature = req.headers["x-webhook-signature"];
    const isProduction = process.env.NODE_ENV === "production";

    // Extract client info for audit logging
    const clientInfo = {
        ipAddress: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.get("User-Agent") || null,
        route: req.originalUrl || req.url,
        traceId: req.headers["x-trace-id"] || null,
    };

    // In production, signature is mandatory
    if (isProduction && !signature) {
        logger.warn("Webhook signature missing in production", clientInfo);

        // Create audit event if user is authenticated
        if (req.user?.id) {
            try {
                await authService.createAuditEvent(
                    req.user.id,
                    "WEBHOOK_SIGNATURE_MISSING",
                    {
                        ...clientInfo,
                        personaName: req.body?.personaName || null,
                    }
                );
            } catch (auditError) {
                logger.error("Failed to create audit event:", auditError);
            }
        }

        return res.status(401).json({
            status: "error",
            error: "Missing webhook signature",
            message: "X-Webhook-Signature header is required",
        });
    }

    // In development, allow missing signature but log warning
    if (!isProduction && !signature) {
        logger.warn("Webhook signature missing in development (allowing)", clientInfo);
        return next();
    }

    // Verify signature if present
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
        logger.error("WEBHOOK_SECRET not configured but signature provided");
        return res.status(500).json({
            status: "error",
            error: "Server configuration error",
            message: "Webhook signature verification unavailable",
        });
    }

    // Ensure raw body is available
    if (!req.rawBody) {
        logger.error("Raw body not available for signature verification", clientInfo);
        return res.status(500).json({
            status: "error",
            error: "Server configuration error",
            message: "Cannot verify signature without raw body",
        });
    }

    try {
        // Compute expected signature
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(req.rawBody)
            .digest("hex");

        // Timing-safe comparison
        const signatureBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        // Check length first to avoid timingSafeEqual crash
        if (signatureBuffer.length !== expectedBuffer.length) {
            logger.warn("Webhook signature length mismatch", {
                ...clientInfo,
                receivedLength: signatureBuffer.length,
                expectedLength: expectedBuffer.length,
            });

            // Create audit event
            if (req.user?.id) {
                try {
                    await authService.createAuditEvent(
                        req.user.id,
                        "WEBHOOK_SIGNATURE_INVALID",
                        {
                            ...clientInfo,
                            personaName: req.body?.personaName || null,
                            reason: "length_mismatch",
                        }
                    );
                } catch (auditError) {
                    logger.error("Failed to create audit event:", auditError);
                }
            }

            return res.status(401).json({
                status: "error",
                error: "Invalid webhook signature",
                message: "Signature verification failed",
            });
        }

        // Timing-safe comparison
        const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

        if (!isValid) {
            logger.warn("Webhook signature verification failed", clientInfo);

            // Create audit event
            if (req.user?.id) {
                try {
                    await authService.createAuditEvent(
                        req.user.id,
                        "WEBHOOK_SIGNATURE_INVALID",
                        {
                            ...clientInfo,
                            personaName: req.body?.personaName || null,
                            reason: "signature_mismatch",
                        }
                    );
                } catch (auditError) {
                    logger.error("Failed to create audit event:", auditError);
                }
            }

            return res.status(401).json({
                status: "error",
                error: "Invalid webhook signature",
                message: "Signature verification failed",
            });
        }

        // Signature valid - proceed
        logger.debug("Webhook signature verified successfully", {
            route: clientInfo.route,
            userId: req.user?.id,
        });

        next();
    } catch (error) {
        logger.error("Error during signature verification:", error);
        return res.status(500).json({
            status: "error",
            error: "Signature verification error",
            message: "Failed to verify webhook signature",
        });
    }
}

module.exports = {
    verifyWebhookSignature,
};
