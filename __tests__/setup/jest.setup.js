// Create mock Prisma client functions
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockDeleteMany = jest.fn();
const mockUpdateMany = jest.fn();
const mockCount = jest.fn();
const mockFindFirst = jest.fn();
const mockGroupBy = jest.fn();
const mockUpsert = jest.fn();

// Create mock Prisma client
const mockPrismaClient = {
  user: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
    findFirst: mockFindFirst,
  },
  workspace: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  emailVerification: {
    findUnique: mockFindUnique,
    create: mockCreate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
  },
  passwordResetToken: {
    findUnique: mockFindUnique,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
  },
  auditEvent: {
    create: mockCreate,
    deleteMany: mockDeleteMany,
  },
  workspaceDeletion: {
    findUnique: mockFindUnique,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
  },
  persona: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    findFirst: mockFindFirst,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  conversation: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    findFirst: mockFindFirst,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  message: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  chatSession: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    updateMany: mockUpdateMany,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
    groupBy: mockGroupBy,
  },
  file: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    findFirst: mockFindFirst,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  sharedLink: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    upsert: mockUpsert,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  reaction: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  messageEdit: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  personaFavourite: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  session: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    updateMany: mockUpdateMany,
    findFirst: mockFindFirst,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((callback) => callback(mockPrismaClient)),
};

// Mock Prisma client for tests
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Export mock functions for use in tests
global.mockPrisma = mockPrismaClient;
global.mockFindUnique = mockFindUnique;
global.mockFindMany = mockFindMany;
global.mockCreate = mockCreate;
global.mockUpdate = mockUpdate;
global.mockUpdateMany = mockUpdateMany;
global.mockDelete = mockDelete;
global.mockDeleteMany = mockDeleteMany;
global.mockCount = mockCount;
global.mockFindFirst = mockFindFirst;
global.mockGroupBy = mockGroupBy;
global.mockUpsert = mockUpsert;

// Mock rate limiter middleware for tests
jest.mock("../../src/middlewares/rateLimiter", () => ({
  resendVerificationLimiter: (req, res, next) => next(),
  chatLimiter: (req, res, next) => next(),
  personaLimiter: (req, res, next) => next(),
  publicLimiter: (req, res, next) => next(),
  registerLimiter: (req, res, next) => next(),
  loginLimiter: (req, res, next) => next(),
  passwordResetLimiter: (req, res, next) => next(),
  redis: {
    ping: jest.fn().mockResolvedValue("PONG"),
  },
  checkRedisHealth: jest
    .fn()
    .mockResolvedValue({ healthy: true, message: "Mocked Redis" }),
  clearRateLimit: jest.fn().mockResolvedValue({ cleared: 0 }),
  getRateLimitStatus: jest
    .fn()
    .mockResolvedValue({ currentCount: 0, ttlSeconds: -1 }),
  SlidingWindowRedisStore: jest.fn(),
}));

// Mock breach check service for tests
jest.mock("../../src/services/breachCheckService", () => ({
  checkPasswordBreach: jest.fn().mockResolvedValue({
    breached: false,
    count: 0,
    severity: "safe",
  }),
  validatePasswordWithBreachCheck: jest.fn().mockResolvedValue({
    isValid: true,
    reason: "Password is secure",
  }),
  getSeverityLevel: jest.fn((count) => {
    if (count > 100000) return "critical";
    if (count > 10000) return "high";
    if (count > 1000) return "medium";
    if (count > 100) return "low";
    return "safe";
  }),
}));

// Mock logger for tests
jest.mock("../../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock JWT utilities for tests
jest.mock("../../src/utils/jwt", () => ({
  generateAccessToken: jest.fn(() => "mock-access-token"),
  generateRefreshToken: jest.fn(() => "mock-refresh-token"),
  verifyToken: jest.fn(() => ({ userId: "user123" })),
  signToken: jest.fn(() => "mock-access-token"),
  signRefreshToken: jest.fn(() => "mock-refresh-token"),
  generateToken: jest.fn(() => "mock-access-token"),
}));

// Mock bcrypt for tests
jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock crypto for tests - only mock specific functions, leave others intact
jest.mock("crypto", () => {
  const originalCrypto = jest.requireActual("crypto");

  return {
    ...originalCrypto,
    // Only mock specific functions that need custom behavior
    createHash: jest.fn((algorithm) => {
      if (algorithm === "sha256" || algorithm === "sha1") {
        // For sha256 and sha1, use the real implementation
        return originalCrypto.createHash(algorithm);
      }
      // For other algorithms, use mock
      return {
        update: jest.fn(() => ({
          digest: jest.fn(() => "ABCDEF1234567890ABCDEF1234567890ABCDEF12"),
        })),
      };
    }),
  };
});

// Mock path for tests
jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
  extname: jest.fn(() => ".jpg"),
  resolve: jest.fn((...args) => args.join("/")),
}));

// Mock fs.promises for tests
jest.mock("fs", () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock sharp for tests
jest.mock("sharp", () => {
  return jest.fn().mockReturnValue({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("mock-image")),
  });
});

// Mock nodemailer for tests
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(),
    sendMail: jest.fn().mockResolvedValue({
      messageId: "mock-message-id",
    }),
  })),
}));

// Mock axios for tests
jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock config for tests
jest.mock("../../src/config", () => ({
  smtpHost: "smtp.example.com",
  smtpPort: 587,
  smtpUser: "test@example.com",
  smtpPass: "password",
  smtpFrom: "noreply@example.com",
  appBaseUrl: "https://app.example.com",
  bcryptSaltRounds: 12,
}));
