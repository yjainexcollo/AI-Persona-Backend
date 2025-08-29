const ApiError = require("../utils/apiError");
const roles = require("../utils/roles");

/**
 * Permission middleware factory function
 * Creates middleware that checks if authenticated user has required permission
 *
 * @param {string} requiredPermission - The permission required to access the route
 * @returns {Function} Express middleware function
 */
function permissionMiddleware(requiredPermission) {
  // Validate required permission parameter
  if (typeof requiredPermission !== "string") {
    throw new Error("Required permission must be a non-empty string");
  }

  if (!requiredPermission || requiredPermission.trim() === "") {
    throw new Error("Required permission cannot be empty");
  }

  // Trim the permission for consistent comparison
  const trimmedPermission = requiredPermission.trim();

  return (req, res, next) => {
    try {
      // Check if user object exists and has role
      if (!req.user) {
        return next(new ApiError(401, "User authentication required"));
      }

      if (
        !req.user.role ||
        typeof req.user.role !== "string" ||
        req.user.role.trim() === ""
      ) {
        return next(new ApiError(401, "User role not found"));
      }

      const userRole = req.user.role;
      const permissions = roles[userRole];

      // Check if role exists in roles configuration
      if (!permissions || !Array.isArray(permissions)) {
        return next(new ApiError(403, "Invalid user role"));
      }

      // Check if user has required permission
      if (!permissions.includes(trimmedPermission)) {
        return next(new ApiError(403, "Insufficient permissions"));
      }

      // User has required permission, proceed
      next();
    } catch (error) {
      // Handle any unexpected errors
      return next(new ApiError(500, "Permission check failed"));
    }
  };
}

module.exports = permissionMiddleware;
