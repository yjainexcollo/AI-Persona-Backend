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

// Generate and store a verification token
async function createEmailVerification(userId, expiresInMinutes = 60) {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await prisma.emailVerification.deleteMany({ where: { userId } });
  await prisma.emailVerification.create({
    data: { userId, token, expiresAt },
  });
  logger.debug(`Created verification token for user ${userId}`);
  return token;
}

// Send verification email
async function sendVerificationEmail(user, token) {
  const verifyUrl = `${config.appBaseUrl}/api/auth/verify-email?token=${token}`;
  const mailOptions = {
    from: config.smtpFrom,
    to: user.email,
    subject: "Verify your email address",
    html: `<p>Hello ${user.name || ""},</p>
           <p>Please verify your email by clicking the link below:</p>
           <a href="${verifyUrl}">${verifyUrl}</a>
           <p>This link will expire in 60 minutes.</p>`,
  };
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Sent verification email to ${user.email}`);
  } catch (err) {
    logger.error(
      `Failed to send verification email to ${user.email}: ${err.message}`
    );
    throw new ApiError(500, "Failed to send verification email");
  }
}

// Verify the token and mark user as verified
async function verifyEmailToken(token) {
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
    data: { emailVerified: true },
  });
  await prisma.emailVerification.delete({ where: { token } });
  logger.info(`User ${record.userId} verified their email`);
  return record.user;
}

// Resend verification email
async function resendVerificationEmail(user) {
  if (user.emailVerified) throw new ApiError(400, "Email already verified");
  const token = await createEmailVerification(user.id);
  await sendVerificationEmail(user, token);
}

// Cleanup expired tokens (can be run as a scheduled job)
async function cleanupExpiredVerifications() {
  const result = await prisma.emailVerification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  logger.info(`Cleaned up ${result.count} expired email verification tokens`);
}

// Send password reset email
async function sendPasswordResetEmail(user, token) {
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
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Sent password reset email to ${user.email}`);
  } catch (err) {
    logger.error(
      `Failed to send password reset email to ${user.email}: ${err.message}`
    );
    throw new ApiError(500, "Failed to send password reset email");
  }
}

// Send workspace invite email
async function sendInviteEmail(email, token, workspaceId) {
  const inviteUrl = `${config.appBaseUrl}/accept-invite?token=${token}`;
  const mailOptions = {
    from: config.smtpFrom,
    to: email,
    subject: "You're invited to join a workspace on AI-Persona!",
    html: `<p>Hello,</p>
           <p>You have been invited to join a workspace on AI-Persona.</p>
           <p>Click the link below to accept the invite and join the workspace:</p>
           <a href="${inviteUrl}">${inviteUrl}</a>
           <p>This link will expire in 48 hours. If you did not expect this invite, you can ignore this email.</p>`,
  };
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Sent workspace invite email to ${email}`);
  } catch (err) {
    logger.error(
      `Failed to send workspace invite email to ${email}: ${err.message}`
    );
    throw new ApiError(500, "Failed to send workspace invite email");
  }
}

module.exports = {
  createEmailVerification,
  sendVerificationEmail,
  verifyEmailToken,
  resendVerificationEmail,
  cleanupExpiredVerifications,
  sendPasswordResetEmail,
  sendInviteEmail,
};
