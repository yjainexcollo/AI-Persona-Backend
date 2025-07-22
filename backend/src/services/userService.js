const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../utils/apiError");
const { hashPassword, verifyPassword } = require("../utils/password");
const logger = require("../utils/logger");

// Get current user's profile
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: true },
  });
  if (!user) throw new ApiError(404, "User not found");
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    memberships: user.memberships,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Update profile (name, optionally email)
async function updateProfile(userId, { name, email }) {
  const data = {};
  if (name) data.name = name;
  if (email) data.email = email; // Optionally, trigger email verification flow here
  if (Object.keys(data).length === 0)
    throw new ApiError(400, "No profile fields to update");
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  logger.info(`User ${userId} updated profile`);
  return user;
}

// Change password
async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash)
    throw new ApiError(404, "User not found or password not set");
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new ApiError(401, "Current password is incorrect");
  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
  logger.info(`User ${userId} changed password`);
}

// Deactivate (soft delete) account
async function deactivateAccount(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
  logger.info(`User ${userId} deactivated their account`);
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
};
