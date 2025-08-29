const profileService = require("../../../src/services/profileService");

// Mock bcrypt
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock sharp
jest.mock("sharp", () => {
  return jest.fn().mockReturnValue({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("mock-image")),
  });
});

// Mock fs.promises
jest.mock("fs", () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock breachCheckService
jest.mock("../../../src/services/breachCheckService", () => ({
  validatePasswordWithBreachCheck: jest.fn(),
  checkPasswordBreach: jest.fn(),
}));

// Mock logger
jest.mock("../../../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock path
jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
  extname: jest.fn(() => ".jpg"),
}));

// Mock crypto
jest.mock("crypto", () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => "mock-random-string"),
  })),
}));

describe("ProfileService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    global.mockFindUnique.mockReset();
    global.mockUpdate.mockReset();
    global.mockCreate.mockReset();

    // Reset sharp mock
    const sharp = require("sharp");
    sharp.mockReturnValue({
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("mock-image")),
    });

    // Reset path mock
    const path = require("path");
    path.extname.mockReturnValue(".jpg");
  });

  describe("getProfile", () => {
    it("should return user profile", async () => {
      const userId = "user123";
      const mockUser = {
        id: userId,
        email: "test@example.com",
        name: "Test User",
        avatarUrl: "https://example.com/avatar.jpg",
        timezone: "UTC",
        locale: "en",
        emailVerified: true,
        status: "ACTIVE",
        role: "ADMIN",
        workspaceId: "workspace123",
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      const result = await profileService.getProfile(userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
      expect(result.email).toBe("test@example.com");
      expect(result.name).toBe("Test User");
    });

    it("should throw error for non-existent user", async () => {
      const userId = "user123";

      global.mockFindUnique.mockResolvedValue(null);

      await expect(profileService.getProfile(userId)).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("updateProfile", () => {
    it("should update user profile", async () => {
      const userId = "user123";
      const updateData = {
        name: "Updated Name",
        timezone: "America/New_York",
        locale: "en-US",
      };

      const mockUser = {
        id: userId,
        email: "test@example.com",
        name: "Test User",
        timezone: "UTC",
        locale: "en",
      };

      const updatedUser = {
        ...mockUser,
        ...updateData,
      };

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockUpdate.mockResolvedValue(updatedUser);
      global.mockCreate.mockResolvedValue({}); // For audit event creation

      const result = await profileService.updateProfile(userId, updateData);

      expect(result).toBeDefined();
      expect(result.name).toBe("Updated Name");
      expect(result.timezone).toBe("America/New_York");
      expect(result.locale).toBe("en-US");
    });

    it("should throw error for non-existent user", async () => {
      const userId = "user123";
      const updateData = { name: "Updated Name" };

      global.mockFindUnique.mockResolvedValue(null);

      await expect(
        profileService.updateProfile(userId, updateData)
      ).rejects.toThrow("User not found");
    });

    it("should throw error for invalid timezone", async () => {
      const userId = "user123";
      const updateData = { timezone: "Invalid/Timezone" };

      const mockUser = {
        id: userId,
        email: "test@example.com",
        name: "Test User",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile(userId, updateData)
      ).rejects.toThrow("Invalid timezone");
    });

    it("should throw error for invalid locale", async () => {
      const userId = "user123";
      const updateData = {
        locale: "invalid-locale",
      };

      const mockUser = {
        id: userId,
        email: "test@example.com",
        name: "Test User",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile(userId, updateData)
      ).rejects.toThrow("Invalid locale");
    });
  });

  describe("processAvatarUpload", () => {
    it("should process avatar upload successfully", async () => {
      const userId = "user123";
      const mockFile = {
        originalname: "avatar.jpg",
        mimetype: "image/jpeg",
        size: 1024 * 1024, // 1MB
        buffer: Buffer.from("fake-image-data"),
      };

      const mockUser = {
        id: userId,
        email: "test@example.com",
        name: "Test User",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockUpdate.mockResolvedValue({
        ...mockUser,
        avatarUrl: "/uploads/avatars/mock-file.jpg",
      });
      global.mockCreate.mockResolvedValue({}); // For audit event creation

      // Mock file system operations
      const fs = require("fs");
      fs.promises.mkdir.mockResolvedValue(undefined);
      fs.promises.writeFile.mockResolvedValue(undefined);

      const result = await profileService.processAvatarUpload(userId, mockFile);

      expect(result).toBeDefined();
      expect(result).toMatch(/\/uploads\/avatars\/.*\.jpg$/);
      expect(global.mockUpdate).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          avatarUrl: expect.stringMatching(/\/uploads\/avatars\/.*\.jpg$/),
        },
      });
    });

    it("should throw error for non-existent user", async () => {
      const userId = "nonexistent";
      const mockFile = {
        originalname: "avatar.jpg",
        mimetype: "image/jpeg",
        size: 1024 * 1024,
        buffer: Buffer.from("fake-image-data"),
      };

      global.mockFindUnique.mockResolvedValue(null);

      await expect(
        profileService.processAvatarUpload(userId, mockFile)
      ).rejects.toThrow("User not found");
    });

    it("should throw error for invalid file type", async () => {
      const userId = "user123";
      const mockFile = {
        originalname: "avatar.txt",
        mimetype: "text/plain",
        size: 1024,
        buffer: Buffer.from("mock-data"),
      };

      const mockUser = {
        id: userId,
        email: "test@example.com",
        name: "Test User",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.processAvatarUpload(userId, mockFile)
      ).rejects.toThrow("Invalid file type");
    });

    it("should throw error for file too large", async () => {
      const userId = "user123";
      const mockFile = {
        originalname: "avatar.jpg",
        mimetype: "image/jpeg",
        size: 3 * 1024 * 1024, // 3MB
        buffer: Buffer.from("mock-image-data"),
      };

      const mockUser = {
        id: userId,
        email: "test@example.com",
        name: "Test User",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.processAvatarUpload(userId, mockFile)
      ).rejects.toThrow("File size too large");
    });

    it("should throw error for missing file", async () => {
      const userId = "user123";

      await expect(
        profileService.processAvatarUpload(userId, null)
      ).rejects.toThrow("No file uploaded");

      await expect(
        profileService.processAvatarUpload(userId, undefined)
      ).rejects.toThrow("No file uploaded");
    });
  });

  describe("processPresignedAvatar", () => {
    it("should process presigned avatar successfully", async () => {
      const userId = "user123";
      const presignedUrl = "https://example.com/avatar.jpg";

      const mockUser = {
        id: userId,
        email: "test@example.com",
        name: "Test User",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockUpdate.mockResolvedValue({
        ...mockUser,
        avatarUrl: presignedUrl,
      });
      global.mockCreate.mockResolvedValue({}); // For audit event creation

      const result = await profileService.processPresignedAvatar(
        userId,
        presignedUrl
      );

      expect(result).toBeDefined();
      expect(result).toBe(presignedUrl);
      expect(global.mockUpdate).toHaveBeenCalledWith({
        where: { id: userId },
        data: { avatarUrl: presignedUrl },
      });
    });

    it("should throw error for non-existent user", async () => {
      const userId = "nonexistent";
      const presignedUrl = "https://example.com/avatar.jpg";

      global.mockFindUnique.mockResolvedValue(null);

      await expect(
        profileService.processPresignedAvatar(userId, presignedUrl)
      ).rejects.toThrow("User not found");
    });

    it("should throw error for invalid URL", async () => {
      const userId = "user123";
      const invalidUrl = "not-a-valid-url";

      const mockUser = {
        id: userId,
        email: "test@example.com",
        name: "Test User",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.processPresignedAvatar(userId, invalidUrl)
      ).rejects.toThrow("Invalid presigned URL format");
    });

    it("should throw error for missing presigned URL", async () => {
      const userId = "user123";

      await expect(
        profileService.processPresignedAvatar(userId, null)
      ).rejects.toThrow("Presigned URL is required");

      await expect(
        profileService.processPresignedAvatar(userId, "")
      ).rejects.toThrow("Presigned URL is required");
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      const userId = "user123";
      const currentPassword = "OldPassword123!";
      const newPassword = "NewPassword123!";

      const mockUser = {
        id: userId,
        email: "test@example.com",
        passwordHash: "hashed-old-password",
      };

      const bcrypt = require("bcrypt");
      const breachCheckService = require("../../../src/services/breachCheckService");

      bcrypt.compare
        .mockResolvedValueOnce(true) // Current password check
        .mockResolvedValueOnce(false); // New password different check

      breachCheckService.checkPasswordBreach.mockResolvedValue({
        breached: false,
      });

      bcrypt.hash.mockResolvedValue("hashed-new-password");

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockUpdate.mockResolvedValue({
        ...mockUser,
        passwordHash: "hashed-new-password",
      });
      global.mockCreate.mockResolvedValue({}); // For audit event creation

      await profileService.changePassword(userId, currentPassword, newPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        currentPassword,
        "hashed-old-password"
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
    });

    it("should throw error for non-existent user", async () => {
      const userId = "user123";
      const currentPassword = "OldPassword123!";
      const newPassword = "NewPassword123!";

      global.mockFindUnique.mockResolvedValue(null);

      await expect(
        profileService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow("User not found");
    });

    it("should throw error for incorrect current password", async () => {
      const userId = "user123";
      const currentPassword = "wrongPassword";
      const newPassword = "NewPassword123!";

      const mockUser = {
        id: userId,
        email: "test@example.com",
        passwordHash: "hashed-old-password",
      };

      const bcrypt = require("bcrypt");
      bcrypt.compare.mockResolvedValue(false);

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow("Current password is incorrect");
    });

    it("should throw error for same password", async () => {
      const userId = "user123";
      const currentPassword = "samePassword";
      const newPassword = "samePassword";

      const mockUser = {
        id: userId,
        email: "test@example.com",
        passwordHash: "hashed-old-password",
      };

      const bcrypt = require("bcrypt");
      bcrypt.compare
        .mockResolvedValueOnce(true) // Current password check
        .mockResolvedValueOnce(true); // New password same check

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow("New password must be different from current password");
    });

    it("should throw error for weak new password", async () => {
      const userId = "user123";
      const currentPassword = "OldPassword123!";
      const newPassword = "weak";

      const mockUser = {
        id: userId,
        email: "test@example.com",
        passwordHash: "hashed-old-password",
      };

      const bcrypt = require("bcrypt");
      bcrypt.compare
        .mockResolvedValueOnce(true) // Current password check
        .mockResolvedValueOnce(false); // New password different check

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow("Password must be at least 8 characters long");
    });

    it("should throw error for breached password", async () => {
      const userId = "user123";
      const currentPassword = "OldPassword123!";
      const newPassword = "BreachedPassword123!";

      const mockUser = {
        id: userId,
        email: "test@example.com",
        passwordHash: "hashed-old-password",
      };

      const bcrypt = require("bcrypt");
      const breachCheckService = require("../../../src/services/breachCheckService");

      bcrypt.compare
        .mockResolvedValueOnce(true) // Current password check
        .mockResolvedValueOnce(false); // New password different check

      breachCheckService.checkPasswordBreach.mockResolvedValue({
        breached: true,
      });

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow("This password has been compromised in a data breach");
    });

    it("should throw error for OAuth-only users", async () => {
      const userId = "user123";
      const currentPassword = "password";
      const newPassword = "NewPassword123!";

      const mockUser = {
        id: userId,
        email: "test@example.com",
        passwordHash: null, // OAuth-only user
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow("Cannot change password for OAuth-only users");
    });

    it("should throw error for password without uppercase letter", async () => {
      const userId = "user123";
      const currentPassword = "OldPassword123!";
      const newPassword = "newpassword123!"; // No uppercase

      const mockUser = {
        id: userId,
        email: "test@example.com",
        passwordHash: "hashed-old-password",
      };

      const bcrypt = require("bcrypt");
      bcrypt.compare
        .mockResolvedValueOnce(true) // Current password check
        .mockResolvedValueOnce(false); // New password different check

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow("Password must contain at least one uppercase letter");
    });

    it("should throw error for password without special character", async () => {
      const userId = "user123";
      const currentPassword = "OldPassword123!";
      const newPassword = "NewPassword123"; // No special character

      const mockUser = {
        id: userId,
        email: "test@example.com",
        passwordHash: "hashed-old-password",
      };

      const bcrypt = require("bcrypt");
      bcrypt.compare
        .mockResolvedValueOnce(true) // Current password check
        .mockResolvedValueOnce(false); // New password different check

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        profileService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow("Password must contain at least one uppercase letter");
    });
  });

  describe("isValidTimezone", () => {
    it("should validate correct timezone", () => {
      const result = profileService.isValidTimezone("America/New_York");
      expect(result).toBe(true);
    });

    it("should reject invalid timezone", () => {
      const result = profileService.isValidTimezone("Invalid/Timezone");
      expect(result).toBe(false);
    });
  });

  describe("isValidLocale", () => {
    it("should validate correct locale", () => {
      const result = profileService.isValidLocale("en-US");
      expect(result).toBe(true);
    });

    it("should validate language-only locale", () => {
      const result = profileService.isValidLocale("en");
      expect(result).toBe(true);
    });

    it("should validate different valid locales", () => {
      expect(profileService.isValidLocale("fr-FR")).toBe(true);
      expect(profileService.isValidLocale("de-DE")).toBe(true);
      expect(profileService.isValidLocale("es")).toBe(true);
    });

    it("should reject invalid locale", () => {
      const result = profileService.isValidLocale("invalid-locale");
      expect(result).toBe(false);
    });

    it("should reject malformed locales", () => {
      expect(profileService.isValidLocale("e")).toBe(false); // Too short
      expect(profileService.isValidLocale("EN-us")).toBe(false); // Wrong case
      expect(profileService.isValidLocale("en-us-extra")).toBe(false); // Too many parts
      expect(profileService.isValidLocale("123-45")).toBe(false); // Numbers
    });
  });
});
