const { body, param, query, validationResult } = require("express-validator");
const ApiError = require("../utils/apiError");

/**
 * Handle validation errors from express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleValidationErrors = (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((error) => {
        // Include field name in error message for better UX
        const fieldName = error.param || "field";
        return `${fieldName}: ${error.msg}`;
      });
      return next(
        new ApiError(400, `Validation failed: ${errorMessages.join(", ")}`)
      );
    }
    next();
  } catch (error) {
    // Handle unexpected errors in validation processing
    return next(new ApiError(500, "Validation processing failed"));
  }
};

// Registration validation
const validateRegistration = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  handleValidationErrors,
];

// Login validation
const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

// Password reset request validation
const validatePasswordResetRequest = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  handleValidationErrors,
];

// Password reset validation
const validatePasswordReset = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  handleValidationErrors,
];

// Email verification validation
const validateEmailVerification = [
  query("token").notEmpty().withMessage("Verification token is required"),
  handleValidationErrors,
];

// Resend verification validation
const validateResendVerification = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  handleValidationErrors,
];

// Token refresh validation
const validateTokenRefresh = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
  handleValidationErrors,
];

// Session revocation validation
const validateSessionRevocation = [
  param("sessionId").notEmpty().withMessage("Session ID is required"),
  handleValidationErrors,
];

// User ID parameter validation
const validateUserId = [
  param("id").notEmpty().withMessage("User ID is required"),
  handleValidationErrors,
];

// Pagination validation
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  handleValidationErrors,
];

// Search validation
const validateSearch = [
  query("q")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Search query must be at least 2 characters long"),
  handleValidationErrors,
];

// Date range validation
const validateDateRange = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
  handleValidationErrors,
];

// Profile validation schemas
const validateProfileUpdate = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("avatarUrl")
    .optional()
    .isURL()
    .withMessage("Avatar URL must be a valid URL"),
  body("timezone")
    .optional()
    .isString()
    .withMessage("Timezone must be a string"),
  body("locale").optional().isString().withMessage("Locale must be a string"),
  handleValidationErrors,
];

const validatePasswordChange = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  handleValidationErrors,
];

const validateAvatarUpload = [
  body("presignedUrl")
    .optional()
    .isURL()
    .withMessage("Presigned URL must be a valid URL"),
  handleValidationErrors,
];

// Workspace validation schemas
const validateWorkspaceUpdate = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Workspace name must be between 2 and 100 characters"),
  body("timezone")
    .optional()
    .isString()
    .withMessage("Timezone must be a string"),
  body("locale").optional().isString().withMessage("Locale must be a string"),
  handleValidationErrors,
];

const validateRoleChange = [
  body("role")
    .isIn(["ADMIN", "MEMBER"])
    .withMessage("Role must be either 'ADMIN' or 'MEMBER'"),
  handleValidationErrors,
];

const validateWorkspaceId = [
  param("id").notEmpty().withMessage("Workspace ID is required"),
  handleValidationErrors,
];

const validateMemberId = [
  param("uid").notEmpty().withMessage("Member ID is required"),
  handleValidationErrors,
];

const validateDeletionRequest = [
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must be less than 500 characters"),
  handleValidationErrors,
];

// New smart member management validation schemas
const validateMembersListQuery = [
  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search term must be less than 100 characters"),
  query("status")
    .optional()
    .isIn(["ACTIVE", "DEACTIVATED", "PENDING_VERIFY"])
    .withMessage("Status must be one of: ACTIVE, DEACTIVATED, PENDING_VERIFY"),
  query("role")
    .optional()
    .isIn(["ADMIN", "MEMBER"])
    .withMessage("Role must be one of: ADMIN, MEMBER"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  handleValidationErrors,
];

const validateRolePatch = [
  body("role")
    .isIn(["ADMIN", "MEMBER"])
    .withMessage("Role must be either 'ADMIN' or 'MEMBER'"),
  handleValidationErrors,
];

const validateStatusPatch = [
  body("status")
    .isIn(["ACTIVE", "DEACTIVATED", "PENDING_VERIFY"])
    .withMessage("Status must be one of: ACTIVE, DEACTIVATED, PENDING_VERIFY"),
  handleValidationErrors,
];

/**
 * Generic string validation factory
 * @param {string} fieldName - Name of the field to validate
 * @param {number} minLength - Minimum length (default: 1)
 * @param {number} maxLength - Maximum length (default: 255)
 * @returns {Array} Validation middleware array
 */
