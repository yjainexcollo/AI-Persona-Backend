const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const oauthProviders = require("../utils/oauthProviders");
const prisma = require("../utils/prisma");
const logger = require("../utils/logger");
const ApiError = require("../utils/apiError");

// getPrismaClient no longer needed; we import singleton directly

/**
 * Validate and extract email from OAuth profile
 * @param {Object} profile - OAuth profile object
 * @returns {string|null} Extracted email or null if invalid
 */
function extractEmail(profile) {
  if (!profile || !profile.emails || !Array.isArray(profile.emails)) {
    return null;
  }

  const primaryEmail = profile.emails[0];
  if (
    !primaryEmail ||
    !primaryEmail.value ||
    typeof primaryEmail.value !== "string"
  ) {
    return null;
  }

  const email = primaryEmail.value.trim().toLowerCase();
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : null;
}

/**
 * Validate OAuth profile data
 * @param {Object} profile - OAuth profile object
 * @returns {Object} Validation result with isValid and errors
 */
function validateProfile(profile) {
  const errors = [];

  if (!profile) {
    errors.push("Profile is required");
    return { isValid: false, errors };
  }

  if (!profile.id) {
    errors.push("Profile ID is required");
  }

  const email = extractEmail(profile);
  if (!email) {
    errors.push("Valid email is required");
  }

  if (
    !profile.displayName ||
    typeof profile.displayName !== "string" ||
    profile.displayName.trim() === ""
  ) {
    errors.push("Display name is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
    email,
    displayName: profile.displayName ? profile.displayName.trim() : null,
  };
}

/**
 * Find or create workspace for new user
 * @param {string} email - User email
 * @param {PrismaClient} client - Optional Prisma client for dependency injection
 * @returns {Object|null} Workspace object or null
 */
async function findOrCreateWorkspace(email, client = null) {
  const prismaClient = client || prisma;

  try {
    // First, try to find an existing workspace
    let workspace = await prismaClient.workspace.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    // If no workspace exists, create a default one
    if (!workspace) {
      const domain = email.split("@")[1];
      workspace = await prismaClient.workspace.create({
        data: {
          name: `${domain} Workspace`,
          description: "Default workspace",
          status: "ACTIVE",
          settings: {},
        },
      });
      logger.info(
        `Created new workspace: ${workspace.id} for domain: ${domain}`
      );
    }

    return workspace;
  } catch (error) {
    logger.error("Error finding or creating workspace:", error);
    return null;
  }
}

/**
 * Initialize Passport with OAuth strategies
 * @param {Object} options - Configuration options
 * @param {PrismaClient} options.prismaClient - Optional Prisma client instance
 */
function initializePassport(options = {}) {

  try {
    // Validate OAuth providers configuration
    if (!oauthProviders || typeof oauthProviders !== "object") {
      logger.warn("OAuth providers configuration is missing or invalid");
      return;
    }

    // Google OAuth Strategy
    if (
      oauthProviders.google &&
      oauthProviders.google.clientID &&
      oauthProviders.google.clientSecret &&
      oauthProviders.google.callbackURL
    ) {
      logger.info("Initializing Google OAuth strategy");

      passport.use(
        new GoogleStrategy(
          {
            clientID: oauthProviders.google.clientID,
            clientSecret: oauthProviders.google.clientSecret,
            callbackURL: oauthProviders.google.callbackURL,
            userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
            scope: ["profile", "email"],
          },
          async (accessToken, refreshToken, profile, done) => {
            const client = prisma;

            try {
              logger.info(
                `OAuth authentication attempt for profile ID: ${profile.id}`
              );

              // Validate profile data
              const validation = validateProfile(profile);
              if (!validation.isValid) {
                logger.error("Invalid OAuth profile:", validation.errors);
                return done(
                  new ApiError(
                    400,
                    `Invalid profile data: ${validation.errors.join(", ")}`
                  ),
                  null
                );
              }

              const { email, displayName } = validation;

              // Find existing user by email
              let user = await client.user.findUnique({
                where: { email },
                include: {
                  workspace: {
                    select: { id: true, name: true, status: true },
                  },
                },
              });

              if (user) {
                // Check if user is active
                if (user.status !== "ACTIVE") {
                  const isDevelopment = process.env.NODE_ENV !== "production";
                  const allowInactiveOAuth = process.env.ALLOW_INACTIVE_OAUTH_LOGIN === "true";

                  // In development or if explicitly allowed, auto-activate the user
                  if (isDevelopment || allowInactiveOAuth) {
                    logger.warn(
                      `Auto-activating inactive user for OAuth login (${process.env.NODE_ENV}): ${email}`
                    );

                    // Update user status to ACTIVE and mark email as verified
                    user = await client.user.update({
                      where: { id: user.id },
                      data: {
                        status: "ACTIVE",
                        emailVerified: true,
                        verifiedAt: new Date(),
                      },
                      include: {
                        workspace: {
                          select: { id: true, name: true, status: true },
                        },
                      },
                    });

                    logger.info(
                      `User ${email} activated successfully via OAuth in development mode`
                    );
                  } else {
                    // Production: block inactive users with clear error
                    logger.warn(`Inactive user attempted OAuth login: ${email}`);
                    return done(
                      new ApiError(
                        403,
                        "Your account is inactive. Please contact support or verify your email to activate your account."
                      ),
                      null
                    );
                  }
                }

                // Check if workspace is active
                if (!user.workspace || user.workspace.status !== "ACTIVE") {
                  logger.warn(
                    `User with inactive workspace attempted OAuth login: ${email}`
                  );
                  return done(
                    new ApiError(403, "User workspace is not active"),
                    null
                  );
                }

                logger.info(`Existing user authenticated via OAuth: ${email}`);
                return done(null, { user, profile, isNewUser: false });
              }

              // Create new user
              const workspace = await findOrCreateWorkspace(email, client);
              if (!workspace) {
                logger.error("Failed to find or create workspace for new user");
                return done(
                  new ApiError(500, "Failed to create user workspace"),
                  null
                );
              }

              // Determine role based on workspace
              const userCount = await client.user.count({
                where: { workspaceId: workspace.id, status: "ACTIVE" },
              });
              const role = userCount === 0 ? "ADMIN" : "MEMBER";

              user = await client.user.create({
                data: {
                  email,
                  name: displayName,
                  emailVerified: true,
                  status: "ACTIVE",
                  workspaceId: workspace.id,
                  role,
                  oauthProvider: "google",
                  oauthId: profile.id,
                },
                include: {
                  workspace: {
                    select: { id: true, name: true, status: true },
                  },
                },
              });

              logger.info(
                `New user created via OAuth: ${email} with role: ${role}`
              );
              return done(null, { user, profile, isNewUser: true });
            } catch (error) {
              logger.error("OAuth authentication error:", error);

              if (error instanceof ApiError) {
                return done(error, null);
              }

              return done(new ApiError(500, "Authentication failed"), null);
            }
          }
        )
      );

      logger.info("Google OAuth strategy initialized successfully");
    } else {
      logger.warn(
        "Google OAuth configuration is incomplete - strategy not initialized"
      );
    }

    // Serialize user for session (minimal data)
    passport.serializeUser((authResult, done) => {
      try {
        const userId = authResult.user ? authResult.user.id : authResult.id;
        if (!userId) {
          logger.error("No user ID found during serialization");
          return done(new Error("Invalid user data for serialization"), null);
        }
        done(null, userId);
      } catch (error) {
        logger.error("Error during user serialization:", error);
        done(error, null);
      }
    });

    // Deserialize user from session
    passport.deserializeUser(async (userId, done) => {
      const client = prisma;

      try {
        if (!userId || typeof userId !== "string") {
          logger.error("Invalid user ID for deserialization:", userId);
          return done(new Error("Invalid user ID"), null);
        }

        const user = await client.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            workspaceId: true,
            workspace: {
              select: { id: true, name: true, status: true },
            },
          },
        });

        if (!user) {
          logger.warn(`User not found during deserialization: ${userId}`);
          return done(null, false);
        }

        if (user.status !== "ACTIVE") {
          logger.warn(`Inactive user during deserialization: ${userId}`);
          return done(null, false);
        }

        done(null, user);
      } catch (error) {
        logger.error("Error during user deserialization:", error);
        done(error, null);
      }
    });

    logger.info("Passport initialization completed");
  } catch (error) {
    logger.error("Failed to initialize Passport:", error);
    throw new ApiError(500, "Failed to initialize authentication");
  }
}

/**
 * Cleanup Prisma client connection
 */
async function cleanup() {
  try {
    await prisma.$disconnect();
    logger.info("Prisma client disconnected");
  } catch (_) { }
}

module.exports = {
  initializePassport,
  extractEmail,
  validateProfile,
  findOrCreateWorkspace,
  cleanup,
  // Export for testing
};
