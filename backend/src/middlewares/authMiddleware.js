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
    const token = authHeader.split(" ")[1];
    // Verify token and extract payload
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      throw new ApiError(401, "Invalid or expired token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { memberships: true },
    });
    if (!user || !user.isActive) {
      throw new ApiError(401, "User not found or inactive");
    }
    
    let workspace = null;
    if (payload.workspaceId) {
      workspace = await prisma.workspace.findUnique({
        where: { id: payload.workspaceId },
      });
      if (!workspace) {
        throw new ApiError(403, "Workspace not found");
      }
      // Check membership
      const membership = user.memberships.find(
        (m) => m.workspaceId === workspace.id && m.isActive
      );
      if (!membership) {
        throw new ApiError(403, "User is not a member of this workspace");
      }
      req.membership = membership; // Attach membership context
    }
    // Attach user and workspace context to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: payload.role,
      memberships: user.memberships,
    };
    req.workspace = workspace;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
