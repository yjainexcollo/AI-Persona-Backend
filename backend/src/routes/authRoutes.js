const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const emailController = require("../controllers/emailController");
const oauthController = require("../controllers/oauthController");
const { resendVerificationLimiter } = require("../middlewares/rateLimiter");
const passwordResetController = require("../controllers/passwordResetController");
const authMiddleware = require("../middlewares/authMiddleware");

// Registration, login, refresh
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshTokens);

// Email verification endpoints
router.get("/verify-email", emailController.verifyEmail);
router.post(
  "/resend-verification",
  resendVerificationLimiter,
  emailController.resendVerification
);

// OAuth endpoints (Google)
router.get("/google", oauthController.googleAuth);
router.get("/google/callback", ...oauthController.googleCallback);

// Password reset endpoints
router.post(
  "/request-password-reset",
  passwordResetController.requestPasswordReset
);
router.post("/reset-password", passwordResetController.resetPassword);

module.exports = router;
