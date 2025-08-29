const profileService = require("../services/profileService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

/**
 * Extract client information from request for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Client information
 */
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.get("User-Agent") || null,
  traceId: req.headers["x-trace-id"] || null,
  requestId: req.headers["x-request-id"] || null,
});

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result with isValid and missingFields
 */
const validateRequiredFields = (body, requiredFields) => {
  const missingFields = requiredFields.filter((field) => !body[field]);
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Validate string field is not empty
 * @param {string} value - Value to validate
 * @returns {boolean} Whether value is valid
 */
const validateNonEmptyString = (value) => {
  return typeof value === "string" && value.trim().length > 0;
};

/**
 * Validate timezone format
 * @param {string} timezone - Timezone to validate
 * @returns {boolean} Whether timezone is valid
 */
const validateTimezone = (timezone) => {
  if (!timezone || typeof timezone !== "string") return false;
  const trimmedTimezone = timezone.trim();
  if (trimmedTimezone === "") return false;

  // More strict timezone validation
  // Accepts: Continent/City, UTC, GMT, EST, PST, etc.
  const timezoneRegex =
    /^[A-Za-z_]+[A-Za-z0-9_-]*(\/[A-Za-z_]+[A-Za-z0-9_-]*)?$/;

  // Additional validation: must have at least one slash for Continent/City format
  // or be a common abbreviation
  const commonAbbreviations = ["UTC", "GMT", "EST", "PST", "CST", "MST"];
  if (commonAbbreviations.includes(trimmedTimezone)) {
    return true;
  }

  // Must have Continent/City format
  return timezoneRegex.test(trimmedTimezone) && trimmedTimezone.includes("/");
};

/**
 * Validate locale format
 * @param {string} locale - Locale to validate
 * @returns {boolean} Whether locale is valid
 */
const validateLocale = (locale) => {
  if (!locale || typeof locale !== "string") return false;
  const trimmedLocale = locale.trim();
  if (trimmedLocale === "") return false;

  // Basic locale validation (ISO 639-1 format)
  const localeRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
  return localeRegex.test(trimmedLocale);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid
 */
const validateUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const trimmedUrl = url.trim();
  if (trimmedUrl === "") return false;

  // More permissive URL validation
  try {
    const urlObj = new URL(trimmedUrl);
    // Accept common protocols for avatar URLs
    const validProtocols = ["http:", "https:", "ftp:", "data:"];
    return validProtocols.includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and issues
 */
const validatePassword = (password) => {
  if (!password || typeof password !== "string") {
    return { isValid: false, issues: ["Password must be a string"] };
  }

  const issues = [];

  if (password.length < 8) {
    issues.push("Password must be at least 8 characters long");
  }

  if (password.length > 128) {
    issues.push("Password must be no more than 128 characters long");
  }

  if (!/[a-zA-Z]/.test(password)) {
    issues.push("Password must contain at least one letter");
  }

  if (!/\d/.test(password)) {
    issues.push("Password must contain at least one number");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};

// GET /api/users/me
const getMe = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const userId = req.user.id;

    logger.info("Profile retrieval requested", {
      userId,
      ipAddress,
      userAgent,
      traceId,
    });

    const profile = await profileService.getProfile(userId);

    logger.info("Profile retrieved successfully", {
      userId,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      data: { user: profile },
    });
  } catch (error) {
    logger.error("Profile retrieval failed", {
      userId: req.user.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

// PUT /api/users/me
const updateMe = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const userId = req.user.id;
    const { name, avatarUrl, timezone, locale } = req.body;

    // Check if there are any fields to update first
    const hasFields =
      name !== undefined ||
      avatarUrl !== undefined ||
      timezone !== undefined ||
      locale !== undefined;
    if (!hasFields) {
      logger.warn("Profile update failed: no fields provided", {
        userId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "No fields provided for update");
    }

    // Validate input data
    const validationErrors = [];

    if (name !== undefined) {
      if (!validateNonEmptyString(name)) {
        validationErrors.push("Name must be a non-empty string");
      } else if (name.length > 100) {
        validationErrors.push("Name must be no more than 100 characters long");
      }
    }

    if (avatarUrl !== undefined) {
      if (!validateUrl(avatarUrl)) {
        validationErrors.push("Avatar URL must be a valid URL");
      }
    }

    if (timezone !== undefined) {
      if (!validateTimezone(timezone)) {
        validationErrors.push(
          "Timezone must be in valid IANA format (e.g., 'America/New_York')"
        );
      }
    }

    if (locale !== undefined) {
      if (!validateLocale(locale)) {
        validationErrors.push(
          "Locale must be in valid ISO format (e.g., 'en' or 'en-US')"
        );
      }
    }

    if (validationErrors.length > 0) {
      logger.warn("Profile update failed: validation errors", {
        userId,
        validationErrors,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(
        400,
        `Validation failed: ${validationErrors.join(", ")}`
      );
    }

    // Filter out undefined values
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl.trim();
    if (timezone !== undefined) updateData.timezone = timezone.trim();
    if (locale !== undefined) updateData.locale = locale.trim();

    // Check if there are any valid fields to update after validation
    if (Object.keys(updateData).length === 0) {
      logger.warn("Profile update failed: no valid fields to update", {
        userId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "No valid fields provided for update");
    }

    logger.info("Profile update requested", {
      userId,
      updateFields: Object.keys(updateData),
      ipAddress,
      userAgent,
      traceId,
    });

    const updatedProfile = await profileService.updateProfile(
      userId,
      updateData
    );

    logger.info("Profile updated successfully", {
      userId,
      updateFields: Object.keys(updateData),
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: { user: updatedProfile },
    });
  } catch (error) {
    logger.error("Profile update failed", {
      userId: req.user.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

// POST /api/users/me/avatar
const uploadAvatar = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const userId = req.user.id;

    logger.info("Avatar upload requested", {
      userId,
      hasFile: !!req.file,
      hasPresignedUrl: !!req.body.presignedUrl,
      ipAddress,
      userAgent,
      traceId,
    });

    let avatarUrl;

    if (req.file) {
      // Handle multipart/form-data upload
      if (!req.file.mimetype || !req.file.mimetype.startsWith("image/")) {
        logger.warn("Avatar upload failed: invalid file type", {
          userId,
          mimetype: req.file.mimetype,
          ipAddress,
          userAgent,
          traceId,
        });
        throw new ApiError(
          400,
          "Only image files are allowed for avatar uploads"
        );
      }

      // Validate file size (max 5MB)
      const maxSizeBytes = 5 * 1024 * 1024;
      if (req.file.size > maxSizeBytes) {
        logger.warn("Avatar upload failed: file too large", {
          userId,
          fileSize: req.file.size,
          maxSize: maxSizeBytes,
          ipAddress,
          userAgent,
          traceId,
        });
        throw new ApiError(
          400,
          `File size must be no more than ${maxSizeBytes / (1024 * 1024)}MB`
        );
      }

      avatarUrl = await profileService.processAvatarUpload(userId, req.file);
    } else if (req.body.presignedUrl) {
      // Handle presigned URL upload
      if (!validateUrl(req.body.presignedUrl)) {
        logger.warn("Avatar upload failed: invalid presigned URL", {
          userId,
          presignedUrl: req.body.presignedUrl.substring(0, 20) + "***",
          ipAddress,
          userAgent,
          traceId,
        });
        throw new ApiError(400, "Invalid presigned URL format");
      }

      avatarUrl = await profileService.processPresignedAvatar(
        userId,
        req.body.presignedUrl.trim()
      );
    } else {
      logger.warn("Avatar upload failed: no file or presigned URL provided", {
        userId,
        hasFile: false,
        hasPresignedUrl: false,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "No avatar file or presigned URL provided");
    }

    logger.info("Avatar uploaded successfully", {
      userId,
      avatarUrl: avatarUrl.substring(0, 30) + "***",
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      message: "Avatar uploaded successfully",
      data: { avatarUrl },
    });
  } catch (error) {
    logger.error("Avatar upload failed", {
      userId: req.user.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

// PUT /api/users/me/password
const changePassword = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    const validation = validateRequiredFields(req.body, [
      "currentPassword",
      "newPassword",
    ]);
    if (!validation.isValid) {
      logger.warn("Password change failed: missing required fields", {
        userId,
        missingFields: validation.missingFields,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(
        400,
        `Missing required fields: ${validation.missingFields.join(", ")}`
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      logger.warn("Password change failed: weak password", {
        userId,
        passwordIssues: passwordValidation.issues,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(
        400,
        `Password validation failed: ${passwordValidation.issues.join(", ")}`
      );
    }

    // Prevent using the same password
    if (currentPassword === newPassword) {
      logger.warn("Password change failed: new password same as current", {
        userId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(
        400,
        "New password must be different from current password"
      );
    }

    logger.info("Password change requested", {
      userId,
      ipAddress,
      userAgent,
      traceId,
    });

    await profileService.changePassword(userId, currentPassword, newPassword);

    logger.info("Password changed successfully", {
      userId,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error("Password change failed", {
      userId: req.user.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

module.exports = {
  getMe,
  updateMe,
  uploadAvatar,
  changePassword,
  getClientInfo,
  validateRequiredFields,
  validateNonEmptyString,
  validateTimezone,
  validateLocale,
  validateUrl,
  validatePassword,
};
