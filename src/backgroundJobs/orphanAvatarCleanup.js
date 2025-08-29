const { PrismaClient } = require("@prisma/client");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../utils/logger");

const prisma = new PrismaClient();

/**
 * Clean up orphaned avatar files
 * Runs weekly
 */
async function orphanAvatarCleanup() {
  try {
    logger.info("Starting orphan avatar cleanup job");

    const uploadsDir = path.join(__dirname, "../../uploads/avatars");

    // Check if uploads directory exists
    try {
      await fs.access(uploadsDir);
    } catch {
      logger.info("Uploads directory doesn't exist, skipping cleanup");
      return;
    }

    // Get all avatar files in the uploads directory
    const files = await fs.readdir(uploadsDir);
    const avatarFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    logger.info(`Found ${avatarFiles.length} avatar files to check`);

    // Get all avatar URLs from the database
    const users = await prisma.user.findMany({
      where: {
        avatarUrl: {
          not: null,
        },
      },
      select: {
        avatarUrl: true,
      },
    });

    const dbAvatarUrls = new Set(
      users
        .map((user) => user.avatarUrl)
        .filter((url) => url && url.startsWith("/uploads/avatars/"))
        .map((url) => path.basename(url))
    );

    let deletedCount = 0;
    let errorCount = 0;

    for (const file of avatarFiles) {
      try {
        if (!dbAvatarUrls.has(file)) {
          // File is not referenced in database, delete it
          const filePath = path.join(uploadsDir, file);
          await fs.unlink(filePath);
          deletedCount++;
          logger.debug(`Deleted orphaned avatar file: ${file}`);
        }
      } catch (error) {
        errorCount++;
        logger.error(`Failed to delete orphaned avatar file ${file}:`, error);
      }
    }

    logger.info(
      `Orphan avatar cleanup completed: ${deletedCount} files deleted, ${errorCount} errors`
    );
  } catch (error) {
    logger.error("Orphan avatar cleanup job failed:", error);
  }
}

module.exports = orphanAvatarCleanup;
