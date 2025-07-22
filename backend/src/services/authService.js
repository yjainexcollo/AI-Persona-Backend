const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { hashPassword, verifyPassword } = require("../utils/password");
const { signToken, signRefreshToken } = require("../utils/jwt");
const ApiError = require("../utils/apiError");
const apiResponse = require("../utils/apiResponse");
const logger = require("../utils/logger");
const emailService = require("./emailService");

async function getOrCreateDefaultWorkspace(email) {
  const domain = email.split("@")[1] || "default.local";
  let workspace = await prisma.workspace.findUnique({ where: { domain } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: domain,
        domain,
      },
    });
    logger.info(`Created new workspace: ${workspace.id} (${workspace.domain})`);
  }
  return workspace;
}

// Registration logic
async function register({ email, password, name }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.warn(`Registration attempt with existing email: ${email}`);
    throw new ApiError(409, "Email already registered");
  }
  const passwordHash = await hashPassword(password);
  const workspace = await getOrCreateDefaultWorkspace(email);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      emailVerified: false,
      isActive: true,
      memberships: {
        create: {
          workspaceId: workspace.id,
          role: "MEMBER",
          isActive: true,
        },
      },
    },
    include: {
      memberships: true,
    },
  });
  logger.info(
    `User registered: ${user.id} (${user.email}) in workspace ${workspace.id}`
  );
  // Email verification logic
  try {
    const token = await emailService.createEmailVerification(user.id);
    await emailService.sendVerificationEmail(user, token);
    logger.info(`Verification email sent to ${user.email}`);
  } catch (err) {
    logger.error(
      `Failed to send verification email to ${user.email}: ${err.message}`
    );
    // Optionally, you can throw here or continue
  }
  return apiResponse({
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        memberships: user.memberships,
      },
      workspace: { id: workspace.id, domain: workspace.domain },
    },
    message:
      "Registration successful. Please check your email to verify your account before logging in.",
  });
}

// Login logic
async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true },
  });
  if (!user || !user.passwordHash) {
    logger.warn(
      `Failed login attempt: user not found or no password (${email})`
    );
    throw new ApiError(401, "Invalid email or password");
  }
  if (!user.isActive) {
    logger.warn(`Login attempt for inactive user: ${user.id} (${user.email})`);
    throw new ApiError(403, "User account is inactive");
  }
  if (!user.emailVerified) {
    logger.warn(
      `Login attempt for unverified email: ${user.id} (${user.email})`
    );
    throw new ApiError(
      403,
      "Email not verified. Please check your inbox or request a new verification email."
    );
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    logger.warn(
      `Failed login attempt: invalid password for user ${user.id} (${user.email})`
    );
    throw new ApiError(401, "Invalid email or password");
  }
  const membership = user.memberships[0];
  if (!membership) {
    logger.warn(
      `Login attempt for user with no workspace: ${user.id} (${user.email})`
    );
    throw new ApiError(403, "User is not a member of any workspace");
  }
  const accessToken = signToken({
    userId: user.id,
    workspaceId: membership.workspaceId,
    role: membership.role,
  });
  const refreshToken = signRefreshToken({
    userId: user.id,
    workspaceId: membership.workspaceId,
    role: membership.role,
  });
  logger.info(
    `User logged in: ${user.id} (${user.email}) in workspace ${membership.workspaceId}`
  );
  return apiResponse({
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        memberships: user.memberships,
      },
      workspaceId: membership.workspaceId,
      accessToken,
      refreshToken,
    },
    message: "Login successful",
  });
}

// Token refresh logic
async function refreshTokens({ refreshToken }) {
  let payload;
  try {
    payload = require("../utils/jwt").verifyRefreshToken(refreshToken);
  } catch (err) {
    logger.warn("Invalid or expired refresh token used");
    throw new ApiError(401, "Invalid or expired refresh token");
  }
  const { userId, workspaceId, role } = payload;
  const accessToken = signToken({ userId, workspaceId, role });
  const newRefreshToken = signRefreshToken({ userId, workspaceId, role });
  logger.info(
    `Refresh token used for user: ${userId} in workspace ${workspaceId}`
  );
  return apiResponse({
    data: {
      accessToken,
      refreshToken: newRefreshToken,
    },
    message: "Tokens refreshed",
  });
}

module.exports = {
  register,
  login,
  refreshTokens,
};
