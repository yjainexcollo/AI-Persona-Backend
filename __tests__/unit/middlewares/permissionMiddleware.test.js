const permissionMiddleware = require("../../../src/middlewares/permissionMiddleware");
const ApiError = require("../../../src/utils/apiError");

// Mock the roles utility
jest.mock("../../../src/utils/roles", () => ({
  ADMIN: ["read", "write", "delete", "manage_users", "manage_workspace"],
  MEMBER: ["read", "write"],
  GUEST: ["read"],
}));

describe("PermissionMiddleware", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: {
        id: "user123",
        email: "test@example.com",
        role: "MEMBER",
        workspaceId: "workspace123",
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("Middleware Factory Function", () => {
    it("should throw error for missing required permission", () => {
      expect(() => permissionMiddleware()).toThrow(
        "Required permission must be a non-empty string"
      );
    });

    it("should throw error for null required permission", () => {
      expect(() => permissionMiddleware(null)).toThrow(
        "Required permission must be a non-empty string"
      );
    });

    it("should throw error for empty string required permission", () => {
      expect(() => permissionMiddleware("")).toThrow(
        "Required permission cannot be empty"
      );
    });

    it("should throw error for whitespace-only required permission", () => {
      expect(() => permissionMiddleware("   ")).toThrow(
        "Required permission cannot be empty"
      );
    });

    it("should throw error for non-string required permission", () => {
      expect(() => permissionMiddleware(123)).toThrow(
        "Required permission must be a non-empty string"
      );
      expect(() => permissionMiddleware({})).toThrow(
        "Required permission must be a non-empty string"
      );
      expect(() => permissionMiddleware([])).toThrow(
        "Required permission must be a non-empty string"
      );
      expect(() => permissionMiddleware(true)).toThrow(
        "Required permission must be a non-empty string"
      );
    });

    it("should return a function when valid permission provided", () => {
      const middleware = permissionMiddleware("read");
      expect(typeof middleware).toBe("function");
    });
  });

  describe("User Authentication Validation", () => {
    it("should reject request with no user object", () => {
      mockReq.user = null;
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User authentication required",
        })
      );
    });

    it("should reject request with undefined user object", () => {
      mockReq.user = undefined;
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User authentication required",
        })
      );
    });

    it("should reject request with missing user property", () => {
      delete mockReq.user;
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User authentication required",
        })
      );
    });
  });

  describe("Role Validation", () => {
    it("should reject user with missing role property", () => {
      delete mockReq.user.role;
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User role not found",
        })
      );
    });

    it("should reject user with null role", () => {
      mockReq.user.role = null;
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User role not found",
        })
      );
    });

    it("should reject user with undefined role", () => {
      mockReq.user.role = undefined;
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User role not found",
        })
      );
    });

    it("should reject user with empty string role", () => {
      mockReq.user.role = "";
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User role not found",
        })
      );
    });

    it("should reject user with whitespace-only role", () => {
      mockReq.user.role = "   ";
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User role not found",
        })
      );
    });

    it("should reject user with non-string role", () => {
      mockReq.user.role = 123;
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User role not found",
        })
      );
    });

    it("should reject user with invalid role", () => {
      mockReq.user.role = "INVALID_ROLE";
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Invalid user role",
        })
      );
    });

    it("should handle case-sensitive role comparison", () => {
      mockReq.user.role = "member"; // lowercase
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Invalid user role",
        })
      );
    });
  });

  describe("Permission Validation", () => {
    it("should allow ADMIN user with read permission", () => {
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should allow ADMIN user with write permission", () => {
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware("write");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow ADMIN user with delete permission", () => {
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware("delete");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow ADMIN user with manage_users permission", () => {
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware("manage_users");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow MEMBER user with read permission", () => {
      mockReq.user.role = "MEMBER";
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow MEMBER user with write permission", () => {
      mockReq.user.role = "MEMBER";
      const middleware = permissionMiddleware("write");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow GUEST user with read permission", () => {
      mockReq.user.role = "GUEST";
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should reject MEMBER user without delete permission", () => {
      mockReq.user.role = "MEMBER";
      const middleware = permissionMiddleware("delete");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Insufficient permissions",
        })
      );
    });

    it("should reject MEMBER user without manage_users permission", () => {
      mockReq.user.role = "MEMBER";
      const middleware = permissionMiddleware("manage_users");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Insufficient permissions",
        })
      );
    });

    it("should reject GUEST user without write permission", () => {
      mockReq.user.role = "GUEST";
      const middleware = permissionMiddleware("write");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Insufficient permissions",
        })
      );
    });

    it("should reject GUEST user without delete permission", () => {
      mockReq.user.role = "GUEST";
      const middleware = permissionMiddleware("delete");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Insufficient permissions",
        })
      );
    });

    it("should handle non-existent permission", () => {
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware("non_existent_permission");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Insufficient permissions",
        })
      );
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle request object without headers", () => {
      delete mockReq.headers;
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle request object with additional properties", () => {
      mockReq.additionalProperty = "test";
      mockReq.user.role = "ADMIN";
      mockReq.user.additionalUserProperty = "test";
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle permission with special characters", () => {
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware("read-write_permission.test");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Insufficient permissions",
        })
      );
    });

    it("should handle very long permission names", () => {
      const longPermission = "a".repeat(1000);
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware(longPermission);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Insufficient permissions",
        })
      );
    });

    it("should handle multiple middleware instances", () => {
      const readMiddleware = permissionMiddleware("read");
      const writeMiddleware = permissionMiddleware("write");

      mockReq.user.role = "MEMBER";

      // Test read middleware
      readMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenLastCalledWith();

      mockNext.mockClear();

      // Test write middleware
      writeMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenLastCalledWith();
    });

    it("should handle middleware reuse with different users", () => {
      const middleware = permissionMiddleware("delete");

      // Test with ADMIN user
      mockReq.user.role = "ADMIN";
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenLastCalledWith();

      mockNext.mockClear();

      // Test with MEMBER user
      mockReq.user.role = "MEMBER";
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenLastCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Insufficient permissions",
        })
      );
    });
  });

  describe("Integration Scenarios", () => {
    it("should work in a typical Express route scenario", () => {
      // Simulate Express route: app.get('/admin', authMiddleware, permissionMiddleware('manage_users'), handler)
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware("manage_users");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should work with chained permission checks", () => {
      const readMiddleware = permissionMiddleware("read");
      const writeMiddleware = permissionMiddleware("write");

      mockReq.user.role = "MEMBER";

      // First check - read permission (should pass)
      readMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenLastCalledWith();

      mockNext.mockClear();

      // Second check - write permission (should pass for MEMBER)
      writeMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenLastCalledWith();
    });

    it("should fail early in permission chain", () => {
      const readMiddleware = permissionMiddleware("read");
      const deleteMiddleware = permissionMiddleware("delete");

      mockReq.user.role = "GUEST";

      // First check - read permission (should pass)
      readMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenLastCalledWith();

      mockNext.mockClear();

      // Second check - delete permission (should fail for GUEST)
      deleteMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenLastCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Insufficient permissions",
        })
      );
    });
  });

  describe("Advanced Edge Cases", () => {
    it("should handle role with extra whitespace", () => {
      mockReq.user.role = " ADMIN ";
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Invalid user role",
        })
      );
    });

    it("should handle permission with leading/trailing spaces", () => {
      // This should work since " read ".trim() === "read" and ADMIN has "read" permission
      const middleware = permissionMiddleware(" read ");
      expect(typeof middleware).toBe("function");

      // Test that it works correctly - ADMIN should have read permission
      mockReq.user.role = "ADMIN";
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle complex user object structures", () => {
      mockReq.user = {
        id: "user123",
        profile: { name: "Test User" },
        role: "MEMBER",
        permissions: ["custom_permission"], // This should be ignored
        workspaceId: "workspace123",
      };
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle role as object property", () => {
      mockReq.user.role = { value: "ADMIN" }; // Non-string role
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User role not found",
        })
      );
    });

    it("should handle unicode characters in permission names", () => {
      const unicodePermission = "read_文档";
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware(unicodePermission);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Insufficient permissions",
        })
      );
    });

    it("should handle numeric strings in role", () => {
      mockReq.user.role = "123";
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Invalid user role",
        })
      );
    });

    it("should handle boolean role values", () => {
      mockReq.user.role = true;
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User role not found",
        })
      );
    });

    it("should handle array role values", () => {
      mockReq.user.role = ["ADMIN", "MEMBER"];
      const middleware = permissionMiddleware("read");

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "User role not found",
        })
      );
    });

    it("should handle middleware called multiple times with same request", () => {
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware("read");

      // Call middleware multiple times
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenLastCalledWith();

      mockNext.mockClear();

      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenLastCalledWith();
    });

    it("should handle permission names with numbers", () => {
      const numericPermission = "level_2_access";
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware(numericPermission);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "Insufficient permissions",
        })
      );
    });
  });

  describe("Performance and Memory Tests", () => {
    it("should handle creating many middleware instances", () => {
      const middlewares = [];

      // Create 100 middleware instances
      for (let i = 0; i < 100; i++) {
        middlewares.push(permissionMiddleware(`permission_${i}`));
      }

      expect(middlewares).toHaveLength(100);
      middlewares.forEach((middleware) => {
        expect(typeof middleware).toBe("function");
      });
    });

    it("should handle rapid successive calls", () => {
      mockReq.user.role = "ADMIN";
      const middleware = permissionMiddleware("read");

      // Call middleware 50 times rapidly
      for (let i = 0; i < 50; i++) {
        middleware(mockReq, mockRes, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(50);
      expect(mockNext).toHaveBeenLastCalledWith();
    });
  });
});
