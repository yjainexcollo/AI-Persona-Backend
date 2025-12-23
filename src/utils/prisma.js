const { PrismaClient } = require("@prisma/client");
const logger = require("./logger");

let prismaInstance;

function getPrismaInstance() {
  if (!prismaInstance) {
    // Validate DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      logger.error("CRITICAL: DATABASE_URL environment variable is not set!");
      throw new Error("DATABASE_URL environment variable is required");
    }

    // Log database connection info (without exposing credentials)
    const dbUrl = process.env.DATABASE_URL;
    const dbHost = dbUrl.match(/@([^:\/]+)/)?.[1] || "unknown";
    logger.info(`Initializing Prisma Client for database host: ${dbHost}`);

    try {
      prismaInstance = new PrismaClient({
        log: [
          { level: "warn", emit: "event" },
          { level: "error", emit: "event" },
        ],
      });

      // Log Prisma warnings and errors
      prismaInstance.$on("warn", (e) => {
        logger.warn("Prisma warning:", { message: e.message, target: e.target });
      });

      prismaInstance.$on("error", (e) => {
        logger.error("Prisma error:", { message: e.message, target: e.target });
      });

      // Attempt initial connection (non-fatal if fails; Prisma will connect lazily on first query)
      prismaInstance
        .$connect()
        .then(() => {
          logger.info("✅ Prisma connected successfully to database");
        })
        .catch((err) => {
          logger.error("❌ Prisma initial connect failed:", {
            error: err.message,
            code: err.code,
            meta: err.meta,
            stack: err.stack,
          });
          logger.warn("Prisma will attempt to reconnect on first query");
        });

      // Graceful shutdown
      const shutdown = async () => {
        try {
          logger.info("Disconnecting Prisma...");
          await prismaInstance.$disconnect();
          logger.info("Prisma disconnected");
        } catch (err) {
          logger.error("Error disconnecting Prisma:", err.message);
        }
      };
      process.on("beforeExit", shutdown);
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    } catch (err) {
      logger.error("CRITICAL: Failed to initialize Prisma Client:", {
        error: err.message,
        stack: err.stack,
      });
      throw err;
    }
  }
  return prismaInstance;
}

module.exports = getPrismaInstance();


