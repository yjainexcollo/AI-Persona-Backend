const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const authHelpers = {
  generateTestToken: (user) => {
    return jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "test-secret-key-for-jwt-signing",
      { expiresIn: "1h" }
    );
  },

  verifyTestToken: (token) => {
    try {
      return jwt.verify(
        token,
        process.env.JWT_SECRET || "test-secret-key-for-jwt-signing"
      );
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  },

  hashPassword: async (password) => {
    return await bcrypt.hash(password, 10);
  },

  verifyPassword: async (password, hash) => {
    return await bcrypt.compare(password, hash);
  },

  createTestUserData: (overrides = {}) => {
    return {
      email: `test-${Date.now()}@example.com`,
      password: "TestPassword123!",
      name: "Test User",
      status: "ACTIVE",
      emailVerified: true,
      role: "MEMBER",
      ...overrides,
    };
  },
};

module.exports = authHelpers;
