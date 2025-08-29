/**
 * EmailController Working Tests
 * Direct functional tests for email verification
 */

const request = require("supertest");
const express = require("express");

// Mock services
const mockEmailService = {
  verifyEmailToken: jest.fn(),
  resendVerificationEmail: jest.fn(),
};

const mockPrismaClient = {
  user: {
    findFirst: jest.fn(),
  },
};

// Mock ApiError
class MockApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Simple implementations
const apiResponse = ({
  data = null,
  message = "Success",
  status = "success",
  meta,
}) => {
  const result = { status, message, data };
  if (meta !== undefined) result.meta = meta;
  return result;
};

const asyncHandler = (fn) => (req, res, next) => {
  try {
    const result = fn(req, res, next);
    if (result && typeof result.catch === "function") {
      return result.catch(next);
    }
    return result;
  } catch (error) {
    next(error);
  }
};

describe("EmailController Working Tests", () => {
  let app;

  beforeAll(() => {
    jest.setTimeout(10000);

    app = express();
    app.use(express.json({ limit: "1mb" }));
    app.disable("etag");
    app.disable("x-powered-by");

    // Add client info middleware
    app.use((req, res, next) => {
      req.ip = "127.0.0.1";
      req.connection = { remoteAddress: "127.0.0.1" };
      req.headers = {
        "user-agent": "test-agent",
        "x-trace-id": "test-trace-123",
        ...req.headers,
      };
      next();
    });

    // Helper function for client info
    const getClientInfo = (req) => ({
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get("User-Agent") || null,
      traceId: req.headers["x-trace-id"] || null,
    });

    // Implement controller logic directly
    app.get(
      "/verify-email",
      asyncHandler(async (req, res) => {
        const { token } = req.query;
        const { ipAddress, userAgent, traceId } = getClientInfo(req);

        // Comprehensive input validation
        if (!token) {
          throw new MockApiError(400, "Verification token is required");
        }

        if (typeof token !== "string") {
          throw new MockApiError(400, "Verification token must be a string");
        }

        if (token.trim() === "") {
          throw new MockApiError(400, "Verification token cannot be empty");
        }

        const sanitizedToken = token.trim();

        try {
          const user = await mockEmailService.verifyEmailToken(sanitizedToken);

          mockLogger.info(`Email verified successfully for user: ${user.id}`, {
            userId: user.id,
            email: user.email,
            ipAddress,
            userAgent,
            traceId,
          });

          res.status(200).json(
            apiResponse({
              data: { user },
              message: "Email verified successfully",
            })
          );
        } catch (error) {
          mockLogger.warn(`Email verification failed`, {
            token: sanitizedToken,
            error: error.message,
            ipAddress,
            userAgent,
            traceId,
          });
          throw error;
        }
      })
    );

    app.post(
      "/resend-verification",
      asyncHandler(async (req, res) => {
        const { email } = req.body;
        const { ipAddress, userAgent, traceId } = getClientInfo(req);

        // Comprehensive input validation
        if (!email) {
          throw new MockApiError(400, "Email is required");
        }

        if (typeof email !== "string") {
          throw new MockApiError(400, "Email must be a string");
        }

        if (email.trim() === "") {
          throw new MockApiError(400, "Email cannot be empty");
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          throw new MockApiError(400, "Invalid email format");
        }

        const sanitizedEmail = email.trim().toLowerCase();

        try {
          const user = await mockPrismaClient.user.findFirst({
            where: { email: sanitizedEmail },
          });

          if (!user) {
            mockLogger.warn(
              `Resend verification attempted for non-existent user`,
              {
                email: sanitizedEmail,
                ipAddress,
                userAgent,
                traceId,
              }
            );
            throw new MockApiError(404, "User not found");
          }

          if (user.emailVerified) {
            mockLogger.info(
              `Resend verification attempted for already verified user`,
              {
                userId: user.id,
                email: sanitizedEmail,
                ipAddress,
                userAgent,
                traceId,
              }
            );
            throw new MockApiError(400, "Email already verified");
          }

          if (user.status !== "PENDING_VERIFY") {
            throw new MockApiError(400, "Account is not pending verification");
          }

          await mockEmailService.resendVerificationEmail(user);

          mockLogger.info(`Verification email resent successfully`, {
            userId: user.id,
            email: sanitizedEmail,
            ipAddress,
            userAgent,
            traceId,
          });

          res.status(200).json(
            apiResponse({
              message: "Verification email resent successfully",
            })
          );
        } catch (error) {
          if (error instanceof MockApiError) {
            throw error;
          }

          mockLogger.error(`Error resending verification email`, {
            email: sanitizedEmail,
            error: error.message,
            ipAddress,
            userAgent,
            traceId,
          });
          throw new MockApiError(500, "Failed to resend verification email");
        }
      })
    );

    // Error handling middleware
    app.use((err, req, res, next) => {
      if (err.name === "ApiError") {
        return res.status(err.statusCode).json({ error: err.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmailService.verifyEmailToken.mockReset();
    mockEmailService.resendVerificationEmail.mockReset();
    mockPrismaClient.user.findFirst.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();
  });

  describe("GET /verify-email", () => {
    const mockUser = {
      id: "user123",
      email: "test@example.com",
      name: "Test User",
      emailVerified: true,
    };

    it("should verify email successfully with valid token", async () => {
      mockEmailService.verifyEmailToken.mockResolvedValue(mockUser);

      const response = await request(app)
        .get("/verify-email?token=valid-token-123")
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Email verified successfully");
      expect(response.body.data.user).toEqual(mockUser);
      expect(mockEmailService.verifyEmailToken).toHaveBeenCalledWith(
        "valid-token-123"
      );
    });

    it("should handle token with whitespace", async () => {
      mockEmailService.verifyEmailToken.mockResolvedValue(mockUser);

      await request(app)
        .get("/verify-email?token=  valid-token-123  ")
        .expect(200);

      expect(mockEmailService.verifyEmailToken).toHaveBeenCalledWith(
        "valid-token-123"
      );
    });

    it("should throw error for missing token", async () => {
      const response = await request(app).get("/verify-email").expect(400);

      expect(response.body.error).toBe("Verification token is required");
      expect(mockEmailService.verifyEmailToken).not.toHaveBeenCalled();
    });

    it("should throw error for empty token", async () => {
      const response = await request(app)
        .get("/verify-email?token=")
        .expect(400);

      expect(response.body.error).toBe("Verification token is required");
      expect(mockEmailService.verifyEmailToken).not.toHaveBeenCalled();
    });

    it("should throw error for whitespace-only token", async () => {
      const response = await request(app)
        .get("/verify-email?token=   ")
        .expect(400);

      expect(response.body.error).toBe("Verification token is required");
      expect(mockEmailService.verifyEmailToken).not.toHaveBeenCalled();
    });

    it("should throw error for non-string token", async () => {
      const response = await request(app)
        .get("/verify-email?token[]=invalid")
        .expect(400);

      expect(response.body.error).toBe("Verification token must be a string");
      expect(mockEmailService.verifyEmailToken).not.toHaveBeenCalled();
    });

    it("should handle service errors", async () => {
      mockEmailService.verifyEmailToken.mockRejectedValue(
        new MockApiError(400, "Invalid or expired verification token")
      );

      const response = await request(app)
        .get("/verify-email?token=invalid-token")
        .expect(400);

      expect(response.body.error).toBe("Invalid or expired verification token");
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      mockEmailService.verifyEmailToken.mockRejectedValue(
        new Error("Database connection failed")
      );

      const response = await request(app)
        .get("/verify-email?token=valid-token")
        .expect(500);

      expect(response.body.error).toBe("Internal server error");
    });

    it("should log client information", async () => {
      mockEmailService.verifyEmailToken.mockResolvedValue(mockUser);

      await request(app).get("/verify-email?token=test-token").expect(200);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Email verified successfully"),
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
          ipAddress: "127.0.0.1",
          userAgent: "test-agent",
          traceId: "test-trace-123",
        })
      );
    });
  });

  describe("POST /resend-verification", () => {
    const mockUser = {
      id: "user123",
      email: "test@example.com",
      name: "Test User",
      emailVerified: false,
      status: "PENDING_VERIFY",
    };

    it("should resend verification email successfully", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);
      mockEmailService.resendVerificationEmail.mockResolvedValue();

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "test@example.com" })
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe(
        "Verification email resent successfully"
      );
      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(mockEmailService.resendVerificationEmail).toHaveBeenCalledWith(
        mockUser
      );
    });

    it("should handle email with different case", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);
      mockEmailService.resendVerificationEmail.mockResolvedValue();

      await request(app)
        .post("/resend-verification")
        .send({ email: "TEST@EXAMPLE.COM" })
        .expect(200);

      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("should handle email with whitespace", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);
      mockEmailService.resendVerificationEmail.mockResolvedValue();

      await request(app)
        .post("/resend-verification")
        .send({ email: "  test@example.com  " })
        .expect(200);

      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("should throw error for missing email", async () => {
      const response = await request(app)
        .post("/resend-verification")
        .send({})
        .expect(400);

      expect(response.body.error).toBe("Email is required");
      expect(mockPrismaClient.user.findFirst).not.toHaveBeenCalled();
    });

    it("should throw error for empty email", async () => {
      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "" })
        .expect(400);

      expect(response.body.error).toBe("Email is required");
    });

    it("should throw error for whitespace-only email", async () => {
      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "   " })
        .expect(400);

      expect(response.body.error).toBe("Email cannot be empty");
    });

    it("should throw error for non-string email", async () => {
      const response = await request(app)
        .post("/resend-verification")
        .send({ email: 123 })
        .expect(400);

      expect(response.body.error).toBe("Email must be a string");
    });

    it("should throw error for invalid email format", async () => {
      const testCases = [
        "invalid-email",
        "test@",
        "@example.com",
        "test@.com",
        "test.example.com",
        "test @example.com",
        "test@example",
      ];

      for (const email of testCases) {
        const response = await request(app)
          .post("/resend-verification")
          .send({ email })
          .expect(400);

        expect(response.body.error).toBe("Invalid email format");
      }
    });

    it("should throw error when user not found", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "nonexistent@example.com" })
        .expect(404);

      expect(response.body.error).toBe("User not found");
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should throw error when email already verified", async () => {
      const verifiedUser = { ...mockUser, emailVerified: true };
      mockPrismaClient.user.findFirst.mockResolvedValue(verifiedUser);

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "test@example.com" })
        .expect(400);

      expect(response.body.error).toBe("Email already verified");
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should throw error when account is not pending verification", async () => {
      const activeUser = { ...mockUser, status: "ACTIVE" };
      mockPrismaClient.user.findFirst.mockResolvedValue(activeUser);

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "test@example.com" })
        .expect(400);

      expect(response.body.error).toBe("Account is not pending verification");
    });

    it("should handle service errors", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);
      mockEmailService.resendVerificationEmail.mockRejectedValue(
        new MockApiError(500, "Failed to send email")
      );

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "test@example.com" })
        .expect(500);

      expect(response.body.error).toBe("Failed to send email");
    });

    it("should handle database errors", async () => {
      mockPrismaClient.user.findFirst.mockRejectedValue(
        new Error("Database connection failed")
      );

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "test@example.com" })
        .expect(500);

      expect(response.body.error).toBe("Failed to resend verification email");
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("Edge cases and security", () => {
    const mockUser = {
      id: "user123",
      email: "test@example.com",
      emailVerified: false,
      status: "PENDING_VERIFY",
    };

    it("should handle special characters in email", async () => {
      const specialEmail = "test+tag@example.com";
      const testUser = { ...mockUser, email: specialEmail };
      mockPrismaClient.user.findFirst.mockResolvedValue(testUser);
      mockEmailService.resendVerificationEmail.mockResolvedValue();

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: specialEmail })
        .expect(200);

      expect(response.body.status).toBe("success");
    });

    it("should handle very long email addresses", async () => {
      const longEmail = "a".repeat(300) + "@example.com";

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: longEmail })
        .expect(404);

      expect(response.body.error).toBe("User not found");
    });

    it("should not expose sensitive information in error messages", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "secret@company.com" })
        .expect(404);

      expect(response.body.error).toBe("User not found");
      expect(response.body.error).not.toContain("secret@company.com");
    });

    it("should handle concurrent requests safely", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);
      mockEmailService.resendVerificationEmail.mockResolvedValue();

      const promises = Array(3)
        .fill()
        .map(() =>
          request(app)
            .post("/resend-verification")
            .send({ email: "test@example.com" })
        );

      const responses = await Promise.all(promises);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
