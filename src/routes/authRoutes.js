/**
 * AuthRoutes - Enhanced authentication routes
 * Includes account lifecycle, security features, and audit logging
 */

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const oauthController = require("../controllers/oauthController");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  validateRegistration,
  validateLogin,
  validateTokenRefresh,
  validateEmailVerification,
  validateResendVerification,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateSessionRevocation,
} = require("../middlewares/validationMiddleware");
// Import all rate limiters from centralized rateLimiter.js
const {
  resendVerificationLimiter,
  registerLimiter,
  loginLimiter,
  passwordResetLimiter,
} = require("../middlewares/rateLimiter");

// Public routes (no authentication required)
router.post(
  "/register",
  registerLimiter,
  validateRegistration,
  authController.register
);
router.post("/login", loginLimiter, validateLogin, authController.login);
router.post("/refresh", validateTokenRefresh, authController.refreshTokens);

// Email verification routes
router.get(
  "/verify-email",
  validateEmailVerification,
  authController.verifyEmail
);
router.post(
  "/resend-verification",
  resendVerificationLimiter, // Using centralized sliding window limiter from rateLimiter.js
  validateResendVerification,
  authController.resendVerification
);

// Password reset routes
router.post(
  "/request-password-reset",
  passwordResetLimiter,
  validatePasswordResetRequest,
  authController.requestPasswordReset
);
router.post(
  "/reset-password",
  validatePasswordReset,
  authController.resetPassword
);

// Health check
router.get("/health", authController.healthCheck);

// JWKS endpoint (public)
router.get("/.well-known/jwks.json", authController.getJWKS);

// Protected routes (authentication required)
const authenticatedOnly = [authMiddleware];

// Session management
router.get("/sessions", ...authenticatedOnly, authController.getUserSessions);
router.delete(
  "/sessions/:sessionId",
  ...authenticatedOnly,
  validateSessionRevocation,
  authController.revokeSession
);

// Authentication management
router.post("/logout", ...authenticatedOnly, authController.logout);

// Account management
router.post(
  "/deactivate",
  ...authenticatedOnly,
  authController.deactivateAccount
);
router.post(
  "/delete-account",
  ...authenticatedOnly,
  authController.requestAccountDeletion
);

// Key rotation (admin only)
router.post("/rotate-keys", ...authenticatedOnly, authController.rotateKeys);

/**
 * POST /api/auth/service-token
 * Create service account and generate long-lived JWT for n8n integration
 * Requires: ADMIN role
 */
const roleMiddleware = require("../middlewares/roleMiddleware");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { signToken } = require("../utils/jwt");
const authService = require("../services/authService");
const logger = require("../utils/logger");

router.post(
  "/service-token",
  ...authenticatedOnly,
  roleMiddleware("ADMIN"),
  async (req, res, next) => {
    try {
      const { email, workspaceId, expiresIn = "365d" } = req.body;

      // Validate required fields
      if (!email || !workspaceId) {
        return res.status(400).json({
          status: "error",
          message: "Email and workspaceId are required"
        });
      }

      // Validate workspace exists and is active
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId }
      });

      if (!workspace) {
        return res.status(404).json({
          status: "error",
          message: "Workspace not found"
        });
      }

      if (!workspace.isActive) {
        return res.status(403).json({
          status: "error",
          message: "Workspace is not active"
        });
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          status: "error",
          message: "User with this email already exists"
        });
      }

      // Create service account
      const serviceAccount = await prisma.user.create({
        data: {
          email,
          name: "n8n Service Account",
          workspaceId,
          role: "ADMIN",
          status: "ACTIVE",
          emailVerified: true,
          passwordHash: null
        }
      });

      // Generate long-lived JWT
      const token = await signToken(
        { userId: serviceAccount.id },
        { expiresIn }
      );

      // Create audit event
      await authService.createAuditEvent(
        req.user.id,
        "SERVICE_ACCOUNT_CREATED",
        {
          serviceAccountId: serviceAccount.id,
          workspaceId,
          email,
          expiresIn,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get("User-Agent")
        }
      );

      logger.info("Service account created", {
        serviceAccountId: serviceAccount.id,
        workspaceId,
        createdBy: req.user.id
      });

      res.status(201).json({
        status: "success",
        data: {
          token,
          userId: serviceAccount.id,
          expiresIn
        },
        message: "Service account created successfully"
      });
    } catch (error) {
      logger.error("Service account creation failed", {
        error: error.message,
        userId: req.user?.id
      });
      next(error);
    }
  }
);

// OAuth routes
router.get("/google", oauthController.googleAuth);
router.get("/google/callback", oauthController.googleCallback);

module.exports = router;
