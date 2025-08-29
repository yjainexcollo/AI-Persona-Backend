const ApiError = require("../../../src/utils/apiError");

// Mock email service
jest.mock("../../../src/services/emailService", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock JWT functions properly - they are async in the real implementation
const mockSignToken = jest.fn().mockResolvedValue("mock-access-token");
const mockSignRefreshToken = jest.fn().mockResolvedValue("mock-refresh-token");

jest.mock("../../../src/utils/jwt", () => ({
  signToken: mockSignToken,
  signRefreshToken: mockSignRefreshToken,
}));

// Clear module cache and import the service after mocking
jest.resetModules();
const oauthService = require("../../../src/services/oauthService");

describe("OAuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    global.mockFindUnique.mockReset();
    global.mockCreate.mockReset();
    global.mockUpdate.mockReset();
    global.mockCount.mockReset();
    global.mockDeleteMany.mockReset();
    global.mockPrisma.$transaction.mockImplementation((callback) =>
      callback(global.mockPrisma)
    );

    // Reset JWT mocks
    mockSignToken.mockResolvedValue("mock-access-token");
    mockSignRefreshToken.mockResolvedValue("mock-refresh-token");
  });

  describe("handleOAuthLogin - Input Validation", () => {
    it("should throw error for invalid provider", async () => {
      const profile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      await expect(
        oauthService.handleOAuthLogin(null, profile)
      ).rejects.toThrow("Valid OAuth provider is required");

      await expect(oauthService.handleOAuthLogin("", profile)).rejects.toThrow(
        "Valid OAuth provider is required"
      );

      await expect(oauthService.handleOAuthLogin(123, profile)).rejects.toThrow(
        "Valid OAuth provider is required"
      );
    });

    it("should throw error for invalid profile", async () => {
      await expect(
        oauthService.handleOAuthLogin("google", null)
      ).rejects.toThrow("Valid OAuth profile is required");

      await expect(
        oauthService.handleOAuthLogin("google", "invalid")
      ).rejects.toThrow("Valid OAuth profile is required");

      await expect(oauthService.handleOAuthLogin("google", {})).rejects.toThrow(
        "Email is required for OAuth login"
      );
    });

    it("should throw error for profile without emails", async () => {
      const profile = {
        id: "google123",
        displayName: "Test User",
      };

      await expect(
        oauthService.handleOAuthLogin("google", profile)
      ).rejects.toThrow("Email is required for OAuth login");
    });

    it("should throw error for profile with empty emails array", async () => {
      const profile = {
        id: "google123",
        emails: [],
        displayName: "Test User",
      };

      await expect(
        oauthService.handleOAuthLogin("google", profile)
      ).rejects.toThrow("Email is required for OAuth login");
    });

    it("should throw error for invalid email format", async () => {
      const profile = {
        id: "google123",
        emails: [{ value: "invalid-email" }],
        displayName: "Test User",
      };

      await expect(
        oauthService.handleOAuthLogin("google", profile)
      ).rejects.toThrow("Valid email is required for OAuth login");
    });

    it("should throw error for empty email value", async () => {
      const profile = {
        id: "google123",
        emails: [{ value: "" }],
        displayName: "Test User",
      };

      await expect(
        oauthService.handleOAuthLogin("google", profile)
      ).rejects.toThrow("Valid email is required for OAuth login");
    });
  });

  describe("handleOAuthLogin - New User Registration", () => {
    it("should create new user and workspace for OAuth login", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const mockWorkspace = {
        id: "workspace123",
        name: "example.com",
        domain: "example.com",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "ADMIN",
        workspaceId: "workspace123",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing workspace
        .mockResolvedValueOnce(null); // No existing user
      global.mockCreate
        .mockResolvedValueOnce(mockWorkspace) // Workspace creation
        .mockResolvedValueOnce(mockUser) // User creation
        .mockResolvedValueOnce({ id: "session123" }); // Session creation
      global.mockCount.mockResolvedValue(0); // First user in workspace

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      expect(result).toBeDefined();
      expect(result.status).toBe("success");
      expect(result.message).toBe("OAuth registration successful");
      expect(result.data.user).toBeDefined();
      expect(result.data.user.email).toBe("test@example.com");
      expect(result.data.user.name).toBe("Test User");
      expect(result.data.user.role).toBe("ADMIN");
      expect(result.data.isNewUser).toBe(true);
      expect(result.data.provider).toBe("google");
      expect(result.data.workspaceId).toBe("workspace123");
      expect(result.data.workspaceName).toBe("example.com");
      expect(result.data.accessToken).toBe("mock-access-token");
      expect(result.data.refreshToken).toBe("mock-refresh-token");
    });

    it("should create new user as MEMBER when workspace already has users", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const mockWorkspace = {
        id: "workspace123",
        name: "example.com",
        domain: "example.com",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "MEMBER",
        workspaceId: "workspace123",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing user first
        .mockResolvedValueOnce(mockWorkspace); // Then existing workspace when creating
      global.mockCreate
        .mockResolvedValueOnce(mockUser) // User creation
        .mockResolvedValueOnce({ id: "session123" }); // Session creation
      global.mockCount.mockResolvedValue(1); // Not first user in workspace

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      expect(result.data.user.role).toBe("MEMBER");
      expect(result.data.isNewUser).toBe(true);
    });

    it("should use email prefix as name when displayName is not provided", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "john.doe@example.com" }],
        displayName: null,
      };

      const mockWorkspace = {
        id: "workspace123",
        name: "example.com",
        domain: "example.com",
      };

      const mockUser = {
        id: "user123",
        email: "john.doe@example.com",
        name: "john.doe",
        emailVerified: true,
        status: "ACTIVE",
        role: "ADMIN",
        workspaceId: "workspace123",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing workspace
        .mockResolvedValueOnce(null); // No existing user
      global.mockCreate
        .mockResolvedValueOnce(mockWorkspace) // Workspace creation
        .mockResolvedValueOnce(mockUser); // User creation
      global.mockCount.mockResolvedValue(0);

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      expect(result.data.user.name).toBe("john.doe");
    });

    it("should handle email without @ symbol gracefully", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "invalid-email" }],
        displayName: "Test User",
      };

      await expect(
        oauthService.handleOAuthLogin(provider, oauthProfile)
      ).rejects.toThrow("Valid email is required for OAuth login");
    });
  });

  describe("handleOAuthLogin - Existing User Login", () => {
    it("should return existing user for OAuth login", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "MEMBER",
        workspaceId: "workspace123",
        workspace: {
          id: "workspace123",
          name: "Test Workspace",
        },
      };

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockCreate.mockResolvedValue({
        id: "session123",
        userId: "user123",
        refreshToken: "mock-refresh-token",
        expiresAt: new Date(),
      });

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      expect(result).toBeDefined();
      expect(result.status).toBe("success");
      expect(result.message).toBe("OAuth login successful");
      expect(result.data.user).toBeDefined();
      expect(result.data.user.email).toBe("test@example.com");
      expect(result.data.isNewUser).toBe(false);
      expect(result.data.provider).toBe("google");
    });

    it("should throw error for deactivated user", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        status: "DEACTIVATED",
        role: "MEMBER",
        workspaceId: "workspace123",
        workspace: {
          id: "workspace123",
          name: "Test Workspace",
        },
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        oauthService.handleOAuthLogin(provider, oauthProfile)
      ).rejects.toThrow("Account is deactivated");
    });

    it("should handle user with unknown workspace name", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "MEMBER",
        workspaceId: "workspace123",
        workspace: null,
      };

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockCreate.mockResolvedValue({
        id: "session123",
        userId: "user123",
        refreshToken: "mock-refresh-token",
        expiresAt: new Date(),
      });

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      expect(result.data.workspaceName).toBe("Unknown Workspace");
    });
  });

  describe("handleOAuthLogin - Error Handling", () => {
    it("should handle database connection errors", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      global.mockFindUnique.mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(
        oauthService.handleOAuthLogin(provider, oauthProfile)
      ).rejects.toThrow("OAuth login failed");
    });

    it("should handle JWT signing errors", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "MEMBER",
        workspaceId: "workspace123",
        workspace: {
          id: "workspace123",
          name: "Test Workspace",
        },
      };

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockCreate.mockRejectedValue(new Error("JWT signing failed"));

      await expect(
        oauthService.handleOAuthLogin(provider, oauthProfile)
      ).rejects.toThrow("OAuth login failed");
    });

    it("should handle workspace creation errors", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing workspace
        .mockResolvedValueOnce(null); // No existing user
      global.mockCreate.mockRejectedValue(
        new Error("Workspace creation failed")
      );

      await expect(
        oauthService.handleOAuthLogin(provider, oauthProfile)
      ).rejects.toThrow("Failed to create or retrieve workspace");
    });
  });

  describe("getOrCreateDefaultWorkspace - Error Handling", () => {
    it("should throw error for invalid email parameter", async () => {
      // This is tested indirectly through handleOAuthLogin
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: null }],
        displayName: "Test User",
      };

      await expect(
        oauthService.handleOAuthLogin(provider, oauthProfile)
      ).rejects.toThrow("Valid email is required for OAuth login");
    });

    it("should handle workspace creation database errors", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing workspace
        .mockResolvedValueOnce(null); // No existing user
      global.mockCreate.mockRejectedValue(new Error("Database error"));

      await expect(
        oauthService.handleOAuthLogin(provider, oauthProfile)
      ).rejects.toThrow("Failed to create or retrieve workspace");
    });
  });

  describe("Session Management", () => {
    it("should create session for new user", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const mockWorkspace = {
        id: "workspace123",
        name: "example.com",
        domain: "example.com",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "ADMIN",
        workspaceId: "workspace123",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing workspace
        .mockResolvedValueOnce(null); // No existing user
      global.mockCreate
        .mockResolvedValueOnce(mockWorkspace) // Workspace creation
        .mockResolvedValueOnce(mockUser) // User creation
        .mockResolvedValueOnce({ id: "session123" }); // Session creation
      global.mockCount.mockResolvedValue(0);

      await oauthService.handleOAuthLogin(provider, oauthProfile);

      // Check that session creation was called with correct parameters
      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user123",
          refreshToken: "mock-refresh-token",
          expiresAt: expect.any(Date),
        },
      });
    });

    it("should create session for existing user", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "MEMBER",
        workspaceId: "workspace123",
        workspace: {
          id: "workspace123",
          name: "Test Workspace",
        },
      };

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockCreate.mockResolvedValue({
        id: "session123",
        userId: "user123",
        refreshToken: "mock-refresh-token",
        expiresAt: new Date(),
      });

      await oauthService.handleOAuthLogin(provider, oauthProfile);

      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user123",
          refreshToken: "mock-refresh-token",
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe("Token Generation", () => {
    it("should generate access and refresh tokens for new user", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const mockWorkspace = {
        id: "workspace123",
        name: "example.com",
        domain: "example.com",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "ADMIN",
        workspaceId: "workspace123",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing workspace
        .mockResolvedValueOnce(null); // No existing user
      global.mockCreate
        .mockResolvedValueOnce(mockWorkspace) // Workspace creation
        .mockResolvedValueOnce(mockUser) // User creation
        .mockResolvedValueOnce({ id: "session123" }); // Session creation
      global.mockCount.mockResolvedValue(0);

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      expect(result.data.accessToken).toBe("mock-access-token");
      expect(result.data.refreshToken).toBe("mock-refresh-token");
    });

    it("should generate access and refresh tokens for existing user", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "MEMBER",
        workspaceId: "workspace123",
        workspace: {
          id: "workspace123",
          name: "Test Workspace",
        },
      };

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockCreate.mockResolvedValue({
        id: "session123",
        userId: "user123",
        refreshToken: "mock-refresh-token",
        expiresAt: new Date(),
      });

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      expect(result.data.accessToken).toBe("mock-access-token");
      expect(result.data.refreshToken).toBe("mock-refresh-token");
    });
  });

  describe("validateOAuthProfile - Direct Testing", () => {
    it("should validate correct OAuth profile", () => {
      const profile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const email = oauthService.validateOAuthProfile(profile);
      expect(email).toBe("test@example.com");
    });

    it("should throw error for null profile", () => {
      expect(() => oauthService.validateOAuthProfile(null)).toThrow(
        "Invalid OAuth profile"
      );
    });

    it("should throw error for non-object profile", () => {
      expect(() => oauthService.validateOAuthProfile("invalid")).toThrow(
        "Invalid OAuth profile"
      );
    });

    it("should throw error for profile without emails", () => {
      const profile = { id: "google123", displayName: "Test User" };
      expect(() => oauthService.validateOAuthProfile(profile)).toThrow(
        "Email is required for OAuth login"
      );
    });

    it("should throw error for profile with non-array emails", () => {
      const profile = {
        id: "google123",
        emails: "invalid",
        displayName: "Test User",
      };
      expect(() => oauthService.validateOAuthProfile(profile)).toThrow(
        "Email is required for OAuth login"
      );
    });

    it("should throw error for profile with empty emails array", () => {
      const profile = {
        id: "google123",
        emails: [],
        displayName: "Test User",
      };
      expect(() => oauthService.validateOAuthProfile(profile)).toThrow(
        "Email is required for OAuth login"
      );
    });

    it("should throw error for invalid email format", () => {
      const profile = {
        id: "google123",
        emails: [{ value: "invalid-email" }],
        displayName: "Test User",
      };
      expect(() => oauthService.validateOAuthProfile(profile)).toThrow(
        "Valid email is required for OAuth login"
      );
    });

    it("should throw error for null email value", () => {
      const profile = {
        id: "google123",
        emails: [{ value: null }],
        displayName: "Test User",
      };
      expect(() => oauthService.validateOAuthProfile(profile)).toThrow(
        "Valid email is required for OAuth login"
      );
    });

    it("should throw error for non-string email", () => {
      const profile = {
        id: "google123",
        emails: [{ value: 123 }],
        displayName: "Test User",
      };
      expect(() => oauthService.validateOAuthProfile(profile)).toThrow(
        "Valid email is required for OAuth login"
      );
    });
  });

  describe("getOrCreateDefaultWorkspace - Direct Testing", () => {
    it("should create new workspace when none exists", async () => {
      const email = "test@example.com";
      const mockWorkspace = {
        id: "workspace123",
        name: "example.com",
        domain: "example.com",
      };

      global.mockFindUnique.mockResolvedValue(null); // No existing workspace
      global.mockCreate.mockResolvedValue(mockWorkspace);

      const result = await oauthService.getOrCreateDefaultWorkspace(email);

      expect(result).toEqual(mockWorkspace);
      expect(global.mockFindUnique).toHaveBeenCalledWith({
        where: { domain: "example.com" },
      });
      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          name: "example.com",
          domain: "example.com",
        },
      });
    });

    it("should return existing workspace when found", async () => {
      const email = "test@example.com";
      const mockWorkspace = {
        id: "workspace123",
        name: "example.com",
        domain: "example.com",
      };

      global.mockFindUnique.mockResolvedValue(mockWorkspace);

      const result = await oauthService.getOrCreateDefaultWorkspace(email);

      expect(result).toEqual(mockWorkspace);
      expect(global.mockFindUnique).toHaveBeenCalledWith({
        where: { domain: "example.com" },
      });
      expect(global.mockCreate).not.toHaveBeenCalled();
    });

    it("should throw error for null email", async () => {
      await expect(
        oauthService.getOrCreateDefaultWorkspace(null)
      ).rejects.toThrow("Valid email is required");
    });

    it("should throw error for non-string email", async () => {
      await expect(
        oauthService.getOrCreateDefaultWorkspace(123)
      ).rejects.toThrow("Valid email is required");
    });

    it("should handle email without @ symbol", async () => {
      const email = "invalid-email";
      const mockWorkspace = {
        id: "workspace123",
        name: "default.local",
        domain: "default.local",
      };

      global.mockFindUnique.mockResolvedValue(null);
      global.mockCreate.mockResolvedValue(mockWorkspace);

      const result = await oauthService.getOrCreateDefaultWorkspace(email);

      expect(result).toEqual(mockWorkspace);
      expect(global.mockFindUnique).toHaveBeenCalledWith({
        where: { domain: "default.local" },
      });
    });

    it("should handle database errors during workspace creation", async () => {
      const email = "test@example.com";

      global.mockFindUnique.mockResolvedValue(null);
      global.mockCreate.mockRejectedValue(new Error("Database error"));

      await expect(
        oauthService.getOrCreateDefaultWorkspace(email)
      ).rejects.toThrow("Failed to create or retrieve workspace");
    });

    it("should handle database errors during workspace lookup", async () => {
      const email = "test@example.com";

      global.mockFindUnique.mockRejectedValue(new Error("Database error"));

      await expect(
        oauthService.getOrCreateDefaultWorkspace(email)
      ).rejects.toThrow("Failed to create or retrieve workspace");
    });
  });

  describe("cleanupOldSessions - Direct Testing", () => {
    it("should cleanup old sessions successfully", async () => {
      const userId = "user123";
      global.mockDeleteMany.mockResolvedValue({ count: 3 });

      const result = await oauthService.cleanupOldSessions(userId);

      expect(result).toBe(3);
      expect(global.mockDeleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it("should return 0 when no sessions to cleanup", async () => {
      const userId = "user123";
      global.mockDeleteMany.mockResolvedValue({ count: 0 });

      const result = await oauthService.cleanupOldSessions(userId);

      expect(result).toBe(0);
    });

    it("should handle null userId gracefully", async () => {
      const result = await oauthService.cleanupOldSessions(null);

      expect(result).toBeUndefined();
      expect(global.mockDeleteMany).not.toHaveBeenCalled();
    });

    it("should handle undefined userId gracefully", async () => {
      const result = await oauthService.cleanupOldSessions(undefined);

      expect(result).toBeUndefined();
      expect(global.mockDeleteMany).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      const userId = "user123";
      global.mockDeleteMany.mockRejectedValue(new Error("Database error"));

      const result = await oauthService.cleanupOldSessions(userId);

      expect(result).toBe(0);
    });

    it("should calculate correct cutoff date", async () => {
      const userId = "user123";
      const mockDate = new Date("2023-01-31T12:00:00Z");
      jest.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

      global.mockDeleteMany.mockResolvedValue({ count: 2 });

      await oauthService.cleanupOldSessions(userId);

      const expectedCutoff = new Date(
        mockDate.getTime() - 30 * 24 * 60 * 60 * 1000
      );

      expect(global.mockDeleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          expiresAt: {
            lt: expectedCutoff,
          },
        },
      });

      Date.now.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle email with special characters", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test+tag@example.com" }],
        displayName: "Test User",
      };

      const mockWorkspace = {
        id: "workspace123",
        name: "example.com",
        domain: "example.com",
      };

      const mockUser = {
        id: "user123",
        email: "test+tag@example.com",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "ADMIN",
        workspaceId: "workspace123",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing workspace
        .mockResolvedValueOnce(null); // No existing user
      global.mockCreate
        .mockResolvedValueOnce(mockWorkspace) // Workspace creation
        .mockResolvedValueOnce(mockUser); // User creation
      global.mockCount.mockResolvedValue(0);

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      expect(result.data.user.email).toBe("test+tag@example.com");
    });

    it("should handle email without domain", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example" }],
        displayName: "Test User",
      };

      const mockWorkspace = {
        id: "workspace123",
        name: "example",
        domain: "example",
      };

      const mockUser = {
        id: "user123",
        email: "test@example",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "ADMIN",
        workspaceId: "workspace123",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing workspace
        .mockResolvedValueOnce(null); // No existing user
      global.mockCreate
        .mockResolvedValueOnce(mockWorkspace) // Workspace creation
        .mockResolvedValueOnce(mockUser); // User creation
      global.mockCount.mockResolvedValue(0);

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      expect(result.data.workspaceName).toBe("example");
    });

    it("should handle transaction rollback on error", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing workspace
        .mockResolvedValueOnce(null); // No existing user
      global.mockCreate
        .mockResolvedValueOnce({ id: "workspace123" }) // Workspace creation
        .mockRejectedValue(new Error("User creation failed")); // User creation fails

      await expect(
        oauthService.handleOAuthLogin(provider, oauthProfile)
      ).rejects.toThrow("OAuth login failed");
    });

    it("should handle empty displayName", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "",
      };

      const mockWorkspace = {
        id: "workspace123",
        name: "example.com",
        domain: "example.com",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "test",
        emailVerified: true,
        status: "ACTIVE",
        role: "ADMIN",
        workspaceId: "workspace123",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing workspace
        .mockResolvedValueOnce(null); // No existing user
      global.mockCreate
        .mockResolvedValueOnce(mockWorkspace) // Workspace creation
        .mockResolvedValueOnce(mockUser); // User creation
      global.mockCount.mockResolvedValue(0);

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      expect(result.data.user.name).toBe("test");
    });

    it("should handle profile with multiple email addresses", () => {
      const profile = {
        id: "google123",
        emails: [
          { value: "primary@example.com" },
          { value: "secondary@example.com" },
        ],
        displayName: "Test User",
      };

      const email = oauthService.validateOAuthProfile(profile);
      expect(email).toBe("primary@example.com"); // Should use first email
    });

    it("should handle email with uppercase characters", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "Test@Example.COM" }],
        displayName: "Test User",
      };

      const mockWorkspace = {
        id: "workspace123",
        name: "Example.COM",
        domain: "Example.COM",
      };

      const mockUser = {
        id: "user123",
        email: "Test@Example.COM",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "ADMIN",
        workspaceId: "workspace123",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(null) // No existing workspace
        .mockResolvedValueOnce(null); // No existing user
      global.mockCreate
        .mockResolvedValueOnce(mockWorkspace) // Workspace creation
        .mockResolvedValueOnce(mockUser); // User creation
      global.mockCount.mockResolvedValue(0);

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      expect(result.data.user.email).toBe("Test@Example.COM");
      expect(result.data.workspaceName).toBe("Example.COM");
    });

    it("should handle session expiration date calculation", async () => {
      const provider = "google";
      const oauthProfile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
        displayName: "Test User",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        status: "ACTIVE",
        role: "MEMBER",
        workspaceId: "workspace123",
        workspace: {
          id: "workspace123",
          name: "Test Workspace",
        },
      };

      const mockDate = new Date("2023-01-01T12:00:00Z");
      jest.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockCreate.mockResolvedValue({
        id: "session123",
        userId: "user123",
        refreshToken: "mock-refresh-token",
        expiresAt: new Date(),
      });

      await oauthService.handleOAuthLogin(provider, oauthProfile);

      const expectedExpiresAt = new Date(
        mockDate.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user123",
          refreshToken: "mock-refresh-token",
          expiresAt: expectedExpiresAt,
        },
      });

      Date.now.mockRestore();
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete OAuth flow with cleanup", async () => {
      const provider = "github";
      const oauthProfile = {
        id: "github123",
        emails: [{ value: "developer@company.com" }],
        displayName: "Developer Name",
      };

      const mockUser = {
        id: "user456",
        email: "developer@company.com",
        name: "Developer Name",
        emailVerified: true,
        status: "ACTIVE",
        role: "MEMBER",
        workspaceId: "workspace456",
        workspace: {
          id: "workspace456",
          name: "Company Workspace",
        },
      };

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockDeleteMany.mockResolvedValue({ count: 2 }); // Cleanup old sessions
      global.mockCreate.mockResolvedValue({
        id: "session456",
        userId: "user456",
        refreshToken: "mock-refresh-token",
        expiresAt: new Date(),
      });

      const result = await oauthService.handleOAuthLogin(
        provider,
        oauthProfile
      );

      // Verify cleanup was called
      expect(global.mockDeleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user456",
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });

      // Verify login success
      expect(result.status).toBe("success");
      expect(result.data.provider).toBe("github");
      expect(result.data.user.email).toBe("developer@company.com");
      expect(result.data.isNewUser).toBe(false);
    });
  });
});
