const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const logger = require("./utils/logger");
const createApolloServer = require("./graphql/apollo");

const passport = require("passport");
const passportSetup = require("./middlewares/passportSetup");
passportSetup();

const authRoutes = require("./routes/authRoutes");
const inviteRoutes = require("./routes/inviteRoutes");
const userRoute = require("./routes/userRoute");
const adminRoutes = require("./routes/adminRoutes");

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
app.use("/api/invites", inviteRoutes);
app.use("/api/users", userRoute);
app.use("/api/admin", adminRoutes);

// Load the swagger.yaml file
const swaggerDocument = YAML.load(path.join(__dirname, "../docs/swagger.yaml"));

// Apollo GraphQL integration
async function startApollo() {
  const apolloServer = createApolloServer();
  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/graphql" });
  logger.info("🚀 GraphQL server ready at /graphql");
}
startApollo();

// Serve Swagger UI at /docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Centralized error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error: %o", err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      details: process.env.NODE_ENV === "production" ? undefined : err.stack,
    },
  });
});

module.exports = app;
