/**
 * AuthMiddleware - Protects routes by verifying JWT access tokens.
 * Attaches user and workspace context to req for downstream use.
 * Uses centralized error handling and is extensible for multi-tenancy.
 *
 * Usage:
 *   app.use('/api/protected', authMiddleware, protectedRoutes);
 */

const { verifyToken } = require("../utils/jwt");
const ApiError = require("../utils/apiError");
const prisma = require("../utils/prisma");
const logger = require("../utils/logger");

async function authMiddleware(req, res, next) {
  try {
    // Get token from Authorization header (Bearer <token>)
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Authorization token missing or malformed");
    }

    const tokenParts = authHeader
      .split(" ")
      .filter((part) => part.trim() !== "");
    if (tokenParts.length !== 2) {
      throw new ApiError(401, "Authorization token missing or malformed");
    }

    const token = tokenParts[1];
    if (!token || token.trim() === "") {
      throw new ApiError(401, "Authorization token missing or malformed");
    }

    // Verify token and extract payload (now async)
    let payload;
    try {
      payload = await verifyToken(token);
    } catch (jwtError) {
      logger.warn("JWT verification failed:", {
        error: jwtError.message,
        path: req.path,
      });
      // Wrap JWT errors in ApiError for consistent error handling
      throw new ApiError(401, "Invalid or expired token");
    }

    if (!payload || !payload.userId) {
      logger.warn("Invalid JWT payload:", { path: req.path });
      throw new ApiError(401, "Invalid or expired token");
    }

    // Fetch user from database
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          workspaceId: true,
        },
      });
    } catch (dbError) {
      logger.error("Database error in authMiddleware:", {
        error: dbError.message,
        code: dbError.code,
        userId: payload.userId,
        path: req.path,
      });
      throw new ApiError(500, "Database connection error");
    }

    if (!user) {
      logger.warn("User not found:", { userId: payload.userId, path: req.path });
      throw new ApiError(401, "User not found or inactive");
    }

    if (user.status !== "ACTIVE") {
      logger.warn("Inactive user attempted access:", {
        userId: user.id,
        status: user.status,
        path: req.path,
      });
      throw new ApiError(401, "User account is not active");
    }

    if (!user.workspaceId) {
      logger.warn("User without workspace attempted access:", {
        userId: user.id,
        path: req.path,
      });
      throw new ApiError(403, "User is not assigned to any workspace");
    }

    // Attach user and workspace context to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspaceId: user.workspaceId,
      emailVerified: user.emailVerified,
    };

    next();
  } catch (err) {
    // If it's already an ApiError, pass it through
    if (err instanceof ApiError) {
      next(err);
    } else {
      // Log unexpected errors with full context
      logger.error("Unexpected error in authMiddleware:", {
        error: err.message,
        stack: err.stack,
        path: req.path,
      });
      // Wrap unexpected errors
      next(new ApiError(500, "Authentication failed"));
    }
  }
}

module.exports = authMiddleware;
