const passwordResetService = require("../services/passwordResetService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
const validateEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const trimmedEmail = email.trim();
  if (trimmedEmail === "") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmedEmail);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} Whether password meets requirements
 */
const validatePassword = (password) => {
  if (!password || typeof password !== "string") return false;
  if (password.length < 6) return false; // Reduced from 8 to 6 for better UX
  if (password.length > 128) return false;
  // Must contain at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
};

/**
 * Extract client information from request for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Client information
 */
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.get("User-Agent") || null,
  traceId: req.headers["x-trace-id"] || null,
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { email } = req.body;

    // Validate email presence and format
    if (!email) {
      logger.warn("Password reset request failed: missing email", {
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Email is required");
    }

    if (!validateEmail(email)) {
      logger.warn("Password reset request failed: invalid email format", {
        email:
          typeof email === "string" && email.length > 0
            ? email.substring(0, 3) + "***"
            : "invalid",
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid email format");
    }

    const trimmedEmail = email.trim().toLowerCase();

    logger.info("Password reset request initiated", {
      email: trimmedEmail.substring(0, 3) + "***",
      ipAddress,
      userAgent,
      traceId,
    });

    await passwordResetService.requestPasswordReset(trimmedEmail);

    logger.info("Password reset request processed successfully", {
      email: trimmedEmail.substring(0, 3) + "***",
      ipAddress,
      userAgent,
      traceId,
    });

    // Always return success for security (do not reveal if user exists)
    res.status(200).json({
      status: "success",
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    // Log the error for debugging
    logger.error("Password reset request error", {
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });

    // Re-throw the error to be handled by asyncHandler
    throw error;
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const { token, newPassword } = req.body;

    // Validate required fields
    if (!token || !newPassword) {
      logger.warn("Password reset failed: missing required fields", {
        hasToken: !!token,
        hasPassword: !!newPassword,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Token and new password are required");
    }

    // Validate token format (basic validation)
    if (typeof token !== "string" || token.trim().length === 0) {
      logger.warn("Password reset failed: invalid token format", {
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid token format");
    }

    // Validate password strength
    if (!validatePassword(newPassword)) {
      logger.warn(
        "Password reset failed: password does not meet requirements",
        {
          passwordLength: newPassword ? newPassword.length : 0,
          ipAddress,
          userAgent,
          traceId,
        }
      );
      throw new ApiError(
        400,
        "Password must be at least 6 characters long and contain both letters and numbers"
      );
    }

    const trimmedToken = token.trim();

    logger.info("Password reset initiated", {
      tokenPrefix: trimmedToken.substring(0, 8) + "***",
      passwordLength: newPassword.length,
      ipAddress,
      userAgent,
      traceId,
    });

    await passwordResetService.resetPassword(trimmedToken, newPassword);

    logger.info("Password reset completed successfully", {
      tokenPrefix: trimmedToken.substring(0, 8) + "***",
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    // Log the error for debugging
    logger.error("Password reset error", {
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });

    // Re-throw the error to be handled by asyncHandler
    throw error;
  }
});

module.exports = {
  requestPasswordReset,
  resetPassword,
  validateEmail,
  validatePassword,
  getClientInfo,
};
