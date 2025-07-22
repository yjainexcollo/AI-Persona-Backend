const ApiError = require("../utils/apiError");

function roleMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, "User role not found"));
    }
    // If allowedRoles is empty, allow all authenticated users
    if (allowedRoles.length === 0) return next();
    // Check if user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }
    next();
  };
}

module.exports = roleMiddleware;
