const { PrismaClient } = require("@prisma/client");

// Create mock Prisma client functions
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockDeleteMany = jest.fn();
const mockCount = jest.fn();
const mockFindFirst = jest.fn();

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
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  conversation: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
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
  file: {
    findUnique: mockFindUnique,
    findMany: mockFindMany,
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
    updateMany: mockUpdate,
    delete: mockDelete,
    deleteMany: mockDeleteMany,
    count: mockCount,
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((callback) => callback(mockPrismaClient)),
};

// Function to patch Prisma client in services
function patchPrismaClient() {
  // Mock the PrismaClient constructor to return our mock
  const originalPrismaClient = PrismaClient;
  PrismaClient.mockImplementation(() => mockPrismaClient);

  return {
    mockPrismaClient,
    mockFindUnique,
    mockFindMany,
    mockCreate,
    mockUpdate,
    mockDelete,
    mockDeleteMany,
    mockCount,
    mockFindFirst,
    restore: () => {
      PrismaClient.mockImplementation(originalPrismaClient);
    },
  };
}

// Function to patch a service's Prisma client instance
function patchServicePrisma(serviceModule) {
  // Find the prisma instance in the service module
  const serviceExports = Object.keys(serviceModule);
  let prismaInstance = null;

  // Look for the prisma instance in the module
  for (const key of serviceExports) {
    if (
      serviceModule[key] &&
      typeof serviceModule[key] === "object" &&
      serviceModule[key].user
    ) {
      prismaInstance = serviceModule[key];
      break;
    }
  }

  if (prismaInstance) {
    // Replace the prisma instance with our mock
    Object.assign(prismaInstance, mockPrismaClient);
  }

  return {
    mockPrismaClient,
    mockFindUnique,
    mockFindMany,
    mockCreate,
    mockUpdate,
    mockDelete,
    mockDeleteMany,
    mockCount,
    mockFindFirst,
  };
}

// Function to reset all mocks
function resetMocks() {
  mockFindUnique.mockReset();
  mockFindMany.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockDeleteMany.mockReset();
  mockCount.mockReset();
  mockFindFirst.mockReset();
}

module.exports = {
  patchPrismaClient,
  patchServicePrisma,
  resetMocks,
  mockPrismaClient,
  mockFindUnique,
  mockFindMany,
  mockCreate,
  mockUpdate,
  mockDelete,
  mockDeleteMany,
  mockCount,
  mockFindFirst,
};
