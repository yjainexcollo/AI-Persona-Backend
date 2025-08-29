/**
 * Token generation utility for shared links
 * Generates secure, unique tokens for conversation sharing
 */

const crypto = require("crypto");
const logger = require("./logger");

/**
 * Generate a secure random token for shared links
 * @param {number} length - Token length (default: 32)
 * @returns {string} - Secure random token
 */
function generateToken(length) {
  // Set default value if not provided
  if (length === undefined) {
    length = 32;
  }

  // Validate length parameter
  if (
    typeof length !== "number" ||
    isNaN(length) ||
    length <= 0 ||
    !Number.isInteger(length)
  ) {
    throw new Error("Length must be a positive integer");
  }

  // Set reasonable limits to prevent abuse
  if (length > 1024) {
    throw new Error("Length cannot exceed 1024");
  }

  try {
    return crypto.randomBytes(length).toString("base64url");
  } catch (error) {
    logger.error("Error generating token:", error);
    throw new Error("Failed to generate token");
  }
}

/**
 * Validate token format
 * @param {string} token - Token to validate
 * @returns {boolean} - True if valid
 */
function validateToken(token) {
  if (!token || typeof token !== "string") {
    return false;
  }

  // Check if token matches expected format (base64url)
  const tokenRegex = /^[A-Za-z0-9_-]+$/;
  return tokenRegex.test(token) && token.length >= 16;
}

/**
 * Generate a unique conversation token
 * @returns {string} - Unique token for conversation sharing
 */
function generateConversationToken() {
  return generateToken(32);
}

module.exports = {
  generateToken,
  validateToken,
  generateConversationToken,
};
