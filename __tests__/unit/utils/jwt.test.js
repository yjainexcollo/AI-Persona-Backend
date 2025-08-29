const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../../../src/config");
const ApiError = require("../../../src/utils/apiError");
const apiResponse = require("../../../src/utils/apiResponse");

// Mock fs.promises
const mockFs = {
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
};

jest.mock("fs", () => ({
  promises: mockFs,
}));

// Mock console methods
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  jest.clearAllMocks();
});

// Mock the JWT module
jest.mock("jsonwebtoken");

describe("JWT Utility", () => {
  let jwtUtils;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup default fs mocks
    mockFs.mkdir.mockResolvedValue();
    mockFs.readFile.mockRejectedValue(new Error("File not found"));
    mockFs.writeFile.mockResolvedValue();

    // Reset module cache and import
    jest.resetModules();

    try {
      jwtUtils = require("../../../src/utils/jwt");
      console.log("Successfully imported jwtUtils:", Object.keys(jwtUtils));
    } catch (error) {
      console.error("Failed to import jwtUtils:", error.message);
      throw error;
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Module Import", () => {
    it("should successfully import the JWT module", () => {
      expect(jwtUtils).toBeDefined();
      expect(typeof jwtUtils).toBe("object");
    });

    it("should export basic functions", () => {
      expect(jwtUtils.signToken).toBeDefined();
      expect(jwtUtils.verifyToken).toBeDefined();
      expect(typeof jwtUtils.signToken).toBe("function");
      expect(typeof jwtUtils.verifyToken).toBe("function");
    });
  });

  describe("Basic Functionality", () => {
    it("should be able to call signToken without throwing", async () => {
      const payload = { userId: "123", role: "user" };

      expect(() => {
        jwtUtils.signToken(payload);
      }).not.toThrow();
    });

    it("should be able to call verifyToken without throwing", async () => {
      const token = "valid.jwt.token";

      expect(() => {
        jwtUtils.verifyToken(token);
      }).not.toThrow();
    });
  });
});
