const emailService = require("../services/emailService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const apiResponse = require("../utils/apiResponse");
const logger = require("../utils/logger");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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

/**
 * Verify email using verification token
 * GET /api/auth/verify-email?token=...
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  // Comprehensive input validation
  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }

  if (typeof token !== "string") {
    throw new ApiError(400, "Verification token must be a string");
  }

  if (token.trim() === "") {
    throw new ApiError(400, "Verification token cannot be empty");
  }

  // Sanitize token
  const sanitizedToken = token.trim();

  try {
    const user = await emailService.verifyEmailToken(sanitizedToken);

    logger.info(`Email verified successfully for user: ${user.id}`, {
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        data: { user },
        message: "Email verified successfully",
      })
    );
  } catch (error) {
    logger.warn(`Email verification failed`, {
      token: sanitizedToken,
      error: error.message,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  // Comprehensive input validation
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  if (typeof email !== "string") {
    throw new ApiError(400, "Email must be a string");
  }

  if (email.trim() === "") {
    throw new ApiError(400, "Email cannot be empty");
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new ApiError(400, "Invalid email format");
  }

  // Sanitize email
  const sanitizedEmail = email.trim().toLowerCase();

  try {
    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: sanitizedEmail },
    });

    if (!user) {
      // Don't reveal whether user exists for security
      logger.warn(`Resend verification attempted for non-existent user`, {
        email: sanitizedEmail,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(404, "User not found");
    }

    if (user.emailVerified) {
      logger.info(`Resend verification attempted for already verified user`, {
        userId: user.id,
        email: sanitizedEmail,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Email already verified");
    }

    // Check user status
    if (user.status !== "PENDING_VERIFY") {
      throw new ApiError(400, "Account is not pending verification");
    }

    await emailService.resendVerificationEmail(user);

    logger.info(`Verification email resent successfully`, {
      userId: user.id,
      email: sanitizedEmail,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json(
      apiResponse({
        message: "Verification email resent successfully",
      })
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error(`Error resending verification email`, {
      email: sanitizedEmail,
      error: error.message,
      ipAddress,
      userAgent,
      traceId,
    });
    throw new ApiError(500, "Failed to resend verification email");
  }
});

module.exports = {
  verifyEmail,
  resendVerification,
};
