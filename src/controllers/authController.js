/**
 * AuthController - Enhanced authentication controller
 * Includes account lifecycle, security features, and audit logging
 */

const authService = require("../services/authService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const emailService = require("../services/emailService");
const crypto = require("crypto");
const jwtUtils = require("../utils/jwt");

// Generate trace ID for request tracking
function generateTraceId() {
  try {
    return crypto.randomBytes(16).toString("hex");
  } catch (error) {
    // Fallback for test environments where crypto might be mocked
    return "test-trace-id-" + Date.now();
  }
}

// Get client information from request
function getClientInfo(req) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    traceId: req.headers["x-trace-id"] || generateTraceId(),
  };
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  if (!email || typeof email !== "string" || email.trim() === "") {
    throw new ApiError(400, "Email is required");
  }

  if (!password || typeof password !== "string" || password.trim() === "") {
    throw new ApiError(400, "Password is required");
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new ApiError(400, "Invalid email format");
  }

  const result = await authService.register(
    { email, password, name },
    ipAddress,
    userAgent,
    traceId
  );

  res.status(201).json({
    status: "success",
    message: result.isNewUser
      ? "Registration successful. Verification email sent."
      : "Account reactivated. Verification email sent.",
    data: {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        status: result.user.status,
        role: result.user.role,
        workspaceId: result.user.workspaceId,
      },
      workspace: {
        id: result.workspace.id,
        domain: result.workspace.domain,
      },
    },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  if (!email || typeof email !== "string" || email.trim() === "") {
    throw new ApiError(400, "Email is required");
  }

  if (!password || typeof password !== "string" || password.trim() === "") {
    throw new ApiError(400, "Password is required");
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new ApiError(400, "Invalid email format");
  }

  const result = await authService.login(
    { email, password },
    ipAddress,
    userAgent,
    traceId
  );

  res.status(200).json({
    status: "success",
    message: "Login successful",
    data: {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        status: result.user.status,
        role: result.user.role,
        workspaceId: result.user.workspaceId,
      },
      workspaceId: result.workspaceId,
      workspaceName: result.workspaceName,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

// POST /api/auth/refresh
const refreshTokens = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  if (
    !refreshToken ||
    typeof refreshToken !== "string" ||
    refreshToken.trim() === ""
  ) {
    throw new ApiError(400, "Refresh token is required");
  }

  const result = await authService.refreshTokens(
    { refreshToken },
    ipAddress,
    userAgent,
    traceId
  );

  res.status(200).json({
    status: "success",
    message: "Tokens refreshed",
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  // Get the current session ID from the request headers or token
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Authorization token required");
  }

  const token = authHeader.split(" ")[1];

  // Revoke the current session
  const result = await authService.logout(
    { token },
    ipAddress,
    userAgent,
    traceId
  );

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

// GET /api/auth/verify-email
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  if (!token || typeof token !== "string" || token.trim() === "") {
    throw new ApiError(400, "Verification token is required");
  }

  const user = await authService.verifyEmail(
    token,
    ipAddress,
    userAgent,
    traceId
  );

  res.status(200).json({
    status: "success",
    message: "Email verified",
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        role: user.role,
        workspaceId: user.workspaceId,
      },
    },
  });
});

// POST /api/auth/resend-verification
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  if (!email || typeof email !== "string" || email.trim() === "") {
    throw new ApiError(400, "Email is required");
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new ApiError(400, "Invalid email format");
  }

  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.emailVerified) {
    throw new ApiError(400, "Email already verified");
  }

  if (user.status !== "PENDING_VERIFY") {
    throw new ApiError(400, "Account is not pending verification");
  }

  await emailService.resendVerificationEmail(user);
  await authService.createAuditEvent(
    user.id,
    "RESEND_VERIFICATION",
    null,
    ipAddress,
    userAgent,
    traceId
  );

  res.status(200).json({
    status: "success",
    message: "Verification email resent",
  });
});

// POST /api/auth/request-password-reset
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const result = await authService.requestPasswordReset(
    { email },
    ipAddress,
    userAgent,
    traceId
  );

  res.status(200).json(result);
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  if (!token || !newPassword) {
    throw new ApiError(400, "Token and new password are required");
  }

  const result = await authService.resetPassword(
    { token, newPassword },
    ipAddress,
    userAgent,
    traceId
  );

  res.status(200).json({
    status: "success",
    message: "Password has been reset successfully.",
  });
});

// GET /api/auth/sessions
const getUserSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const sessions = await authService.getUserSessions(userId);

  res.status(200).json({
    status: "success",
    message: "User sessions retrieved",
    data: { sessions },
  });
});

// DELETE /api/auth/sessions/:sessionId
const revokeSession = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sessionId } = req.params;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  const result = await authService.revokeSession(
    userId,
    sessionId,
    ipAddress,
    userAgent,
    traceId
  );

  res.status(200).json({
    status: "success",
    message: "Session revoked successfully",
  });
});

// POST /api/auth/deactivate
const deactivateAccount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  const result = await authService.deactivateAccount(
    userId,
    ipAddress,
    userAgent,
    traceId
  );

  res.status(200).json({
    status: "success",
    message: "Account deactivated successfully",
  });
});

// POST /api/auth/delete-account
const requestAccountDeletion = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  const result = await authService.requestAccountDeletion(
    userId,
    ipAddress,
    userAgent,
    traceId
  );

  res.status(200).json({
    status: "success",
    message:
      "Account deletion requested. Your account will be permanently deleted in 30 days.",
  });
});

// Health check endpoint
const healthCheck = asyncHandler(async (req, res) => {
  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    throw new ApiError(503, "Database connection failed");
  }

  res.status(200).json({
    status: "success",
    message: "Service is healthy",
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    },
  });
});

// JWKS endpoint
const getJWKS = asyncHandler(async (req, res) => {
  const jwks = jwtUtils.generateJWKS();
  res.status(200).json(jwks);
});

// Key rotation endpoint (admin only)
const rotateKeys = asyncHandler(async (req, res) => {
  const rotatedKeys = jwtUtils.rotateKeys();
  res.status(200).json({
    status: "success",
    message: "Keys rotated successfully",
    data: {
      newKid: rotatedKeys.newKey.kid,
      oldKid: rotatedKeys.oldKey.kid,
    },
  });
});

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  getUserSessions,
  revokeSession,
  deactivateAccount,
  requestAccountDeletion,
  healthCheck,
  getJWKS,
  rotateKeys,
};
