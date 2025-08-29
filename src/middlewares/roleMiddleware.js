const ApiError = require("../utils/apiError");

/**
 * Role-based access control middleware
 * @param {string|string[]} requiredRoles - Role(s) required to access the resource
 * @param {boolean} permitSelf - Whether to allow access if user is accessing their own resource
 * @returns {Function} Express middleware function
 */
function roleMiddleware(requiredRoles, permitSelf = false) {
  // Input validation
  if (requiredRoles === null || requiredRoles === undefined) {
    throw new Error("Required roles parameter is mandatory");
  }

  if (typeof requiredRoles !== "string" && !Array.isArray(requiredRoles)) {
    throw new Error("Required roles must be a string or array of strings");
  }

  if (typeof requiredRoles === "string" && requiredRoles.trim() === "") {
    throw new Error("Required role cannot be an empty string");
  }

  if (Array.isArray(requiredRoles)) {
    if (requiredRoles.length === 0) {
      throw new Error("Required roles array cannot be empty");
    }

    const invalidRoles = requiredRoles.filter(
      (role) => typeof role !== "string" || role.trim() === ""
    );
    if (invalidRoles.length > 0) {
      throw new Error("All roles must be non-empty strings");
    }
  }

  if (typeof permitSelf !== "boolean") {
    throw new Error("PermitSelf parameter must be a boolean");
  }

  return (req, res, next) => {
    try {
      // Check authentication
      if (!req.user) {
        return next(new ApiError(401, "Authentication required"));
      }

      // Validate user object structure
      if (typeof req.user !== "object") {
        return next(new ApiError(401, "Invalid user object"));
      }

      if (!req.user.id || typeof req.user.id !== "string") {
        return next(new ApiError(401, "Invalid user ID"));
      }

      // Convert to array if single role is passed and normalize
      const roles = Array.isArray(requiredRoles)
        ? requiredRoles.map((role) => role.trim().toUpperCase())
        : [requiredRoles.trim().toUpperCase()];

      // Check if user's role is in the required roles (case-insensitive)
      const userRole = req.user.role;
      const hasRequiredRole =
        userRole &&
        typeof userRole === "string" &&
        userRole.trim() !== "" &&
        roles.includes(userRole.trim().toUpperCase());

      // If permitSelf is true, allow access if user is accessing their own resource
      if (permitSelf && !hasRequiredRole) {
        const resourceUserId =
          req.params.uid || req.params.userId || req.params.id;
        if (resourceUserId && resourceUserId === req.user.id) {
          return next();
        }
      }

      if (!hasRequiredRole) {
        return next(new ApiError(403, "Insufficient permissions"));
      }

      next();
    } catch (error) {
      // Handle unexpected errors
      return next(new ApiError(500, "Role validation failed"));
    }
  };
}

module.exports = roleMiddleware;
