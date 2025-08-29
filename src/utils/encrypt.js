/**
 * Encryption utility for sensitive data
 * Uses AES-256-GCM with random IV for secure encryption/decryption
 */

const crypto = require("crypto");
const logger = require("./logger");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // AES-256 requires 32 bytes

function validateAndConvertKey(secretKey) {
  if (!secretKey || typeof secretKey !== "string") {
    throw new Error("Secret key must be a non-empty string");
  }

  // Try to decode as base64 first
  try {
    const base64Key = Buffer.from(secretKey, "base64");
    if (base64Key.length === KEY_LENGTH) {
      return base64Key;
    }
  } catch (error) {
    // Not valid base64, continue to utf8
  }

  // Try utf8 encoding
  const utf8Key = Buffer.from(secretKey, "utf8");
  if (utf8Key.length === KEY_LENGTH) {
    return utf8Key;
  }

  // If neither works, hash the key to get exactly 32 bytes
  try {
    return crypto.createHash("sha256").update(secretKey).digest();
  } catch (error) {
    logger.error("Key hashing failed:", error.message);
    throw new Error("Invalid key format");
  }
}

function encrypt(text, secretKey) {
  if (
    text === undefined ||
    text === null ||
    secretKey === undefined ||
    secretKey === null
  ) {
    throw new Error("Text and secret key are required");
  }

  try {
    const key = validateAndConvertKey(secretKey);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from("persona-webhook", "utf8"));
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();
    const result = Buffer.concat([iv, Buffer.from(encrypted, "hex"), tag]);
    return result.toString("base64");
  } catch (error) {
    // If it's a validation error, re-throw it
    if (error.message === "Secret key must be a non-empty string") {
      throw error;
    }
    logger.error("Encryption failed:", error.message, error.stack);
    throw new Error("Encryption failed");
  }
}

function decrypt(encryptedText, secretKey) {
  if (
    encryptedText === undefined ||
    encryptedText === null ||
    secretKey === undefined ||
    secretKey === null
  ) {
    throw new Error("Encrypted text and secret key are required");
  }

  try {
    const key = validateAndConvertKey(secretKey);
    const encryptedBuffer = Buffer.from(encryptedText, "base64");

    if (encryptedBuffer.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const tag = encryptedBuffer.subarray(encryptedBuffer.length - TAG_LENGTH);
    const encrypted = encryptedBuffer.subarray(
      IV_LENGTH,
      encryptedBuffer.length - TAG_LENGTH
    );

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from("persona-webhook", "utf8"));
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    // If it's a validation error, re-throw it
    if (error.message === "Secret key must be a non-empty string") {
      throw error;
    }
    logger.error("Decryption failed:", error);
    throw new Error("Decryption failed");
  }
}

function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString("base64");
}

module.exports = {
  encrypt,
  decrypt,
  generateKey,
};
