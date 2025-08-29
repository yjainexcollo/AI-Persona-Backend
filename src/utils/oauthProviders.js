const config = require("../config");

const oauthProviders = {
  google: {
    clientID: config.googleClientId,
    clientSecret: config.googleClientSecret,
    callbackURL: config.oauthCallbackUrl,
    scope: ["profile", "email"],
  },
  // Add more providers as needed (e.g., Microsoft, GitHub)
  // microsoft: {
  //   clientID: config.microsoftClientId,
  //   clientSecret: config.microsoftClientSecret,
  //   callbackURL: config.microsoftCallbackUrl,
  //   scope: ['user.read', 'openid', 'email', 'profile'],
  // },
};

module.exports = oauthProviders;
