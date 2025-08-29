const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

const prisma = new PrismaClient();

/**
 * Purge deleted workspaces that have passed their purge date
 * Runs daily at 02:00
 */
async function purgeDeletedWorkspaces() {
  try {
    logger.info("Starting purge deleted workspaces job");

    // Find workspaces that are pending deletion and past their purge date
    const workspacesToPurge = await prisma.workspaceDeletion.findMany({
      where: {
        purgeAfter: {
          lte: new Date(),
        },
      },
      include: {
        workspace: {
          include: {
            users: {
              select: { id: true, workspaceId: true },
            },
          },
        },
      },
    });

    logger.info(`Found ${workspacesToPurge.length} workspaces to purge`);

    for (const deletion of workspacesToPurge) {
      try {
        // Check if any users still belong to this workspace
        const userCount = await prisma.user.count({
          where: { workspaceId: deletion.workspaceId },
        });

        if (userCount > 0) {
          logger.warn(
            `Skipping workspace ${deletion.workspaceId} - still has ${userCount} users`
          );
          continue;
        }

        // Delete workspace and all related data
        await prisma.$transaction(async (tx) => {
          // Delete workspace deletion record
          await tx.workspaceDeletion.delete({
            where: { id: deletion.id },
          });

          // Delete workspace (this will cascade to all related data)
          await tx.workspace.delete({
            where: { id: deletion.workspaceId },
          });
        });

        logger.info(`Successfully purged workspace ${deletion.workspaceId}`);
      } catch (error) {
        logger.error(
          `Failed to purge workspace ${deletion.workspaceId}:`,
          error
        );
      }
    }

    logger.info("Purge deleted workspaces job completed");
  } catch (error) {
    logger.error("Purge deleted workspaces job failed:", error);
  }
}

module.exports = purgeDeletedWorkspaces;
