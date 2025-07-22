const http = require("http");
const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");

const PORT = config.port || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info("Server closed. Exiting process.");
    process.exit(0);
  });
  // Force exit if not closed in 10s
  setTimeout(() => {
    logger.error("Force exiting after 10s.");
    process.exit(1);
  }, 10000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
