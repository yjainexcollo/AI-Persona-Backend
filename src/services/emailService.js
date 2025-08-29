const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { generateToken } = require("../utils/token");
const nodemailer = require("nodemailer");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");
const config = require("../config");

// Configure Nodemailer (replace with your SMTP or provider)
const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: false,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

// Test email configuration
async function testEmailConfig() {
  try {
    logger.info(
      `Testing email configuration: ${config.smtpHost}:${config.smtpPort}`
    );
    logger.info(`SMTP User: ${config.smtpUser}`);
    logger.info(`SMTP From: ${config.smtpFrom}`);

    await transporter.verify();
    logger.info("Email configuration is valid");
    return true;
  } catch (error) {
    logger.error(`Email configuration error: ${error.message}`);
    return false;
  }
}

// Generate and store a verification token
async function createEmailVerification(userId, expiresInMinutes = 1440) {
  // 24 hours
  try {
    // Validate required parameter
    if (!userId) {
      throw new ApiError(400, "Missing required parameter: userId");
    }

    // Validate expiration time
    if (expiresInMinutes <= 0 || expiresInMinutes > 10080) {
      // Max 7 days
      throw new ApiError(
        400,
        "Expiration time must be between 1 minute and 7 days"
      );
    }

    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await prisma.emailVerification.deleteMany({ where: { userId } });
    await prisma.emailVerification.create({
      data: { userId, token, expiresAt },
    });

    logger.debug(`Created verification token for user ${userId}`);
    return token;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error(`Error creating email verification: ${error.message}`);
    throw new ApiError(500, "Failed to create email verification");
  }
}

// Send verification email
async function sendVerificationEmail(user, token) {
  try {
    // Validate required parameters
    if (!user || !user.email || !token) {
      throw new ApiError(
        400,
        "Missing required parameters: user, user.email, or token"
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      throw new ApiError(400, "Invalid email address");
    }

    const verifyUrl = `${config.appBaseUrl}/api/auth/verify-email?token=${token}`;
    const mailOptions = {
      from: config.smtpFrom,
      to: user.email,
      subject: "Verify your email address",
      html: `<p>Hello ${user.name || ""},</p>
             <p>Please verify your email by clicking the link below:</p>
             <a href="${verifyUrl}">${verifyUrl}</a>
             <p>This link will expire in 24 hours.</p>`,
    };

    logger.info(`Attempting to send verification email to ${user.email}`);
    logger.debug(`Email configuration: ${config.smtpHost}:${config.smtpPort}`);

    await transporter.sendMail(mailOptions);
    logger.info(`Successfully sent verification email to ${user.email}`);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error(
      `Failed to send verification email to ${user.email}: ${err.message}`
    );
    logger.error(`SMTP Error details: ${JSON.stringify(err)}`);
    throw new ApiError(500, "Failed to send verification email");
  }
}

// Verify the token and mark user as verified
async function verifyEmailToken(token) {
  try {
    // Validate required parameter
    if (!token) {
      throw new ApiError(400, "Missing required parameter: token");
    }

    const record = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      logger.warn(`Invalid or expired verification token: ${token}`);
      throw new ApiError(400, "Invalid or expired verification token");
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true, verifiedAt: new Date() },
    });

    await prisma.emailVerification.delete({ where: { token } });
    logger.info(`User ${record.userId} verified their email`);
    return record.user;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error(`Error verifying email token: ${error.message}`);
    throw new ApiError(500, "Failed to verify email token");
  }
}

// Resend verification email
async function resendVerificationEmail(user) {
  try {
    // Validate required parameter
    if (!user || !user.id) {
      throw new ApiError(400, "Missing required parameter: user or user.id");
    }

    if (user.emailVerified) {
      throw new ApiError(400, "Email already verified");
    }

    const token = await createEmailVerification(user.id);
    await sendVerificationEmail(user, token);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error(`Error resending verification email: ${error.message}`);
    throw new ApiError(500, "Failed to resend verification email");
  }
}

// Cleanup expired tokens (can be run as a scheduled job)
async function cleanupExpiredVerifications() {
  const result = await prisma.emailVerification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  logger.info(`Cleaned up ${result.count} expired email verification tokens`);
}

// Create password reset token
async function createPasswordResetToken(userId, expiresInMinutes = 60) {
  try {
    // Validate required parameter
    if (!userId) {
      throw new ApiError(400, "Missing required parameter: userId");
    }

    // Validate expiration time
    if (expiresInMinutes <= 0 || expiresInMinutes > 1440) {
      // Max 24 hours
      throw new ApiError(
        400,
        "Expiration time must be between 1 minute and 24 hours"
      );
    }

    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Delete any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId } });

    await prisma.passwordResetToken.create({
      data: { userId, token, expiresAt },
    });

    logger.debug(`Created password reset token for user ${userId}`);
    return token;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error(`Error creating password reset token: ${error.message}`);
    throw new ApiError(500, "Failed to create password reset token");
  }
}

// Send password reset email
async function sendPasswordResetEmail(user, token) {
  try {
    // Validate required parameters
    if (!user || !user.email || !token) {
      throw new ApiError(
        400,
        "Missing required parameters: user, user.email, or token"
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      throw new ApiError(400, "Invalid email address");
    }

    const resetUrl = `${config.appBaseUrl}/reset-password?token=${token}`;
    const mailOptions = {
      from: config.smtpFrom,
      to: user.email,
      subject: "Reset your AI-Persona account password",
      html: `<p>Hello ${user.name || ""},</p>
             <p>You requested a password reset. Click the link below to set a new password:</p>
             <a href="${resetUrl}">${resetUrl}</a>
             <p>This link will expire in 1 hour. If you did not request this, you can ignore this email.</p>`,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Sent password reset email to ${user.email}`);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error(
      `Failed to send password reset email to ${user.email}: ${err.message}`
    );
    throw new ApiError(500, "Failed to send password reset email");
  }
}

// Send workspace invite email
async function sendInviteEmail(email, token, workspaceId) {
  try {
    // Validate required parameters
    if (!email || !token) {
      throw new ApiError(400, "Missing required parameters: email or token");
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApiError(400, "Invalid email address");
    }

    // Use config for frontend URL instead of hardcoded localhost
    const frontendUrl = config.frontendUrl || "http://localhost:5173";
    const registerUrl = `${frontendUrl}/register?token=${token}`;

    const mailOptions = {
      from: config.smtpFrom,
      to: email,
      subject: "You're invited to join a workspace on AI-Persona!",
      html: `<p>Hello,</p>
             <p>You have been invited to join a workspace on AI-Persona.</p>
             <p>Click the link below to register and join the workspace:</p>
             <a href="${registerUrl}">${registerUrl}</a>
             <p>This link will expire in 48 hours. If you did not expect this invite, you can ignore this email.</p>`,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Sent workspace invite email to ${email}`);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error(
      `Failed to send workspace invite email to ${email}: ${err.message}`
    );
    throw new ApiError(500, "Failed to send workspace invite email");
  }
}

module.exports = {
  testEmailConfig,
  createEmailVerification,
  sendVerificationEmail,
  verifyEmailToken,
  resendVerificationEmail,
  cleanupExpiredVerifications,
  createPasswordResetToken,
  sendPasswordResetEmail,
  sendInviteEmail,
  // Test helper to access transporter in unit tests
  getTransporter: () => transporter,
};
