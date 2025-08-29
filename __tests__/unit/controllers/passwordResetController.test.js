/**
 * PasswordResetController Unit Tests
 * Tests for password reset functionality
 */

// Mock dependencies
jest.mock("../../../src/services/passwordResetService");
jest.mock("../../../src/utils/asyncHandler", () => {
  return (fn) => fn; // Return the function as-is for testing
});
jest.mock("../../../src/utils/apiError");
jest.mock("../../../src/utils/logger");

const mockPasswordResetService = require("../../../src/services/passwordResetService");
const mockApiError = require("../../../src/utils/apiError");
const mockLogger = require("../../../src/utils/logger");

// Import the actual controller
const passwordResetController = require("../../../src/controllers/passwordResetController");

describe("PasswordResetController", () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockLogger.info = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.error = jest.fn();

    // Mock ApiError constructor
    mockApiError.mockImplementation((statusCode, message) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    });

    // Create mock request and response objects
    mockReq = {
      body: {},
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" },
      headers: {
        "user-agent": "test-agent",
        "x-trace-id": "test-trace-123",
      },
      get: jest.fn((header) => {
        if (header === "User-Agent") return "test-agent";
        return mockReq.headers[header.toLowerCase()] || null;
      }),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("requestPasswordReset", () => {
    describe("Success scenarios", () => {
      it("should handle successful password reset request", async () => {
        const email = "test@example.com";
        mockReq.body = { email };

        mockPasswordResetService.requestPasswordReset.mockResolvedValue();

        await passwordResetController.requestPasswordReset(mockReq, mockRes);

        expect(
          mockPasswordResetService.requestPasswordReset
        ).toHaveBeenCalledWith("test@example.com");
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          message:
            "If an account with that email exists, a password reset link has been sent.",
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Password reset request initiated",
          expect.objectContaining({
            email: "tes***",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Password reset request processed successfully",
          expect.objectContaining({
            email: "tes***",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });

      it("should handle email with whitespace and convert to lowercase", async () => {
        const email = "  TEST@EXAMPLE.COM  ";
        mockReq.body = { email };

        mockPasswordResetService.requestPasswordReset.mockResolvedValue();

        await passwordResetController.requestPasswordReset(mockReq, mockRes);

        expect(
          mockPasswordResetService.requestPasswordReset
        ).toHaveBeenCalledWith("test@example.com");
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it("should handle email with mixed case", async () => {
        const email = "Test@Example.com";
        mockReq.body = { email };

        mockPasswordResetService.requestPasswordReset.mockResolvedValue();

        await passwordResetController.requestPasswordReset(mockReq, mockRes);

        expect(
          mockPasswordResetService.requestPasswordReset
        ).toHaveBeenCalledWith("test@example.com");
      });
    });

    describe("Error scenarios", () => {
      it("should handle missing email", async () => {
        mockReq.body = {};

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Email is required");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Password reset request failed: missing email",
          expect.objectContaining({
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );

        expect(
          mockPasswordResetService.requestPasswordReset
        ).not.toHaveBeenCalled();
      });

      it("should handle null email", async () => {
        mockReq.body = { email: null };

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Email is required");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Password reset request failed: missing email",
          expect.objectContaining({
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });

      it("should handle undefined email", async () => {
        mockReq.body = { email: undefined };

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Email is required");
      });

      it("should handle empty string email", async () => {
        mockReq.body = { email: "" };

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Email is required");
      });

      it("should handle whitespace-only email", async () => {
        mockReq.body = { email: "   " };

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Invalid email format");
      });

      it("should handle non-string email", async () => {
        mockReq.body = { email: 123 };

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Invalid email format");
      });

      it("should handle invalid email format - missing @", async () => {
        const email = "testexample.com";
        mockReq.body = { email };

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Invalid email format");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Password reset request failed: invalid email format",
          expect.objectContaining({
            email: "tes***",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });

      it("should handle invalid email format - missing domain", async () => {
        const email = "test@";
        mockReq.body = { email };

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Invalid email format");
      });

      it("should handle invalid email format - missing local part", async () => {
        const email = "@example.com";
        mockReq.body = { email };

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Invalid email format");
      });

      it("should handle invalid email format - multiple @ symbols", async () => {
        const email = "test@@example.com";
        mockReq.body = { email };

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Invalid email format");
      });

      it("should handle invalid email format - spaces in email", async () => {
        const email = "test @example.com";
        mockReq.body = { email };

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Invalid email format");
      });

      it("should handle service errors", async () => {
        const email = "test@example.com";
        mockReq.body = { email };

        const serviceError = new Error("Service unavailable");
        mockPasswordResetService.requestPasswordReset.mockRejectedValue(
          serviceError
        );

        await expect(
          passwordResetController.requestPasswordReset(mockReq, mockRes)
        ).rejects.toThrow("Service unavailable");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Password reset request error",
          expect.objectContaining({
            error: "Service unavailable",
            stack: serviceError.stack,
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });
    });

    describe("Edge cases", () => {
      it("should handle missing client info gracefully", async () => {
        const email = "test@example.com";
        mockReq.body = { email };
        mockReq.ip = undefined;
        mockReq.connection = undefined;
        mockReq.headers = {};
        mockReq.get = jest.fn(() => null);

        mockPasswordResetService.requestPasswordReset.mockResolvedValue();

        await passwordResetController.requestPasswordReset(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockLogger.info).toHaveBeenCalledWith(
          "Password reset request initiated",
          expect.objectContaining({
            email: "tes***",
            ipAddress: null,
            userAgent: null,
            traceId: null,
          })
        );
      });

      it("should handle very long email addresses", async () => {
        const longEmail = "a".repeat(100) + "@example.com";
        mockReq.body = { email: longEmail };

        mockPasswordResetService.requestPasswordReset.mockResolvedValue();

        await passwordResetController.requestPasswordReset(mockReq, mockRes);

        expect(
          mockPasswordResetService.requestPasswordReset
        ).toHaveBeenCalledWith(longEmail.toLowerCase());
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });
  });

  describe("resetPassword", () => {
    describe("Success scenarios", () => {
      it("should handle successful password reset", async () => {
        const token = "valid-reset-token-123";
        const newPassword = "NewPassword123";
        mockReq.body = { token, newPassword };

        mockPasswordResetService.resetPassword.mockResolvedValue();

        await passwordResetController.resetPassword(mockReq, mockRes);

        expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(
          "valid-reset-token-123",
          "NewPassword123"
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          message: "Password has been reset successfully.",
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Password reset initiated",
          expect.objectContaining({
            tokenPrefix: "valid-re***",
            passwordLength: 14,
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Password reset completed successfully",
          expect.objectContaining({
            tokenPrefix: "valid-re***",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });

      it("should handle token with whitespace", async () => {
        const token = "  valid-token  ";
        const newPassword = "NewPassword123";
        mockReq.body = { token, newPassword };

        mockPasswordResetService.resetPassword.mockResolvedValue();

        await passwordResetController.resetPassword(mockReq, mockRes);

        expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(
          "valid-token",
          "NewPassword123"
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it("should handle minimum valid password", async () => {
        const token = "valid-token";
        const newPassword = "Pass12";
        mockReq.body = { token, newPassword };

        mockPasswordResetService.resetPassword.mockResolvedValue();

        await passwordResetController.resetPassword(mockReq, mockRes);

        expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(
          "valid-token",
          "Pass12"
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe("Error scenarios", () => {
      it("should handle missing token", async () => {
        const newPassword = "NewPassword123";
        mockReq.body = { newPassword };

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow("Token and new password are required");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Password reset failed: missing required fields",
          expect.objectContaining({
            hasToken: false,
            hasPassword: true,
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );

        expect(mockPasswordResetService.resetPassword).not.toHaveBeenCalled();
      });

      it("should handle missing password", async () => {
        const token = "valid-token";
        mockReq.body = { token };

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow("Token and new password are required");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Password reset failed: missing required fields",
          expect.objectContaining({
            hasToken: true,
            hasPassword: false,
          })
        );
      });

      it("should handle missing both token and password", async () => {
        mockReq.body = {};

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow("Token and new password are required");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Password reset failed: missing required fields",
          expect.objectContaining({
            hasToken: false,
            hasPassword: false,
          })
        );
      });

      it("should handle null token", async () => {
        const newPassword = "NewPassword123";
        mockReq.body = { token: null, newPassword };

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow("Token and new password are required");
      });

      it("should handle null password", async () => {
        const token = "valid-token";
        mockReq.body = { token, newPassword: null };

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow("Token and new password are required");
      });

      it("should handle empty string token", async () => {
        const newPassword = "NewPassword123";
        mockReq.body = { token: "", newPassword };

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow("Token and new password are required");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Password reset failed: missing required fields",
          expect.objectContaining({
            hasToken: false,
            hasPassword: true,
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });

      it("should handle whitespace-only token", async () => {
        const newPassword = "NewPassword123";
        mockReq.body = { token: "   ", newPassword };

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow("Invalid token format");
      });

      it("should handle non-string token", async () => {
        const newPassword = "NewPassword123";
        mockReq.body = { token: 123, newPassword };

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow("Invalid token format");
      });

      it("should handle password too short", async () => {
        const token = "valid-token";
        const newPassword = "Pass";
        mockReq.body = { token, newPassword };

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow(
          "Password must be at least 6 characters long and contain both letters and numbers"
        );

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Password reset failed: password does not meet requirements",
          expect.objectContaining({
            passwordLength: 4,
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });

      it("should handle password too long", async () => {
        const token = "valid-token";
        const newPassword = "a".repeat(129) + "1";
        mockReq.body = { token, newPassword };

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow(
          "Password must be at least 6 characters long and contain both letters and numbers"
        );
      });

      it("should handle password without letters", async () => {
        const token = "valid-token";
        const newPassword = "123456";
        mockReq.body = { token, newPassword };

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow(
          "Password must be at least 6 characters long and contain both letters and numbers"
        );
      });

      it("should handle password without numbers", async () => {
        const token = "valid-token";
        const newPassword = "abcdef";
        mockReq.body = { token, newPassword };

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow(
          "Password must be at least 6 characters long and contain both letters and numbers"
        );
      });

      it("should handle service errors", async () => {
        const token = "valid-token";
        const newPassword = "NewPassword123";
        mockReq.body = { token, newPassword };

        const serviceError = new Error("Invalid token");
        mockPasswordResetService.resetPassword.mockRejectedValue(serviceError);

        await expect(
          passwordResetController.resetPassword(mockReq, mockRes)
        ).rejects.toThrow("Invalid token");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Password reset error",
          expect.objectContaining({
            error: "Invalid token",
            stack: serviceError.stack,
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });
    });

    describe("Edge cases", () => {
      it("should handle missing client info gracefully", async () => {
        const token = "valid-token";
        const newPassword = "NewPassword123";
        mockReq.body = { token, newPassword };
        mockReq.ip = undefined;
        mockReq.connection = undefined;
        mockReq.headers = {};
        mockReq.get = jest.fn(() => null);

        mockPasswordResetService.resetPassword.mockResolvedValue();

        await passwordResetController.resetPassword(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockLogger.info).toHaveBeenCalledWith(
          "Password reset initiated",
          expect.objectContaining({
            tokenPrefix: "valid-to***",
            passwordLength: 14,
            ipAddress: null,
            userAgent: null,
            traceId: null,
          })
        );
      });

      it("should handle very long token", async () => {
        const token = "a".repeat(1000);
        const newPassword = "NewPassword123";
        mockReq.body = { token, newPassword };

        mockPasswordResetService.resetPassword.mockResolvedValue();

        await passwordResetController.resetPassword(mockReq, mockRes);

        expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(
          token,
          "NewPassword123"
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it("should handle very long password", async () => {
        const token = "valid-token";
        const newPassword = "a".repeat(100) + "1";
        mockReq.body = { token, newPassword };

        mockPasswordResetService.resetPassword.mockResolvedValue();

        await passwordResetController.resetPassword(mockReq, mockRes);

        expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(
          "valid-token",
          newPassword
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });
  });

  describe("Helper Functions", () => {
    describe("validateEmail", () => {
      it("should validate correct email addresses", () => {
        expect(passwordResetController.validateEmail("test@example.com")).toBe(
          true
        );
        expect(
          passwordResetController.validateEmail("user.name@domain.co.uk")
        ).toBe(true);
        expect(
          passwordResetController.validateEmail("test+tag@example.org")
        ).toBe(true);
        expect(passwordResetController.validateEmail("123@numbers.com")).toBe(
          true
        );
      });

      it("should reject invalid email addresses", () => {
        expect(passwordResetController.validateEmail("")).toBe(false);
        expect(passwordResetController.validateEmail("   ")).toBe(false);
        expect(passwordResetController.validateEmail("test")).toBe(false);
        expect(passwordResetController.validateEmail("@example.com")).toBe(
          false
        );
        expect(passwordResetController.validateEmail("test@")).toBe(false);
        expect(passwordResetController.validateEmail("test@@example.com")).toBe(
          false
        );
        expect(passwordResetController.validateEmail("test @example.com")).toBe(
          false
        );
        expect(passwordResetController.validateEmail("test@ example.com")).toBe(
          false
        );
      });

      it("should reject non-string inputs", () => {
        expect(passwordResetController.validateEmail(null)).toBe(false);
        expect(passwordResetController.validateEmail(undefined)).toBe(false);
        expect(passwordResetController.validateEmail(123)).toBe(false);
        expect(passwordResetController.validateEmail({})).toBe(false);
        expect(passwordResetController.validateEmail([])).toBe(false);
      });

      it("should handle email with whitespace", () => {
        expect(
          passwordResetController.validateEmail("  test@example.com  ")
        ).toBe(true);
        expect(
          passwordResetController.validateEmail("test@example.com  ")
        ).toBe(true);
        expect(
          passwordResetController.validateEmail("  test@example.com")
        ).toBe(true);
      });
    });

    describe("validatePassword", () => {
      it("should validate correct passwords", () => {
        expect(passwordResetController.validatePassword("Password123")).toBe(
          true
        );
        expect(passwordResetController.validatePassword("MyPass1")).toBe(true);
        expect(passwordResetController.validatePassword("123456a")).toBe(true);
        expect(
          passwordResetController.validatePassword("a".repeat(100) + "1")
        ).toBe(true);
      });

      it("should reject passwords that are too short", () => {
        expect(passwordResetController.validatePassword("Pass")).toBe(false);
        expect(passwordResetController.validatePassword("Pass")).toBe(false);
        expect(passwordResetController.validatePassword("")).toBe(false);
      });

      it("should reject passwords that are too long", () => {
        expect(
          passwordResetController.validatePassword("a".repeat(129) + "1")
        ).toBe(false);
      });

      it("should reject passwords without letters", () => {
        expect(passwordResetController.validatePassword("123456")).toBe(false);
        expect(passwordResetController.validatePassword("1234567")).toBe(false);
      });

      it("should reject passwords without numbers", () => {
        expect(passwordResetController.validatePassword("abcdef")).toBe(false);
        expect(passwordResetController.validatePassword("abcdefg")).toBe(false);
      });

      it("should reject non-string inputs", () => {
        expect(passwordResetController.validatePassword(null)).toBe(false);
        expect(passwordResetController.validatePassword(undefined)).toBe(false);
        expect(passwordResetController.validatePassword(123)).toBe(false);
        expect(passwordResetController.validatePassword({})).toBe(false);
        expect(passwordResetController.validatePassword([])).toBe(false);
      });

      it("should handle edge case passwords", () => {
        expect(
          passwordResetController.validatePassword("a".repeat(6) + "1")
        ).toBe(true);
        expect(
          passwordResetController.validatePassword("a".repeat(127) + "1")
        ).toBe(true);
        expect(
          passwordResetController.validatePassword("1" + "a".repeat(5))
        ).toBe(true);
        expect(
          passwordResetController.validatePassword("a" + "1" + "a".repeat(4))
        ).toBe(true);
      });
    });

    describe("getClientInfo", () => {
      it("should extract client information correctly", () => {
        const req = {
          ip: "192.168.1.1",
          connection: { remoteAddress: "10.0.0.1" },
          headers: {
            "user-agent": "test-browser",
            "x-trace-id": "trace-456",
          },
          get: jest.fn((header) => {
            if (header === "User-Agent") return "test-browser";
            return req.headers[header.toLowerCase()] || null;
          }),
        };

        const result = passwordResetController.getClientInfo(req);

        expect(result).toEqual({
          ipAddress: "192.168.1.1",
          userAgent: "test-browser",
          traceId: "trace-456",
        });
      });

      it("should fallback to connection.remoteAddress when ip is missing", () => {
        const req = {
          connection: { remoteAddress: "10.0.0.1" },
          headers: {
            "user-agent": "test-browser",
            "x-trace-id": "trace-456",
          },
          get: jest.fn((header) => {
            if (header === "User-Agent") return "test-browser";
            return req.headers[header.toLowerCase()] || null;
          }),
        };

        const result = passwordResetController.getClientInfo(req);

        expect(result.ipAddress).toBe("10.0.0.1");
      });

      it("should handle missing headers gracefully", () => {
        const req = {
          get: jest.fn(() => null),
          headers: {},
        };

        const result = passwordResetController.getClientInfo(req);

        expect(result).toEqual({
          ipAddress: null,
          userAgent: null,
          traceId: null,
        });
      });

      it("should handle missing connection gracefully", () => {
        const req = {
          headers: {
            "user-agent": "test-browser",
            "x-trace-id": "trace-456",
          },
          get: jest.fn((header) => {
            if (header === "User-Agent") return "test-browser";
            return req.headers[header.toLowerCase()] || null;
          }),
        };

        const result = passwordResetController.getClientInfo(req);

        expect(result.ipAddress).toBe(null);
      });
    });
  });

  describe("Security considerations", () => {
    it("should not log sensitive information", async () => {
      const email = "test@example.com";
      const token = "sensitive-reset-token-123";
      const newPassword = "NewPassword123";

      // Test email masking
      mockReq.body = { email };
      mockPasswordResetService.requestPasswordReset.mockResolvedValue();

      await passwordResetController.requestPasswordReset(mockReq, mockRes);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Password reset request initiated",
        expect.objectContaining({
          email: "tes***",
        })
      );

      // Test token masking
      mockReq.body = { token, newPassword };
      mockPasswordResetService.resetPassword.mockResolvedValue();

      await passwordResetController.resetPassword(mockReq, mockRes);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Password reset initiated",
        expect.objectContaining({
          tokenPrefix: "sensitiv***",
        })
      );

      // Verify full values are never logged
      const logCalls = mockLogger.info.mock.calls;
      logCalls.forEach((call) => {
        const logData = call[1];
        expect(logData.email || "").not.toContain("test@example.com");
        expect(logData.tokenPrefix || "").not.toContain(
          "sensitive-reset-token-123"
        );
        expect(logData.newPassword).toBeUndefined();
      });
    });

    it("should always return success for email requests regardless of user existence", async () => {
      const email = "nonexistent@example.com";
      mockReq.body = { email };

      // Even if service throws an error, we should still return success
      // This is handled by the asyncHandler, but we can test the happy path
      mockPasswordResetService.requestPasswordReset.mockResolvedValue();

      await passwordResetController.requestPasswordReset(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    });
  });
});
