const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const sharp = require("sharp");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs").promises;
const logger = require("../utils/logger");
const ApiError = require("../utils/apiError");
const breachCheckService = require("./breachCheckService");

const prisma = new PrismaClient();

// Get user profile
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      timezone: true,
      locale: true,
      emailVerified: true,
      status: true,
      role: true,
      workspaceId: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}

// Update user profile
async function updateProfile(userId, updateData) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Validate timezone if provided
  if (updateData.timezone && !isValidTimezone(updateData.timezone)) {
    throw new ApiError(400, "Invalid timezone");
  }

  // Validate locale if provided
  if (updateData.locale && !isValidLocale(updateData.locale)) {
    throw new ApiError(400, "Invalid locale");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: updateData.name,
      avatarUrl: updateData.avatarUrl,
      timezone: updateData.timezone,
      locale: updateData.locale,
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      timezone: true,
      locale: true,
      emailVerified: true,
      status: true,
      role: true,
      workspaceId: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Log audit event
  await logAuditEvent(userId, "PROFILE_UPDATED", {
    updatedFields: Object.keys(updateData),
  });

  logger.info(`User ${userId} updated profile`);
  return updatedUser;
}

// Process avatar upload from multipart/form-data
async function processAvatarUpload(userId, file) {
  if (!file) {
    throw new ApiError(400, "No file uploaded");
  }

  // Check if user exists first
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Validate file type
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new ApiError(
      400,
      "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed"
    );
  }

  // Validate file size (2MB limit)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    throw new ApiError(400, "File size too large. Maximum size is 2MB");
  }

  try {
    // Create thumbnails directory if it doesn't exist
    const uploadsDir = path.join(__dirname, "../../uploads/avatars");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${userId}_${crypto
      .randomBytes(16)
      .toString("hex")}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Process image and create thumbnail
    const imageBuffer = await sharp(file.buffer)
      .resize(128, 128, { fit: "cover", position: "center" })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Save processed image
    await fs.writeFile(filePath, imageBuffer);

    // Generate CDN URL (in production, this would upload to CDN)
    const avatarUrl = `/uploads/avatars/${fileName}`;

    // Update user's avatar URL
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    // Log audit event
    await logAuditEvent(userId, "AVATAR_UPLOADED", {
      fileName,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    logger.info(`User ${userId} uploaded avatar: ${fileName}`);
    return avatarUrl;
  } catch (error) {
    // Re-throw ApiError instances directly
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error(`Avatar upload failed for user ${userId}:`, error);
    throw new ApiError(500, "Failed to process avatar upload");
  }
}

// Process presigned URL avatar upload
async function processPresignedAvatar(userId, presignedUrl) {
  if (!presignedUrl) {
    throw new ApiError(400, "Presigned URL is required");
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Validate URL format
  try {
    new URL(presignedUrl);
  } catch {
    throw new ApiError(400, "Invalid presigned URL format");
  }

  // In a real implementation, you would:
  // 1. Download the file from the presigned URL
  // 2. Process it similar to multipart upload
  // 3. Upload to your CDN
  // 4. Return the final CDN URL

  // For now, we'll just store the presigned URL as the avatar URL
  // In production, you'd process the file and upload to your CDN
  const avatarUrl = presignedUrl;

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });

  // Log audit event
  await logAuditEvent(userId, "AVATAR_UPLOADED", {
    presignedUrl: true,
  });

  logger.info(`User ${userId} uploaded avatar via presigned URL`);
  return avatarUrl;
}

// Change password
async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.passwordHash) {
    throw new ApiError(400, "Cannot change password for OAuth-only users");
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );
  if (!isCurrentPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  // Check if new password is same as current
  const isNewPasswordSame = await bcrypt.compare(
    newPassword,
    user.passwordHash
  );
  if (isNewPasswordSame) {
    throw new ApiError(
      400,
      "New password must be different from current password"
    );
  }

  // Validate password strength
  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  if (!passwordRegex.test(newPassword)) {
    throw new ApiError(
      400,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    );
  }

  // Check for data breaches
  const breachResult = await breachCheckService.checkPasswordBreach(
    newPassword
  );
  if (breachResult.breached) {
    throw new ApiError(
      400,
      "This password has been compromised in a data breach. Please choose a different password"
    );
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword },
  });

  // Log audit event
  await logAuditEvent(userId, "CHANGE_PASSWORD", {});

  logger.info(`User ${userId} changed password`);
}

// Helper function to validate timezone
function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Helper function to validate locale
function isValidLocale(locale) {
  try {
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
  getProfile,
  updateProfile,
  processAvatarUpload,
  processPresignedAvatar,
  changePassword,
  isValidTimezone,
  isValidLocale,
};