const validateString = (fieldName, minLength = 1, maxLength = 255) => {
  if (typeof fieldName !== "string" || !fieldName.trim()) {
    throw new Error("Field name must be a non-empty string");
  }
  if (typeof minLength !== "number" || minLength < 0) {
    throw new Error("Min length must be a non-negative number");
  }
  if (typeof maxLength !== "number" || maxLength < minLength) {
    throw new Error(
      "Max length must be a number greater than or equal to min length"
    );
  }

  return [
    body(fieldName)
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(
        `${fieldName} must be between ${minLength} and ${maxLength} characters`
      ),
    handleValidationErrors,
  ];
};

/**
 * Generic email validation factory
 * @param {string} fieldName - Name of the field to validate
 * @returns {Array} Validation middleware array
 */
const validateEmail = (fieldName) => {
  if (typeof fieldName !== "string" || !fieldName.trim()) {
    throw new Error("Field name must be a non-empty string");
  }

  return [
    body(fieldName)
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    handleValidationErrors,
  ];
};

/**
 * Generic ID validation factory
 * @param {string} fieldName - Name of the field to validate
 * @returns {Array} Validation middleware array
 */
const validateId = (fieldName) => {
  if (typeof fieldName !== "string" || !fieldName.trim()) {
    throw new Error("Field name must be a non-empty string");
  }

  return [
    param(fieldName).notEmpty().withMessage(`${fieldName} is required`),
    handleValidationErrors,
  ];
};

// Persona validation schemas
const validatePersonaId = [
  param("id").notEmpty().withMessage("Persona ID is required"),
  handleValidationErrors,
];

const validateChatMessage = [
  param("id").notEmpty().withMessage("Persona ID is required"),
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 1, max: 10000 })
    .withMessage("Message must be between 1 and 10000 characters"),
  body("conversationId")
    .optional()
    .matches(/^[a-z0-9]{25}$/)
    .withMessage("Conversation ID must be a valid cuid"),
  handleValidationErrors,
];

const validateFavouriteToggle = [
  param("id").notEmpty().withMessage("Persona ID is required"),
  handleValidationErrors,
];

// Conversation validation schemas
const validateConversationId = [
  param("id")
    .matches(/^[a-z0-9]{25}$/)
    .withMessage("Conversation ID must be a valid cuid"),
  handleValidationErrors,
];

const validateConversationVisibility = [
  param("id")
    .matches(/^[a-z0-9]{25}$/)
    .withMessage("Conversation ID must be a valid cuid"),
  body("visibility")
    .isIn(["PRIVATE", "SHARED"])
    .withMessage("Visibility must be either PRIVATE or SHARED"),
  handleValidationErrors,
];

const validateConversationQuery = [
  query("archived")
    .optional()
    .isBoolean()
    .withMessage("Archived parameter must be a boolean"),
  handleValidationErrors,
];

// Message validation schemas
const validateMessageId = [
  param("id")
    .matches(/^[a-z0-9]{25}$/)
    .withMessage("Message ID must be a valid cuid"),
  handleValidationErrors,
];

const validateMessageEdit = [
  param("id")
    .matches(/^[a-z0-9]{25}$/)
    .withMessage("Message ID must be a valid cuid"),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 1, max: 4000 })
    .withMessage("Content must be between 1 and 4000 characters"),
  handleValidationErrors,
];

// File upload validation schemas
const validateFileUpload = [
  param("id")
    .matches(/^[a-z0-9]{25}$/)
    .withMessage("Conversation ID must be a valid cuid"),
  body("filename")
    .trim()
    .notEmpty()
    .withMessage("Filename is required")
    .isLength({ max: 200 })
    .withMessage("Filename must be less than 200 characters"),
  body("mimeType")
    .trim()
    .notEmpty()
    .withMessage("Mime type is required")
    .matches(/^(image\/|application\/pdf)$/)
    .withMessage("Invalid mime type. Allowed: image/*, application/pdf"),
  body("sizeBytes")
    .isInt({ min: 1, max: 10485760 })
    .withMessage("File size must be between 1 and 10 MB"),
  handleValidationErrors,
];

