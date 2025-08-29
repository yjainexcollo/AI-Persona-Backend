const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");

// Load test environment variables ONLY (don't load .env)
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env.test"),
  override: true,
});

// Set DATABASE_URL to TEST_DATABASE_URL for Prisma
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// Debug: Log the database URL being used
console.log("TEST_DATABASE_URL:", process.env.TEST_DATABASE_URL);
console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Global test database client
global.testPrisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.TEST_DATABASE_URL ||
        "postgresql://test:test@localhost:5433/aipersona_test",
    },
  },
});

// Global test utilities
global.testUtils = {
  createTestUser: async (userData = {}) => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const processId = process.pid;
    const testId = Math.random().toString(36).substring(2, 15);
    const threadId = Math.random().toString(36).substring(2, 8);
    const uniqueId = Math.random().toString(36).substring(2, 10);

    const defaultUser = {
      email: `test-${timestamp}-${randomSuffix}@example.com`,
      name: "Test User",
      password: "TestPassword123!",
      status: "ACTIVE",
      emailVerified: true,
      role: "MEMBER",
    };

    const user = { ...defaultUser, ...userData };
    const hashedPassword = await bcrypt.hash(user.password, 10);

    // Remove password and OAuth fields from userData before passing to Prisma
    const { password, oauthId, oauthProvider, ...userDataForDb } = user;

    // Create workspace first if not provided
    let workspace;
    if (userData.workspaceId) {
      workspace = await global.testPrisma.workspace.findUnique({
        where: { id: userData.workspaceId },
      });
      if (!workspace) {
        throw new Error(`Workspace with id ${userData.workspaceId} not found`);
      }
    } else {
      // Use a more unique domain to avoid constraint violations
      const uniqueDomain = `test-${timestamp}-${processId}-${testId}-${threadId}-${uniqueId}.com`;

      try {
        workspace = await global.testPrisma.workspace.create({
          data: {
            name: `Test Workspace ${timestamp}-${randomSuffix}`,
            domain: uniqueDomain,
          },
        });
      } catch (error) {
        // If domain still conflicts, try with additional randomness
        const fallbackDomain = `test-${timestamp}-${processId}-${testId}-${threadId}-${uniqueId}-${Math.random()
          .toString(36)
          .substring(2, 8)}.com`;
        try {
          workspace = await global.testPrisma.workspace.create({
            data: {
              name: `Test Workspace ${timestamp}-${randomSuffix}`,
              domain: fallbackDomain,
            },
          });
        } catch (secondError) {
          // Last resort: use UUID-like domain
          const uuidDomain = `test-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 15)}-${Math.random()
            .toString(36)
            .substring(2, 15)}.com`;
          workspace = await global.testPrisma.workspace.create({
            data: {
              name: `Test Workspace ${timestamp}-${randomSuffix}`,
              domain: uuidDomain,
            },
          });
        }
      }
    }

    if (!workspace) {
      throw new Error("Failed to create or find workspace for test user");
    }

    try {
      return await global.testPrisma.user.create({
        data: {
          ...userDataForDb,
          passwordHash: hashedPassword,
          workspaceId: workspace.id,
        },
        include: { workspace: true },
      });
    } catch (error) {
      // If user creation fails, clean up the workspace and retry
      if (workspace && !userData.workspaceId) {
        try {
          await global.testPrisma.workspace.delete({
            where: { id: workspace.id },
          });
        } catch (deleteError) {
          // Ignore delete errors
        }
      }
      throw error;
    }
  },

  createTestToken: (user) => {
    // Use a simple secret for test environment
    const secret = process.env.JWT_SECRET || "test-secret-key-for-jwt-signing";
    return jwt.sign({ userId: user.id, email: user.email }, secret, {
      expiresIn: "1h",
    });
  },

  createTestPersona: async (personaData = {}) => {
    const defaultPersona = {
      name: "Test Persona",
      description: "Test Description",
      webhookUrl: "https://test.com/webhook",
      isActive: true,
    };

    return await global.testPrisma.persona.create({
      data: { ...defaultPersona, ...personaData },
    });
  },

  createTestConversation: async (userId, personaId, conversationData = {}) => {
    const defaultConversation = {
      title: "Test Conversation",
      visibility: "PRIVATE",
      isActive: true,
    };

    return await global.testPrisma.conversation.create({
      data: {
        ...defaultConversation,
        ...conversationData,
        userId,
        personaId,
      },
    });
  },

  cleanupTestData: async () => {
    try {
      // Use a single transaction to avoid deadlocks
      await global.testPrisma.$transaction(async (tx) => {
        // Delete in order to respect foreign key constraints
        await tx.auditEvent.deleteMany();
        await tx.session.deleteMany();
        await tx.emailVerification.deleteMany();
        await tx.passwordResetToken.deleteMany();
        await tx.reaction.deleteMany();
        await tx.messageEdit.deleteMany();
        await tx.message.deleteMany();
        await tx.file.deleteMany();
        await tx.sharedLink.deleteMany();
        await tx.conversation.deleteMany();
        await tx.personaFavourite.deleteMany();
        await tx.persona.deleteMany();
        await tx.user.deleteMany();
        await tx.workspaceDeletion.deleteMany();
        await tx.workspace.deleteMany();
      });
    } catch (error) {
      console.error("Error cleaning test data:", error);
    }
  },
};

// Global setup and teardown
beforeAll(async () => {
  // Ensure test database is ready
  await global.testPrisma.$connect();
});

afterAll(async () => {
  await global.testPrisma.$disconnect();
});

beforeEach(async () => {
  // Clean up before each test
  await global.testUtils.cleanupTestData();
});

afterEach(async () => {
  // Clean up after each test
  await global.testUtils.cleanupTestData();
});
