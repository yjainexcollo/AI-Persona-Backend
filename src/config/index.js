const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

function getEnvVar(key, required = true) {
  const value = process.env[key];
  if (required && (value === undefined || value === "")) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const config = {
  env: getEnvVar("NODE_ENV", false) || "development",
  port: parseInt(getEnvVar("PORT", false), 10) || 3000,
  databaseUrl: getEnvVar("DATABASE_URL"),
  jwtSecret: getEnvVar("JWT_SECRET"),
  sessionSecret: getEnvVar("SESSION_SECRET"),
  googleClientId: getEnvVar("GOOGLE_CLIENT_ID", false),
  googleClientSecret: getEnvVar("GOOGLE_CLIENT_SECRET", false),
  oauthCallbackUrl: getEnvVar("OAUTH_CALLBACK_URL", false),
  microsoftClientId: getEnvVar("MICROSOFT_CLIENT_ID", false),
  microsoftClientSecret: getEnvVar("MICROSOFT_CLIENT_SECRET", false),
  microsoftCallbackUrl: getEnvVar("MICROSOFT_CALLBACK_URL", false),
  corsOrigin: getEnvVar("CORS_ORIGIN", false) || "https://ai-persona-frontend-ashy.vercel.app",
  bcryptSaltRounds: parseInt(getEnvVar("BCRYPT_SALT_ROUNDS", false), 10) || 12,
  jwtExpiresIn: getEnvVar("JWT_EXPIRES_IN", false) || "1d",
  jwtRefreshExpiresIn: getEnvVar("JWT_REFRESH_EXPIRES_IN", false) || "7d",

  // Email Provider Configuration
  emailProvider: getEnvVar("EMAIL_PROVIDER", false) || null,
  brevoApiKey: getEnvVar("BREVO_API_KEY", false),
  emailFrom: getEnvVar("EMAIL_FROM", false),
  emailFromName: getEnvVar("EMAIL_FROM_NAME", false) || "AI Persona",

  // SMTP Configuration (optional, for backward compatibility)
  smtpHost: getEnvVar("SMTP_HOST", false),
  smtpPort: parseInt(getEnvVar("SMTP_PORT", false), 10) || 587,
  smtpUser: getEnvVar("SMTP_USER", false),
  smtpPass: getEnvVar("SMTP_PASS", false),
  smtpFrom: getEnvVar("SMTP_FROM", false),
  // Backend URL for generating email links (verify-email, reset-password, etc.)
  appBaseUrl:
    getEnvVar("APP_BASE_URL", false) ||
    "https://ai-persona-backend-828912814307.asia-southeast1.run.app",
  // Frontend URL for redirects and emails
  frontendUrl:
    getEnvVar("FRONTEND_URL", false) ||
    "https://ai-persona-frontend-ashy.vercel.app",
};

module.exports = config;
