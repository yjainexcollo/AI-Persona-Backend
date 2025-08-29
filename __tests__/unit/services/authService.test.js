// Mock dependencies before importing the service
jest.mock("../../../src/services/breachCheckService", () => ({
  validatePasswordWithBreachCheck: jest.fn().mockResolvedValue({
    isValid: true,
    reason: "Password is secure",
    severity: "safe",
  }),
}));

jest.mock("../../../src/services/emailService", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  createEmailVerification: jest
    .fn()
    .mockResolvedValue("mock-verification-token"),
  createPasswordResetToken: jest
    .fn()
    .mockResolvedValue("mock-password-reset-token"),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

// Mock bcrypt
jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock jwt with all required functions
jest.mock("../../../src/utils/jwt", () => ({
  generateAccessToken: jest.fn(() => "mock-access-token"),
  generateRefreshToken: jest.fn(() => "mock-refresh-token"),
  verifyToken: jest.fn(() => ({ userId: "user123" })),
  signToken: jest.fn(() => "mock-access-token"),
  signRefreshToken: jest.fn(() => "mock-refresh-token"),
  generateToken: jest.fn(() => "mock-access-token"),
}));

// Clear module cache and import the service after mocking
jest.resetModules();
const authService = require("../../../src/services/authService");

describe("AuthService", () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mock implementations
    global.mockFindUnique.mockReset();
    global.mockCreate.mockReset();
    global.mockUpdate.mockReset();
    global.mockCount.mockReset();

    // Ensure JWT async functions resolve concrete tokens
    const jwt = require("../../../src/utils/jwt");
    if (
      jwt.signToken &&
      typeof jwt.signToken.mockResolvedValue === "function"
    ) {
      jwt.signToken.mockResolvedValue("mock-access-token");
    }
    if (
      jwt.signRefreshToken &&
      typeof jwt.signRefreshToken.mockResolvedValue === "function"
    ) {
      jwt.signRefreshToken.mockResolvedValue("mock-refresh-token");
    }
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "SecurePassword123!",
        name: "Test User",
      };

      const mockWorkspace = {
        id: "workspace123",
        name: "example.com",
        domain: "example.com",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing user
        .mockResolvedValueOnce(null); // No existing workspace
      global.mockCount.mockResolvedValue(0); // First user in workspace
      global.mockCreate
        .mockResolvedValueOnce(mockWorkspace) // Workspace creation
        .mockResolvedValueOnce({
          // User creation
          id: "user123",
          email: userData.email,
          name: userData.name,
          emailVerified: false,
          status: "ACTIVE",
          role: "ADMIN",
          workspaceId: "workspace123",
          workspace: mockWorkspace,
        });

      // Mock breach check service
      const breachCheckService = require("../../../src/services/breachCheckService");
      breachCheckService.validatePasswordWithBreachCheck.mockResolvedValue({
        isValid: true,
        reason: "Password is secure",
      });

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.user.name).toBe(userData.name);
      expect(result.user.role).toBe("ADMIN");
      expect(result.workspace).toBeDefined();
      expect(result.workspace.id).toBe("workspace123");
    });

    it("should validate password strength", async () => {
      // Mock breach check to fail
      const breachCheckService = require("../../../src/services/breachCheckService");
      breachCheckService.validatePasswordWithBreachCheck = jest
        .fn()
        .mockResolvedValue({
          isValid: false,
          reason: "Password too weak",
        });

      const weakPassword = "123";

      await expect(
        authService.register({
          email: `test-${Date.now()}@example.com`,
          password: weakPassword,
          name: "Test User",
        })
      ).rejects.toThrow("Password too weak");
    });

    it("should handle existing user reactivation", async () => {
      const userData = {
        email: "existing@example.com",
        password: "SecurePassword123!",
        name: "Existing User",
      };

      const existingUser = {
        id: "user123",
        email: userData.email,
        name: userData.name,
        emailVerified: false,
        status: "PENDING_DELETION", // This should trigger reactivation
        role: "MEMBER",
        workspaceId: "workspace123",
      };

      global.mockFindUnique.mockResolvedValue(existingUser);
      global.mockUpdate.mockResolvedValue({
        ...existingUser,
        status: "ACTIVE",
      });

      // Mock breach check service
      const breachCheckService = require("../../../src/services/breachCheckService");
      breachCheckService.validatePasswordWithBreachCheck.mockResolvedValue({
        isValid: true,
        reason: "Password is secure",
      });

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(result.user.status).toBe("ACTIVE");
    });
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      const credentials = {
        email: "test@example.com",
        password: "SecurePassword123!",
      };

      const mockUser = {
        id: "user123",
        email: credentials.email,
        name: "Test User",
        passwordHash: "hashed-password",
        emailVerified: true,
        status: "ACTIVE",
        role: "MEMBER",
        workspaceId: "workspace123",
        workspace: { id: "workspace123", name: "Example" },
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      // Mock bcrypt to return true for password comparison
      const bcrypt = require("bcrypt");
      bcrypt.compare.mockResolvedValue(true);

      const result = await authService.login(credentials);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(credentials.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("should reject unverified users", async () => {
      const testUser = {
        id: "user123",
        email: "test@example.com",
        status: "PENDING_VERIFY",
        emailVerified: false,
        passwordHash: "hashed-password",
      };

      const loginData = {
        email: testUser.email,
        password: "TestPassword123!",
      };

      global.mockFindUnique.mockResolvedValue(testUser);

      await expect(authService.login(loginData)).rejects.toThrow(
        "Please verify your email before logging in"
      );
    });

    it("should reject when account is locked", async () => {
      const credentials = { email: "locked@example.com", password: "x" };
      const future = new Date(Date.now() + 10 * 60 * 1000);
      global.mockFindUnique.mockResolvedValue({
        id: "user1",
        email: credentials.email,
        passwordHash: "hash",
        status: "ACTIVE",
        emailVerified: true,
        lockedUntil: future,
        workspace: { id: "w1", name: "W" },
      });

      await expect(authService.login(credentials)).rejects.toThrow(
        /temporarily locked/i
      );
    });

    it("should handle invalid password with attempts remaining", async () => {
      const credentials = { email: "user@example.com", password: "bad" };
      const user = {
        id: "user1",
        email: credentials.email,
        passwordHash: "hash",
        status: "ACTIVE",
        emailVerified: true,
        failedLoginCount: 1,
        workspace: { id: "w1", name: "W" },
      };

      // First findUnique for login, second for lockAccount internals
      global.mockFindUnique
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(user);

      const bcrypt = require("bcrypt");
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(credentials)).rejects.toThrow(
        /attempts remaining/i
      );
      expect(global.mockUpdate).toHaveBeenCalled();
    });

    it("should lock account on too many failed attempts", async () => {
      const credentials = { email: "user@example.com", password: "bad" };
      const user = {
        id: "user1",
        email: credentials.email,
        passwordHash: "hash",
        status: "ACTIVE",
        emailVerified: true,
        failedLoginCount: 4,
        workspace: { id: "w1", name: "W" },
      };

      global.mockFindUnique
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(user);

      const bcrypt = require("bcrypt");
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(credentials)).rejects.toThrow(
        /temporarily locked/i
      );
    });

    it("should reject deactivated users", async () => {
      const user = {
        id: "user2",
        email: "x@example.com",
        passwordHash: "hash",
        emailVerified: true,
        status: "DEACTIVATED",
      };
      global.mockFindUnique.mockResolvedValue(user);

      await expect(
        authService.login({ email: user.email, password: "x" })
      ).rejects.toThrow(/deactivated/i);
    });

    it("should reject pending deletion users", async () => {
      const user = {
        id: "user2",
        email: "x@example.com",
        passwordHash: "hash",
        emailVerified: true,
        status: "PENDING_DELETION",
      };
      global.mockFindUnique.mockResolvedValue(user);

      await expect(
        authService.login({ email: user.email, password: "x" })
      ).rejects.toThrow(/pending deletion/i);
    });
  });

  describe("refreshTokens", () => {
    it("should reject invalid or expired refresh token", async () => {
      global.mockFindUnique.mockResolvedValue(null);
      await expect(
        authService.refreshTokens({ refreshToken: "bad" })
      ).rejects.toThrow(/Invalid or expired refresh token/);
    });

    it("should reject when user is not active", async () => {
      global.mockFindUnique.mockResolvedValue({
        id: "s1",
        isActive: true,
        expiresAt: new Date(Date.now() + 1000),
        deviceId: "dev1",
        user: { id: "u1", status: "DEACTIVATED" },
      });

      await expect(
        authService.refreshTokens({ refreshToken: "ok" })
      ).rejects.toThrow(/Account is not active/);
      expect(global.mockUpdate).toHaveBeenCalled();
    });

    it("should rotate tokens and sessions on success", async () => {
      global.mockFindUnique.mockResolvedValue({
        id: "s1",
        isActive: true,
        expiresAt: new Date(Date.now() + 1000),
        deviceId: "dev1",
        user: {
          id: "u1",
          email: "u@example.com",
          status: "ACTIVE",
          workspaceId: "w1",
        },
      });

      const result = await authService.refreshTokens({ refreshToken: "ok" });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(global.mockUpdate).toHaveBeenCalled();
      expect(global.mockCreate).toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("should revoke active session and succeed", async () => {
      const jwt = require("../../../src/utils/jwt");
      jwt.verifyToken.mockReturnValue({ userId: "user123" });

      global.mockFindFirst.mockResolvedValue({ id: "s1", deviceId: "dev1" });

      const result = await authService.logout({ token: "token" });
      expect(result.status).toBe("success");
      expect(global.mockUpdate).toHaveBeenCalled();
    });

    it("should succeed even with invalid token", async () => {
      const jwt = require("../../../src/utils/jwt");
      jwt.verifyToken.mockImplementationOnce(() => {
        throw new Error("bad token");
      });

      const result = await authService.logout({ token: "bad" });
      expect(result.status).toBe("success");
    });
  });

  describe("sessions", () => {
    it("should list user sessions", async () => {
      global.mockFindMany.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
      const sessions = await authService.getUserSessions("u1");
      expect(sessions).toHaveLength(2);
    });

    it("should revoke specific session", async () => {
      global.mockFindFirst.mockResolvedValue({ id: "s1" });
      const result = await authService.revokeSession("u1", "s1");
      expect(result).toEqual({ success: true });
      expect(global.mockUpdate).toHaveBeenCalled();
    });

    it("should error when session not found to revoke", async () => {
      global.mockFindFirst.mockResolvedValue(null);
      await expect(authService.revokeSession("u1", "s1")).rejects.toThrow(
        /Session not found/
      );
    });
  });

  describe("email verification and password reset", () => {
    it("should verify email with valid token", async () => {
      const record = {
        token: "t1",
        userId: "u1",
        user: { id: "u1" },
      };
      global.mockFindUnique.mockResolvedValue(record);

      const result = await authService.verifyEmail("t1");
      expect(result).toEqual(record.user);
      expect(global.mockUpdate).toHaveBeenCalled();
      expect(global.mockDelete).toHaveBeenCalled();
    });

    it("should reject invalid verification token", async () => {
      global.mockFindUnique.mockResolvedValue(null);
      await expect(authService.verifyEmail("bad")).rejects.toThrow(
        /Invalid or expired verification token/
      );
    });

    it("should request password reset when user exists", async () => {
      global.mockFindUnique.mockResolvedValue({ id: "u1", email: "x@x.com" });
      const emailService = require("../../../src/services/emailService");
      const result = await authService.requestPasswordReset({
        email: "x@x.com",
      });
      expect(emailService.createPasswordResetToken).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(result.status).toBe("success");
    });

    it("should always succeed for password reset request even if user missing", async () => {
      global.mockFindUnique.mockResolvedValue(null);
      const emailService = require("../../../src/services/emailService");
      const result = await authService.requestPasswordReset({
        email: "x@x.com",
      });
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result.status).toBe("success");
    });

    it("should reset password with valid token", async () => {
      const record = {
        id: "prt1",
        userId: "u1",
        user: { id: "u1" },
        expiresAt: new Date(Date.now() + 1000),
        used: false,
      };
      global.mockFindUnique.mockResolvedValue(record);

      const result = await authService.resetPassword({
        token: "tok",
        newPassword: "StrongP@ssw0rd",
      });
      expect(result).toEqual({ success: true });
      expect(global.mockUpdate).toHaveBeenCalled();
      expect(global.mockUpdate).toHaveBeenCalled();
      expect(global.mockUpdateMany).toBeDefined();
    });

    it("should reject invalid or expired reset token", async () => {
      global.mockFindUnique.mockResolvedValue(null);
      await expect(
        authService.resetPassword({
          token: "bad",
          newPassword: "StrongP@ssw0rd",
        })
      ).rejects.toThrow(/Invalid or expired reset token/);
    });
  });

  describe("account status changes", () => {
    it("should deactivate account", async () => {
      global.mockFindUnique.mockResolvedValue({ id: "u1" });
      const result = await authService.deactivateAccount("u1");
      expect(result).toEqual({ success: true });
      expect(global.mockUpdate).toHaveBeenCalled();
      expect(global.mockUpdateMany).toBeDefined();
    });

    it("should error deactivating unknown account", async () => {
      global.mockFindUnique.mockResolvedValue(null);
      await expect(authService.deactivateAccount("uX")).rejects.toThrow(
        /User not found/
      );
    });

    it("should request account deletion", async () => {
      global.mockFindUnique.mockResolvedValue({ id: "u1" });
      const result = await authService.requestAccountDeletion("u1");
      expect(result).toEqual({ success: true });
      expect(global.mockUpdate).toHaveBeenCalled();
      expect(global.mockUpdateMany).toBeDefined();
    });
  });

  describe("cleanup jobs", () => {
    it("should cleanup unverified users", async () => {
      global.mockDeleteMany.mockResolvedValue({ count: 5 });
      const count = await authService.cleanupUnverifiedUsers(7);
      expect(count).toBe(5);
    });

    it("should cleanup pending deletion users", async () => {
      global.mockDeleteMany.mockResolvedValue({ count: 3 });
      const count = await authService.cleanupPendingDeletionUsers(30);
      expect(count).toBe(3);
    });

    it("should cleanup expired sessions", async () => {
      global.mockDeleteMany.mockResolvedValue({ count: 7 });
      const count = await authService.cleanupExpiredSessions();
      expect(count).toBe(7);
    });
  });
});
