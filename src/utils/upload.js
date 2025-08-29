/**
 * Upload utility for handling presigned URLs and file uploads
 * Supports S3-compatible storage with presigned URLs
 */

const crypto = require("crypto");
const logger = require("./logger");
const ApiError = require("./apiError");

// File upload configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

/**
 * Validate file upload request
 * @param {object} fileData - File data from request
 * @returns {object} - Validation result
 */
function validateFileUpload(fileData) {
  const { filename, mimeType, sizeBytes } = fileData;

  // Validate filename
  if (!filename || filename.length > 200) {
    throw new ApiError(
      400,
      "Filename must be provided and less than 200 characters"
    );
  }

  // Validate mime type
  if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new ApiError(
      400,
      `Invalid mime type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`
    );
  }

  // Validate file size
  if (!sizeBytes || sizeBytes > MAX_FILE_SIZE) {
    throw new ApiError(
      413,
      `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)} MB`
    );
  }

  return { filename, mimeType, sizeBytes };
}

/**
 * Generate presigned upload URL
 * @param {string} fileId - Unique file ID
 * @param {string} filename - Original filename
 * @param {string} mimeType - File mime type
 * @returns {object} - Presigned URL data
 */
function generatePresignedUrl(fileId, filename, mimeType) {
  try {
    // For now, we'll generate a simple upload URL
    // In production, this would integrate with S3 or similar service
    const uploadUrl = `${
      process.env.UPLOAD_BASE_URL || "http://localhost:3000"
    }/uploads/${fileId}`;

    return {
      presignedUrl: uploadUrl,
      fileId: fileId,
      expiresIn: 3600, // 1 hour
    };
  } catch (error) {
    logger.error("Error generating presigned URL:", error);
    throw new ApiError(500, "Failed to generate upload URL");
  }
}

/**
 * Generate unique file ID
 * @returns {string} - Unique file ID
 */
function generateFileId() {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Update file URL after successful upload
 * @param {string} fileId - File ID
 * @param {string} url - Uploaded file URL
 * @returns {Promise<void>}
 */
async function updateFileUrl(fileId, url) {
  try {
    // This would typically update the database
    // For now, we'll just log the update
    logger.info(`File ${fileId} uploaded successfully to ${url}`);
  } catch (error) {
    logger.error("Error updating file URL:", error);
    throw new ApiError(500, "Failed to update file URL");
  }
}

module.exports = {
  validateFileUpload,
  generatePresignedUrl,
  generateFileId,
  updateFileUrl,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
};
