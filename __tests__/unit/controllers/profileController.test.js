/**
 * ProfileController Unit Tests
 * Comprehensive tests for profile management functionality
 */

// Mock dependencies
jest.mock("../../../src/services/profileService");
jest.mock("../../../src/utils/asyncHandler", () => {
  return (fn) => fn; // Return the function as-is for testing
});
jest.mock("../../../src/utils/apiError");
jest.mock("../../../src/utils/logger");

const mockProfileService = require("../../../src/services/profileService");
const mockApiError = require("../../../src/utils/apiError");
const mockLogger = require("../../../src/utils/logger");

// Import the actual controller
const profileController = require("../../../src/controllers/profileController");

describe("ProfileController", () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockLogger.info = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.error = jest.fn();

    // Mock ApiError constructor
    mockApiError.mockImplementation((statusCode, message) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    });

    // Create mock request and response objects
    mockReq = {
      params: {},
      body: {},
      query: {},
      user: {
        id: "user123",
        email: "test@example.com",
        workspaceId: "workspace123",
      },
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" },
      headers: {
        "user-agent": "test-agent",
        "x-trace-id": "test-trace-123",
        "x-request-id": "test-request-456",
      },
      get: jest.fn((header) => {
        if (header === "User-Agent") return "test-agent";
        return mockReq.headers[header.toLowerCase()] || null;
      }),
      file: null,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("getMe", () => {
    describe("Success scenarios", () => {
      it("should retrieve user profile successfully", async () => {
        const mockProfile = {
          id: "user123",
          email: "test@example.com",
          name: "Test User",
          avatarUrl: "https://example.com/avatar.jpg",
          timezone: "UTC",
          locale: "en",
          role: "MEMBER",
          status: "ACTIVE",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockProfileService.getProfile.mockResolvedValue(mockProfile);

        await profileController.getMe(mockReq, mockRes);

        expect(mockProfileService.getProfile).toHaveBeenCalledWith("user123");
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          data: { user: mockProfile },
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Profile retrieval requested",
          expect.objectContaining({
            userId: "user123",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Profile retrieved successfully",
          expect.objectContaining({
            userId: "user123",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });
    });

    describe("Error scenarios", () => {
      it("should handle service errors", async () => {
        const serviceError = new Error("User not found");
        mockProfileService.getProfile.mockRejectedValue(serviceError);

        await expect(profileController.getMe(mockReq, mockRes)).rejects.toThrow(
          "User not found"
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Profile retrieval failed",
          expect.objectContaining({
            userId: "user123",
            error: "User not found",
            stack: serviceError.stack,
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });
    });

    describe("Edge cases", () => {
      it("should handle missing client info gracefully", async () => {
        mockReq.ip = undefined;
        mockReq.connection = undefined;
        mockReq.headers = {};
        mockReq.get = jest.fn(() => null);

        const mockProfile = { id: "user123", name: "Test User" };
        mockProfileService.getProfile.mockResolvedValue(mockProfile);

        await profileController.getMe(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockLogger.info).toHaveBeenCalledWith(
          "Profile retrieval requested",
          expect.objectContaining({
            ipAddress: null,
            userAgent: null,
            traceId: null,
          })
        );
      });
    });
  });

  describe("updateMe", () => {
    describe("Success scenarios", () => {
      it("should update user profile successfully", async () => {
        const mockUpdatedProfile = {
          id: "user123",
          email: "test@example.com",
          name: "Updated User",
          avatarUrl: "https://example.com/new-avatar.jpg",
          timezone: "America/New_York",
          locale: "es",
        };

        mockProfileService.updateProfile.mockResolvedValue(mockUpdatedProfile);

        const updateData = {
          name: "Updated User",
          avatarUrl: "https://example.com/new-avatar.jpg",
          timezone: "America/New_York",
          locale: "es",
        };

        mockReq.body = updateData;

        await profileController.updateMe(mockReq, mockRes);

        expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
          "user123",
          {
            name: "Updated User",
            avatarUrl: "https://example.com/new-avatar.jpg",
            timezone: "America/New_York",
            locale: "es",
          }
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          message: "Profile updated successfully",
          data: { user: mockUpdatedProfile },
        });
      });

      it("should handle partial updates", async () => {
        const mockUpdatedProfile = {
          id: "user123",
          name: "Partially Updated",
        };

        mockProfileService.updateProfile.mockResolvedValue(mockUpdatedProfile);

        mockReq.body = { name: "Partially Updated" };

        await profileController.updateMe(mockReq, mockRes);

        expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
          "user123",
          {
            name: "Partially Updated",
          }
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it("should trim input values", async () => {
        const mockUpdatedProfile = { id: "user123", name: "Trimmed Name" };
        mockProfileService.updateProfile.mockResolvedValue(mockUpdatedProfile);

        mockReq.body = {
          name: "  Trimmed Name  ",
          timezone: "  America/New_York  ",
        };

        await profileController.updateMe(mockReq, mockRes);

        expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
          "user123",
          {
            name: "Trimmed Name",
            timezone: "America/New_York",
          }
        );
      });
    });

    describe("Validation scenarios", () => {
      it("should handle empty name", async () => {
        mockReq.body = { name: "" };

        await expect(
          profileController.updateMe(mockReq, mockRes)
        ).rejects.toThrow("Validation failed: Name must be a non-empty string");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Profile update failed: validation errors",
          expect.objectContaining({
            userId: "user123",
            validationErrors: ["Name must be a non-empty string"],
          })
        );
      });

      it("should handle whitespace-only name", async () => {
        mockReq.body = { name: "   " };

        await expect(
          profileController.updateMe(mockReq, mockRes)
        ).rejects.toThrow("Validation failed: Name must be a non-empty string");
      });

      it("should handle name too long", async () => {
        mockReq.body = { name: "a".repeat(101) };

        await expect(
          profileController.updateMe(mockReq, mockRes)
        ).rejects.toThrow(
          "Validation failed: Name must be no more than 100 characters long"
        );
      });

      it("should handle invalid avatar URL", async () => {
        mockReq.body = { avatarUrl: "not-a-url" };

        await expect(
          profileController.updateMe(mockReq, mockRes)
        ).rejects.toThrow("Validation failed: Avatar URL must be a valid URL");
      });

      it("should handle invalid timezone", async () => {
        mockReq.body = { timezone: "invalid-timezone" };

        await expect(
          profileController.updateMe(mockReq, mockRes)
        ).rejects.toThrow(
          "Validation failed: Timezone must be in valid IANA format (e.g., 'America/New_York')"
        );
      });

      it("should handle invalid locale", async () => {
        mockReq.body = { locale: "invalid-locale" };

        await expect(
          profileController.updateMe(mockReq, mockRes)
        ).rejects.toThrow(
          "Validation failed: Locale must be in valid ISO format (e.g., 'en' or 'en-US')"
        );
      });

      it("should handle no valid fields to update", async () => {
        mockReq.body = {
          name: undefined,
          avatarUrl: undefined,
          timezone: undefined,
          locale: undefined,
        };

        await expect(
          profileController.updateMe(mockReq, mockRes)
        ).rejects.toThrow("No fields provided for update");
      });

      it("should accept valid timezone formats", async () => {
        const validTimezones = [
          "America/New_York",
          "Europe/London",
          "Asia/Tokyo",
          "UTC",
          "GMT",
        ];

        for (const timezone of validTimezones) {
          mockReq.body = { timezone };
          mockProfileService.updateProfile.mockResolvedValue({
            id: "user123",
            timezone,
          });

          await profileController.updateMe(mockReq, mockRes);

          expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
            "user123",
            {
              timezone,
            }
          );
        }
      });

      it("should accept valid locale formats", async () => {
        const validLocales = ["en", "es", "fr", "en-US", "es-MX", "fr-CA"];

        for (const locale of validLocales) {
          mockReq.body = { locale };
          mockProfileService.updateProfile.mockResolvedValue({
            id: "user123",
            locale,
          });

          await profileController.updateMe(mockReq, mockRes);

          expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
            "user123",
            {
              locale,
            }
          );
        }
      });
    });

    describe("Error scenarios", () => {
      it("should handle service errors", async () => {
        mockReq.body = { name: "Test" };
        const serviceError = new Error("Database error");
        mockProfileService.updateProfile.mockRejectedValue(serviceError);

        await expect(
          profileController.updateMe(mockReq, mockRes)
        ).rejects.toThrow("Database error");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Profile update failed",
          expect.objectContaining({
            userId: "user123",
            error: "Database error",
            stack: serviceError.stack,
          })
        );
      });
    });
  });

  describe("uploadAvatar", () => {
    describe("File upload scenarios", () => {
      it("should handle file upload successfully", async () => {
        const mockFile = {
          mimetype: "image/jpeg",
          size: 1024 * 1024, // 1MB
          originalname: "avatar.jpg",
        };

        mockReq.file = mockFile;
        mockProfileService.processAvatarUpload.mockResolvedValue(
          "https://example.com/avatar.jpg"
        );

        await profileController.uploadAvatar(mockReq, mockRes);

        expect(mockProfileService.processAvatarUpload).toHaveBeenCalledWith(
          "user123",
          mockFile
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          message: "Avatar uploaded successfully",
          data: { avatarUrl: "https://example.com/avatar.jpg" },
        });
      });

      it("should reject non-image files", async () => {
        const mockFile = {
          mimetype: "application/pdf",
          size: 1024,
          originalname: "document.pdf",
        };

        mockReq.file = mockFile;

        await expect(
          profileController.uploadAvatar(mockReq, mockRes)
        ).rejects.toThrow("Only image files are allowed for avatar uploads");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Avatar upload failed: invalid file type",
          expect.objectContaining({
            userId: "user123",
            mimetype: "application/pdf",
          })
        );
      });

      it("should reject files that are too large", async () => {
        const mockFile = {
          mimetype: "image/jpeg",
          size: 6 * 1024 * 1024, // 6MB
          originalname: "large-avatar.jpg",
        };

        mockReq.file = mockFile;

        await expect(
          profileController.uploadAvatar(mockReq, mockRes)
        ).rejects.toThrow("File size must be no more than 5MB");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Avatar upload failed: file too large",
          expect.objectContaining({
            userId: "user123",
            fileSize: 6 * 1024 * 1024,
            maxSize: 5 * 1024 * 1024,
          })
        );
      });

      it("should handle missing mimetype", async () => {
        const mockFile = {
          size: 1024,
          originalname: "avatar.jpg",
        };

        mockReq.file = mockFile;

        await expect(
          profileController.uploadAvatar(mockReq, mockRes)
        ).rejects.toThrow("Only image files are allowed for avatar uploads");
      });
    });

    describe("Presigned URL scenarios", () => {
      it("should handle presigned URL upload successfully", async () => {
        const presignedUrl = "https://example.com/presigned-upload";
        mockReq.body = { presignedUrl };

        mockProfileService.processPresignedAvatar.mockResolvedValue(
          "https://example.com/avatar.jpg"
        );

        await profileController.uploadAvatar(mockReq, mockRes);

        expect(mockProfileService.processPresignedAvatar).toHaveBeenCalledWith(
          "user123",
          presignedUrl
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it("should reject invalid presigned URLs", async () => {
        mockReq.body = { presignedUrl: "not-a-url" };

        await expect(
          profileController.uploadAvatar(mockReq, mockRes)
        ).rejects.toThrow("Invalid presigned URL format");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Avatar upload failed: invalid presigned URL",
          expect.objectContaining({
            userId: "user123",
            presignedUrl: "not-a-url***",
          })
        );
      });

      it("should trim presigned URL", async () => {
        const presignedUrl = "  https://example.com/presigned-upload  ";
        mockReq.body = { presignedUrl };

        mockProfileService.processPresignedAvatar.mockResolvedValue(
          "https://example.com/avatar.jpg"
        );

        await profileController.uploadAvatar(mockReq, mockRes);

        expect(mockProfileService.processPresignedAvatar).toHaveBeenCalledWith(
          "user123",
          presignedUrl.trim()
        );
      });
    });

    describe("Error scenarios", () => {
      it("should handle no file or presigned URL", async () => {
        await expect(
          profileController.uploadAvatar(mockReq, mockRes)
        ).rejects.toThrow("No avatar file or presigned URL provided");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Avatar upload failed: no file or presigned URL provided",
          expect.objectContaining({
            userId: "user123",
            hasFile: false,
            hasPresignedUrl: false,
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });

      it("should handle service errors", async () => {
        mockReq.body = { presignedUrl: "https://example.com/upload" };
        const serviceError = new Error("Upload failed");
        mockProfileService.processPresignedAvatar.mockRejectedValue(
          serviceError
        );

        await expect(
          profileController.uploadAvatar(mockReq, mockRes)
        ).rejects.toThrow("Upload failed");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Avatar upload failed",
          expect.objectContaining({
            userId: "user123",
            error: "Upload failed",
            stack: serviceError.stack,
          })
        );
      });
    });
  });

  describe("changePassword", () => {
    describe("Success scenarios", () => {
      it("should change password successfully", async () => {
        const currentPassword = "oldPassword123";
        const newPassword = "newPassword123!";

        mockReq.body = { currentPassword, newPassword };
        mockProfileService.changePassword.mockResolvedValue();

        await profileController.changePassword(mockReq, mockRes);

        expect(mockProfileService.changePassword).toHaveBeenCalledWith(
          "user123",
          currentPassword,
          newPassword
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          message: "Password changed successfully",
        });
      });
    });

    describe("Validation scenarios", () => {
      it("should handle missing current password", async () => {
        mockReq.body = { newPassword: "newPassword123!" };

        await expect(
          profileController.changePassword(mockReq, mockRes)
        ).rejects.toThrow("Missing required fields: currentPassword");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Password change failed: missing required fields",
          expect.objectContaining({
            userId: "user123",
            missingFields: ["currentPassword"],
          })
        );
      });

      it("should handle missing new password", async () => {
        mockReq.body = { currentPassword: "oldPassword123" };

        await expect(
          profileController.changePassword(mockReq, mockRes)
        ).rejects.toThrow("Missing required fields: newPassword");
      });

      it("should handle missing both passwords", async () => {
        mockReq.body = {};

        await expect(
          profileController.changePassword(mockReq, mockRes)
        ).rejects.toThrow(
          "Missing required fields: currentPassword, newPassword"
        );
      });

      it("should handle password too short", async () => {
        mockReq.body = {
          currentPassword: "oldPassword123",
          newPassword: "short",
        };

        await expect(
          profileController.changePassword(mockReq, mockRes)
        ).rejects.toThrow(
          "Password validation failed: Password must be at least 8 characters long, Password must contain at least one number"
        );
      });

      it("should handle password too long", async () => {
        mockReq.body = {
          currentPassword: "oldPassword123",
          newPassword: "a".repeat(129) + "1",
        };

        await expect(
          profileController.changePassword(mockReq, mockRes)
        ).rejects.toThrow(
          "Password validation failed: Password must be no more than 128 characters long"
        );
      });

      it("should handle password without letters", async () => {
        mockReq.body = {
          currentPassword: "oldPassword123",
          newPassword: "12345678",
        };

        await expect(
          profileController.changePassword(mockReq, mockRes)
        ).rejects.toThrow(
          "Password validation failed: Password must contain at least one letter"
        );
      });

      it("should handle password without numbers", async () => {
        mockReq.body = {
          currentPassword: "oldPassword123",
          newPassword: "abcdefgh",
        };

        await expect(
          profileController.changePassword(mockReq, mockRes)
        ).rejects.toThrow(
          "Password validation failed: Password must contain at least one number"
        );
      });

      it("should handle same password", async () => {
        const password = "samePassword123";
        mockReq.body = {
          currentPassword: password,
          newPassword: password,
        };

        await expect(
          profileController.changePassword(mockReq, mockRes)
        ).rejects.toThrow(
          "New password must be different from current password"
        );

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Password change failed: new password same as current",
          expect.objectContaining({
            userId: "user123",
          })
        );
      });

      it("should accept valid passwords", async () => {
        const validPasswords = [
          "Password123",
          "MyPass12",
          "1234567a",
          "a".repeat(100) + "1",
        ];

        for (const newPassword of validPasswords) {
          mockReq.body = {
            currentPassword: "oldPassword123",
            newPassword,
          };
          mockProfileService.changePassword.mockResolvedValue();

          await profileController.changePassword(mockReq, mockRes);

          expect(mockProfileService.changePassword).toHaveBeenCalledWith(
            "user123",
            "oldPassword123",
            newPassword
          );
        }
      });
    });

    describe("Error scenarios", () => {
      it("should handle service errors", async () => {
        mockReq.body = {
          currentPassword: "oldPassword123",
          newPassword: "newPassword123!",
        };
        const serviceError = new Error("Current password incorrect");
        mockProfileService.changePassword.mockRejectedValue(serviceError);

        await expect(
          profileController.changePassword(mockReq, mockRes)
        ).rejects.toThrow("Current password incorrect");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Password change failed",
          expect.objectContaining({
            userId: "user123",
            error: "Current password incorrect",
            stack: serviceError.stack,
          })
        );
      });
    });
  });

  describe("Helper Functions", () => {
    describe("getClientInfo", () => {
      it("should extract client information correctly", () => {
        const result = profileController.getClientInfo(mockReq);

        expect(result).toEqual({
          ipAddress: "127.0.0.1",
          userAgent: "test-agent",
          traceId: "test-trace-123",
          requestId: "test-request-456",
        });
      });

      it("should handle missing headers gracefully", () => {
        mockReq.ip = undefined;
        mockReq.connection = undefined;
        mockReq.headers = {};
        mockReq.get = jest.fn(() => null);

        const result = profileController.getClientInfo(mockReq);

        expect(result).toEqual({
          ipAddress: null,
          userAgent: null,
          traceId: null,
          requestId: null,
        });
      });
    });

    describe("validateRequiredFields", () => {
      it("should validate required fields correctly", () => {
        const body = { field1: "value1", field2: "value2" };
        const requiredFields = ["field1", "field2"];

        const result = profileController.validateRequiredFields(
          body,
          requiredFields
        );

        expect(result.isValid).toBe(true);
        expect(result.missingFields).toEqual([]);
      });

      it("should detect missing required fields", () => {
        const body = { field1: "value1" };
        const requiredFields = ["field1", "field2", "field3"];

        const result = profileController.validateRequiredFields(
          body,
          requiredFields
        );

        expect(result.isValid).toBe(false);
        expect(result.missingFields).toEqual(["field2", "field3"]);
      });

      it("should handle falsy values as missing", () => {
        const body = {
          field1: "",
          field2: null,
          field3: undefined,
          field4: false,
        };
        const requiredFields = ["field1", "field2", "field3", "field4"];

        const result = profileController.validateRequiredFields(
          body,
          requiredFields
        );

        expect(result.isValid).toBe(false);
        expect(result.missingFields).toEqual([
          "field1",
          "field2",
          "field3",
          "field4",
        ]);
      });
    });

    describe("validateNonEmptyString", () => {
      it("should validate non-empty strings correctly", () => {
        expect(profileController.validateNonEmptyString("valid")).toBe(true);
        expect(profileController.validateNonEmptyString("  valid  ")).toBe(
          true
        );
      });

      it("should reject invalid inputs", () => {
        expect(profileController.validateNonEmptyString("")).toBe(false);
        expect(profileController.validateNonEmptyString("   ")).toBe(false);
        expect(profileController.validateNonEmptyString(null)).toBe(false);
        expect(profileController.validateNonEmptyString(undefined)).toBe(false);
        expect(profileController.validateNonEmptyString(123)).toBe(false);
        expect(profileController.validateNonEmptyString({})).toBe(false);
        expect(profileController.validateNonEmptyString([])).toBe(false);
      });
    });

    describe("validateTimezone", () => {
      it("should validate valid timezone formats", () => {
        const validTimezones = [
          "America/New_York",
          "Europe/London",
          "Asia/Tokyo",
          "UTC",
          "GMT",
          "America/Los_Angeles",
        ];

        validTimezones.forEach((timezone) => {
          expect(profileController.validateTimezone(timezone)).toBe(true);
        });
      });

      it("should reject invalid timezone formats", async () => {
        const invalidTimezones = [
          "",
          "   ",
          "invalid",
          "America",
          "New_York",
          "America/New York",
          "America/New_York/Extra",
          "America/New_York/City/Extra",
        ];

        invalidTimezones.forEach((timezone) => {
          expect(profileController.validateTimezone(timezone)).toBe(false);
        });
      });
    });

    describe("validateLocale", () => {
      it("should validate valid locale formats", () => {
        const validLocales = [
          "en",
          "es",
          "fr",
          "en-US",
          "es-MX",
          "fr-CA",
          "zh-CN",
        ];

        validLocales.forEach((locale) => {
          expect(profileController.validateLocale(locale)).toBe(true);
        });
      });

      it("should reject invalid locale formats", () => {
        const invalidLocales = [
          "",
          "   ",
          "EN",
          "en_US",
          "en-us",
          "english",
          "en-US-EXTRA",
        ];

        invalidLocales.forEach((locale) => {
          expect(profileController.validateLocale(locale)).toBe(false);
        });
      });
    });

    describe("validateUrl", () => {
      it("should validate valid URLs", async () => {
        const validUrls = [
          "https://example.com",
          "http://localhost:3000",
          "https://api.example.com/path?query=value",
          "ftp://files.example.com",
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ",
        ];

        validUrls.forEach((url) => {
          expect(profileController.validateUrl(url)).toBe(true);
        });
      });

      it("should reject invalid URLs", async () => {
        const invalidUrls = [
          "",
          "   ",
          "not-a-url",
          "example.com",
          "https://",
          "javascript:alert('xss')",
          "file:///etc/passwd",
          "ftp://",
          "invalid://protocol",
        ];

        invalidUrls.forEach((url) => {
          expect(profileController.validateUrl(url)).toBe(false);
        });
      });
    });

    describe("validatePassword", () => {
      it("should validate strong passwords", async () => {
        const strongPasswords = [
          "Password123",
          "MyPass12",
          "1234567a",
          "a".repeat(100) + "1",
        ];

        strongPasswords.forEach((password) => {
          const result = profileController.validatePassword(password);
          expect(result.isValid).toBe(true);
          expect(result.issues).toEqual([]);
        });
      });

      it("should reject weak passwords", () => {
        const weakPasswords = [
          { password: "", expectedIssues: ["Password must be a string"] },
          {
            password: "short",
            expectedIssues: [
              "Password must be at least 8 characters long",
              "Password must contain at least one number",
            ],
          },
          {
            password: "a".repeat(129) + "1",
            expectedIssues: [
              "Password must be no more than 128 characters long",
            ],
          },
          {
            password: "12345678",
            expectedIssues: ["Password must contain at least one letter"],
          },
          {
            password: "abcdefgh",
            expectedIssues: ["Password must contain at least one number"],
          },
        ];

        weakPasswords.forEach(({ password, expectedIssues }) => {
          const result = profileController.validatePassword(password);
          expect(result.isValid).toBe(false);
          expect(result.issues).toEqual(expectedIssues);
        });
      });
    });
  });

  describe("Security considerations", () => {
    it("should not log sensitive information", async () => {
      const presignedUrl = "https://example.com/sensitive-presigned-url-123";
      mockReq.body = { presignedUrl };

      mockProfileService.processPresignedAvatar.mockResolvedValue(
        "https://example.com/avatar.jpg"
      );

      await profileController.uploadAvatar(mockReq, mockRes);

      // Verify presigned URL is masked in logs
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Avatar upload requested",
        expect.objectContaining({
          hasPresignedUrl: true,
        })
      );

      // Verify full URL is never logged
      const logCalls = mockLogger.info.mock.calls;
      logCalls.forEach((call) => {
        const logData = call[1];
        expect(logData.presignedUrl || "").not.toContain(
          "sensitive-presigned-url-123"
        );
      });
    });

    it("should log avatar URL partially for security", async () => {
      const avatarUrl = "https://example.com/very-long-avatar-url-path-123";
      mockReq.body = { presignedUrl: "https://example.com/upload" };

      mockProfileService.processPresignedAvatar.mockResolvedValue(avatarUrl);

      await profileController.uploadAvatar(mockReq, mockRes);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Avatar uploaded successfully",
        expect.objectContaining({
          avatarUrl: "https://example.com/very-long-***",
        })
      );

      // Verify full URL is never logged
      const logCalls = mockLogger.info.mock.calls;
      logCalls.forEach((call) => {
        const logData = call[1];
        expect(logData.avatarUrl || "").not.toContain(
          "very-long-avatar-url-path-123"
        );
      });
    });
  });
});
