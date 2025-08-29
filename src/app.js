const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const logger = require("./utils/logger");
const passport = require("passport");
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

const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const app = express();

// Security headers
app.use(helmet());

// CORS configuration (customize as needed)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

// JSON body parsing
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(morgan("dev", { stream: logger.stream }));

// Initialize Passport middleware
app.use(passport.initialize());

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
