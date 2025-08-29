const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");
const ApiError = require("../utils/apiError");

const prisma = new PrismaClient();

// Get workspace details
async function getWorkspace(workspaceId, userId) {
  // Validate input parameters
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new ApiError(400, "Valid workspaceId is required");
  }

  if (!userId || typeof userId !== "string") {
    throw new ApiError(400, "Valid userId is required");
  }

  // Verify user belongs to this workspace
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });

  if (!user || user.workspaceId !== workspaceId) {
    throw new ApiError(403, "Access denied to this workspace");
  }

  const workspace = await prisma.workspace.findUnique({
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
  // Validate input parameters
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new ApiError(400, "Valid workspaceId is required");
  }

  if (!userId || typeof userId !== "string") {
    throw new ApiError(400, "Valid userId is required");
  }

  if (!updateData || typeof updateData !== "object") {
    throw new ApiError(400, "Valid updateData is required");
  }

  // Verify user is admin of this workspace
  const user = await prisma.user.findUnique({
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

  // Validate timezone if provided
  if (updateData.timezone && !isValidTimezone(updateData.timezone)) {
    throw new ApiError(400, "Invalid timezone");
  }

  // Validate locale if provided
  if (updateData.locale && !isValidLocale(updateData.locale)) {
    throw new ApiError(400, "Invalid locale");
  }

  const updatedWorkspace = await prisma.workspace.update({
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

  // Log audit event
  await logAuditEvent(userId, "WORKSPACE_UPDATED", {
    workspaceId,
    updatedFields: Object.keys(updateData),
  });

  logger.info(`Workspace ${workspaceId} updated by user ${userId}`);
  return updatedWorkspace;
}

// List workspace members with smart filtering and pagination
async function listMembers(workspaceId, userId, options = {}) {
  const { search, status, role, page = 1, limit = 20 } = options;

  // Verify user belongs to this workspace
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true, role: true },
  });

  if (!user || user.workspaceId !== workspaceId) {
    throw new ApiError(403, "Access denied to this workspace");
  }

  // Only admins can list members
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Only workspace admins can view member list");
  }

  // Build where clause with filters
  const where = { workspaceId };

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (role) {
    where.role = role;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = limit;

  // Get members and total count
  const [members, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return { members, total };
}

// Change member role
async function changeMemberRole(workspaceId, userId, memberId, newRole) {
  // Validate input parameters
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new ApiError(400, "Valid workspaceId is required");
  }

  if (!userId || typeof userId !== "string") {
    throw new ApiError(400, "Valid userId is required");
  }

  if (!memberId || typeof memberId !== "string") {
    throw new ApiError(400, "Valid memberId is required");
  }

  if (!newRole || !["ADMIN", "MEMBER"].includes(newRole)) {
    throw new ApiError(400, "Valid newRole is required (ADMIN or MEMBER)");
  }

  // Verify user is admin of this workspace
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true, role: true },
  });

  if (!user || user.workspaceId !== workspaceId) {
    throw new ApiError(403, "Access denied to this workspace");
  }

  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Only workspace admins can change member roles");
  }

  // Verify member exists and belongs to the same workspace
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { workspaceId: true, role: true },
  });

  if (!member || member.workspaceId !== workspaceId) {
    throw new ApiError(404, "Member not found in this workspace");
  }

  // Prevent admin from demoting themselves if they're the only admin
  if (memberId === userId && newRole === "MEMBER") {
    const adminCount = await prisma.user.count({
      where: { workspaceId, role: "ADMIN" },
    });

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot demote the only admin in the workspace");
    }
  }

  const updatedMember = await prisma.user.update({
    where: { id: memberId },
    data: { role: newRole },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  // Log audit event
  await logAuditEvent(userId, "MEMBER_ROLE_CHANGED", {
    workspaceId,
    memberId,
    oldRole: member.role,
    newRole,
  });

  logger.info(
    `Member ${memberId} role changed to ${newRole} by user ${userId}`
  );
  return updatedMember;
}

// Change member status
async function changeMemberStatus(workspaceId, userId, memberId, newStatus) {
  // Verify user is admin of this workspace
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true, role: true },
  });

  if (!user || user.workspaceId !== workspaceId) {
    throw new ApiError(403, "Access denied to this workspace");
  }

  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Only workspace admins can change member status");
  }

  // Verify member exists and belongs to the same workspace
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { workspaceId: true, role: true, status: true },
  });

  if (!member || member.workspaceId !== workspaceId) {
    throw new ApiError(404, "Member not found in this workspace");
  }

  // Prevent deactivating the last admin
  if (newStatus === "DEACTIVATED" && member.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { workspaceId, role: "ADMIN", status: "ACTIVE" },
    });

    if (adminCount <= 1) {
      throw new ApiError(
        422,
        "Cannot deactivate the last admin in the workspace"
      );
    }
  }

  // Use transaction to update status and revoke sessions if deactivating
  const updatedMember = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: memberId },
      data: { status: newStatus },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    // Revoke all sessions if deactivating
    if (newStatus === "DEACTIVATED") {
      await tx.session.updateMany({
        where: { userId: memberId },
        data: { isActive: false },
      });
    }

    return updated;
  });

  // Log audit event
  await logAuditEvent(userId, "MEMBER_STATUS_CHANGED", {
    workspaceId,
    memberId,
    oldStatus: member.status,
    newStatus,
  });

  logger.info(
    `Member ${memberId} status changed to ${newStatus} by user ${userId}`
  );
  return updatedMember;
}

