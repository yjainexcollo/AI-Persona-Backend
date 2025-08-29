// Mock token generation
const mockGenerateToken = jest.fn(() => "mock-reset-token");
jest.mock("../../../src/utils/token", () => ({
  generateToken: mockGenerateToken,
}));

// Mock password utils
const mockHashPassword = jest.fn().mockResolvedValue("hashed-password");
jest.mock("../../../src/utils/password", () => ({
  hashPassword: mockHashPassword,
  verifyPassword: jest.fn().mockResolvedValue(true),
}));

const passwordResetService = require("../../../src/services/passwordResetService");

// Mock email service
jest.mock("../../../src/services/emailService", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

describe("PasswordResetService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    global.mockFindFirst.mockReset();
    global.mockFindUnique.mockReset();
    global.mockCreate.mockReset();
    global.mockUpdate.mockReset();
    global.mockDeleteMany.mockReset();

    // Reset mocks
    mockGenerateToken.mockReturnValue("mock-reset-token");
    mockHashPassword.mockResolvedValue("hashed-password");

    // Reset transaction mock
    global.mockPrisma.$transaction.mockImplementation((callback) =>
      callback(global.mockPrisma)
    );
  });

  describe("requestPasswordReset", () => {
    it("should request password reset for existing user", async () => {
      const email = "test@example.com";
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        status: "ACTIVE",
      };

      global.mockFindFirst.mockResolvedValue(mockUser);
      global.mockDeleteMany.mockResolvedValue({ count: 1 });
      global.mockCreate.mockResolvedValue({
        id: "reset123",
        userId: "user123",
        token: "mock-reset-token",
        expiresAt: new Date(),
      });

      const result = await passwordResetService.requestPasswordReset(email);

      expect(result).toEqual({
        success: true,
        message: "If the email exists, a reset link has been sent",
      });
      expect(global.mockFindFirst).toHaveBeenCalledWith({
        where: { email },
      });
      expect(global.mockDeleteMany).toHaveBeenCalledWith({
        where: { userId: "user123" },
      });
      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user123",
          token: "mock-reset-token",
          expiresAt: expect.any(Date),
        },
      });
    });

    it("should handle non-existent user gracefully", async () => {
      const email = "nonexistent@example.com";

      global.mockFindFirst.mockResolvedValue(null);

      const result = await passwordResetService.requestPasswordReset(email);

      expect(result).toEqual({
        success: true,
        message: "If the email exists, a reset link has been sent",
      });
      expect(global.mockFindFirst).toHaveBeenCalledWith({
        where: { email },
      });
      // Should not create any tokens for non-existent users
      expect(global.mockCreate).not.toHaveBeenCalled();
    });

    it("should handle inactive user gracefully", async () => {
      const email = "inactive@example.com";
      const mockUser = {
        id: "user123",
        email: "inactive@example.com",
        name: "Inactive User",
        status: "DEACTIVATED",
      };

      global.mockFindFirst.mockResolvedValue(mockUser);

      const result = await passwordResetService.requestPasswordReset(email);

      expect(result).toEqual({
        success: true,
        message: "If the email exists, a reset link has been sent",
      });
      // Should not create any tokens for inactive users
      expect(global.mockCreate).not.toHaveBeenCalled();
    });

    it("should throw error for missing email", async () => {
      await expect(
        passwordResetService.requestPasswordReset(null)
      ).rejects.toThrow("Valid email is required");

      await expect(
        passwordResetService.requestPasswordReset("")
      ).rejects.toThrow("Valid email is required");
    });

    it("should throw error for invalid email format", async () => {
      await expect(
        passwordResetService.requestPasswordReset("invalid-email")
      ).rejects.toThrow("Invalid email format");

      await expect(
        passwordResetService.requestPasswordReset("test@")
      ).rejects.toThrow("Invalid email format");
    });

    it("should handle email sending failure", async () => {
      const email = "test@example.com";
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        status: "ACTIVE",
      };

      global.mockFindFirst.mockResolvedValue(mockUser);
      global.mockDeleteMany.mockResolvedValue({ count: 1 });
      global.mockCreate.mockResolvedValue({
        id: "reset123",
        userId: "user123",
        token: "mock-reset-token",
        expiresAt: new Date(),
      });

      // Mock email service to throw ApiError
      const ApiError = require("../../../src/utils/apiError");
      const emailService = require("../../../src/services/emailService");
      emailService.sendPasswordResetEmail.mockRejectedValue(
        new ApiError(500, "Email failed")
      );

      await expect(
        passwordResetService.requestPasswordReset(email)
      ).rejects.toThrow("Email failed");
    });

    it("should handle database errors", async () => {
      const email = "test@example.com";

      global.mockFindFirst.mockRejectedValue(new Error("Database error"));

      await expect(
        passwordResetService.requestPasswordReset(email)
      ).rejects.toThrow("Failed to process password reset request");
    });

    it("should calculate correct expiration time", async () => {
      const email = "test@example.com";
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        status: "ACTIVE",
      };

      const mockDate = new Date("2023-01-01T12:00:00Z");
      jest.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

      global.mockFindFirst.mockResolvedValue(mockUser);
      global.mockDeleteMany.mockResolvedValue({ count: 0 });
      global.mockCreate.mockResolvedValue({
        id: "reset123",
        userId: "user123",
        token: "mock-reset-token",
        expiresAt: new Date(),
      });

      await passwordResetService.requestPasswordReset(email);

      const expectedExpiresAt = new Date(mockDate.getTime() + 60 * 60 * 1000);

      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user123",
          token: "mock-reset-token",
          expiresAt: expectedExpiresAt,
        },
      });

      Date.now.mockRestore();
    });
  });

  describe("resetPassword", () => {
    it("should reset password with valid token", async () => {
      const token = "valid-token";
      const newPassword = "newSecurePassword123!";

      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        used: false,
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        status: "ACTIVE",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(mockResetToken) // For validateResetToken
        .mockResolvedValueOnce(mockUser); // For user lookup

      global.mockPrisma.$transaction.mockImplementation((callback) =>
        callback(global.mockPrisma)
      );

      const result = await passwordResetService.resetPassword(
        token,
        newPassword
      );

      expect(result).toEqual({
        success: true,
        message: "Password has been reset successfully",
      });
      expect(global.mockFindUnique).toHaveBeenCalledWith({
        where: { token },
      });
      expect(global.mockUpdate).toHaveBeenCalledWith({
        where: { id: "user123" },
        data: { passwordHash: "hashed-password" },
      });
      expect(global.mockUpdate).toHaveBeenCalledWith({
        where: { token },
        data: { used: true, usedAt: expect.any(Date) },
      });
    });

    it("should throw error for invalid token", async () => {
      const token = "invalid-token";
      const newPassword = "newSecurePassword123!";

      global.mockFindUnique.mockResolvedValue(null);

      await expect(
        passwordResetService.resetPassword(token, newPassword)
      ).rejects.toThrow("Invalid or expired password reset token");
    });

    it("should throw error for expired token", async () => {
      const token = "expired-token";
      const newPassword = "newSecurePassword123!";

      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        used: false,
      };

      global.mockFindUnique.mockResolvedValue(mockResetToken);

      await expect(
        passwordResetService.resetPassword(token, newPassword)
      ).rejects.toThrow("Invalid or expired password reset token");
    });

    it("should throw error for weak password", async () => {
      const token = "valid-token";
      const weakPassword = "weak";

      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        status: "ACTIVE",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(mockResetToken)
        .mockResolvedValueOnce(mockUser);

      // Mock password validation to fail with ApiError
      const ApiError = require("../../../src/utils/apiError");
      mockHashPassword.mockRejectedValue(
        new ApiError(400, "Password must be at least 8 characters long")
      );

      await expect(
        passwordResetService.resetPassword(token, weakPassword)
      ).rejects.toThrow("Password must be at least 8 characters long");
    });

    it("should throw error for breached password", async () => {
      const token = "valid-token";
      const breachedPassword = "password123";

      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        status: "ACTIVE",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(mockResetToken)
        .mockResolvedValueOnce(mockUser);

      // Mock breach check to fail with ApiError
      const ApiError = require("../../../src/utils/apiError");
      mockHashPassword.mockRejectedValue(
        new ApiError(400, "This password has been compromised in a data breach")
      );

      await expect(
        passwordResetService.resetPassword(token, breachedPassword)
      ).rejects.toThrow("This password has been compromised in a data breach");
    });

    it("should throw error for missing password", async () => {
      await expect(
        passwordResetService.resetPassword("token", null)
      ).rejects.toThrow("Valid new password is required");

      await expect(
        passwordResetService.resetPassword("token", "")
      ).rejects.toThrow("Valid new password is required");
    });

    it("should throw error for short password", async () => {
      await expect(
        passwordResetService.resetPassword("token", "short")
      ).rejects.toThrow("Password must be at least 8 characters long");
    });

    it("should throw error for user not found", async () => {
      const token = "valid-token";
      const newPassword = "newSecurePassword123!";

      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
      };

      global.mockFindUnique
        .mockResolvedValueOnce(mockResetToken)
        .mockResolvedValueOnce(null); // User not found

      await expect(
        passwordResetService.resetPassword(token, newPassword)
      ).rejects.toThrow("User not found");
    });

    it("should throw error for inactive user", async () => {
      const token = "valid-token";
      const newPassword = "newSecurePassword123!";

      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        status: "DEACTIVATED",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(mockResetToken)
        .mockResolvedValueOnce(mockUser);

      await expect(
        passwordResetService.resetPassword(token, newPassword)
      ).rejects.toThrow("User account is not active");
    });

    it("should handle transaction errors", async () => {
      const token = "valid-token";
      const newPassword = "newSecurePassword123!";

      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        status: "ACTIVE",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(mockResetToken)
        .mockResolvedValueOnce(mockUser);

      global.mockPrisma.$transaction.mockRejectedValue(
        new Error("Transaction failed")
      );

      await expect(
        passwordResetService.resetPassword(token, newPassword)
      ).rejects.toThrow("Failed to reset password");
    });
  });

  describe("validateResetToken", () => {
    it("should validate valid reset token", async () => {
      const token = "valid-token";
      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        used: false,
      };

      global.mockFindUnique.mockResolvedValue(mockResetToken);

      const result = await passwordResetService.validateResetToken(token);

      expect(result).toBeDefined();
      expect(result.id).toBe("reset123");
      expect(result.userId).toBe("user123");
      expect(result.token).toBe(token);
    });

    it("should reject invalid reset token", async () => {
      const token = "invalid-token";

      global.mockFindUnique.mockResolvedValue(null);

      await expect(
        passwordResetService.validateResetToken(token)
      ).rejects.toThrow("Invalid or expired password reset token");
    });

    it("should reject expired reset token", async () => {
      const token = "expired-token";
      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        used: false,
      };

      global.mockFindUnique.mockResolvedValue(mockResetToken);

      await expect(
        passwordResetService.validateResetToken(token)
      ).rejects.toThrow("Invalid or expired password reset token");
    });

    it("should reject used reset token", async () => {
      const token = "used-token";
      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() + 3600000), // Valid expiry
        used: true, // But already used
      };

      global.mockFindUnique.mockResolvedValue(mockResetToken);

      await expect(
        passwordResetService.validateResetToken(token)
      ).rejects.toThrow("Invalid or expired password reset token");
    });

    it("should throw error for missing token", async () => {
      await expect(
        passwordResetService.validateResetToken(null)
      ).rejects.toThrow("Valid token is required");

      await expect(passwordResetService.validateResetToken("")).rejects.toThrow(
        "Valid token is required"
      );
    });

    it("should handle database errors", async () => {
      const token = "valid-token";

      global.mockFindUnique.mockRejectedValue(new Error("Database error"));

      await expect(
        passwordResetService.validateResetToken(token)
      ).rejects.toThrow("Failed to validate reset token");
    });
  });

  describe("cleanupExpiredTokens", () => {
    it("should cleanup expired tokens successfully", async () => {
      global.mockDeleteMany.mockResolvedValue({ count: 5 });

      const result = await passwordResetService.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(global.mockDeleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it("should return 0 when no tokens to cleanup", async () => {
      global.mockDeleteMany.mockResolvedValue({ count: 0 });

      const result = await passwordResetService.cleanupExpiredTokens();

      expect(result).toBe(0);
    });

    it("should handle database errors", async () => {
      global.mockDeleteMany.mockRejectedValue(new Error("Database error"));

      await expect(passwordResetService.cleanupExpiredTokens()).rejects.toThrow(
        "Failed to cleanup expired tokens"
      );
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle complete password reset flow", async () => {
      const email = "test@example.com";
      const token = "reset-token";
      const newPassword = "newSecurePassword123!";

      // Step 1: Request password reset
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        status: "ACTIVE",
      };

      global.mockFindFirst.mockResolvedValue(mockUser);
      global.mockDeleteMany.mockResolvedValue({ count: 1 });
      global.mockCreate.mockResolvedValue({
        id: "reset123",
        userId: "user123",
        token: "mock-reset-token",
        expiresAt: new Date(),
      });

      const requestResult = await passwordResetService.requestPasswordReset(
        email
      );
      expect(requestResult.success).toBe(true);

      // Step 2: Reset password
      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
      };

      global.mockFindUnique
        .mockResolvedValueOnce(mockResetToken)
        .mockResolvedValueOnce(mockUser);

      global.mockPrisma.$transaction.mockImplementation((callback) =>
        callback(global.mockPrisma)
      );

      const resetResult = await passwordResetService.resetPassword(
        token,
        newPassword
      );
      expect(resetResult.success).toBe(true);
    });

    it("should handle concurrent reset requests", async () => {
      const email = "test@example.com";
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        status: "ACTIVE",
      };

      global.mockFindFirst.mockResolvedValue(mockUser);
      global.mockDeleteMany.mockResolvedValue({ count: 2 }); // Multiple old tokens
      global.mockCreate.mockResolvedValue({
        id: "reset123",
        userId: "user123",
        token: "mock-reset-token",
        expiresAt: new Date(),
      });

      const result = await passwordResetService.requestPasswordReset(email);

      expect(result.success).toBe(true);
      expect(global.mockDeleteMany).toHaveBeenCalledWith({
        where: { userId: "user123" },
      });
    });

    it("should handle token validation edge cases", async () => {
      // Test with exactly expired token (boundary condition)
      const token = "boundary-token";
      const mockResetToken = {
        id: "reset123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() - 1), // 1ms ago - expired
        used: false,
      };

      global.mockFindUnique.mockResolvedValue(mockResetToken);

      // Should be considered expired
      await expect(
        passwordResetService.validateResetToken(token)
      ).rejects.toThrow("Invalid or expired password reset token");
    });
  });
});
