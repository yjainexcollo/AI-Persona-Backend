const jwt = require("jsonwebtoken");

// Mock JWT verification for tests
const mockVerifyToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || "test-secret-key-for-jwt-signing"
    );
  } catch (error) {
    throw new Error("Invalid or expired access token");
  }
};

module.exports = {
  mockVerifyToken,
}; 