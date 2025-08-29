const passport = require("passport");
const oauthService = require("../services/oauthService");
const asyncHandler = require("../utils/asyncHandler");
const oauthProviders = require("../utils/oauthProviders");
const logger = require("../utils/logger");
const config = require("../config");

/**
 * Extract client information from request for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Client information
 */
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.get("User-Agent") || null,
  traceId: req.headers["x-trace-id"] || null,
});

/**
 * Validate OAuth profile data
 * @param {Object} profile - OAuth profile data
 * @returns {boolean} Whether profile is valid
 */
const validateOAuthProfile = (profile) => {
  if (!profile) return false;
  if (typeof profile !== "object") return false;
  if (!profile.id || !profile.emails || !Array.isArray(profile.emails))
    return false;
  if (profile.emails.length === 0) return false;
  if (
    !profile.emails[0] ||
    !profile.emails[0].value ||
    typeof profile.emails[0].value !== "string"
  )
    return false;
  if (profile.emails[0].value.trim() === "") return false;
  return true;
};

/**
 * Build OAuth callback redirect URL
 * @param {string} token - JWT access token
 * @param {string} workspaceId - Workspace ID
 * @param {string} workspaceName - Workspace name
 * @returns {string} Redirect URL
 */
const buildRedirectUrl = (token, workspaceId, workspaceName) => {
  if (!token || typeof token !== "string" || token.trim() === "") {
    throw new Error("Valid token is required");
  }

  const baseUrl = config.frontendUrl || "http://localhost:5173";
  const params = new URLSearchParams();

  params.append("token", token.trim());

  // Only add non-empty, non-null, non-undefined values
  if (
    workspaceId &&
    typeof workspaceId === "string" &&
    workspaceId.trim() !== ""
  ) {
    params.append("workspaceId", workspaceId.trim());
  }
  if (
    workspaceName &&
    typeof workspaceName === "string" &&
    workspaceName.trim() !== ""
  ) {
    params.append("workspaceName", workspaceName.trim());
  }

  return `${baseUrl}/oauth-callback?${params.toString()}`;
};

/**
 * Google OAuth authentication
 * GET /api/auth/google
 */
const googleAuth = passport.authenticate("google", {
  scope: oauthProviders.google.scope,
});

/**
 * Google OAuth callback handler
 * GET /api/auth/google/callback
 */
const googleCallback = [
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  asyncHandler(async (req, res) => {
    const { ipAddress, userAgent, traceId } = getClientInfo(req);

    try {
      // Validate user profile from OAuth
      if (!req.user || !req.user.profile) {
        logger.error("OAuth callback failed: missing user profile", {
          ipAddress,
          userAgent,
          traceId,
        });
        return res.status(500).json({
          error: "OAuth authentication failed: profile data missing",
        });
      }

      const profile = req.user.profile;

      // Validate profile structure
      if (!validateOAuthProfile(profile)) {
        logger.error("OAuth callback failed: invalid profile structure", {
          profileId: profile?.id,
          ipAddress,
          userAgent,
          traceId,
        });
        return res.status(500).json({
          error: "OAuth authentication failed: invalid profile data",
        });
      }

      logger.info("OAuth callback processing", {
        provider: "google",
        profileId: profile.id,
        email: profile.emails?.[0]?.value,
        ipAddress,
        userAgent,
        traceId,
      });

      // Handle OAuth login through service
      const response = await oauthService.handleOAuthLogin("google", profile);

      // Validate service response
      if (!response || !response.data) {
        logger.error("OAuth service returned invalid response", {
          provider: "google",
          profileId: profile.id,
          response: response,
          ipAddress,
          userAgent,
          traceId,
        });
        return res.status(500).json({
          error: "OAuth authentication failed: service error",
        });
      }

      // Extract data from response
      const { accessToken, workspaceId, workspaceName } = response.data;

      if (!accessToken) {
        logger.error("OAuth callback failed: missing access token", {
          provider: "google",
          profileId: profile.id,
          responseData: response.data,
          ipAddress,
          userAgent,
          traceId,
        });
        return res.status(500).json({
          error: "OAuth login failed: access token missing",
        });
      }

      // Build redirect URL
      let redirectUrl;
      try {
        redirectUrl = buildRedirectUrl(accessToken, workspaceId, workspaceName);
      } catch (error) {
        logger.error("OAuth callback failed: invalid redirect URL parameters", {
          provider: "google",
          profileId: profile.id,
          error: error.message,
          accessToken: accessToken ? "present" : "missing",
          workspaceId,
          workspaceName,
          ipAddress,
          userAgent,
          traceId,
        });
        return res.status(500).json({
          error: "OAuth authentication failed: invalid redirect parameters",
        });
      }

      logger.info("OAuth callback successful", {
        provider: "google",
        profileId: profile.id,
        workspaceId,
        workspaceName,
        ipAddress,
        userAgent,
        traceId,
      });

      // Redirect to frontend with token and workspace info
      return res.redirect(redirectUrl);
    } catch (error) {
      logger.error("OAuth callback error", {
        provider: "google",
        error: error.message,
        stack: error.stack,
        ipAddress,
        userAgent,
        traceId,
      });

      return res.status(500).json({
        error: "OAuth authentication failed: internal error",
      });
    }
  }),
];

module.exports = {
  googleAuth,
  googleCallback,
  getClientInfo,
  validateOAuthProfile,
  buildRedirectUrl,
};
