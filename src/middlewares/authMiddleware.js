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
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
      // Wrap JWT errors in ApiError for consistent error handling
      throw new ApiError(401, "Invalid or expired token");
    }

    if (!payload || !payload.userId) {
      throw new ApiError(401, "Invalid or expired token");
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
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

    if (!user) {
      throw new ApiError(401, "User not found or inactive");
    }

    if (user.status !== "ACTIVE") {
      throw new ApiError(401, "User account is not active");
    }

    if (!user.workspaceId) {
      throw new ApiError(403, "User is not assigned to any workspace");
    }

    // Attach user and workspace context to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspaceId: user.workspaceId,
    };

    next();
  } catch (err) {
    // If it's already an ApiError, pass it through
    if (err instanceof ApiError) {
      next(err);
    } else {
      // Wrap unexpected errors
      next(new ApiError(500, "Authentication failed"));
    }
  }
}

module.exports = authMiddleware;
