const passwordUtils = require("../../../src/utils/password");
const bcrypt = require("bcrypt");

describe("Password Utils", () => {
  beforeEach(() => {
    // Reset bcrypt mocks before each test
    jest.clearAllMocks();
  });

  describe("hashPassword", () => {
    it("should hash password correctly", async () => {
      const password = "TestPassword123!";
      const mockHash = "$2b$12$mockhashvalue";

      bcrypt.hash.mockResolvedValue(mockHash);

      const hash = await passwordUtils.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).toBe(mockHash);
      expect(hash).not.toBe(password);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it("should generate different hashes for same password", async () => {
      const password = "TestPassword123!";
      const mockHash1 = "$2b$12$mockhashvalue1";
      const mockHash2 = "$2b$12$mockhashvalue2";

      bcrypt.hash
        .mockResolvedValueOnce(mockHash1)
        .mockResolvedValueOnce(mockHash2);

      const hash1 = await passwordUtils.hashPassword(password);
      const hash2 = await passwordUtils.hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(hash1).toBe(mockHash1);
      expect(hash2).toBe(mockHash2);
      expect(bcrypt.hash).toHaveBeenCalledTimes(2);
    });

    it("should throw error for empty password", async () => {
      await expect(passwordUtils.hashPassword("")).rejects.toThrow(
        "Password is required"
      );
      await expect(passwordUtils.hashPassword(null)).rejects.toThrow(
        "Password is required"
      );
      await expect(passwordUtils.hashPassword(undefined)).rejects.toThrow(
        "Password is required"
      );
      await expect(passwordUtils.hashPassword()).rejects.toThrow(
        "Password is required"
      );
    });

    it("should throw error for whitespace-only password", async () => {
      await expect(passwordUtils.hashPassword("   ")).rejects.toThrow(
        "Password is required"
      );
      await expect(passwordUtils.hashPassword("\t\n")).rejects.toThrow(
        "Password is required"
      );
      await expect(passwordUtils.hashPassword("  \t  \n  ")).rejects.toThrow(
        "Password is required"
      );
    });

    it("should throw error for non-string password", async () => {
      await expect(passwordUtils.hashPassword(123)).rejects.toThrow(
        "Password is required"
      );
      await expect(passwordUtils.hashPassword({})).rejects.toThrow(
        "Password is required"
      );
      await expect(passwordUtils.hashPassword([])).rejects.toThrow(
        "Password is required"
      );
      await expect(passwordUtils.hashPassword(true)).rejects.toThrow(
        "Password is required"
      );
    });

    it("should handle bcrypt errors gracefully", async () => {
      const password = "TestPassword123!";
      const error = new Error("bcrypt error");

      bcrypt.hash.mockRejectedValue(error);

      await expect(passwordUtils.hashPassword(password)).rejects.toThrow(
        "bcrypt error"
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it("should accept valid password types", async () => {
      const validPasswords = [
        "simple",
        "Complex123!",
        "very-long-password-with-special-chars-!@#$%^&*()",
        "123456789",
        "password with spaces",
        "Unicode: 测试密码 🚀",
        "a".repeat(1000), // Very long password
        "a", // Single character
        "!@#$%^&*()", // Only special characters
      ];

      const mockHash = "$2b$12$mockhashvalue";
      bcrypt.hash.mockResolvedValue(mockHash);

      for (const password of validPasswords) {
        const hash = await passwordUtils.hashPassword(password);
        expect(hash).toBe(mockHash);
        expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      }
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "TestPassword123!";
      const mockHash = "$2b$12$mockhashvalue";

      bcrypt.compare.mockResolvedValue(true);

      const isValid = await passwordUtils.verifyPassword(password, mockHash);

      expect(isValid).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockHash);
    });

    it("should reject incorrect password", async () => {
      const password = "TestPassword123!";
      const wrongPassword = "WrongPassword123!";
      const mockHash = "$2b$12$mockhashvalue";

      bcrypt.compare.mockResolvedValue(false);

      const isValid = await passwordUtils.verifyPassword(
        wrongPassword,
        mockHash
      );

      expect(isValid).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(wrongPassword, mockHash);
    });

    it("should throw error for missing password parameter", async () => {
      await expect(passwordUtils.verifyPassword("", "hash")).rejects.toThrow(
        "Password and hash are required"
      );
      await expect(passwordUtils.verifyPassword(null, "hash")).rejects.toThrow(
        "Password and hash are required"
      );
      await expect(
        passwordUtils.verifyPassword(undefined, "hash")
      ).rejects.toThrow("Password and hash are required");
      await expect(passwordUtils.verifyPassword("   ", "hash")).rejects.toThrow(
        "Password and hash are required"
      );
    });

    it("should throw error for missing hash parameter", async () => {
      await expect(
        passwordUtils.verifyPassword("password", "")
      ).rejects.toThrow("Password and hash are required");
      await expect(
        passwordUtils.verifyPassword("password", null)
      ).rejects.toThrow("Password and hash are required");
      await expect(
        passwordUtils.verifyPassword("password", undefined)
      ).rejects.toThrow("Password and hash are required");
      await expect(
        passwordUtils.verifyPassword("password", "   ")
      ).rejects.toThrow("Password and hash are required");
    });

    it("should throw error for missing both parameters", async () => {
      await expect(passwordUtils.verifyPassword("", "")).rejects.toThrow(
        "Password and hash are required"
      );
      await expect(passwordUtils.verifyPassword(null, null)).rejects.toThrow(
        "Password and hash are required"
      );
      await expect(
        passwordUtils.verifyPassword(undefined, undefined)
      ).rejects.toThrow("Password and hash are required");
    });

    it("should throw error for non-string parameters", async () => {
      await expect(passwordUtils.verifyPassword(123, "hash")).rejects.toThrow(
        "Password and hash are required"
      );
      await expect(
        passwordUtils.verifyPassword("password", 123)
      ).rejects.toThrow("Password and hash are required");
      await expect(passwordUtils.verifyPassword({}, "hash")).rejects.toThrow(
        "Password and hash are required"
      );
      await expect(
        passwordUtils.verifyPassword("password", {})
      ).rejects.toThrow("Password and hash are required");
    });

    it("should handle bcrypt compare errors gracefully", async () => {
      const password = "TestPassword123!";
      const mockHash = "$2b$12$mockhashvalue";
      const error = new Error("bcrypt compare error");

      bcrypt.compare.mockRejectedValue(error);

      await expect(
        passwordUtils.verifyPassword(password, mockHash)
      ).rejects.toThrow("bcrypt compare error");
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockHash);
    });

    it("should work with real password hashing and verification flow", async () => {
      const password = "TestPassword123!";
      const mockHash = "$2b$12$mockhashvalue";

      // Mock the hash function to return a consistent hash
      bcrypt.hash.mockResolvedValue(mockHash);
      // Mock the compare function to return true for correct password
      bcrypt.compare.mockResolvedValue(true);

      // First hash the password
      const hash = await passwordUtils.hashPassword(password);
      expect(hash).toBe(mockHash);

      // Then verify the password
      const isValid = await passwordUtils.verifyPassword(password, hash);
      expect(isValid).toBe(true);

      // Verify wrong password
      bcrypt.compare.mockResolvedValue(false);
      const isWrongValid = await passwordUtils.verifyPassword(
        "WrongPassword",
        hash
      );
      expect(isWrongValid).toBe(false);
    });

    it("should handle various hash formats", async () => {
      const password = "TestPassword123!";
      const hashFormats = [
        "$2a$12$mockhashvalue",
        "$2b$12$mockhashvalue",
        "$2y$12$mockhashvalue",
        "$2a$10$mockhashvalue",
        "$2b$14$mockhashvalue",
      ];

      bcrypt.compare.mockResolvedValue(true);

      for (const hash of hashFormats) {
        const isValid = await passwordUtils.verifyPassword(password, hash);
        expect(isValid).toBe(true);
        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      }
    });
  });

  describe("Integration tests", () => {
    it("should handle various password types", async () => {
      const passwords = [
        "simple",
        "Complex123!",
        "very-long-password-with-special-chars-!@#$%^&*()",
        "123456789",
        "password with spaces",
        "Unicode: 测试密码 🚀",
        "a".repeat(1000), // Very long password
      ];

      for (const password of passwords) {
        const mockHash = `$2b$12$mockhash-${password.length}`;
        bcrypt.hash.mockResolvedValue(mockHash);
        bcrypt.compare.mockResolvedValue(true);

        const hash = await passwordUtils.hashPassword(password);
        expect(hash).toBe(mockHash);

        const isValid = await passwordUtils.verifyPassword(password, hash);
        expect(isValid).toBe(true);
      }
    });

    it("should handle edge cases", async () => {
      // Test with very short password
      const shortPassword = "a";
      const mockHash = "$2b$12$mockhash";
      bcrypt.hash.mockResolvedValue(mockHash);

      const hash = await passwordUtils.hashPassword(shortPassword);
      expect(hash).toBe(mockHash);

      // Test with password containing only special characters
      const specialPassword = "!@#$%^&*()";
      bcrypt.hash.mockResolvedValue(mockHash);

      const specialHash = await passwordUtils.hashPassword(specialPassword);
      expect(specialHash).toBe(mockHash);
    });

    it("should handle password with leading/trailing spaces", async () => {
      const password = "  TestPassword123!  ";
      const mockHash = "$2b$12$mockhashvalue";

      bcrypt.hash.mockResolvedValue(mockHash);
      bcrypt.compare.mockResolvedValue(true);

      // Should accept password with spaces (bcrypt will handle the actual password)
      const hash = await passwordUtils.hashPassword(password);
      expect(hash).toBe(mockHash);

      const isValid = await passwordUtils.verifyPassword(password, mockHash);
      expect(isValid).toBe(true);
    });

    it("should handle concurrent password operations", async () => {
      const passwords = ["pass1", "pass2", "pass3"];
      const mockHashes = ["hash1", "hash2", "hash3"];

      bcrypt.hash
        .mockResolvedValueOnce(mockHashes[0])
        .mockResolvedValueOnce(mockHashes[1])
        .mockResolvedValueOnce(mockHashes[2]);

      bcrypt.compare.mockResolvedValue(true);

      const promises = passwords.map(async (password, index) => {
        const hash = await passwordUtils.hashPassword(password);
        expect(hash).toBe(mockHashes[index]);

        const isValid = await passwordUtils.verifyPassword(password, hash);
        expect(isValid).toBe(true);

        return { password, hash, isValid };
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(results[0].hash).toBe(mockHashes[0]);
      expect(results[1].hash).toBe(mockHashes[1]);
      expect(results[2].hash).toBe(mockHashes[2]);
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle bcrypt hash returning null", async () => {
      const password = "TestPassword123!";
      bcrypt.hash.mockResolvedValue(null);

      const hash = await passwordUtils.hashPassword(password);
      expect(hash).toBeNull();
    });

    it("should handle bcrypt compare returning null", async () => {
      const password = "TestPassword123!";
      const mockHash = "$2b$12$mockhashvalue";
      bcrypt.compare.mockResolvedValue(null);

      const isValid = await passwordUtils.verifyPassword(password, mockHash);
      expect(isValid).toBeNull();
    });

    it("should handle very large passwords", async () => {
      const largePassword = "a".repeat(10000); // 10KB password
      const mockHash = "$2b$12$mockhashvalue";

      bcrypt.hash.mockResolvedValue(mockHash);

      const hash = await passwordUtils.hashPassword(largePassword);
      expect(hash).toBe(mockHash);
      expect(bcrypt.hash).toHaveBeenCalledWith(largePassword, 12);
    });

    it("should handle passwords with null bytes", async () => {
      const passwordWithNull = "Test\0Password";
      const mockHash = "$2b$12$mockhashvalue";

      bcrypt.hash.mockResolvedValue(mockHash);

      const hash = await passwordUtils.hashPassword(passwordWithNull);
      expect(hash).toBe(mockHash);
    });
  });
});
