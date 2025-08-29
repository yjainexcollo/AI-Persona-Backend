// Mock nodemailer BEFORE importing the service so transporter uses the mock
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: "mock-message-id" }),
  })),
}));

// Mock token generation
jest.mock("../../../src/utils/token", () => ({
  generateToken: jest.fn(() => "mock-verification-token"),
}));

// Import the mocked generateToken to control it in tests
const { generateToken } = require("../../../src/utils/token");

const emailService = require("../../../src/services/emailService");

describe("EmailService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    global.mockFindUnique.mockReset();
    global.mockCreate.mockReset();
    global.mockUpdate.mockReset();
    global.mockDeleteMany.mockReset();
    global.mockCount.mockReset();

    // Reset token generation mock
    generateToken.mockReturnValue("mock-verification-token");
  });

  describe("testEmailConfig", () => {
    it("should return true for valid email configuration", async () => {
      const result = await emailService.testEmailConfig();
      expect(result).toBe(true);
    });

    it("should return false for invalid email configuration", async () => {
      // Ensure we mock the transporter used by the service
      const transporter = emailService.getTransporter();
      transporter.verify.mockRejectedValueOnce(new Error("Invalid config"));

      const result = await emailService.testEmailConfig();
      expect(result).toBe(false);
    });
  });

  describe("createEmailVerification", () => {
    it("should create email verification token", async () => {
      const userId = "user123";

      global.mockCreate.mockResolvedValue({
        id: "verification123",
        userId,
        token: "mock-verification-token",
        expiresAt: new Date(),
      });

      await emailService.createEmailVerification(userId);
      expect(global.mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            expiresAt: expect.any(Date),
          }),
        })
      );
      expect(global.mockDeleteMany).toHaveBeenCalledWith({ where: { userId } });
    });

    it("should throw error for missing userId", async () => {
      await expect(emailService.createEmailVerification(null)).rejects.toThrow(
        "Missing required parameter: userId"
      );
    });

    it("should throw error for invalid expiration time", async () => {
      await expect(
        emailService.createEmailVerification("user123", 0)
      ).rejects.toThrow("Expiration time must be between 1 minute and 7 days");

      await expect(
        emailService.createEmailVerification("user123", 10081)
      ).rejects.toThrow("Expiration time must be between 1 minute and 7 days");
    });
  });

  describe("createPasswordResetToken", () => {
    it("should create password reset token", async () => {
      const userId = "user123";

      global.mockCreate.mockResolvedValue({
        id: "reset123",
        userId,
        token: "mock-reset-token",
        expiresAt: new Date(),
      });

      await emailService.createPasswordResetToken(userId);
      expect(global.mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            expiresAt: expect.any(Date),
          }),
        })
      );
      expect(global.mockDeleteMany).toHaveBeenCalledWith({ where: { userId } });
    });

    it("should throw error for missing userId", async () => {
      await expect(emailService.createPasswordResetToken(null)).rejects.toThrow(
        "Missing required parameter: userId"
      );
    });

    it("should throw error for invalid expiration time", async () => {
      await expect(
        emailService.createPasswordResetToken("user123", 0)
      ).rejects.toThrow(
        "Expiration time must be between 1 minute and 24 hours"
      );

      await expect(
        emailService.createPasswordResetToken("user123", 1441)
      ).rejects.toThrow(
        "Expiration time must be between 1 minute and 24 hours"
      );
    });
  });

  describe("verifyEmailToken", () => {
    it("should verify email token successfully", async () => {
      const token = "valid-token";
      const mockRecord = {
        id: "verification123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        user: { id: "user123" },
      };

      global.mockFindUnique.mockResolvedValue(mockRecord);
      global.mockUpdate.mockResolvedValue({
        id: "user123",
        emailVerified: true,
      });

      await emailService.verifyEmailToken(token);

      expect(global.mockFindUnique).toHaveBeenCalledWith({
        where: { token },
        include: { user: true },
      });
      expect(global.mockUpdate).toHaveBeenCalledWith({
        where: { id: "user123" },
        data: {
          emailVerified: true,
          verifiedAt: expect.any(Date),
        },
      });
    });

    it("should throw error for invalid token", async () => {
      const token = "invalid-token";

      global.mockFindUnique.mockResolvedValue(null);

      await expect(emailService.verifyEmailToken(token)).rejects.toThrow(
        "Invalid or expired verification token"
      );
    });

    it("should throw error for expired token", async () => {
      const token = "expired-token";
      const mockRecord = {
        id: "verification123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      global.mockFindUnique.mockResolvedValue(mockRecord);

      await expect(emailService.verifyEmailToken(token)).rejects.toThrow(
        "Invalid or expired verification token"
      );
    });

    it("should throw error for missing token", async () => {
      await expect(emailService.verifyEmailToken(null)).rejects.toThrow(
        "Missing required parameter: token"
      );
    });
  });

  describe("sendVerificationEmail", () => {
    it("should send verification email successfully", async () => {
      const user = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
      };
      const token = "mock-verification-token";

      await emailService.sendVerificationEmail(user, token);

      const transporter = emailService.getTransporter();
      expect(transporter.sendMail).toHaveBeenCalled();
    });

    it("should handle email sending failure", async () => {
      const user = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
      };
      const token = "mock-verification-token";

      const transporter = emailService.getTransporter();
      transporter.sendMail.mockRejectedValueOnce(
        new Error("Failed to send verification email")
      );

      await expect(
        emailService.sendVerificationEmail(user, token)
      ).rejects.toThrow("Failed to send verification email");
    });

    it("should throw error for missing user", async () => {
      await expect(
        emailService.sendVerificationEmail(null, "token")
      ).rejects.toThrow(
        "Missing required parameters: user, user.email, or token"
      );
    });

    it("should throw error for missing email", async () => {
      await expect(
        emailService.sendVerificationEmail({ id: "user123" }, "token")
      ).rejects.toThrow(
        "Missing required parameters: user, user.email, or token"
      );
    });

    it("should throw error for missing token", async () => {
      await expect(
        emailService.sendVerificationEmail(
          { id: "user123", email: "test@example.com" },
          null
        )
      ).rejects.toThrow(
        "Missing required parameters: user, user.email, or token"
      );
    });

    it("should throw error for invalid email", async () => {
      await expect(
        emailService.sendVerificationEmail(
          { id: "user123", email: "invalid-email" },
          "token"
        )
      ).rejects.toThrow("Invalid email address");
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("should send password reset email successfully", async () => {
      const user = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
      };
      const token = "mock-reset-token";

      await emailService.sendPasswordResetEmail(user, token);

      const transporter = emailService.getTransporter();
      expect(transporter.sendMail).toHaveBeenCalled();
    });

    it("should handle email sending failure", async () => {
      const user = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
      };
      const token = "mock-reset-token";

      const transporter = emailService.getTransporter();
      transporter.sendMail.mockRejectedValueOnce(
        new Error("Failed to send password reset email")
      );

      await expect(
        emailService.sendPasswordResetEmail(user, token)
      ).rejects.toThrow("Failed to send password reset email");
    });

    it("should throw error for missing user", async () => {
      await expect(
        emailService.sendPasswordResetEmail(null, "token")
      ).rejects.toThrow(
        "Missing required parameters: user, user.email, or token"
      );
    });

    it("should throw error for missing email", async () => {
      await expect(
        emailService.sendPasswordResetEmail({ id: "user123" }, "token")
      ).rejects.toThrow(
        "Missing required parameters: user, user.email, or token"
      );
    });

    it("should throw error for missing token", async () => {
      await expect(
        emailService.sendPasswordResetEmail(
          { id: "user123", email: "test@example.com" },
          null
        )
      ).rejects.toThrow(
        "Missing required parameters: user, user.email, or token"
      );
    });

    it("should throw error for invalid email", async () => {
      await expect(
        emailService.sendPasswordResetEmail(
          { id: "user123", email: "invalid-email" },
          "token"
        )
      ).rejects.toThrow("Invalid email address");
    });
  });

  describe("resendVerificationEmail", () => {
    it("should resend verification email for unverified user", async () => {
      const user = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: false,
      };

      global.mockCreate.mockResolvedValue({
        id: "verification123",
        userId: user.id,
        token: "mock-verification-token",
        expiresAt: new Date(),
      });

      await emailService.resendVerificationEmail(user);

      expect(global.mockDeleteMany).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
      expect(global.mockCreate).toHaveBeenCalled();

      const transporter = emailService.getTransporter();
      expect(transporter.sendMail).toHaveBeenCalled();
    });

    it("should throw error for already verified user", async () => {
      const user = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
      };

      await expect(emailService.resendVerificationEmail(user)).rejects.toThrow(
        "Email already verified"
      );
    });

    it("should throw error for missing user", async () => {
      await expect(emailService.resendVerificationEmail(null)).rejects.toThrow(
        "Missing required parameter: user or user.id"
      );
    });

    it("should throw error for missing user.id", async () => {
      await expect(
        emailService.resendVerificationEmail({ email: "test@example.com" })
      ).rejects.toThrow("Missing required parameter: user or user.id");
    });

    it("should handle email sending failure during resend", async () => {
      const user = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: false,
      };

      global.mockCreate.mockResolvedValue({
        id: "verification123",
        userId: user.id,
        token: "mock-verification-token",
        expiresAt: new Date(),
      });

      const transporter = emailService.getTransporter();
      transporter.sendMail.mockRejectedValueOnce(
        new Error("Failed to send verification email")
      );

      await expect(emailService.resendVerificationEmail(user)).rejects.toThrow(
        "Failed to send verification email"
      );
    });
  });

  describe("sendInviteEmail", () => {
    it("should send workspace invite email successfully", async () => {
      const email = "invite@example.com";
      const token = "invite-token";
      const workspaceId = "workspace123";

      await emailService.sendInviteEmail(email, token, workspaceId);

      const transporter = emailService.getTransporter();
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: "You're invited to join a workspace on AI-Persona!",
          html: expect.stringContaining("register?token=invite-token"),
        })
      );
    });

    it("should handle invite email sending failure", async () => {
      const email = "invite@example.com";
      const token = "invite-token";
      const workspaceId = "workspace123";

      const transporter = emailService.getTransporter();
      transporter.sendMail.mockRejectedValueOnce(
        new Error("Failed to send workspace invite email")
      );

      await expect(
        emailService.sendInviteEmail(email, token, workspaceId)
      ).rejects.toThrow("Failed to send workspace invite email");
    });

    it("should throw error for missing email", async () => {
      await expect(
        emailService.sendInviteEmail(null, "token", "workspace123")
      ).rejects.toThrow("Missing required parameters: email or token");
    });

    it("should throw error for missing token", async () => {
      await expect(
        emailService.sendInviteEmail("test@example.com", null, "workspace123")
      ).rejects.toThrow("Missing required parameters: email or token");
    });

    it("should throw error for invalid email", async () => {
      await expect(
        emailService.sendInviteEmail("invalid-email", "token", "workspace123")
      ).rejects.toThrow("Invalid email address");
    });
  });

  describe("cleanupExpiredVerifications", () => {
    it("should cleanup expired verifications", async () => {
      global.mockDeleteMany.mockResolvedValue({ count: 5 });

      await emailService.cleanupExpiredVerifications();

      expect(global.mockDeleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });

    it("should handle cleanup with no expired verifications", async () => {
      global.mockDeleteMany.mockResolvedValue({ count: 0 });

      await emailService.cleanupExpiredVerifications();

      expect(global.mockDeleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });

    it("should handle cleanup database errors", async () => {
      global.mockDeleteMany.mockRejectedValue(new Error("Database error"));

      await expect(emailService.cleanupExpiredVerifications()).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle createEmailVerification with custom expiration", async () => {
      const userId = "user123";
      const customMinutes = 120; // 2 hours

      global.mockCreate.mockResolvedValue({
        id: "verification123",
        userId,
        token: "mock-verification-token",
        expiresAt: new Date(),
      });

      const token = await emailService.createEmailVerification(
        userId,
        customMinutes
      );

      expect(token).toBe("mock-verification-token");
      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          userId,
          token: "mock-verification-token",
          expiresAt: expect.any(Date),
        },
      });
    });

    it("should handle createPasswordResetToken with custom expiration", async () => {
      const userId = "user123";
      const customMinutes = 30; // 30 minutes

      global.mockCreate.mockResolvedValue({
        id: "reset123",
        userId,
        token: "mock-reset-token",
        expiresAt: new Date(),
      });

      const token = await emailService.createPasswordResetToken(
        userId,
        customMinutes
      );

      expect(token).toBe("mock-verification-token"); // Uses the mocked generateToken
      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          userId,
          token: "mock-verification-token",
          expiresAt: expect.any(Date),
        },
      });
    });

    it("should handle database errors in createEmailVerification", async () => {
      const userId = "user123";

      global.mockCreate.mockRejectedValue(new Error("Database error"));

      await expect(
        emailService.createEmailVerification(userId)
      ).rejects.toThrow("Failed to create email verification");
    });

    it("should handle database errors in createPasswordResetToken", async () => {
      const userId = "user123";

      global.mockCreate.mockRejectedValue(new Error("Database error"));

      await expect(
        emailService.createPasswordResetToken(userId)
      ).rejects.toThrow("Failed to create password reset token");
    });

    it("should handle database errors in verifyEmailToken update", async () => {
      const token = "valid-token";
      const mockRecord = {
        id: "verification123",
        userId: "user123",
        token,
        expiresAt: new Date(Date.now() + 3600000),
        user: { id: "user123" },
      };

      global.mockFindUnique.mockResolvedValue(mockRecord);
      global.mockUpdate.mockRejectedValue(new Error("Database error"));

      await expect(emailService.verifyEmailToken(token)).rejects.toThrow(
        "Failed to verify email token"
      );
    });

    it("should send verification email with user name", async () => {
      const user = {
        id: "user123",
        email: "test@example.com",
        name: "John Doe",
      };
      const token = "mock-verification-token";

      await emailService.sendVerificationEmail(user, token);

      const transporter = emailService.getTransporter();
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: "Verify your email address",
          html: expect.stringContaining("Hello John Doe,"),
        })
      );
    });

    it("should send verification email without user name", async () => {
      const user = {
        id: "user123",
        email: "test@example.com",
        name: null,
      };
      const token = "mock-verification-token";

      await emailService.sendVerificationEmail(user, token);

      const transporter = emailService.getTransporter();
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: "Verify your email address",
          html: expect.stringContaining("Hello ,"),
        })
      );
    });

    it("should send password reset email with user name", async () => {
      const user = {
        id: "user123",
        email: "test@example.com",
        name: "Jane Smith",
      };
      const token = "mock-reset-token";

      await emailService.sendPasswordResetEmail(user, token);

      const transporter = emailService.getTransporter();
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: "Reset your AI-Persona account password",
          html: expect.stringContaining("Hello Jane Smith,"),
        })
      );
    });

    it("should send password reset email without user name", async () => {
      const user = {
        id: "user123",
        email: "test@example.com",
        name: "",
      };
      const token = "mock-reset-token";

      await emailService.sendPasswordResetEmail(user, token);

      const transporter = emailService.getTransporter();
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: "Reset your AI-Persona account password",
          html: expect.stringContaining("Hello ,"),
        })
      );
    });

    it("should calculate correct expiration time for email verification", async () => {
      const userId = "user123";
      const expiresInMinutes = 60;
      const mockDate = new Date("2023-01-01T12:00:00Z");
      jest.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

      global.mockCreate.mockResolvedValue({
        id: "verification123",
        userId,
        token: "mock-verification-token",
        expiresAt: new Date(),
      });

      await emailService.createEmailVerification(userId, expiresInMinutes);

      const expectedExpiresAt = new Date(
        mockDate.getTime() + expiresInMinutes * 60 * 1000
      );

      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          userId,
          token: "mock-verification-token",
          expiresAt: expectedExpiresAt,
        },
      });

      Date.now.mockRestore();
    });

    it("should calculate correct expiration time for password reset", async () => {
      const userId = "user123";
      const expiresInMinutes = 30;
      const mockDate = new Date("2023-01-01T14:00:00Z");
      jest.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

      global.mockCreate.mockResolvedValue({
        id: "reset123",
        userId,
        token: "mock-reset-token",
        expiresAt: new Date(),
      });

      await emailService.createPasswordResetToken(userId, expiresInMinutes);

      const expectedExpiresAt = new Date(
        mockDate.getTime() + expiresInMinutes * 60 * 1000
      );

      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          userId,
          token: "mock-verification-token",
          expiresAt: expectedExpiresAt,
        },
      });

      Date.now.mockRestore();
    });
  });
});