// Remove member from workspace
async function removeMember(workspaceId, userId, memberId) {
  // Verify user is admin of this workspace
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true, role: true },
  });

  if (!user || user.workspaceId !== workspaceId) {
    throw new ApiError(403, "Access denied to this workspace");
  }

  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Only workspace admins can remove members");
  }

  // Verify member exists and belongs to the same workspace
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { workspaceId: true, role: true },
  });

  if (!member || member.workspaceId !== workspaceId) {
    throw new ApiError(404, "Member not found in this workspace");
  }

  // Prevent admin from removing themselves if they're the only admin
  if (memberId === userId) {
    const adminCount = await prisma.user.count({
      where: { workspaceId, role: "ADMIN" },
    });

    if (adminCount <= 1) {
      throw new ApiError(
        400,
        "Cannot remove the only admin from the workspace"
      );
    }
  }

  // Soft delete by setting status to DEACTIVATED
  await prisma.user.update({
    where: { id: memberId },
    data: { status: "DEACTIVATED" },
  });

  // Log audit event
  await logAuditEvent(userId, "MEMBER_REMOVED", {
    workspaceId,
    memberId,
    memberRole: member.role,
  });

  logger.info(
    `Member ${memberId} removed from workspace ${workspaceId} by user ${userId}`
  );
}

// Permanently delete member from workspace (hard delete)
async function deleteMemberPermanent(workspaceId, userId, memberId) {
  // Verify user is admin of this workspace
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true, role: true },
  });

  if (!user || user.workspaceId !== workspaceId) {
    throw new ApiError(403, "Access denied to this workspace");
  }

  if (user.role !== "ADMIN") {
    throw new ApiError(
      403,
      "Only workspace admins can permanently delete members"
    );
  }

  // Verify member exists and belongs to the same workspace
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { workspaceId: true, role: true, status: true },
  });

  if (!member || member.workspaceId !== workspaceId) {
    throw new ApiError(404, "Member not found in this workspace");
  }

  // Prevent permanently deleting the last admin in a workspace
  if (member.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { workspaceId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new ApiError(
        400,
        "Cannot permanently delete the only admin from the workspace"
      );
    }
  }

  // Prevent self-removal if they'd become zero admins
  if (memberId === userId) {
    const adminCount = await prisma.user.count({
      where: { workspaceId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new ApiError(
        400,
        "Cannot permanently delete the only admin from the workspace"
      );
    }
  }

  // Use transaction to ensure data consistency
  await prisma.$transaction(async (tx) => {
    // Perform hard delete; relations are set to Cascade in schema
    await tx.user.delete({ where: { id: memberId } });

    // Log audit event
    await logAuditEvent(userId, "MEMBER_REMOVED", {
      workspaceId,
      memberId,
      hardDelete: true,
      memberRole: member.role,
      memberStatus: member.status,
    });
  });

  logger.info(
    `Member ${memberId} permanently removed from workspace ${workspaceId} by user ${userId}`
  );
}

// Request workspace deletion
async function requestDeletion(workspaceId, userId, reason) {
  // Verify user is admin of this workspace
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true, role: true },
  });

  if (!user || user.workspaceId !== workspaceId) {
    throw new ApiError(403, "Access denied to this workspace");
  }

  if (user.role !== "ADMIN") {
    throw new ApiError(
      403,
      "Only workspace admins can request workspace deletion"
    );
  }

  // Check if deletion is already requested
  const existingDeletion = await prisma.workspaceDeletion.findUnique({
    where: { workspaceId },
  });

  if (existingDeletion) {
    throw new ApiError(400, "Workspace deletion has already been requested");
  }

  // Calculate purge date (30 days from now)
  const purgeAfter = new Date();
  purgeAfter.setDate(purgeAfter.getDate() + 30);

  // Create deletion request
  await prisma.workspaceDeletion.create({
    data: {
      workspaceId,
      requestedBy: userId,
      reason,
      purgeAfter,
    },
  });

  // Update workspace status
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { status: "PENDING_DELETION" },
  });

  // Log audit event
  await logAuditEvent(userId, "WORKSPACE_DELETION_REQUESTED", {
    workspaceId,
    reason,
    purgeAfter,
  });

  logger.info(`Workspace ${workspaceId} deletion requested by user ${userId}`);
}

// Helper function to validate timezone
function isValidTimezone(timezone) {
  try {
    // Check if timezone is a valid string
    if (!timezone || typeof timezone !== "string") {
      return false;
    }

    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Helper function to validate locale
function isValidLocale(locale) {
  try {
    // Check if locale is a valid string
    if (!locale || typeof locale !== "string") {
      return false;
    }

    // Check if locale is a valid format (language-country or just language)
    const localeRegex = /^[a-z]{2,3}(-[A-Z]{2})?$/;
    if (!localeRegex.test(locale)) {
      return false;
    }

    // Try to create a DateTimeFormat with the locale
    // This will throw if the locale is not supported
    new Intl.DateTimeFormat(locale);

    // Additional check: make sure the resolved locale is similar to the input
    const resolved = new Intl.DateTimeFormat(locale).resolvedOptions().locale;
    return resolved.startsWith(locale.split("-")[0]);
  } catch {
    return false;
  }
}

// Helper function to log audit events
async function logAuditEvent(userId, eventType, eventData) {
  try {
    await prisma.auditEvent.create({
      data: {
        userId,
        eventType,
        eventData,
        ipAddress: null, // Will be set by middleware
        userAgent: null, // Will be set by middleware
      },
    });
  } catch (error) {
    logger.error(`Failed to log audit event for user ${userId}:`, error);
  }
}

module.exports = {
  getWorkspace,
  updateWorkspace,
  listMembers,
  changeMemberRole,
  changeMemberStatus,
  removeMember,
  deleteMemberPermanent,
  requestDeletion,
  isValidTimezone,
  isValidLocale,
};
