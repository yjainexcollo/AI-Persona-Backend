const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { generateToken } = require("../utils/token");
const emailService = require("./emailService");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

// Send an invite to a user for a workspace
async function sendInvite({
  email,
  workspaceId,
  role = "MEMBER",
  createdById,
}) {
  // Check if user is already a member
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true },
  });
  if (
    existingUser &&
    existingUser.memberships.some((m) => m.workspaceId === workspaceId)
  ) {
    throw new ApiError(409, "User is already a member of this workspace");
  }
  // Invalidate old invites for this email/workspace
  await prisma.invite.deleteMany({
    where: { email, workspaceId, used: false },
  });
  // Generate new invite token
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours expiry
  const invite = await prisma.invite.create({
    data: {
      email,
      token,
      expiresAt,
      workspaceId,
      createdById,
    },
  });
  logger.info(`Invite created for ${email} to workspace ${workspaceId}`);
  // Send invite email
  await emailService.sendInviteEmail(email, token, workspaceId);
  return invite;
}

// Validate an invite token
async function validateInviteToken(token) {
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.used || invite.expiresAt < new Date()) {
    logger.warn(`Invalid or expired invite token: ${token}`);
    throw new ApiError(400, "Invalid or expired invite token");
  }
  return invite;
}

// Accept an invite (assign user to workspace)
async function acceptInvite(token, userId) {
  const invite = await validateInviteToken(token);
  // Check if user is already a member
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: invite.workspaceId,
      },
    },
  });
  if (membership) {
    throw new ApiError(409, "User is already a member of this workspace");
  }
  // Assign user to workspace
  await prisma.membership.create({
    data: {
      userId,
      workspaceId: invite.workspaceId,
      role: "MEMBER", // Or use invite.role if you add it to the model
      isActive: true,
    },
  });
  // Mark invite as used
  await prisma.invite.update({
    where: { token },
    data: { used: true },
  });
  logger.info(
    `User ${userId} accepted invite to workspace ${invite.workspaceId}`
  );
  return invite;
}

module.exports = {
  sendInvite,
  validateInviteToken,
  acceptInvite,
};