// Reaction validation schemas
const validateReaction = [
  param("id")
    .matches(/^[a-z0-9]{25}$/)
    .withMessage("Message ID must be a valid cuid"),
  body("type")
    .isIn(["LIKE", "DISLIKE"])
    .withMessage("Reaction type must be LIKE or DISLIKE"),
  handleValidationErrors,
];

// Archive validation schemas
const validateArchive = [
  param("id")
    .matches(/^[a-z0-9]{25}$/)
    .withMessage("Conversation ID must be a valid cuid"),
  body("archived").isBoolean().withMessage("Archived must be a boolean"),
  handleValidationErrors,
];

// Share link validation schemas
const validateShareLink = [
  param("id")
    .matches(/^[a-z0-9]{25}$/)
    .withMessage("Conversation ID must be a valid cuid"),
  body("expiresInDays")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Expires in days must be between 1 and 365"),
  handleValidationErrors,
];

// Shared token validation schemas
const validateSharedToken = [
  param("token")
    .isLength({ min: 16 })
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage(
      "Token must be at least 16 characters and contain only letters, numbers, hyphens, and underscores"
    ),
  handleValidationErrors,
];

// Webhook validation schemas
const validateWebhookTraits = [
  body("personaName")
    .notEmpty()
    .withMessage("Persona name is required")
    .isString()
    .withMessage("Persona name must be a string"),
  body("metadata")
    .custom((value) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error("Metadata must be an object");
      }
      return true;
    })
    .withMessage("Metadata must be an object"),
  body("metadata.about")
    .notEmpty()
    .withMessage("About field is required")
    .isString()
    .withMessage("About field must be a string"),
  body("metadata.coreExpertise")
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error("Core expertise must be an array");
      }
      return true;
    })
    .withMessage("Core expertise must be an array"),
  body("metadata.communicationStyle")
    .notEmpty()
    .withMessage("Communication style is required")
    .isString()
    .withMessage("Communication style must be a string"),
  body("metadata.traits")
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error("Traits must be an array");
      }
      return true;
    })
    .withMessage("Traits must be an array"),
  body("metadata.painPoints")
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error("Pain points must be an array");
      }
      return true;
    })
    .withMessage("Pain points must be an array"),
  body("metadata.keyResponsibilities")
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error("Key responsibilities must be an array");
      }
      return true;
    })
    .withMessage("Key responsibilities must be an array"),
  handleValidationErrors,
];

module.exports = {
  validateRegistration,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateEmailVerification,
  validateResendVerification,
  validateTokenRefresh,
  validateSessionRevocation,
  validateUserId,
  validatePagination,
  validateSearch,
  validateDateRange,
  validateString,
  validateEmail,
  validateId,
  // Profile validation schemas
  validateProfileUpdate,
  validatePasswordChange,
  validateAvatarUpload,
  // Workspace validation schemas
  validateWorkspaceUpdate,
  validateRoleChange,
  validateWorkspaceId,
  validateMemberId,
  validateDeletionRequest,
  // New smart member management validation schemas
  validateMembersListQuery,
  validateRolePatch,
  validateStatusPatch,
  // Persona validation schemas
  validatePersonaId,
  validateChatMessage,
  validateFavouriteToggle,
  // Conversation validation schemas
  validateConversationId,
  validateConversationVisibility,
  validateConversationQuery,
  // Message validation schemas
  validateMessageId,
  validateMessageEdit,
  // File upload validation schemas
  validateFileUpload,
  // Reaction validation schemas
  validateReaction,
  // Archive validation schemas
  validateArchive,
  // Share link validation schemas
  validateShareLink,
  // Shared token validation schemas
  validateSharedToken,
  // Webhook validation schemas
  validateWebhookTraits,
  handleValidationErrors,
};
