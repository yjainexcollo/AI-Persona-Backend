const { PrismaClient } = require("@prisma/client");
const logger = require("./logger");

let prismaInstance;

function getPrismaInstance() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();

    // Helpful connect log (non-fatal if fails; Prisma will connect lazily on first query)
    prismaInstance
      .$connect()
      .then(() => {
        logger.info("Prisma connected");
      })
      .catch((err) => {
        logger.warn(`Prisma initial connect failed: ${err.message}`);
      });

    // Graceful shutdown
    const shutdown = async () => {
      try {
        await prismaInstance.$disconnect();
      } catch (_) {}
    };
    process.on("beforeExit", shutdown);
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
  return prismaInstance;
}

module.exports = getPrismaInstance();


