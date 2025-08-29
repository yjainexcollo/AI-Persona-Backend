const logger = require("../../src/utils/logger");
const ApiError = require("../../src/utils/apiError");

// Test-specific workspace service that uses the test Prisma client
async function getWorkspace(workspaceId, userId) {
  // Verify user belongs to this workspace
  const user = await global.testPrisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });

  if (!user || user.workspaceId !== workspaceId) {
    throw new ApiError(403, "Access denied to this workspace");
  }

  const workspace = await global.testPrisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      domain: true,
      timezone: true,
      locale: true,
      isActive: true,
      maxMembers: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  return workspace;
}

// Update workspace
async function updateWorkspace(workspaceId, userId, updateData) {
  // Verify user is admin of this workspace
  const user = await global.testPrisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true, role: true },
  });

  if (!user || user.workspaceId !== workspaceId) {
    throw new ApiError(403, "Access denied to this workspace");
  }

  if (user.role !== "ADMIN") {
    throw new ApiError(
      403,
      "Only workspace admins can update workspace settings"
    );
  }

  const updatedWorkspace = await global.testPrisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: updateData.name,
      timezone: updateData.timezone,
      locale: updateData.locale,
    },
    select: {
      id: true,
      name: true,
      domain: true,
      timezone: true,
      locale: true,
      isActive: true,
      maxMembers: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logger.info(`Workspace ${workspaceId} updated by user ${userId}`);
  return updatedWorkspace;
}

// List workspace members
async function listMembers(workspaceId, userId, options = {}) {
  // Verify user belongs to this workspace
  const user = await global.testPrisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });

  if (!user || user.workspaceId !== workspaceId) {
    throw new ApiError(403, "Access denied to this workspace");
  }

  const { page = 1, limit = 10, search = "" } = options;
  const skip = (page - 1) * limit;

  const whereClause = {
    workspaceId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [members, total] = await Promise.all([
    global.testPrisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    global.testPrisma.user.count({ where: whereClause }),
  ]);

  return {
    members,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  getWorkspace,
  updateWorkspace,
  listMembers,
}; 