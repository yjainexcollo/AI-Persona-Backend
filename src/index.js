const http = require("http");
const cron = require("node-cron");
const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");

// Import cron jobs
const purgeDeletedWorkspaces = require("./backgroundJobs/purgeDeletedWorkspaces");
const orphanAvatarCleanup = require("./backgroundJobs/orphanAvatarCleanup");

const PORT = config.port || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});

// Schedule cron jobs
// Purge deleted workspaces daily at 02:00
cron.schedule("0 2 * * *", async () => {
  logger.info("Running scheduled job: purge deleted workspaces");
  await purgeDeletedWorkspaces();
});

// Clean up orphaned avatars weekly on Sunday at 03:00
cron.schedule("0 3 * * 0", async () => {
  logger.info("Running scheduled job: orphan avatar cleanup");
  await orphanAvatarCleanup();
});

logger.info("Cron jobs scheduled");

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
