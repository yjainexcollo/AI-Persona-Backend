const passport = require("passport");
const oauthService = require("../services/oauthService");
const asyncHandler = require("../utils/asyncHandler");
const oauthProviders = require("../utils/oauthProviders");

const googleAuth = passport.authenticate("google", {
  scope: oauthProviders.google.scope,
});

const googleCallback = [
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  asyncHandler(async (req, res) => {
    // req.user = { user, profile }
    const response = await oauthService.handleOAuthLogin(
      "google",
      req.user.profile
    );
    res.status(200).json(response);
  }),
];

module.exports = {
  googleAuth,
  googleCallback,
};
