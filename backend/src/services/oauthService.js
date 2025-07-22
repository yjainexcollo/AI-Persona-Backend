const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { signToken, signRefreshToken } = require("../utils/jwt");
const apiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

function extractEmail(profile) {
  if (
    profile.emails &&
    Array.isArray(profile.emails) &&
    profile.emails.length > 0
  ) {
    for (const emailObj of profile.emails) {
      if (emailObj && emailObj.value) return emailObj.value;
    }
  }
  if (profile._json && profile._json.email) {
    return profile._json.email;
  }
  return null;
}

async function handleOAuthLogin(provider, profile) {
  const email = extractEmail(profile);
  const name =
    profile.displayName || (profile._json && profile._json.name) || "";
  if (!email) {
    throw new ApiError(400, "OAuth profile missing email");
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true },
  });
  let isNewUser = false;
  if (!user) {
    // Assign to a default or first workspace (customize as needed)
    let workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: { name: "Default Workspace", domain: "default.local" },
      });
    }
    user = await prisma.user.create({
      data: {
        email,
        name,
        emailVerified: true,
        isActive: true,
        memberships: {
          create: {
            workspaceId: workspace.id,
            role: "MEMBER",
            isActive: true,
          },
        },
        // No passwordHash for OAuth users
      },
      include: { memberships: true },
    });
    isNewUser = true;
    logger.info(
      `OAuth user created: ${user.id} (${user.email}) via ${provider}`
    );
  } else {
    logger.info(`OAuth user login: ${user.id} (${user.email}) via ${provider}`);
  }

  // Defensive check for memberships
  const membership = Array.isArray(user.memberships)
    ? user.memberships[0]
    : null;
  if (!membership)
    throw new ApiError(403, "User is not a member of any workspace");

  // Generate tokens
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
      isNewUser,
      provider,
    },
    message: isNewUser
      ? "OAuth registration successful"
      : "OAuth login successful",
  });
}

module.exports = {
  handleOAuthLogin,
};
