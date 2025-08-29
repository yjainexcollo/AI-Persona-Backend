const workspaceService = require("../services/workspaceService");
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
 * Validate role values
 * @param {string} role - Role to validate
 * @returns {boolean} Whether role is valid
 */
const validateRole = (role) => {
  if (!role || typeof role !== "string") return false;
  const validRoles = ["MEMBER", "ADMIN", "OWNER"];
  return validRoles.includes(role.toUpperCase());
};

/**
 * Validate status values
 * @param {string} status - Status to validate
 * @returns {boolean} Whether status is valid
 */
const validateStatus = (status) => {
  if (!status || typeof status !== "string") return false;
  const validStatuses = ["ACTIVE", "DEACTIVATED", "PENDING_VERIFY"];
  return validStatuses.includes(status.toUpperCase());
};

/**
 * Validate ID parameter
 * @param {string} id - ID to validate
 * @returns {boolean} Whether ID is valid
 */
const validateId = (id) => {
  return !!(id && typeof id === "string" && id.trim().length > 0);
};

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Validation result with isValid and issues
 */
const validatePagination = (page, limit) => {
  const issues = [];

  if (page < 1) {
    issues.push("Page must be at least 1");
  }

  if (limit < 1 || limit > 100) {
    issues.push("Limit must be between 1 and 100");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};

// GET /api/workspaces/:id
const getWorkspace = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const workspaceId = req.params.id;
    const userId = req.user.id;

    // Validate workspace ID
    if (!validateId(workspaceId)) {
      logger.warn("Workspace retrieval failed: invalid workspace ID", {
        userId,
        workspaceId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid workspace ID");
    }

    logger.info("Workspace retrieval requested", {
      userId,
      workspaceId,
      ipAddress,
      userAgent,
      traceId,
    });

    const workspace = await workspaceService.getWorkspace(workspaceId, userId);

    logger.info("Workspace retrieved successfully", {
      userId,
      workspaceId,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      data: { workspace },
    });
  } catch (error) {
    logger.error("Workspace retrieval failed", {
      userId: req.user.id,
      workspaceId: req.params.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

// PUT /api/workspaces/:id
const updateWorkspace = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const workspaceId = req.params.id;
    const userId = req.user.id;
    const { name, timezone, locale } = req.body;

    // Validate workspace ID
    if (!validateId(workspaceId)) {
      logger.warn("Workspace update failed: invalid workspace ID", {
        userId,
        workspaceId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid workspace ID");
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
      logger.warn("Workspace update failed: validation errors", {
        userId,
        workspaceId,
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

    // Check if there are any fields to update
    const hasFields =
      name !== undefined || timezone !== undefined || locale !== undefined;
    if (!hasFields) {
      logger.warn("Workspace update failed: no fields provided", {
        userId,
        workspaceId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "No fields provided for update");
    }

    // Filter out undefined values and create update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (timezone !== undefined) updateData.timezone = timezone.trim();
    if (locale !== undefined) updateData.locale = locale.trim();

    logger.info("Workspace update requested", {
      userId,
      workspaceId,
      updateFields: Object.keys(updateData),
      ipAddress,
      userAgent,
      traceId,
    });

    const updatedWorkspace = await workspaceService.updateWorkspace(
      workspaceId,
      userId,
      updateData
    );

    logger.info("Workspace updated successfully", {
      userId,
      workspaceId,
      updateFields: Object.keys(updateData),
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      message: "Workspace updated successfully",
      data: { workspace: updatedWorkspace },
    });
  } catch (error) {
    logger.error("Workspace update failed", {
      userId: req.user.id,
      workspaceId: req.params.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

// GET /api/workspaces/:id/members (Smart listing with query params)
const listMembers = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const workspaceId = req.params.id;
    const userId = req.user.id;
    const { search, status, role, page = 1, limit = 20 } = req.query;

    // Validate workspace ID
    if (!validateId(workspaceId)) {
      logger.warn("Member listing failed: invalid workspace ID", {
        userId,
        workspaceId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid workspace ID");
    }

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || isNaN(limitNum)) {
      logger.warn("Member listing failed: invalid pagination parameters", {
        userId,
        workspaceId,
        page,
        limit,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid pagination parameters");
    }

    const paginationValidation = validatePagination(pageNum, limitNum);
    if (!paginationValidation.isValid) {
      logger.warn("Member listing failed: pagination validation errors", {
        userId,
        workspaceId,
        paginationIssues: paginationValidation.issues,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(
        400,
        `Pagination validation failed: ${paginationValidation.issues.join(
          ", "
        )}`
      );
    }

    // Validate status and role if provided
    if (status && !validateStatus(status)) {
      logger.warn("Member listing failed: invalid status", {
        userId,
        workspaceId,
        status,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid status value");
    }

    if (role && !validateRole(role)) {
      logger.warn("Member listing failed: invalid role", {
        userId,
        workspaceId,
        role,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid role value");
    }

    logger.info("Member listing requested", {
      userId,
      workspaceId,
      search: search || null,
      status: status || null,
      role: role || null,
      page: pageNum,
      limit: limitNum,
      ipAddress,
      userAgent,
      traceId,
    });

    const result = await workspaceService.listMembers(workspaceId, userId, {
      search: search ? search.trim() : undefined,
      status: status ? status.toUpperCase() : undefined,
      role: role ? role.toUpperCase() : undefined,
      page: pageNum,
      limit: limitNum,
    });

    logger.info("Member listing completed successfully", {
      userId,
      workspaceId,
      resultCount: result.members?.length || 0,
      total: result.total,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      data: result.members,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
      },
    });
  } catch (error) {
    logger.error("Member listing failed", {
      userId: req.user.id,
      workspaceId: req.params.id,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

// PATCH /api/workspaces/:id/members/:uid/role
const changeRole = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const workspaceId = req.params.id;
    const memberId = req.params.uid;
    const userId = req.user.id;
    const { role } = req.body;

    // Validate parameters
    if (!validateId(workspaceId)) {
      logger.warn("Role change failed: invalid workspace ID", {
        userId,
        workspaceId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid workspace ID");
    }

    if (!validateId(memberId)) {
      logger.warn("Role change failed: invalid member ID", {
        userId,
        workspaceId,
        memberId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid member ID");
    }

    // Validate required fields
    const validation = validateRequiredFields(req.body, ["role"]);
    if (!validation.isValid) {
      logger.warn("Role change failed: missing required fields", {
        userId,
        workspaceId,
        memberId,
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

    // Validate role value
    if (!validateRole(role)) {
      logger.warn("Role change failed: invalid role", {
        userId,
        workspaceId,
        memberId,
        role,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid role value");
    }

    logger.info("Member role change requested", {
      userId,
      workspaceId,
      memberId,
      newRole: role.toUpperCase(),
      ipAddress,
      userAgent,
      traceId,
    });

    const updatedMember = await workspaceService.changeMemberRole(
      workspaceId,
      userId,
      memberId,
      role.toUpperCase()
    );

    logger.info("Member role changed successfully", {
      userId,
      workspaceId,
      memberId,
      newRole: role.toUpperCase(),
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      message: "Member role updated successfully",
      data: { member: updatedMember },
    });
  } catch (error) {
    logger.error("Member role change failed", {
      userId: req.user.id,
      workspaceId: req.params.id,
      memberId: req.params.uid,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

// PATCH /api/workspaces/:id/members/:uid/status
const changeStatus = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const workspaceId = req.params.id;
    const memberId = req.params.uid;
    const userId = req.user.id;
    const { status } = req.body;

    // Validate parameters
    if (!validateId(workspaceId)) {
      logger.warn("Status change failed: invalid workspace ID", {
        userId,
        workspaceId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid workspace ID");
    }

    if (!validateId(memberId)) {
      logger.warn("Status change failed: invalid member ID", {
        userId,
        workspaceId,
        memberId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid member ID");
    }

    // Validate required fields
    const validation = validateRequiredFields(req.body, ["status"]);
    if (!validation.isValid) {
      logger.warn("Status change failed: missing required fields", {
        userId,
        workspaceId,
        memberId,
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

    // Validate status value
    if (!validateStatus(status)) {
      logger.warn("Status change failed: invalid status", {
        userId,
        workspaceId,
        memberId,
        status,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid status value");
    }

    logger.info("Member status change requested", {
      userId,
      workspaceId,
      memberId,
      newStatus: status.toUpperCase(),
      ipAddress,
      userAgent,
      traceId,
    });

    const updatedMember = await workspaceService.changeMemberStatus(
      workspaceId,
      userId,
      memberId,
      status.toUpperCase()
    );

    logger.info("Member status changed successfully", {
      userId,
      workspaceId,
      memberId,
      newStatus: status.toUpperCase(),
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      message: "Member status updated successfully",
      data: { member: updatedMember },
    });
  } catch (error) {
    logger.error("Member status change failed", {
      userId: req.user.id,
      workspaceId: req.params.id,
      memberId: req.params.uid,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

// DELETE /api/workspaces/:id/members/:uid
const removeMember = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const workspaceId = req.params.id;
    const memberId = req.params.uid;
    const userId = req.user.id;

    // Validate parameters
    if (!validateId(workspaceId)) {
      logger.warn("Member removal failed: invalid workspace ID", {
        userId,
        workspaceId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid workspace ID");
    }

    if (!validateId(memberId)) {
      logger.warn("Member removal failed: invalid member ID", {
        userId,
        workspaceId,
        memberId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid member ID");
    }

    logger.info("Member removal requested", {
      userId,
      workspaceId,
      memberId,
      ipAddress,
      userAgent,
      traceId,
    });

    await workspaceService.removeMember(workspaceId, userId, memberId);

    logger.info("Member removed successfully", {
      userId,
      workspaceId,
      memberId,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      message: "Member removed successfully",
    });
  } catch (error) {
    logger.error("Member removal failed", {
      userId: req.user.id,
      workspaceId: req.params.id,
      memberId: req.params.uid,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

// DELETE /api/workspaces/:id/members/:uid/permanent
const deleteMemberPermanent = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const workspaceId = req.params.id;
    const memberId = req.params.uid;
    const userId = req.user.id;

    // Validate parameters
    if (!validateId(workspaceId)) {
      throw new ApiError(400, "Invalid workspace ID");
    }

    if (!validateId(memberId)) {
      throw new ApiError(400, "Invalid member ID");
    }

    logger.info("Permanent member deletion requested", {
      userId,
      workspaceId,
      memberId,
      ipAddress,
      userAgent,
      traceId,
    });

    await workspaceService.deleteMemberPermanent(workspaceId, userId, memberId);

    logger.info("Member permanently removed successfully", {
      userId,
      workspaceId,
      memberId,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      message: "Member removed permanently",
    });
  } catch (error) {
    logger.error("Permanent member deletion failed", {
      userId: req.user.id,
      workspaceId: req.params.id,
      memberId: req.params.uid,
      error: error.message,
      stack: error.stack,
      ipAddress,
      userAgent,
      traceId,
    });
    throw error;
  }
});

// POST /api/workspaces/:id/delete
const requestDeletion = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent, traceId } = getClientInfo(req);

  try {
    const workspaceId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;

    // Validate workspace ID
    if (!validateId(workspaceId)) {
      logger.warn("Deletion request failed: invalid workspace ID", {
        userId,
        workspaceId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ApiError(400, "Invalid workspace ID");
    }

    // Validate reason if provided
    if (reason !== undefined) {
      if (!validateNonEmptyString(reason)) {
        logger.warn("Deletion request failed: invalid reason", {
          userId,
          workspaceId,
          reason,
          ipAddress,
          userAgent,
          traceId,
        });
        throw new ApiError(400, "Reason must be a non-empty string");
      }

      if (reason.length > 500) {
        logger.warn("Deletion request failed: reason too long", {
          userId,
          workspaceId,
          reasonLength: reason.length,
          ipAddress,
          userAgent,
          traceId,
        });
        throw new ApiError(
          400,
          "Reason must be no more than 500 characters long"
        );
      }
    }

    logger.info("Workspace deletion requested", {
      userId,
      workspaceId,
      hasReason: !!reason,
      ipAddress,
      userAgent,
      traceId,
    });

    await workspaceService.requestDeletion(
      workspaceId,
      userId,
      reason ? reason.trim() : undefined
    );

    logger.info("Workspace deletion requested successfully", {
      userId,
      workspaceId,
      ipAddress,
      userAgent,
      traceId,
    });

    res.status(200).json({
      status: "success",
      message: "Workspace deletion requested successfully",
    });
  } catch (error) {
    logger.error("Workspace deletion request failed", {
      userId: req.user.id,
      workspaceId: req.params.id,
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
  getWorkspace,
  updateWorkspace,
  listMembers,
  changeRole,
  changeStatus,
  removeMember,
  deleteMemberPermanent,
  requestDeletion,
  getClientInfo,
  validateRequiredFields,
  validateNonEmptyString,
  validateTimezone,
  validateLocale,
  validateRole,
  validateStatus,
  validateId,
  validatePagination,
};
