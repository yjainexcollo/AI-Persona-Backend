const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { generateToken } = require("../utils/token");
const emailService = require("./emailService");
const { hashPassword } = require("../utils/password");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

// Request a password reset: generate token, store, and send email
async function requestPasswordReset(email) {
  try {
    // Validate required parameter
    if (!email || typeof email !== "string") {
      throw new ApiError(400, "Valid email is required");
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApiError(400, "Invalid email format");
    }

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      // For security, do not reveal if user exists - return success
      return {
        success: true,
        message: "If the email exists, a reset link has been sent",
      };
    }

    // Check if user account is active
    if (user.status !== "ACTIVE") {
      logger.warn(`Password reset requested for inactive user: ${user.id}`);
      // Don't reveal account status for security
      return {
        success: true,
        message: "If the email exists, a reset link has been sent",
      };
    }

    // Invalidate old tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Generate new token
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    logger.info(`Password reset token created for user ${user.id}`);

    // Send email
    await emailService.sendPasswordResetEmail(user, token);

    return {
      success: true,
      message: "If the email exists, a reset link has been sent",
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error(`Error in requestPasswordReset: ${error.message}`);
    throw new ApiError(500, "Failed to process password reset request");
  }
}

// Validate a password reset token
async function validateResetToken(token) {
  try {
    // Validate required parameter
    if (!token || typeof token !== "string") {
      throw new ApiError(400, "Valid token is required");
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.expiresAt < new Date() || record.used) {
      logger.warn(`Invalid or expired password reset token: ${token}`);
      throw new ApiError(400, "Invalid or expired password reset token");
    }

    return record;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error(`Error in validateResetToken: ${error.message}`);
    throw new ApiError(500, "Failed to validate reset token");
  }
}

// Reset the user's password
async function resetPassword(token, newPassword) {
  try {
    // Validate required parameters
    if (!newPassword || typeof newPassword !== "string") {
      throw new ApiError(400, "Valid new password is required");
    }

    // Basic password strength validation
    if (newPassword.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters long");
    }

    const record = await validateResetToken(token);

    const user = await prisma.user.findUnique({
      where: { id: record.userId },
    });

    if (!user) {
      logger.error(`User not found for reset token: ${record.userId}`);
      throw new ApiError(404, "User not found");
    }

    // Check if user account is still active
    if (user.status !== "ACTIVE") {
      logger.warn(`Password reset attempted for inactive user: ${user.id}`);
      throw new ApiError(403, "User account is not active");
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Hash the new password
      const passwordHash = await hashPassword(newPassword);

      // Update user password
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Mark token as used
      await tx.passwordResetToken.update({
        where: { token },
        data: { used: true, usedAt: new Date() },
      });
    });

    logger.info(`Password reset completed for user ${user.id}`);
    return { success: true, message: "Password has been reset successfully" };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error(`Error in resetPassword: ${error.message}`);
    throw new ApiError(500, "Failed to reset password");
  }
}

// Cleanup expired password reset tokens
async function cleanupExpiredTokens() {
  try {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired password reset tokens`);
    }

    return result.count;
  } catch (error) {
    logger.error(`Error cleaning up expired tokens: ${error.message}`);
    throw new ApiError(500, "Failed to cleanup expired tokens");
  }
}

module.exports = {
  requestPasswordReset,
  validateResetToken,
  resetPassword,
  cleanupExpiredTokens,
};
