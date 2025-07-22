const ApiError = require("../utils/apiError");
const roles = require("../utils/roles");

function permissionMiddleware(requiredPermission) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, "User role not found"));
    }
    const userRole = req.user.role;
    const permissions = roles[userRole] || [];
    if (!permissions.includes(requiredPermission)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }
    next();
  };
}

module.exports = permissionMiddleware;
