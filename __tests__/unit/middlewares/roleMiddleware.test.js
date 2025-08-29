const roleMiddleware = require("../../../src/middlewares/roleMiddleware");
const ApiError = require("../../../src/utils/apiError");

describe("RoleMiddleware", () => {
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
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("Middleware Factory Function", () => {
    describe("Parameter Validation", () => {
      it("should throw error for missing requiredRoles parameter", () => {
        expect(() => roleMiddleware()).toThrow(
          "Required roles parameter is mandatory"
        );
        expect(() => roleMiddleware(null)).toThrow(
          "Required roles parameter is mandatory"
        );
        expect(() => roleMiddleware(undefined)).toThrow(
          "Required roles parameter is mandatory"
        );
      });

      it("should throw error for invalid requiredRoles type", () => {
        expect(() => roleMiddleware(123)).toThrow(
          "Required roles must be a string or array of strings"
        );
        expect(() => roleMiddleware(true)).toThrow(
          "Required roles must be a string or array of strings"
        );
        expect(() => roleMiddleware({})).toThrow(
          "Required roles must be a string or array of strings"
        );
      });

      it("should throw error for empty string requiredRoles", () => {
        expect(() => roleMiddleware("")).toThrow(
          "Required role cannot be an empty string"
        );
        expect(() => roleMiddleware("   ")).toThrow(
          "Required role cannot be an empty string"
        );
      });

      it("should throw error for empty array requiredRoles", () => {
        expect(() => roleMiddleware([])).toThrow(
          "Required roles array cannot be empty"
        );
      });

      it("should throw error for array with invalid role types", () => {
        expect(() => roleMiddleware(["ADMIN", 123])).toThrow(
          "All roles must be non-empty strings"
        );
        expect(() => roleMiddleware(["ADMIN", ""])).toThrow(
          "All roles must be non-empty strings"
        );
        expect(() => roleMiddleware([null, "ADMIN"])).toThrow(
          "All roles must be non-empty strings"
        );
      });

      it("should throw error for invalid permitSelf parameter", () => {
        expect(() => roleMiddleware("ADMIN", "invalid")).toThrow(
          "PermitSelf parameter must be a boolean"
        );
        expect(() => roleMiddleware("ADMIN", 1)).toThrow(
          "PermitSelf parameter must be a boolean"
        );
        expect(() => roleMiddleware("ADMIN", {})).toThrow(
          "PermitSelf parameter must be a boolean"
        );
      });

      it("should accept valid string role", () => {
        expect(() => roleMiddleware("ADMIN")).not.toThrow();
        expect(() => roleMiddleware("MEMBER")).not.toThrow();
      });

      it("should accept valid array of roles", () => {
        expect(() => roleMiddleware(["ADMIN", "MEMBER"])).not.toThrow();
        expect(() => roleMiddleware(["ADMIN"])).not.toThrow();
      });

      it("should accept valid permitSelf parameter", () => {
        expect(() => roleMiddleware("ADMIN", true)).not.toThrow();
        expect(() => roleMiddleware("ADMIN", false)).not.toThrow();
      });
    });
  });

  describe("Middleware Function", () => {
    describe("Authentication Validation", () => {
      it("should call next() with error when user is missing", () => {
        mockReq.user = null;
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 401,
            message: "Authentication required",
          })
        );
      });

      it("should call next() with error when user is undefined", () => {
        delete mockReq.user;
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 401,
            message: "Authentication required",
          })
        );
      });

      it("should call next() with error when user is not an object", () => {
        mockReq.user = "invalid";
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 401,
            message: "Invalid user object",
          })
        );
      });

      it("should call next() with error when user ID is missing", () => {
        delete mockReq.user.id;
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 401,
            message: "Invalid user ID",
          })
        );
      });

      it("should call next() with error when user ID is not a string", () => {
        mockReq.user.id = 123;
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 401,
            message: "Invalid user ID",
          })
        );
      });

      it("should call next() with error when user ID is empty string", () => {
        mockReq.user.id = "";
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 401,
            message: "Invalid user ID",
          })
        );
      });
    });

    describe("Single Role Authorization", () => {
      it("should call next() when user has required role", () => {
        mockReq.user.role = "ADMIN";
        const middleware = roleMiddleware("ADMIN");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should call next() when user has exact required role", () => {
        mockReq.user.role = "MEMBER";
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should call next() with ApiError when user has insufficient role", () => {
        mockReq.user.role = "MEMBER";
        const middleware = roleMiddleware("ADMIN");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });

      it("should handle case-insensitive role comparison", () => {
        mockReq.user.role = "admin"; // lowercase
        const middleware = roleMiddleware("ADMIN"); // uppercase

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should handle mixed case roles", () => {
        mockReq.user.role = "AdMiN";
        const middleware = roleMiddleware("admin");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should handle roles with whitespace", () => {
        mockReq.user.role = " ADMIN ";
        const middleware = roleMiddleware(" ADMIN ");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });
    });

    describe("Multiple Roles Authorization", () => {
      it("should allow access when user has one of multiple required roles", () => {
        mockReq.user.role = "ADMIN";
        const middleware = roleMiddleware(["ADMIN", "MODERATOR"]);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should allow access when user has second of multiple required roles", () => {
        mockReq.user.role = "MODERATOR";
        const middleware = roleMiddleware(["ADMIN", "MODERATOR"]);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should deny access when user has none of multiple required roles", () => {
        mockReq.user.role = "MEMBER";
        const middleware = roleMiddleware(["ADMIN", "MODERATOR"]);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });

      it("should handle case-insensitive comparison with multiple roles", () => {
        mockReq.user.role = "moderator";
        const middleware = roleMiddleware(["ADMIN", "MODERATOR"]);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });
    });

    describe("Invalid Role Handling", () => {
      it("should handle missing role property", () => {
        delete mockReq.user.role;
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });

      it("should handle null role", () => {
        mockReq.user.role = null;
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });

      it("should handle undefined role", () => {
        mockReq.user.role = undefined;
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });

      it("should handle empty string role", () => {
        mockReq.user.role = "";
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });

      it("should handle whitespace-only role", () => {
        mockReq.user.role = "   ";
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });

      it("should handle non-string role", () => {
        mockReq.user.role = 123;
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });

      it("should handle invalid role values", () => {
        mockReq.user.role = "INVALID_ROLE";
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });
    });

    describe("PermitSelf Feature", () => {
      it("should allow access when permitSelf is true and user accesses own resource via uid", () => {
        mockReq.user.role = "MEMBER";
        mockReq.params.uid = "user123";
        const middleware = roleMiddleware("ADMIN", true);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should allow access when permitSelf is true and user accesses own resource via userId", () => {
        mockReq.user.role = "MEMBER";
        mockReq.params.userId = "user123";
        const middleware = roleMiddleware("ADMIN", true);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should allow access when permitSelf is true and user accesses own resource via id", () => {
        mockReq.user.role = "MEMBER";
        mockReq.params.id = "user123";
        const middleware = roleMiddleware("ADMIN", true);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should deny access when permitSelf is true but user accesses different resource", () => {
        mockReq.user.role = "MEMBER";
        mockReq.params.uid = "different-user";
        const middleware = roleMiddleware("ADMIN", true);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });

      it("should deny access when permitSelf is true but no resource ID in params", () => {
        mockReq.user.role = "MEMBER";
        const middleware = roleMiddleware("ADMIN", true);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });

      it("should not use permitSelf when user has required role", () => {
        mockReq.user.role = "ADMIN";
        mockReq.params.uid = "different-user";
        const middleware = roleMiddleware("ADMIN", true);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should ignore permitSelf when it's false", () => {
        mockReq.user.role = "MEMBER";
        mockReq.params.uid = "user123";
        const middleware = roleMiddleware("ADMIN", false);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });

      it("should work with multiple roles and permitSelf", () => {
        mockReq.user.role = "MEMBER";
        mockReq.params.uid = "user123";
        const middleware = roleMiddleware(["ADMIN", "MODERATOR"], true);

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors gracefully", () => {
        // Create a middleware that will throw an error
        const middleware = roleMiddleware("ADMIN");

        // Mock req.user to cause an error in the middleware
        Object.defineProperty(mockReq, "user", {
          get: () => {
            throw new Error("Unexpected error");
          },
        });

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 500,
            message: "Role validation failed",
          })
        );
      });
    });

    describe("Standard Role Tests", () => {
      it("should work with MEMBER role requirement", () => {
        mockReq.user.role = "MEMBER";
        const middleware = roleMiddleware("MEMBER");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should work with ADMIN role requirement", () => {
        mockReq.user.role = "ADMIN";
        const middleware = roleMiddleware("ADMIN");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should reject MEMBER when ADMIN required", () => {
        mockReq.user.role = "MEMBER";
        const middleware = roleMiddleware("ADMIN");

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403,
            message: "Insufficient permissions",
          })
        );
      });
    });
  });

  describe("Integration Tests", () => {
    it("should work in typical Express middleware chain", () => {
      const middleware = roleMiddleware("ADMIN");

      expect(typeof middleware).toBe("function");
      expect(middleware.length).toBe(3); // req, res, next
    });

    it("should handle complex scenario with multiple roles and permitSelf", () => {
      mockReq.user.role = "MODERATOR";
      mockReq.params.userId = "different-user";
      const middleware = roleMiddleware(["ADMIN", "MODERATOR"], true);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should prioritize role check over permitSelf", () => {
      mockReq.user.role = "ADMIN";
      mockReq.params.uid = "different-user";
      const middleware = roleMiddleware("ADMIN", true);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});
