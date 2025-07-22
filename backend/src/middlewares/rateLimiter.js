const rateLimit = require("express-rate-limit");

// Limit to 5 requests per hour per IP for resend-verification
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: {
      message:
        "Too many resend verification requests from this IP, please try again after an hour.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  resendVerificationLimiter,
};
