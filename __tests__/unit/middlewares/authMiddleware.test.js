const authMiddleware = require("../../../src/middlewares/authMiddleware");

// Mock JWT utility
jest.mock("../../../src/utils/jwt", () => ({
  verifyToken: jest.fn(),
}));

// Mock ApiError
jest.mock("../../../src/utils/apiError", () => {
  return class ApiError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
      this.name = "ApiError";
    }
  };
});

describe("AuthMiddleware", () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockVerifyToken;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: null,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Get mocked functions
    mockVerifyToken = require("../../../src/utils/jwt").verifyToken;

    // Reset all mocks
    jest.clearAllMocks();
    global.mockFindUnique.mockReset();
  });

  describe("Authorization Header Validation", () => {
    it("should reject request without authorization header", async () => {
      mockReq.headers = {};

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authorization token missing or malformed",
        })
      );
    });

    it("should reject request with empty authorization header", async () => {
      mockReq.headers.authorization = "";

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authorization token missing or malformed",
        })
      );
    });

    it("should reject malformed authorization header", async () => {
      mockReq.headers.authorization = "InvalidFormat";

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authorization token missing or malformed",
        })
      );
    });

    it("should reject authorization header without Bearer prefix", async () => {
      mockReq.headers.authorization = "Token abc123";

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authorization token missing or malformed",
        })
      );
    });

    it("should reject Bearer header without token", async () => {
      mockReq.headers.authorization = "Bearer ";

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authorization token missing or malformed",
        })
      );
    });

    it("should reject Bearer header with empty token", async () => {
      mockReq.headers.authorization = "Bearer    ";

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authorization token missing or malformed",
        })
      );
    });
  });

  describe("Token Verification", () => {
    it("should reject invalid JWT token", async () => {
      mockReq.headers.authorization = "Bearer invalid-token";
      mockVerifyToken.mockRejectedValue(new Error("jwt malformed"));

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith("invalid-token");
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Invalid or expired token",
        })
      );
    });

    it("should reject expired JWT token", async () => {
      mockReq.headers.authorization = "Bearer expired-token";
      mockVerifyToken.mockRejectedValue(new Error("jwt expired"));

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith("expired-token");
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Invalid or expired token",
        })
      );
    });

    it("should reject token with no payload", async () => {
      mockReq.headers.authorization = "Bearer valid-token";
      mockVerifyToken.mockResolvedValue(null);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Invalid or expired token",
        })
      );
    });

    it("should reject token with missing userId", async () => {
      mockReq.headers.authorization = "Bearer valid-token";
      mockVerifyToken.mockResolvedValue({ someOtherField: "value" });

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Invalid or expired token",
        })
      );
    });

    it("should reject token with empty userId", async () => {
      mockReq.headers.authorization = "Bearer valid-token";
      mockVerifyToken.mockResolvedValue({ userId: "" });

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Invalid or expired token",
        })
      );
    });
  });

  describe("User Validation", () => {
    beforeEach(() => {
      mockReq.headers.authorization = "Bearer valid-token";
      mockVerifyToken.mockResolvedValue({ userId: "user123" });
    });

    it("should reject when user not found", async () => {
      global.mockFindUnique.mockResolvedValue(null);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(global.mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user123" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          workspaceId: true,
        },
      });
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User not found or inactive",
        })
      );
    });

    it("should reject inactive user", async () => {
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        status: "DEACTIVATED",
        workspaceId: "workspace123",
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User account is not active",
        })
      );
    });

    it("should reject user with pending deletion status", async () => {
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        status: "PENDING_DELETION",
        workspaceId: "workspace123",
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User account is not active",
        })
      );
    });

    it("should reject user without workspace", async () => {
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        status: "ACTIVE",
        workspaceId: null,
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "User is not assigned to any workspace",
        })
      );
    });

    it("should reject user with empty workspace", async () => {
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        status: "ACTIVE",
        workspaceId: "",
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "User is not assigned to any workspace",
        })
      );
    });
  });

  describe("Successful Authentication", () => {
    beforeEach(() => {
      mockReq.headers.authorization = "Bearer valid-token";
      mockVerifyToken.mockResolvedValue({ userId: "user123" });
    });

    it("should authenticate valid user and attach user context", async () => {
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        status: "ACTIVE",
        workspaceId: "workspace123",
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");
      expect(global.mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user123" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          workspaceId: true,
        },
      });
      expect(mockReq.user).toEqual({
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        workspaceId: "workspace123",
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should authenticate admin user", async () => {
      const mockUser = {
        id: "admin123",
        email: "admin@example.com",
        name: "Admin User",
        role: "ADMIN",
        status: "ACTIVE",
        workspaceId: "workspace123",
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({
        id: "admin123",
        email: "admin@example.com",
        name: "Admin User",
        role: "ADMIN",
        workspaceId: "workspace123",
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle user with minimal name", async () => {
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "A",
        role: "MEMBER",
        status: "ACTIVE",
        workspaceId: "workspace123",
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.user.name).toBe("A");
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe("Database Error Handling", () => {
    beforeEach(() => {
      mockReq.headers.authorization = "Bearer valid-token";
      mockVerifyToken.mockResolvedValue({ userId: "user123" });
    });

    it("should handle database connection errors", async () => {
      global.mockFindUnique.mockRejectedValue(
        new Error("Database connection failed")
      );

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: "Authentication failed",
        })
      );
    });

    it("should handle database timeout errors", async () => {
      global.mockFindUnique.mockRejectedValue(new Error("Query timeout"));

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: "Authentication failed",
        })
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle case-sensitive Bearer token", async () => {
      mockReq.headers.authorization = "bearer valid-token";

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authorization token missing or malformed",
        })
      );
    });

    it("should handle multiple spaces in authorization header", async () => {
      mockReq.headers.authorization = "Bearer    valid-token";
      mockVerifyToken.mockResolvedValue({ userId: "user123" });

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        status: "ACTIVE",
        workspaceId: "workspace123",
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle authorization header with different case", async () => {
      mockReq.headers.Authorization = "Bearer valid-token";

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authorization token missing or malformed",
        })
      );
    });

    it("should preserve original user object if it exists", async () => {
      mockReq.user = { originalData: "should be overwritten" };
      mockReq.headers.authorization = "Bearer valid-token";
      mockVerifyToken.mockResolvedValue({ userId: "user123" });

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        status: "ACTIVE",
        workspaceId: "workspace123",
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        workspaceId: "workspace123",
      });
      expect(mockReq.user.originalData).toBeUndefined();
    });

    it("should handle token with extra whitespace", async () => {
      mockReq.headers.authorization = "Bearer  \t valid-token \n ";
      mockVerifyToken.mockResolvedValue({ userId: "user123" });

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        status: "ACTIVE",
        workspaceId: "workspace123",
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle JWT payload with additional fields", async () => {
      mockReq.headers.authorization = "Bearer valid-token";
      mockVerifyToken.mockResolvedValue({
        userId: "user123",
        exp: 1234567890,
        iat: 1234567880,
        role: "MEMBER", // This should be ignored, role comes from DB
      });

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "ADMIN", // This should override the JWT role
        status: "ACTIVE",
        workspaceId: "workspace123",
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.user.role).toBe("ADMIN"); // Should use DB role, not JWT role
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle very long tokens", async () => {
      const longToken = "a".repeat(1000);
      mockReq.headers.authorization = `Bearer ${longToken}`;
      mockVerifyToken.mockResolvedValue({ userId: "user123" });

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        status: "ACTIVE",
        workspaceId: "workspace123",
      };
      global.mockFindUnique.mockResolvedValue(mockUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith(longToken);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle Bearer with no space after it", async () => {
      mockReq.headers.authorization = "Bearervalid-token";

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authorization token missing or malformed",
        })
      );
    });
  });
});
