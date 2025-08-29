/**
 * ProfileRoutes - Enhanced user profile management routes
 * Includes profile updates, avatar uploads, password changes, and comprehensive logging
 */

const express = require("express");
const multer = require("multer");
const router = express.Router();
const profileController = require("../controllers/profileController");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  validateProfileUpdate,
  validatePasswordChange,
  validateAvatarUpload,
} = require("../middlewares/validationMiddleware");
const { personaLimiter } = require("../middlewares/rateLimiter");
const logger = require("../utils/logger");

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed"
        ),
        false
      );
    }
  },
});

// Helper function to get client information for logging
const getClientInfo = (req) => {
  return {
    ip:
      req.ip ||
      req.connection?.remoteAddress ||
      req.headers["x-forwarded-for"] ||
      "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
    userId: req.user?.id || "unauthenticated",
    traceId: req.headers["x-trace-id"] || "unknown",
    requestId: req.headers["x-request-id"] || "unknown",
  };
};

// Routes
// GET /api/users/me - Get current user profile
router.get(
  "/me",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const clientInfo = getClientInfo(req);
      logger.info("GET /api/users/me accessed", { ...clientInfo });
      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in GET /api/users/me logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  profileController.getMe
);

// GET /api/users/profile (alias for backward compatibility)
router.get(
  "/profile",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const clientInfo = getClientInfo(req);
      logger.info("GET /api/users/profile accessed", { ...clientInfo });
      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in GET /api/users/profile logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  profileController.getMe
);

// PUT /api/users/me - Update current user profile
router.put(
  "/me",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const { name, email, timezone, locale } = req.body;
      const clientInfo = getClientInfo(req);
      
      logger.info("PUT /api/users/me accessed", {
        updateFields: Object.keys(req.body).filter(key => req.body[key] !== undefined),
        hasName: !!name,
        hasEmail: !!email,
        hasTimezone: !!timezone,
        hasLocale: !!locale,
        ...clientInfo,
      });
      
      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in PUT /api/users/me logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateProfileUpdate,
  profileController.updateMe
);

// PUT /api/users/profile (alias for backward compatibility)
router.put(
  "/profile",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const { name, email, timezone, locale } = req.body;
      const clientInfo = getClientInfo(req);
      
      logger.info("PUT /api/users/profile accessed", {
        updateFields: Object.keys(req.body).filter(key => req.body[key] !== undefined),
        hasName: !!name,
        hasEmail: !!email,
        hasTimezone: !!timezone,
        hasLocale: !!locale,
        ...clientInfo,
      });
      
      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in PUT /api/users/profile logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateProfileUpdate,
  profileController.updateMe
);

// POST /api/users/me/avatar - Upload avatar
router.post(
  "/me/avatar",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const clientInfo = getClientInfo(req);
      logger.info("POST /api/users/me/avatar accessed", { ...clientInfo });
      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in POST /api/users/me/avatar logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  upload.single("avatar"),
  (req, res, next) => {
    try {
      const clientInfo = getClientInfo(req);
      if (req.file) {
        logger.info("Avatar file uploaded", {
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          ...clientInfo,
        });
      } else {
        logger.warn("No avatar file provided", { ...clientInfo });
      }
      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in avatar file logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateAvatarUpload,
  profileController.uploadAvatar
);

// PUT /api/users/me/password - Change password
router.put(
  "/me/password",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const clientInfo = getClientInfo(req);
      
      logger.info("PUT /api/users/me/password accessed", {
        hasCurrentPassword: !!currentPassword,
        hasNewPassword: !!newPassword,
        newPasswordLength: newPassword ? newPassword.length : 0,
        ...clientInfo,
      });
      
      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in PUT /api/users/me/password logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validatePasswordChange,
  profileController.changePassword
);

module.exports = router;
