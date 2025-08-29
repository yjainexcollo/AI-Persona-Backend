const jwt = require("jsonwebtoken");
const ApiError = require("../../src/utils/apiError");

// Test-specific auth middleware that uses simple JWT verification
async function testAuthMiddleware(req, res, next) {
  try {
    // Get token from Authorization header (Bearer <token>)
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Authorization token missing or malformed");
    }
    const token = authHeader.split(" ")[1];

    // Verify token using simple secret for tests
    const secret = process.env.JWT_SECRET || "test-secret-key-for-jwt-signing";
    const payload = jwt.verify(token, secret);

    if (!payload || !payload.userId) {
      throw new ApiError(401, "Invalid or expired token");
    }

    // Use the test Prisma client
    const user = await global.testPrisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user || user.status !== "ACTIVE") {
      throw new ApiError(401, "User not found or inactive");
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
    next(err);
  }
}

module.exports = testAuthMiddleware;
