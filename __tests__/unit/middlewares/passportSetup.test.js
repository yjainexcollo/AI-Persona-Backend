const passport = require("passport");
const {
  initializePassport,
  extractEmail,
  validateProfile,
  findOrCreateWorkspace,
  cleanup,
  getPrismaClient,
} = require("../../../src/middlewares/passportSetup");

// Mock dependencies
jest.mock("passport");
jest.mock("passport-google-oauth20", () => ({
  Strategy: jest.fn(),
}));
jest.mock("../../../src/utils/oauthProviders");
jest.mock("../../../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock("../../../src/utils/apiError");

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const oauthProviders = require("../../../src/utils/oauthProviders");
const logger = require("../../../src/utils/logger");
const ApiError = require("../../../src/utils/apiError");

describe("PassportSetup", () => {
  let mockPrisma;
  let mockUser;
  let mockWorkspace;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ApiError
    ApiError.mockImplementation((statusCode, message) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      error.name = "ApiError";
      return error;
    });

    // Mock Prisma client
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      workspace: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    // Mock user and workspace data
    mockUser = {
      id: "user123",
      email: "test@example.com",
      name: "Test User",
      role: "MEMBER",
      status: "ACTIVE",
      workspaceId: "workspace123",
      workspace: {
        id: "workspace123",
        name: "Test Workspace",
        status: "ACTIVE",
      },
    };

    mockWorkspace = {
      id: "workspace123",
      name: "Test Workspace",
      status: "ACTIVE",
      createdAt: new Date(),
    };

    // Mock OAuth providers
    oauthProviders.google = {
      clientID: "test-client-id",
      clientSecret: "test-client-secret",
      callbackURL: "http://localhost:3000/auth/google/callback",
    };

    // Mock passport methods
    passport.use = jest.fn();
    passport.serializeUser = jest.fn();
    passport.deserializeUser = jest.fn();
  });

  afterEach(async () => {
    // Skip cleanup in tests to avoid $disconnect errors
    // await cleanup();
  });

  describe("extractEmail", () => {
    it("should extract valid email from profile", () => {
      const profile = {
        emails: [{ value: "  Test@Example.COM  " }],
      };

      const result = extractEmail(profile);

      expect(result).toBe("test@example.com");
    });

    it("should return null for missing profile", () => {
      expect(extractEmail(null)).toBeNull();
      expect(extractEmail(undefined)).toBeNull();
    });

    it("should return null for profile without emails", () => {
      const profile = { id: "123" };
      expect(extractEmail(profile)).toBeNull();
    });

    it("should return null for profile with empty emails array", () => {
      const profile = { emails: [] };
      expect(extractEmail(profile)).toBeNull();
    });

    it("should return null for profile with invalid email structure", () => {
      const profile = { emails: [{}] };
      expect(extractEmail(profile)).toBeNull();
    });

    it("should return null for profile with non-string email", () => {
      const profile = { emails: [{ value: 123 }] };
      expect(extractEmail(profile)).toBeNull();
    });

    it("should return null for invalid email format", () => {
      const profile = { emails: [{ value: "invalid-email" }] };
      expect(extractEmail(profile)).toBeNull();
    });

    it("should handle multiple emails and return first valid one", () => {
      const profile = {
        emails: [
          { value: "primary@example.com" },
          { value: "secondary@example.com" },
        ],
      };

      const result = extractEmail(profile);

      expect(result).toBe("primary@example.com");
    });
  });

  describe("validateProfile", () => {
    it("should validate valid profile", () => {
      const profile = {
        id: "google123",
        displayName: "Test User",
        emails: [{ value: "test@example.com" }],
      };

      const result = validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.email).toBe("test@example.com");
      expect(result.displayName).toBe("Test User");
    });

    it("should reject null profile", () => {
      const result = validateProfile(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Profile is required");
    });

    it("should reject profile without ID", () => {
      const profile = {
        displayName: "Test User",
        emails: [{ value: "test@example.com" }],
      };

      const result = validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Profile ID is required");
    });

    it("should reject profile without valid email", () => {
      const profile = {
        id: "google123",
        displayName: "Test User",
        emails: [],
      };

      const result = validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Valid email is required");
    });

    it("should reject profile without display name", () => {
      const profile = {
        id: "google123",
        emails: [{ value: "test@example.com" }],
      };

      const result = validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Display name is required");
    });

    it("should reject profile with empty display name", () => {
      const profile = {
        id: "google123",
        displayName: "   ",
        emails: [{ value: "test@example.com" }],
      };

      const result = validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Display name is required");
    });

    it("should trim display name", () => {
      const profile = {
        id: "google123",
        displayName: "  Test User  ",
        emails: [{ value: "test@example.com" }],
      };

      const result = validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.displayName).toBe("Test User");
    });
  });

  describe("findOrCreateWorkspace", () => {
    it("should return existing active workspace", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue(mockWorkspace);

      const result = await findOrCreateWorkspace(
        "test@example.com",
        mockPrisma
      );

      expect(result).toEqual(mockWorkspace);
      expect(mockPrisma.workspace.findFirst).toHaveBeenCalledWith({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      });
      expect(mockPrisma.workspace.create).not.toHaveBeenCalled();
    });

    it("should create new workspace if none exists", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue(null);
      mockPrisma.workspace.create.mockResolvedValue(mockWorkspace);

      const result = await findOrCreateWorkspace(
        "test@example.com",
        mockPrisma
      );

      expect(result).toEqual(mockWorkspace);
      expect(mockPrisma.workspace.create).toHaveBeenCalledWith({
        data: {
          name: "example.com Workspace",
          description: "Default workspace",
          status: "ACTIVE",
          settings: {},
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        `Created new workspace: ${mockWorkspace.id} for domain: example.com`
      );
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.workspace.findFirst.mockRejectedValue(
        new Error("Database error")
      );

      const result = await findOrCreateWorkspace(
        "test@example.com",
        mockPrisma
      );

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Error finding or creating workspace:",
        expect.any(Error)
      );
    });

    it("should handle workspace creation errors", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue(null);
      mockPrisma.workspace.create.mockRejectedValue(
        new Error("Creation failed")
      );

      const result = await findOrCreateWorkspace(
        "test@example.com",
        mockPrisma
      );

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Error finding or creating workspace:",
        expect.any(Error)
      );
    });
  });

  describe("initializePassport", () => {
    beforeEach(() => {
      // Reset the module-level prisma client
      jest.doMock("../../../src/middlewares/passportSetup", () => {
        const originalModule = jest.requireActual(
          "../../../src/middlewares/passportSetup"
        );
        return {
          ...originalModule,
          getPrismaClient: () => mockPrisma,
        };
      });
    });

    it("should initialize passport with valid OAuth configuration", () => {
      initializePassport({ prismaClient: mockPrisma });

      expect(logger.info).toHaveBeenCalledWith(
        "Initializing Google OAuth strategy"
      );
      expect(passport.use).toHaveBeenCalledWith(expect.any(GoogleStrategy));
      expect(passport.serializeUser).toHaveBeenCalled();
      expect(passport.deserializeUser).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        "Google OAuth strategy initialized successfully"
      );
      expect(logger.info).toHaveBeenCalledWith(
        "Passport initialization completed"
      );
    });

    it("should handle missing OAuth providers configuration", () => {
      oauthProviders.google = undefined;

      initializePassport({ prismaClient: mockPrisma });

      expect(logger.warn).toHaveBeenCalledWith(
        "Google OAuth configuration is incomplete - strategy not initialized"
      );
      expect(passport.use).not.toHaveBeenCalled();
    });

    it("should handle incomplete Google OAuth configuration", () => {
      oauthProviders.google = {
        clientID: "test-client-id",
        // Missing clientSecret and callbackURL
      };

      initializePassport({ prismaClient: mockPrisma });

      expect(logger.warn).toHaveBeenCalledWith(
        "Google OAuth configuration is incomplete - strategy not initialized"
      );
      expect(passport.use).not.toHaveBeenCalled();
    });

    it("should handle invalid OAuth providers object", () => {
      // Temporarily set oauthProviders to null
      const originalOauthProviders = require("../../../src/utils/oauthProviders");
      require("../../../src/utils/oauthProviders").google = null;

      initializePassport({ prismaClient: mockPrisma });

      expect(logger.warn).toHaveBeenCalledWith(
        "Google OAuth configuration is incomplete - strategy not initialized"
      );

      // Restore original value
      require("../../../src/utils/oauthProviders").google =
        originalOauthProviders.google;
    });

    it("should handle initialization errors", () => {
      passport.use.mockImplementation(() => {
        throw new Error("Passport error");
      });

      expect(() => initializePassport({ prismaClient: mockPrisma })).toThrow(
        "Failed to initialize authentication"
      );
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to initialize Passport:",
        expect.any(Error)
      );
    });
  });

  describe("Google OAuth Strategy", () => {
    let strategyCallback;

    beforeEach(() => {
      initializePassport({ prismaClient: mockPrisma });

      // Extract the strategy callback from the GoogleStrategy constructor call
      const strategyCall = GoogleStrategy.mock.calls[0];
      strategyCallback = strategyCall ? strategyCall[1] : null;
    });

    it("should authenticate existing user successfully", async () => {
      if (!strategyCallback) {
        throw new Error("Strategy callback not found");
      }

      const mockProfile = {
        id: "google123",
        displayName: "Test User",
        emails: [{ value: "test@example.com" }],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const mockDone = jest.fn();

      await strategyCallback(
        "access-token",
        "refresh-token",
        mockProfile,
        mockDone
      );

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        include: {
          workspace: {
            select: { id: true, name: true, status: true },
          },
        },
      });
      expect(mockDone).toHaveBeenCalledWith(null, {
        user: mockUser,
        profile: mockProfile,
        isNewUser: false,
      });
      expect(logger.info).toHaveBeenCalledWith(
        "Existing user authenticated via OAuth: test@example.com"
      );
    });

    it("should reject inactive user", async () => {
      if (!strategyCallback) {
        throw new Error("Strategy callback not found");
      }

      const mockProfile = {
        id: "google123",
        displayName: "Test User",
        emails: [{ value: "test@example.com" }],
      };

      const inactiveUser = { ...mockUser, status: "INACTIVE" };
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);
      const mockDone = jest.fn();

      await strategyCallback(
        "access-token",
        "refresh-token",
        mockProfile,
        mockDone
      );

      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "User account is not active",
        }),
        null
      );
      expect(logger.warn).toHaveBeenCalledWith(
        "Inactive user attempted OAuth login: test@example.com"
      );
    });

    it("should reject user with inactive workspace", async () => {
      if (!strategyCallback) {
        throw new Error("Strategy callback not found");
      }

      const mockProfile = {
        id: "google123",
        displayName: "Test User",
        emails: [{ value: "test@example.com" }],
      };

      const userWithInactiveWorkspace = {
        ...mockUser,
        workspace: { ...mockUser.workspace, status: "INACTIVE" },
      };
      mockPrisma.user.findUnique.mockResolvedValue(userWithInactiveWorkspace);
      const mockDone = jest.fn();

      await strategyCallback(
        "access-token",
        "refresh-token",
        mockProfile,
        mockDone
      );

      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: "User workspace is not active",
        }),
        null
      );
      expect(logger.warn).toHaveBeenCalledWith(
        "User with inactive workspace attempted OAuth login: test@example.com"
      );
    });

    it("should create new user as ADMIN when no users exist", async () => {
      if (!strategyCallback) {
        throw new Error("Strategy callback not found");
      }

      const mockProfile = {
        id: "google123",
        displayName: "Test User",
        emails: [{ value: "test@example.com" }],
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.workspace.findFirst.mockResolvedValue(mockWorkspace);
      mockPrisma.user.count.mockResolvedValue(0); // No existing users
      mockPrisma.user.create.mockResolvedValue({
        ...mockUser,
        role: "ADMIN",
      });
      const mockDone = jest.fn();

      await strategyCallback(
        "access-token",
        "refresh-token",
        mockProfile,
        mockDone
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "test@example.com",
          name: "Test User",
          emailVerified: true,
          status: "ACTIVE",
          workspaceId: mockWorkspace.id,
          role: "ADMIN",
          oauthProvider: "google",
          oauthId: "google123",
        },
        include: {
          workspace: {
            select: { id: true, name: true, status: true },
          },
        },
      });
      expect(mockDone).toHaveBeenCalledWith(null, {
        user: { ...mockUser, role: "ADMIN" },
        profile: mockProfile,
        isNewUser: true,
      });
      expect(logger.info).toHaveBeenCalledWith(
        "New user created via OAuth: test@example.com with role: ADMIN"
      );
    });

    it("should create new user as MEMBER when users exist", async () => {
      if (!strategyCallback) {
        throw new Error("Strategy callback not found");
      }

      const mockProfile = {
        id: "google123",
        displayName: "Test User",
        emails: [{ value: "test@example.com" }],
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.workspace.findFirst.mockResolvedValue(mockWorkspace);
      mockPrisma.user.count.mockResolvedValue(2); // Existing users
      mockPrisma.user.create.mockResolvedValue(mockUser);
      const mockDone = jest.fn();

      await strategyCallback(
        "access-token",
        "refresh-token",
        mockProfile,
        mockDone
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "test@example.com",
          name: "Test User",
          emailVerified: true,
          status: "ACTIVE",
          workspaceId: mockWorkspace.id,
          role: "MEMBER",
          oauthProvider: "google",
          oauthId: "google123",
        },
        include: {
          workspace: {
            select: { id: true, name: true, status: true },
          },
        },
      });
      expect(mockDone).toHaveBeenCalledWith(null, {
        user: mockUser,
        profile: mockProfile,
        isNewUser: true,
      });
    });

    it("should handle invalid profile data", async () => {
      if (!strategyCallback) {
        throw new Error("Strategy callback not found");
      }

      const invalidProfile = {
        id: "google123",
        // Missing displayName and emails
      };

      const mockDone = jest.fn();

      await strategyCallback(
        "access-token",
        "refresh-token",
        invalidProfile,
        mockDone
      );

      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining("Invalid profile data"),
        }),
        null
      );
      expect(logger.error).toHaveBeenCalledWith(
        "Invalid OAuth profile:",
        expect.any(Array)
      );
    });

    it("should handle workspace creation failure", async () => {
      if (!strategyCallback) {
        throw new Error("Strategy callback not found");
      }

      const mockProfile = {
        id: "google123",
        displayName: "Test User",
        emails: [{ value: "test@example.com" }],
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.workspace.findFirst.mockRejectedValue(
        new Error("Database error")
      );
      const mockDone = jest.fn();

      await strategyCallback(
        "access-token",
        "refresh-token",
        mockProfile,
        mockDone
      );

      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: "Failed to create user workspace",
        }),
        null
      );
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to find or create workspace for new user"
      );
    });

    it("should handle database errors during authentication", async () => {
      if (!strategyCallback) {
        throw new Error("Strategy callback not found");
      }

      const mockProfile = {
        id: "google123",
        displayName: "Test User",
        emails: [{ value: "test@example.com" }],
      };

      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));
      const mockDone = jest.fn();

      await strategyCallback(
        "access-token",
        "refresh-token",
        mockProfile,
        mockDone
      );

      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: "Authentication failed",
        }),
        null
      );
      expect(logger.error).toHaveBeenCalledWith(
        "OAuth authentication error:",
        expect.any(Error)
      );
    });
  });

  describe("Passport Serialization", () => {
    let serializeCallback;
    let deserializeCallback;

    beforeEach(() => {
      initializePassport({ prismaClient: mockPrisma });

      // Extract callbacks from passport method calls
      const serializeCall = passport.serializeUser.mock.calls[0];
      const deserializeCall = passport.deserializeUser.mock.calls[0];

      serializeCallback = serializeCall ? serializeCall[0] : null;
      deserializeCallback = deserializeCall ? deserializeCall[0] : null;
    });

    describe("serializeUser", () => {
      it("should serialize user with user object", () => {
        if (!serializeCallback) {
          throw new Error("Serialize callback not found");
        }

        const authResult = { user: mockUser };
        const mockDone = jest.fn();

        serializeCallback(authResult, mockDone);

        expect(mockDone).toHaveBeenCalledWith(null, mockUser.id);
      });

      it("should serialize user with direct ID", () => {
        if (!serializeCallback) {
          throw new Error("Serialize callback not found");
        }

        const authResult = { id: "user123" };
        const mockDone = jest.fn();

        serializeCallback(authResult, mockDone);

        expect(mockDone).toHaveBeenCalledWith(null, "user123");
      });

      it("should handle missing user ID", () => {
        if (!serializeCallback) {
          throw new Error("Serialize callback not found");
        }

        const authResult = {};
        const mockDone = jest.fn();

        serializeCallback(authResult, mockDone);

        expect(mockDone).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Invalid user data for serialization",
          }),
          null
        );
        expect(logger.error).toHaveBeenCalledWith(
          "No user ID found during serialization"
        );
      });

      it("should handle serialization errors", () => {
        if (!serializeCallback) {
          throw new Error("Serialize callback not found");
        }

        const authResult = null; // This will cause an error
        const mockDone = jest.fn();

        serializeCallback(authResult, mockDone);

        expect(mockDone).toHaveBeenCalledWith(expect.any(Error), null);
        expect(logger.error).toHaveBeenCalledWith(
          "Error during user serialization:",
          expect.any(Error)
        );
      });
    });

    describe("deserializeUser", () => {
      it("should deserialize active user successfully", async () => {
        if (!deserializeCallback) {
          throw new Error("Deserialize callback not found");
        }

        mockPrisma.user.findUnique.mockResolvedValue(mockUser);
        const mockDone = jest.fn();

        await deserializeCallback("user123", mockDone);

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: "user123" },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            workspaceId: true,
            workspace: {
              select: { id: true, name: true, status: true },
            },
          },
        });
        expect(mockDone).toHaveBeenCalledWith(null, mockUser);
      });

      it("should handle user not found", async () => {
        if (!deserializeCallback) {
          throw new Error("Deserialize callback not found");
        }

        mockPrisma.user.findUnique.mockResolvedValue(null);
        const mockDone = jest.fn();

        await deserializeCallback("user123", mockDone);

        expect(mockDone).toHaveBeenCalledWith(null, false);
        expect(logger.warn).toHaveBeenCalledWith(
          "User not found during deserialization: user123"
        );
      });

      it("should handle inactive user", async () => {
        if (!deserializeCallback) {
          throw new Error("Deserialize callback not found");
        }

        const inactiveUser = { ...mockUser, status: "INACTIVE" };
        mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);
        const mockDone = jest.fn();

        await deserializeCallback("user123", mockDone);

        expect(mockDone).toHaveBeenCalledWith(null, false);
        expect(logger.warn).toHaveBeenCalledWith(
          "Inactive user during deserialization: user123"
        );
      });

      it("should handle invalid user ID", async () => {
        if (!deserializeCallback) {
          throw new Error("Deserialize callback not found");
        }

        const mockDone = jest.fn();

        await deserializeCallback(null, mockDone);

        expect(mockDone).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Invalid user ID",
          }),
          null
        );
        expect(logger.error).toHaveBeenCalledWith(
          "Invalid user ID for deserialization:",
          null
        );
      });

      it("should handle non-string user ID", async () => {
        if (!deserializeCallback) {
          throw new Error("Deserialize callback not found");
        }

        const mockDone = jest.fn();

        await deserializeCallback(123, mockDone);

        expect(mockDone).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Invalid user ID",
          }),
          null
        );
        expect(logger.error).toHaveBeenCalledWith(
          "Invalid user ID for deserialization:",
          123
        );
      });

      it("should handle database errors", async () => {
        if (!deserializeCallback) {
          throw new Error("Deserialize callback not found");
        }

        mockPrisma.user.findUnique.mockRejectedValue(
          new Error("Database error")
        );
        const mockDone = jest.fn();

        await deserializeCallback("user123", mockDone);

        expect(mockDone).toHaveBeenCalledWith(expect.any(Error), null);
        expect(logger.error).toHaveBeenCalledWith(
          "Error during user deserialization:",
          expect.any(Error)
        );
      });
    });
  });

  describe("cleanup", () => {
    it("should disconnect Prisma client", async () => {
      // Test cleanup with a proper mock
      const mockCleanupPrisma = {
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };

      // Initialize with a mock client that has $disconnect
      initializePassport({ prismaClient: mockCleanupPrisma });

      await cleanup();

      expect(mockCleanupPrisma.$disconnect).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("Prisma client disconnected");
    });

    it("should handle cleanup when no client exists", async () => {
      // Reset any existing client
      await cleanup();

      // Should not throw error
      expect(logger.info).not.toHaveBeenCalledWith(
        "Prisma client disconnected"
      );
    });
  });

  describe("getPrismaClient", () => {
    it("should return singleton Prisma client", () => {
      // Mock the PrismaClient constructor
      jest.doMock("@prisma/client", () => ({
        PrismaClient: jest.fn().mockImplementation(() => ({
          $disconnect: jest.fn(),
        })),
      }));

      const client1 = getPrismaClient();
      const client2 = getPrismaClient();

      expect(client1).toBe(client2);
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle multiple initialization calls", () => {
      expect(() => {
        initializePassport({ prismaClient: mockPrisma });
        initializePassport({ prismaClient: mockPrisma });
      }).not.toThrow();

      expect(passport.use).toHaveBeenCalledTimes(2);
    });

    it("should handle email with special characters", () => {
      const profile = {
        emails: [{ value: "test+tag@sub.example.com" }],
      };

      const result = extractEmail(profile);

      expect(result).toBe("test+tag@sub.example.com");
    });

    it("should handle profile with extra properties", () => {
      const profile = {
        id: "google123",
        displayName: "Test User",
        emails: [{ value: "test@example.com" }],
        photos: [{ value: "http://example.com/photo.jpg" }],
        provider: "google",
        _raw: "{}",
        _json: {},
      };

      const result = validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.email).toBe("test@example.com");
      expect(result.displayName).toBe("Test User");
    });

    it("should handle workspace creation with special domain characters", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue(null);
      mockPrisma.workspace.create.mockResolvedValue(mockWorkspace);

      const result = await findOrCreateWorkspace(
        "test@sub-domain.co.uk",
        mockPrisma
      );

      expect(mockPrisma.workspace.create).toHaveBeenCalledWith({
        data: {
          name: "sub-domain.co.uk Workspace",
          description: "Default workspace",
          status: "ACTIVE",
          settings: {},
        },
      });
      expect(result).toEqual(mockWorkspace);
    });
  });
});
