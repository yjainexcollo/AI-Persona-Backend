/**
 * AuthService - Enhanced authentication and user management
 * Includes account lifecycle, security hardening, and audit logging
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const logger = require("../utils/logger");
const ApiError = require("../utils/apiError");
const config = require("../config");
const emailService = require("./emailService");
const breachCheckService = require("./breachCheckService");
const jwtUtils = require("../utils/jwt");

const prisma = new PrismaClient();

// Password strength validation using zxcvbn-like logic
function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  let score = 0;
  if (password.length >= minLength) score++;
  if (hasUpperCase) score++;
  if (hasLowerCase) score++;
  if (hasNumbers) score++;
  if (hasSpecialChar) score++;

  // Additional complexity checks
  if (password.length >= 12) score++;
  if (/(.)\1{2,}/.test(password)) score--; // Deduct for repeated characters
  if (/^(.)\1+$/.test(password)) score -= 2; // Deduct for all same characters

  return {
    isValid: score >= 3,
    score: score,
    feedback:
      score < 3
        ? "Password too weak. Include uppercase, lowercase, numbers, and special characters."
        : null,
  };
}

// Check if account is locked
function isAccountLocked(user) {
  if (!user.lockedUntil) return false;
  return new Date() < user.lockedUntil;
}

// Lock account after failed attempts
async function lockAccount(userId, lockoutMinutes = 15) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const newFailedCount = (user.failedLoginCount || 0) + 1;

  if (newFailedCount >= 5) {
    // Lock account after 5 failed attempts
    const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil,
        failedLoginCount: newFailedCount,
      },
    });
    logger.warn(
      `Account locked for user ${userId} until ${lockedUntil} after ${newFailedCount} failed attempts`
    );
  } else {
    // Just increment failed count without locking
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: newFailedCount },
    });
    logger.warn(`Failed login attempt ${newFailedCount}/5 for user ${userId}`);
  }
}

// Unlock account
async function unlockAccount(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lockedUntil: null,
      failedLoginCount: 0,
    },
  });

  logger.info(`Account unlocked for user ${userId}`);
}

// Create audit event
async function createAuditEvent(
  userId,
  eventType,
  eventData = null,
  ipAddress = null,
  userAgent = null,
  traceId = null
) {
  try {
    // Only create audit event if userId is provided
    if (userId) {
      await prisma.auditEvent.create({
        data: {
          userId,
          eventType,
          eventData: eventData ? JSON.stringify(eventData) : null,
          ipAddress,
          userAgent,
          traceId,
        },
      });
    }
  } catch (error) {
    logger.error(`Failed to create audit event: ${error.message}`);
  }
}

// Get or create default workspace
async function getOrCreateDefaultWorkspace(email) {
  const domain = email.split("@")[1];

  let workspace = await prisma.workspace.findUnique({
    where: { domain },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: `${domain} Workspace`,
        domain,
      },
    });
    logger.info(`Created new workspace: ${workspace.id} for domain: ${domain}`);
  }

  return workspace;
}

// Enhanced registration with account lifecycle
async function register(
  { email, password, name },
  ipAddress = null,
  userAgent = null,
  traceId = null
) {
  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    throw new ApiError(400, passwordValidation.feedback);
  }

  // Check password against breached database
  const breachCheck = await breachCheckService.validatePasswordWithBreachCheck(
    password
  );
  if (!breachCheck.isValid) {
    throw new ApiError(400, breachCheck.reason);
  }

  // Store breach warning info for response
  // Provide an informational warning when breach check indicates non-safe severity
  const breachWarning =
    breachCheck &&
    breachCheck.isValid &&
    breachCheck.severity &&
    breachCheck.severity !== "safe"
      ? {
          message: breachCheck.reason,
          severity: breachCheck.severity,
          count: breachCheck.count,
        }
      : null;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { workspace: true },
  });

  if (existingUser) {
    if (existingUser.status === "PENDING_DELETION") {
      // Reactivate account
      const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
      const workspace = await getOrCreateDefaultWorkspace(email);

      const user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          passwordHash,
          status: "PENDING_VERIFY",
          emailVerified: false,
          verifiedAt: null,
          failedLoginCount: 0,
          lockedUntil: null,
          workspaceId: workspace.id,
          role: "MEMBER", // Reactivated users start as members
        },
        include: { workspace: true },
      });

      // Send verification email
      const token = await emailService.createEmailVerification(user.id);
      await emailService.sendVerificationEmail(user, token);

      // Audit event
      await createAuditEvent(
        user.id,
        "REACTIVATE_ACCOUNT",
        { email },
        ipAddress,
        userAgent,
        traceId
      );

      return {
        user,
        workspace: user.workspace,
        isNewUser: false,
        breachWarning,
      };
    } else if (existingUser.status === "DEACTIVATED") {
      throw new ApiError(
        409,
        "Account is deactivated. Contact support to reactivate."
      );
    } else {
      throw new ApiError(409, "Email already registered");
    }
  }

  // Create new user
  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
  const workspace = await getOrCreateDefaultWorkspace(email);

  // Check if this is the first user in workspace (make them ADMIN)
  const workspaceUserCount = await prisma.user.count({
    where: { workspaceId: workspace.id },
  });

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      status: "PENDING_VERIFY",
      role: workspaceUserCount === 0 ? "ADMIN" : "MEMBER",
      workspaceId: workspace.id,
    },
    include: { workspace: true },
  });

  // Send verification email
  const token = await emailService.createEmailVerification(user.id);
  await emailService.sendVerificationEmail(user, token);

  // Audit event
  await createAuditEvent(
    user.id,
    "REGISTER",
    { email },
    ipAddress,
    userAgent,
    traceId
  );

  logger.info(`New user registered: ${user.id} (${email})`);
  return {
    user,
    workspace: user.workspace,
    isNewUser: true,
    breachWarning,
  };
}

// Enhanced login with security features
async function login(
  { email, password },
  ipAddress = null,
  userAgent = null,
  traceId = null
) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { workspace: true },
  });

  if (!user) {
    await createAuditEvent(
      null,
      "LOGIN_FAILED",
      { email, reason: "User not found" },
      ipAddress,
      userAgent,
      traceId
    );
    throw new ApiError(401, "Invalid email or password");
  }

  // Check account status
  if (user.status === "PENDING_VERIFY") {
    await createAuditEvent(
      user.id,
      "LOGIN_FAILED",
      { reason: "Email not verified" },
      ipAddress,
      userAgent,
      traceId
    );
    throw new ApiError(403, "Please verify your email before logging in");
  }

  if (user.status === "DEACTIVATED") {
    await createAuditEvent(
      user.id,
      "LOGIN_FAILED",
      { reason: "Account deactivated" },
      ipAddress,
      userAgent,
      traceId
    );
    throw new ApiError(403, "Account is deactivated");
  }

  if (user.status === "PENDING_DELETION") {
    await createAuditEvent(
      user.id,
      "LOGIN_FAILED",
      { reason: "Account pending deletion" },
      ipAddress,
      userAgent,
      traceId
    );
    throw new ApiError(403, "Account is pending deletion");
  }

  // Check if account is locked
  if (isAccountLocked(user)) {
    const lockoutEnd = user.lockedUntil;
    const now = new Date();
    const remainingMinutes = Math.ceil((lockoutEnd - now) / (1000 * 60));

    await createAuditEvent(
      user.id,
      "LOGIN_FAILED",
      { reason: "Account locked", remainingMinutes },
      ipAddress,
      userAgent,
      traceId
    );
    throw new ApiError(
      423,
      `Account is temporarily locked due to too many failed attempts. Please try again in ${remainingMinutes} minutes.`
    );
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const currentFailedCount = user.failedLoginCount || 0;
    const remainingAttempts = 5 - currentFailedCount - 1;

    await lockAccount(user.id);
    await createAuditEvent(
      user.id,
      "LOGIN_FAILED",
      { reason: "Invalid password", failedAttempts: currentFailedCount + 1 },
      ipAddress,
      userAgent,
      traceId
    );

    if (remainingAttempts <= 0) {
      throw new ApiError(
        423,
        "Account is temporarily locked due to too many failed attempts. Please try again in 15 minutes."
      );
    } else {
      throw new ApiError(
        401,
        `Invalid email or password. ${remainingAttempts} attempts remaining before account lockout.`
      );
    }
  }

  // Reset failed login count and unlock account
  await unlockAccount(user.id);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const accessToken = await jwtUtils.signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    workspaceId: user.workspaceId,
  });

  const refreshToken = crypto.randomBytes(32).toString("hex");
  const deviceId = crypto.randomBytes(16).toString("hex");

  // Create session
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      userAgent,
      ipAddress,
      deviceId,
    },
  });

  // Audit event
  await createAuditEvent(
    user.id,
    "LOGIN_SUCCESS",
    { deviceId },
    ipAddress,
    userAgent,
    traceId
  );

  logger.info(`User logged in: ${user.id} (${email})`);
  return {
    user,
    workspaceId: user.workspaceId,
    workspaceName: user.workspace.name,
    accessToken,
    refreshToken,
  };
}

// Enhanced token refresh with rotation
async function refreshTokens(
  { refreshToken },
  ipAddress = null,
  userAgent = null,
  traceId = null
) {
  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { user: true },
  });

  if (!session || !session.isActive || session.expiresAt < new Date()) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // Check user status
  if (session.user.status !== "ACTIVE") {
    await prisma.session.update({
      where: { id: session.id },
      data: { isActive: false },
    });
    throw new ApiError(401, "Account is not active");
  }

  // Generate new tokens
  const newAccessToken = await jwtUtils.signToken({
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    workspaceId: session.user.workspaceId,
  });

  const newRefreshToken = crypto.randomBytes(32).toString("hex");

  // Revoke old session and create new one
  await prisma.session.update({
    where: { id: session.id },
    data: { isActive: false },
  });

  await prisma.session.create({
    data: {
      userId: session.user.id,
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent,
      ipAddress,
      deviceId: session.deviceId,
    },
  });

  // Audit event
  await createAuditEvent(
    session.user.id,
    "REFRESH_TOKEN",
    { deviceId: session.deviceId },
    ipAddress,
    userAgent,
    traceId
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

// Enhanced logout
async function logout(
  { token },
  ipAddress = null,
  userAgent = null,
  traceId = null
) {
  try {
    // Verify the access token to get user information
    const payload = jwtUtils.verifyToken(token);
    const userId = payload.userId;

    // Find and revoke the current session for this user
    const session = await prisma.session.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: "desc" },
    });

    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });

      await createAuditEvent(
        userId,
        "LOGOUT",
        { deviceId: session.deviceId },
        ipAddress,
        userAgent,
        traceId
      );
      logger.info(`User logged out: ${userId}`);
    }

    return {
      status: "success",
      message: "Logout successful",
    };
  } catch (error) {
    // If token verification fails, still return success to prevent token enumeration
    logger.warn(`Logout with invalid token: ${error.message}`);
    return {
      status: "success",
      message: "Logout successful",
    };
  }
}

// Get user sessions
async function getUserSessions(userId) {
  return await prisma.session.findMany({
    where: { userId, isActive: true },
    orderBy: { lastUsedAt: "desc" },
  });
}

// Revoke specific session
async function revokeSession(
  userId,
  sessionId,
  ipAddress = null,
  userAgent = null,
  traceId = null
) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { isActive: false },
  });

  await createAuditEvent(
    userId,
    "SESSION_REVOKED",
    { sessionId },
    ipAddress,
    userAgent,
    traceId
  );

  return { success: true };
}

// Enhanced email verification
async function verifyEmail(
  token,
  ipAddress = null,
  userAgent = null,
  traceId = null
) {
  const record = await prisma.emailVerification.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  // Update user status
  await prisma.user.update({
    where: { id: record.userId },
    data: {
      emailVerified: true,
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
  });

  // Delete verification token
  await prisma.emailVerification.delete({ where: { token } });

  // Audit event
  await createAuditEvent(
    record.userId,
    "VERIFY_EMAIL",
    null,
    ipAddress,
    userAgent,
    traceId
  );

  logger.info(`User verified email: ${record.userId}`);
  return record.user;
}

// Enhanced password reset request
async function requestPasswordReset(
  { email },
  ipAddress = null,
  userAgent = null,
  traceId = null
) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = await emailService.createPasswordResetToken(user.id);
    await emailService.sendPasswordResetEmail(user, token);

    await createAuditEvent(
      user.id,
      "REQUEST_PASSWORD_RESET",
      null,
      ipAddress,
      userAgent,
      traceId
    );
  }

  // Always return success to prevent email enumeration
  return {
    status: "success",
    message:
      "If an account with that email exists, a password reset link has been sent.",
  };
}

// Enhanced password reset
async function resetPassword(
  { token, newPassword },
  ipAddress = null,
  userAgent = null,
  traceId = null
) {
  // Validate password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    throw new ApiError(400, passwordValidation.feedback);
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date() || record.used) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const passwordHash = await bcrypt.hash(newPassword, config.bcryptSaltRounds);

  // Update password and mark token as used
  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { used: true, usedAt: new Date() },
  });

  // Revoke all existing sessions
  await prisma.session.updateMany({
    where: { userId: record.userId },
    data: { isActive: false },
  });

  await createAuditEvent(
    record.userId,
    "RESET_PASSWORD",
    null,
    ipAddress,
    userAgent,
    traceId
  );

  logger.info(`Password reset for user: ${record.userId}`);
  return { success: true };
}

// Deactivate account
async function deactivateAccount(
  userId,
  ipAddress = null,
  userAgent = null,
  traceId = null
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "DEACTIVATED" },
  });

  // Revoke all sessions
  await prisma.session.updateMany({
    where: { userId },
    data: { isActive: false },
  });

  await createAuditEvent(
    userId,
    "DEACTIVATE_ACCOUNT",
    null,
    ipAddress,
    userAgent,
    traceId
  );

  logger.info(`Account deactivated: ${userId}`);
  return { success: true };
}

// Request account deletion (GDPR)
async function requestAccountDeletion(
  userId,
  ipAddress = null,
  userAgent = null,
  traceId = null
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "PENDING_DELETION" },
  });

  // Revoke all sessions
  await prisma.session.updateMany({
    where: { userId },
    data: { isActive: false },
  });

  await createAuditEvent(
    userId,
    "REQUEST_ACCOUNT_DELETION",
    { reason: "GDPR deletion request" },
    ipAddress,
    userAgent,
    traceId
  );

  logger.info(`Account deletion requested: ${userId}`);
  return { success: true };
}

// Cleanup functions for cron jobs
async function cleanupUnverifiedUsers(daysOld = 7) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const result = await prisma.user.deleteMany({
    where: {
      status: "PENDING_VERIFY",
      createdAt: { lt: cutoffDate },
    },
  });

  logger.info(
    `Cleaned up ${result.count} unverified users older than ${daysOld} days`
  );
  return result.count;
}

async function cleanupPendingDeletionUsers(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const result = await prisma.user.deleteMany({
    where: {
      status: "PENDING_DELETION",
      createdAt: { lt: cutoffDate },
    },
  });

  logger.info(
    `Cleaned up ${result.count} pending deletion users older than ${daysOld} days`
  );
  return result.count;
}

async function cleanupExpiredSessions() {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  logger.info(`Cleaned up ${result.count} expired sessions`);
  return result.count;
}

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  getUserSessions,
  revokeSession,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  deactivateAccount,
  requestAccountDeletion,
  cleanupUnverifiedUsers,
  cleanupPendingDeletionUsers,
  cleanupExpiredSessions,
  validatePasswordStrength,
  createAuditEvent,
};
