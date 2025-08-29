/**
 * WorkspaceRoutes - Workspace management and administration routes
 * Includes workspace CRUD operations, member management, and role changes
 *
 * Security Note: These routes require ADMIN role and should be monitored
 * for administrative actions and potential security threats.
 */

const express = require("express");
const router = express.Router();
const workspaceController = require("../controllers/workspaceController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const {
  validateWorkspaceUpdate,
  validateRoleChange,
  validateWorkspaceId,
  validateMemberId,
  validateDeletionRequest,
  validateMembersListQuery,
  validateRolePatch,
  validateStatusPatch,
} = require("../middlewares/validationMiddleware");
const { personaLimiter } = require("../middlewares/rateLimiter");
const logger = require("../utils/logger");

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
// GET /api/workspaces/:id - Get workspace details
router.get(
  "/:id",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id } = req.params;
      const clientInfo = getClientInfo(req);

      logger.info("GET /api/workspaces/:id accessed", {
        workspaceId: id,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in GET /api/workspaces/:id logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateWorkspaceId,
  workspaceController.getWorkspace
);

// PUT /api/workspaces/:id - Update workspace
router.put(
  "/:id",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id } = req.params;
      const updateFields = Object.keys(req.body).filter(
        (key) => req.body[key] !== undefined
      );
      const clientInfo = getClientInfo(req);

      logger.info("PUT /api/workspaces/:id accessed", {
        workspaceId: id,
        updateFields,
        hasName: !!req.body.name,
        hasDescription: !!req.body.description,
        hasSettings: !!req.body.settings,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in PUT /api/workspaces/:id logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateWorkspaceId,
  validateWorkspaceUpdate,
  roleMiddleware("ADMIN"),
  workspaceController.updateWorkspace
);

// GET /api/workspaces/:id/members - Smart listing with query params
router.get(
  "/:id/members",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id } = req.params;
      const { limit, offset, role, status, search } = req.query;
      const clientInfo = getClientInfo(req);

      logger.info("GET /api/workspaces/:id/members accessed", {
        workspaceId: id,
        queryParams: {
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
          role,
          status,
          hasSearch: !!search,
        },
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in GET /api/workspaces/:id/members logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateWorkspaceId,
  validateMembersListQuery,
  roleMiddleware("ADMIN"),
  workspaceController.listMembers
);

// PATCH /api/workspaces/:id/members/:uid/role - Change member role
router.patch(
  "/:id/members/:uid/role",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id, uid } = req.params;
      const { role } = req.body;
      const clientInfo = getClientInfo(req);

      logger.info("PATCH /api/workspaces/:id/members/:uid/role accessed", {
        workspaceId: id,
        memberId: uid,
        newRole: role,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error(
        "Error in PATCH /api/workspaces/:id/members/:uid/role logging",
        {
          error: error.message,
          ...clientInfo,
        }
      );
      next(error);
    }
  },
  validateWorkspaceId,
  validateMemberId,
  validateRolePatch,
  roleMiddleware("ADMIN"),
  workspaceController.changeRole
);

// PATCH /api/workspaces/:id/members/:uid/status - Change member status
router.patch(
  "/:id/members/:uid/status",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id, uid } = req.params;
      const { status } = req.body;
      const clientInfo = getClientInfo(req);

      logger.info("PATCH /api/workspaces/:id/members/:uid/status accessed", {
        workspaceId: id,
        memberId: uid,
        newStatus: status,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error(
        "Error in PATCH /api/workspaces/:id/members/:uid/status logging",
        {
          error: error.message,
          ...clientInfo,
        }
      );
      next(error);
    }
  },
  validateWorkspaceId,
  validateMemberId,
  validateStatusPatch,
  roleMiddleware("ADMIN"),
  workspaceController.changeStatus
);

// DELETE /api/workspaces/:id/members/:uid - Remove member
router.delete(
  "/:id/members/:uid",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id, uid } = req.params;
      const clientInfo = getClientInfo(req);

      logger.info("DELETE /api/workspaces/:id/members/:uid accessed", {
        workspaceId: id,
        memberId: uid,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in DELETE /api/workspaces/:id/members/:uid logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateWorkspaceId,
  validateMemberId,
  roleMiddleware("ADMIN"),
  workspaceController.removeMember
);

// DELETE /api/workspaces/:id/members/:uid/permanent - Permanently delete member
router.delete(
  "/:id/members/:uid/permanent",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id, uid } = req.params;
      const clientInfo = getClientInfo(req);

      logger.info(
        "DELETE /api/workspaces/:id/members/:uid/permanent accessed",
        {
          workspaceId: id,
          memberId: uid,
          ...clientInfo,
        }
      );

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error(
        "Error in DELETE /api/workspaces/:id/members/:uid/permanent logging",
        {
          error: error.message,
          ...clientInfo,
        }
      );
      next(error);
    }
  },
  validateWorkspaceId,
  validateMemberId,
  roleMiddleware("ADMIN"),
  workspaceController.deleteMemberPermanent
);

// POST /api/workspaces/:id/delete - Request workspace deletion
router.post(
  "/:id/delete",
  authMiddleware,
  personaLimiter,
  (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const clientInfo = getClientInfo(req);

      logger.info("POST /api/workspaces/:id/delete accessed", {
        workspaceId: id,
        hasReason: !!reason,
        reasonLength: reason ? reason.length : 0,
        ...clientInfo,
      });

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);
      logger.error("Error in POST /api/workspaces/:id/delete logging", {
        error: error.message,
        ...clientInfo,
      });
      next(error);
    }
  },
  validateWorkspaceId,
  validateDeletionRequest,
  roleMiddleware("ADMIN"),
  workspaceController.requestDeletion
);

module.exports = router;
