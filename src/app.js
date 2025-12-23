const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const logger = require("./utils/logger");
const passport = require("passport");
const config = require("./config");
const { initializePassport } = require("./middlewares/passportSetup");
initializePassport();

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const personaRoutes = require("./routes/personaRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const chatSessionRoutes = require("./routes/chatSessionRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const publicRoutes = require("./routes/publicRoutes");
const seedRoutes = require("./routes/seedRoutes");

const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const app = express();

// Security headers
app.use(helmet());

// CORS configuration - supports multiple origins from comma-separated env var
const corsOrigins = config.corsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in the allowlist
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject origin not in allowlist
    return callback(
      new Error(
        `Origin ${origin} not allowed by CORS policy. Allowed origins: ${corsOrigins.join(", ")}`
      ),
      false
    );
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-workspace-id",
    "X-Requested-With",
    "Accept",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 600, // Cache preflight for 10 minutes
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests for all routes
app.options("*", cors(corsOptions));

// Raw body capture for webhook routes (must come before route mounting)
// This captures the raw body buffer for signature verification
app.use("/api/webhooks", express.json({
  limit: "2mb",
  verify: (req, res, buf, encoding) => {
    // Store raw body as string for signature verification
    req.rawBody = buf.toString("utf8");
  }
}));

// JSON body parsing for all other routes
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(morgan("dev", { stream: logger.stream }));

// Initialize Passport middleware
app.use(passport.initialize());

// Validate webhook registries at startup
try {
  const traitsWebhookRegistry = require('./config/traitsWebhookRegistry');
  const chatWebhookRegistry = require('./config/chatWebhookRegistry');

  logger.info('Validating webhook registries...');

  // Validate traits webhook registry
  const traitsValidation = traitsWebhookRegistry.validateRegistry();
  if (traitsValidation.isValid) {
    logger.info('Traits webhook registry validated successfully', {
      personaCount: traitsWebhookRegistry.getRegistryStats().totalPersonas,
      warnings: traitsValidation.warnings.length,
    });
  } else {
    logger.warn('Traits webhook registry validation failed', {
      errors: traitsValidation.errors,
      warnings: traitsValidation.warnings,
    });
  }

  // Validate chat webhook registry
  const chatValidation = chatWebhookRegistry.validateRegistry();
  if (chatValidation.isValid) {
    logger.info('Chat webhook registry validated successfully', {
      personaCount: chatWebhookRegistry.getRegistryStats().totalPersonas,
      warnings: chatValidation.warnings.length,
    });
  } else {
    logger.warn('Chat webhook registry validation failed', {
      errors: chatValidation.errors,
      warnings: chatValidation.warnings,
    });
  }
} catch (error) {
  logger.error('Failed to validate webhook registries', {
    error: error.message,
    stack: error.stack,
  });
  // Don't crash - log error and continue
}

// Health check endpoint (REST)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/users", profileRoutes);
app.use("/api/personas", personaRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chat-sessions", chatSessionRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/seed", seedRoutes);

// Public Routes (no authentication required)
app.use("/p", publicRoutes);

// Load the swagger.yaml file - with error handling for tests
let swaggerDocument = {};
if (process.env.NODE_ENV !== "test") {
  try {
    const fs = require("fs");
    const swaggerPath = path.join(__dirname, "../docs/swagger.yaml");
    if (fs.existsSync(swaggerPath)) {
      swaggerDocument = YAML.load(swaggerPath);
    } else {
      console.warn(
        "Swagger documentation file not found, skipping swagger setup"
      );
    }
  } catch (error) {
    console.warn("Failed to load swagger documentation:", error.message);
  }
}

// Serve Swagger UI at /docs
if (Object.keys(swaggerDocument).length > 0) {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Centralized error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error: %o", err);

  // For tests and API consistency, return error message directly
  const errorResponse = {
    error: err.message || "Internal Server Error",
    status: "error",
  };

  // Add stack trace in development
  if (process.env.NODE_ENV !== "production") {
    errorResponse.details = err.stack;
  }

  res.status(err.statusCode || err.status || 500).json(errorResponse);
});

module.exports = app;
