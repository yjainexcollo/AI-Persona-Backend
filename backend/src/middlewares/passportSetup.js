const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const oauthProviders = require("../utils/oauthProviders");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function initializePassport() {
  // Google OAuth Strategy
  if (oauthProviders.google.clientID && oauthProviders.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: oauthProviders.google.clientID,
          clientSecret: oauthProviders.google.clientSecret,
          callbackURL: oauthProviders.google.callbackURL,
          userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Find or create user in DB, always include memberships
            let user = await prisma.user.findUnique({
              where: {
                email:
                  profile.emails &&
                  profile.emails[0] &&
                  profile.emails[0].value,
              },
              include: { memberships: true },
            });
            if (!user) {
              // Optionally, assign to a workspace or create one
              const workspace = await prisma.workspace.findFirst(); // Or use domain logic
              user = await prisma.user.create({
                data: {
                  email:
                    profile.emails &&
                    profile.emails[0] &&
                    profile.emails[0].value,
                  name: profile.displayName,
                  emailVerified: true,
                  isActive: true,
                  memberships: workspace
                    ? {
                        create: {
                          workspaceId: workspace.id,
                          role: "MEMBER",
                          isActive: true,
                        },
                      }
                    : undefined,
                  // No passwordHash for OAuth users
                },
                include: { memberships: true },
              });
            }
            // Pass both user and profile to downstream
            return done(null, { user, profile });
          } catch (err) {
            return done(err, null);
          }
        }
      )
    );
  }
  // Add more strategies here (e.g., Microsoft, GitHub)

  // Minimal serialize/deserialize for JWT (not sessions)
  passport.serializeUser((obj, done) =>
    done(null, obj.user ? obj.user.id : obj.id)
  );
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}

module.exports = initializePassport;
