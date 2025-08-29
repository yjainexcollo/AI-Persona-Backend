const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");
const ApiError = require("../utils/apiError");
const { signToken, signRefreshToken } = require("../utils/jwt");

const prisma = new PrismaClient();

// Helper function to get or create default workspace
async function getOrCreateDefaultWorkspace(email) {
  if (!email || typeof email !== "string") {
    throw new ApiError(400, "Valid email is required");
  }

  const domain = email.split("@")[1] || "default.local";

  try {
    let workspace = await prisma.workspace.findUnique({
      where: { domain },
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: domain,
          domain,
        },
      });
      logger.info(
        `Created new workspace: ${workspace.id} (${workspace.domain})`
      );
    }

    return workspace;
  } catch (error) {
    logger.error(`Error in getOrCreateDefaultWorkspace: ${error.message}`);
    throw new ApiError(500, "Failed to create or retrieve workspace");
  }
}

// Validate OAuth profile
function validateOAuthProfile(profile) {
  if (!profile || typeof profile !== "object") {
    throw new ApiError(400, "Invalid OAuth profile");
  }

  if (
    !profile.emails ||
    !Array.isArray(profile.emails) ||
    profile.emails.length === 0
  ) {
    throw new ApiError(400, "Email is required for OAuth login");
  }

  const email = profile.emails[0].value;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new ApiError(400, "Valid email is required for OAuth login");
  }

  return email;
}

// Clean up old sessions for user
async function cleanupOldSessions(userId) {
  try {
    // Validate required parameter
    if (!userId) {
      logger.warn("cleanupOldSessions called without userId");
      return;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await prisma.session.deleteMany({
      where: {
        userId,
        expiresAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} old sessions for user ${userId}`);
    }

    return result.count;
  } catch (error) {
    logger.warn(
      `Failed to cleanup old sessions for user ${userId}: ${error.message}`
    );
    // Don't throw error for cleanup failures
    return 0;
  }
}

// Handle OAuth login/registration
async function handleOAuthLogin(provider, profile) {
  // Validate inputs
  if (!provider || typeof provider !== "string") {
    throw new ApiError(400, "Valid OAuth provider is required");
  }

  if (!profile || typeof profile !== "object") {
    throw new ApiError(400, "Valid OAuth profile is required");
  }

  const email = validateOAuthProfile(profile);
  const { displayName } = profile;
  const name = displayName || email.split("@")[0];

  try {
    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Find existing user
      let user = await tx.user.findUnique({
        where: { email },
        include: {
          workspace: true,
        },
      });

      if (user) {
        // Existing user - log them in
        if (user.status !== "ACTIVE") {
          throw new ApiError(403, "Account is deactivated");
        }

        logger.info(
          `OAuth user login: ${user.id} (${user.email}) in workspace ${user.workspaceId} via ${provider}`
        );

        // Clean up old sessions
        await cleanupOldSessions(user.id);

        // Generate tokens
        const accessToken = await signToken({
          userId: user.id,
          workspaceId: user.workspaceId,
          role: user.role,
        });
        const refreshToken = await signRefreshToken({
          userId: user.id,
          workspaceId: user.workspaceId,
          role: user.role,
        });

        // Create session
        await tx.session.create({
          data: {
            userId: user.id,
            refreshToken,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        });

        return {
          status: "success",
          message: "OAuth login successful",
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              emailVerified: user.emailVerified,
              status: user.status,
              role: user.role,
              workspaceId: user.workspaceId,
            },
            workspaceId: user.workspaceId,
            workspaceName: user.workspace?.name || "Unknown Workspace",
            accessToken,
            refreshToken,
            isNewUser: false,
            provider,
          },
        };
      } else {
        // New user - create account
        const workspace = await getOrCreateDefaultWorkspace(email);

        // Check if this is the first user in the workspace
        const userCount = await tx.user.count({
          where: { workspaceId: workspace.id },
        });
        const role = userCount === 0 ? "ADMIN" : "MEMBER";

        const user = await tx.user.create({
          data: {
            email,
            name,
            emailVerified: true, // OAuth users are pre-verified
            status: "ACTIVE",
            workspaceId: workspace.id,
            role,
          },
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
            status: true,
            role: true,
            workspaceId: true,
          },
        });

        logger.info(
          `OAuth user created: ${user.id} (${user.email}) in workspace ${workspace.id} as ${role} via ${provider}`
        );

        // Generate tokens
        const accessToken = await signToken({
          userId: user.id,
          workspaceId: user.workspaceId,
          role: user.role,
        });
        const refreshToken = await signRefreshToken({
          userId: user.id,
          workspaceId: user.workspaceId,
          role: user.role,
        });

        // Create session
        await tx.session.create({
          data: {
            userId: user.id,
            refreshToken,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        });

        return {
          status: "success",
          message: "OAuth registration successful",
          data: {
            user,
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            accessToken,
            refreshToken,
            isNewUser: true,
            provider,
          },
        };
      }
    });

    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error(`OAuth login error: ${error.message}`);
    throw new ApiError(500, "OAuth login failed");
  }
}

module.exports = {
  handleOAuthLogin,
  // Export helper functions for testing
  getOrCreateDefaultWorkspace,
  validateOAuthProfile,
  cleanupOldSessions,
};
