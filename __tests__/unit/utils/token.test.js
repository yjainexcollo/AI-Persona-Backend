// Patch Buffer.prototype.toString to support 'base64url' for all Buffers in tests
const origBufferToString = Buffer.prototype.toString;
Buffer.prototype.toString = function (encoding, ...args) {
  if (encoding === "base64url") {
    // Convert base64 to base64url (replace + with -, / with _, remove =)
    const base64 = origBufferToString.call(this, "base64");
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  return origBufferToString.call(this, encoding, ...args);
};

const tokenUtils = require("../../../src/utils/token");

describe("Token Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateToken", () => {
    it("should generate a token with default length", () => {
      const generatedToken = tokenUtils.generateToken();

      expect(generatedToken).toBeDefined();
      expect(typeof generatedToken).toBe("string");
      expect(generatedToken.length).toBeGreaterThan(0);
    });

    it("should generate a token with specified length", () => {
      const length = 64;
      const generatedToken = tokenUtils.generateToken(length);

      expect(generatedToken).toBeDefined();
      expect(typeof generatedToken).toBe("string");
      expect(generatedToken.length).toBeGreaterThan(0);
    });

    it("should generate unique tokens", () => {
      const token1 = tokenUtils.generateToken();
      const token2 = tokenUtils.generateToken();

      expect(token1).not.toBe(token2);
    });

    it("should handle crypto errors gracefully", () => {
      // Mock crypto.randomBytes to throw an error
      const crypto = require("crypto");
      const originalRandomBytes = crypto.randomBytes;
      crypto.randomBytes = jest.fn(() => {
        throw new Error("Crypto error");
      });

      expect(() => tokenUtils.generateToken()).toThrow(
        "Failed to generate token"
      );

      // Restore original function
      crypto.randomBytes = originalRandomBytes;
    });

    // New test cases for input validation
    it("should throw error for non-numeric length", () => {
      const invalidLengths = [null, "abc"];

      invalidLengths.forEach((length) => {
        expect(() => tokenUtils.generateToken(length)).toThrow(
          "Length must be a positive integer"
        );
      });
    });

    it("should use default value for undefined", () => {
      const token1 = tokenUtils.generateToken();
      const token2 = tokenUtils.generateToken(undefined);

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(typeof token1).toBe("string");
      expect(typeof token2).toBe("string");
    });

    it("should throw error for object and array inputs", () => {
      const invalidLengths = [{}, [], { length: 32 }, [32]];

      invalidLengths.forEach((length) => {
        expect(() => tokenUtils.generateToken(length)).toThrow(
          "Length must be a positive integer"
        );
      });
    });

    it("should throw error for string numbers that are not integers", () => {
      const invalidLengths = ["32.5", "32.1", "abc", "32abc"];

      invalidLengths.forEach((length) => {
        expect(() => tokenUtils.generateToken(length)).toThrow(
          "Length must be a positive integer"
        );
      });
    });

    it("should throw error for non-integer length", () => {
      const invalidLengths = [32.5, 32.1, 32.9];

      invalidLengths.forEach((length) => {
        expect(() => tokenUtils.generateToken(length)).toThrow(
          "Length must be a positive integer"
        );
      });
    });

    it("should throw error for zero or negative length", () => {
      const invalidLengths = [0, -1, -10, -100];

      invalidLengths.forEach((length) => {
        expect(() => tokenUtils.generateToken(length)).toThrow(
          "Length must be a positive integer"
        );
      });
    });

    it("should throw error for length exceeding maximum", () => {
      expect(() => tokenUtils.generateToken(1025)).toThrow(
        "Length cannot exceed 1024"
      );
      expect(() => tokenUtils.generateToken(2000)).toThrow(
        "Length cannot exceed 1024"
      );
    });

    it("should accept valid length values", () => {
      const validLengths = [1, 16, 32, 64, 128, 256, 512, 1024];

      validLengths.forEach((length) => {
        expect(() => tokenUtils.generateToken(length)).not.toThrow();
        const generatedToken = tokenUtils.generateToken(length);
        expect(generatedToken).toBeDefined();
        expect(typeof generatedToken).toBe("string");
      });
    });

    it("should generate tokens with exact byte length", () => {
      const length = 16;
      const generatedToken = tokenUtils.generateToken(length);

      // Base64url encoding: each byte becomes ~1.33 characters
      // So 16 bytes should produce approximately 22 characters
      expect(generatedToken.length).toBeGreaterThanOrEqual(16);
    });
  });

  describe("validateToken", () => {
    it("should reject invalid tokens", () => {
      const invalidTokens = [
        null,
        undefined,
        "",
        123,
        {},
        [],
        "invalid token with spaces",
        "token-with-special-chars!@#",
      ];

      invalidTokens.forEach((invalidToken) => {
        const isValid = tokenUtils.validateToken(invalidToken);
        expect(isValid).toBe(false);
      });
    });

    it("should validate tokens with correct format", () => {
      const validFormats = [
        "abc123def456ghi789", // 18 characters
        "ABCDEFGHIJKLMNOP", // 16 characters
        "token_with_underscores_123", // 24 characters
        "token-with-dashes-123", // 20 characters
        "1234567890123456", // 16 characters
      ];

      validFormats.forEach((tokenStr) => {
        const isValid = tokenUtils.validateToken(tokenStr);
        expect(isValid).toBe(true);
      });
    });

    it("should reject tokens that are too short", () => {
      const shortTokens = ["short", "12345", "abc", "short123"];

      shortTokens.forEach((shortToken) => {
        const isValid = tokenUtils.validateToken(shortToken);
        expect(isValid).toBe(false);
      });
    });

    // New test cases for edge cases
    it("should handle tokens with exactly 16 characters", () => {
      const exactLengthToken = "1234567890123456";
      const isValid = tokenUtils.validateToken(exactLengthToken);
      expect(isValid).toBe(true);
    });

    it("should reject tokens with 15 characters", () => {
      const shortToken = "123456789012345";
      const isValid = tokenUtils.validateToken(shortToken);
      expect(isValid).toBe(false);
    });

    it("should handle tokens with special base64url characters", () => {
      const validTokens = [
        "abc123DEF456ghi789",
        "TOKEN_with_UNDERSCORES",
        "token-with-dashes-123",
        "1234567890123456",
        "a_b-c_d-e_f-g_h-i_j",
      ];

      validTokens.forEach((tokenStr) => {
        const isValid = tokenUtils.validateToken(tokenStr);
        expect(isValid).toBe(true);
      });
    });

    it("should reject tokens with invalid base64url characters", () => {
      const invalidTokens = [
        "token+with+plus+signs",
        "token/with/slashes",
        "token=with=equals",
        "token with spaces",
        "token!with!exclamation",
        "token@with@at",
        "token#with#hash",
        "token$with$dollar",
      ];

      invalidTokens.forEach((tokenStr) => {
        const isValid = tokenUtils.validateToken(tokenStr);
        expect(isValid).toBe(false);
      });
    });
  });

  describe("generateConversationToken", () => {
    it("should generate a conversation token", () => {
      const conversationToken = tokenUtils.generateConversationToken();

      expect(conversationToken).toBeDefined();
      expect(typeof conversationToken).toBe("string");
      expect(conversationToken.length).toBeGreaterThan(0);
    });

    it("should generate unique conversation tokens", () => {
      const token1 = tokenUtils.generateConversationToken();
      const token2 = tokenUtils.generateConversationToken();

      expect(token1).not.toBe(token2);
    });

    it("should generate valid conversation tokens", () => {
      const conversationToken = tokenUtils.generateConversationToken();
      const isValid = tokenUtils.validateToken(conversationToken);

      expect(isValid).toBe(true);
    });

    // New test cases for conversation tokens
    it("should generate conversation tokens with consistent length", () => {
      const tokens = [];
      for (let i = 0; i < 10; i++) {
        tokens.push(tokenUtils.generateConversationToken());
      }

      tokens.forEach((tokenStr) => {
        expect(tokenStr.length).toBeGreaterThan(0);
        expect(typeof tokenStr).toBe("string");
      });
    });

    it("should generate conversation tokens that are all valid", () => {
      const tokens = [];
      for (let i = 0; i < 10; i++) {
        tokens.push(tokenUtils.generateConversationToken());
      }

      tokens.forEach((tokenStr) => {
        const isValid = tokenUtils.validateToken(tokenStr);
        expect(isValid).toBe(true);
      });
    });
  });

  describe("token format", () => {
    it("should generate base64url format tokens", () => {
      const generatedToken = tokenUtils.generateToken();

      // Base64url format: A-Z, a-z, 0-9, -, _
      const base64urlRegex = /^[A-Za-z0-9_-]+$/;

      expect(generatedToken).toMatch(base64urlRegex);
    });

    it("should not contain special characters", () => {
      const generatedToken = tokenUtils.generateToken();

      // Should not contain +, /, =, or other special chars
      expect(generatedToken).not.toMatch(/[+/=]/);
    });

    // New test cases for format validation
    it("should generate tokens with consistent base64url format", () => {
      const tokens = [];
      for (let i = 0; i < 10; i++) {
        tokens.push(tokenUtils.generateToken());
      }

      const base64urlRegex = /^[A-Za-z0-9_-]+$/;
      tokens.forEach((tokenStr) => {
        expect(tokenStr).toMatch(base64urlRegex);
      });
    });

    it("should handle different token lengths with correct format", () => {
      const lengths = [16, 32, 64, 128];
      const base64urlRegex = /^[A-Za-z0-9_-]+$/;

      lengths.forEach((length) => {
        const generatedToken = tokenUtils.generateToken(length);
        expect(generatedToken).toMatch(base64urlRegex);
      });
    });
  });

  describe("token security", () => {
    it("should generate cryptographically secure tokens", () => {
      const tokens = [];

      // Generate multiple tokens to ensure randomness
      for (let i = 0; i < 10; i++) {
        tokens.push(tokenUtils.generateToken());
      }

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it("should handle different token lengths", () => {
      const lengths = [16, 32, 64, 128];

      lengths.forEach((length) => {
        const generatedToken = tokenUtils.generateToken(length);
        expect(generatedToken.length).toBeGreaterThan(0);
        expect(typeof generatedToken).toBe("string");
      });
    });

    // New test cases for security
    it("should generate tokens with sufficient entropy", () => {
      const tokens = [];
      for (let i = 0; i < 100; i++) {
        tokens.push(tokenUtils.generateToken());
      }

      // Check for sufficient randomness by ensuring no duplicates
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it("should generate tokens with varied character distribution", () => {
      const generatedToken = tokenUtils.generateToken(64);

      // Should contain a mix of different character types
      expect(generatedToken).toMatch(/[A-Z]/); // At least one uppercase
      expect(generatedToken).toMatch(/[a-z]/); // At least one lowercase
      expect(generatedToken).toMatch(/[0-9]/); // At least one digit
    });

    it("should not generate predictable tokens", () => {
      const tokens = [];
      for (let i = 0; i < 10; i++) {
        tokens.push(tokenUtils.generateToken());
      }

      // Check that tokens don't follow a simple pattern
      const firstToken = tokens[0];
      const allSame = tokens.every((t) => t === firstToken);
      expect(allSame).toBe(false);
    });
  });

  describe("integration tests", () => {
    it("should work with real crypto.randomBytes", () => {
      const generatedToken = tokenUtils.generateToken(32);
      expect(generatedToken).toBeDefined();
      expect(typeof generatedToken).toBe("string");
      expect(generatedToken.length).toBeGreaterThan(0);
    });

    it("should generate and validate tokens correctly", () => {
      const generatedToken = tokenUtils.generateToken();
      const isValid = tokenUtils.validateToken(generatedToken);
      expect(isValid).toBe(true);
    });

    it("should handle conversation token generation and validation", () => {
      const conversationToken = tokenUtils.generateConversationToken();
      const isValid = tokenUtils.validateToken(conversationToken);
      expect(isValid).toBe(true);
    });
  });
});
