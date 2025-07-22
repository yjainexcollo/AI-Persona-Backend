const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

// List all users (with optional filters/pagination)
async function listUsers({ skip = 0, take = 20, search = "" } = {}) {
  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};
  const users = await prisma.user.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: { memberships: true },
  });
  const total = await prisma.user.count({ where });
  return { users, total };
}

// Get user details
async function getUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: true },
  });
  if (!user) throw new ApiError(404, "User not found");
  return user;
}

// Activate user
async function activateUser(userId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });
  logger.info(`Admin activated user ${userId}`);
  return user;
}

// Deactivate user
async function deactivateUser(userId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
  logger.info(`Admin deactivated user ${userId}`);
  return user;
}

// List all workspaces
async function listWorkspaces({ skip = 0, take = 20, search = "" } = {}) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { domain: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};
  const workspaces = await prisma.workspace.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: { memberships: true },
  });
  const total = await prisma.workspace.count({ where });
  return { workspaces, total };
}

// Get workspace details
async function getWorkspace(workspaceId) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { memberships: true },
  });
  if (!workspace) throw new ApiError(404, "Workspace not found");
  return workspace;
}

// Activate workspace
async function activateWorkspace(workspaceId) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { isActive: true },
  });
  logger.info(`Admin activated workspace ${workspaceId}`);
  return workspace;
}

// Deactivate workspace
async function deactivateWorkspace(workspaceId) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { isActive: false },
  });
  logger.info(`Admin deactivated workspace ${workspaceId}`);
  return workspace;
}

// Get system stats
async function getStats() {
  const [userCount, workspaceCount, inviteCount] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.invite.count(),
  ]);
  return {
    users: userCount,
    workspaces: workspaceCount,
    invites: inviteCount,
  };
}

module.exports = {
  listUsers,
  getUser,
  activateUser,
  deactivateUser,
  listWorkspaces,
  getWorkspace,
  activateWorkspace,
  deactivateWorkspace,
  getStats,
};
