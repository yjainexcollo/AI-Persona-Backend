const upload = require("../../../src/utils/upload");

describe("Upload Utils", () => {
  describe("validateFileUpload", () => {
    it("should validate valid file upload", () => {
      const validFileData = {
        filename: "test-image.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024 * 1024, // 1MB
      };

      const result = upload.validateFileUpload(validFileData);

      expect(result).toEqual(validFileData);
    });

    it("should reject missing filename", () => {
      const invalidFileData = {
        mimeType: "image/jpeg",
        sizeBytes: 1024 * 1024,
      };

      expect(() => upload.validateFileUpload(invalidFileData)).toThrow(
        "Filename must be provided and less than 200 characters"
      );
    });

    it("should reject filename that is too long", () => {
      const invalidFileData = {
        filename: "a".repeat(201), // 201 characters
        mimeType: "image/jpeg",
        sizeBytes: 1024 * 1024,
      };

      expect(() => upload.validateFileUpload(invalidFileData)).toThrow(
        "Filename must be provided and less than 200 characters"
      );
    });

    it("should reject invalid mime type", () => {
      const invalidFileData = {
        filename: "test.txt",
        mimeType: "text/plain",
        sizeBytes: 1024 * 1024,
      };

      expect(() => upload.validateFileUpload(invalidFileData)).toThrow(
        "Invalid mime type. Allowed: image/jpeg, image/png, image/gif, image/webp, application/pdf"
      );
    });

    it("should reject oversized files", () => {
      const invalidFileData = {
        filename: "large-file.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 11 * 1024 * 1024, // 11MB
      };

      expect(() => upload.validateFileUpload(invalidFileData)).toThrow(
        "File size must be less than 10 MB"
      );
    });

    it("should accept all allowed mime types", () => {
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ];

      allowedMimeTypes.forEach((mimeType) => {
        const fileData = {
          filename: "test-file",
          mimeType: mimeType,
          sizeBytes: 1024 * 1024,
        };

        const result = upload.validateFileUpload(fileData);
        expect(result.mimeType).toBe(mimeType);
      });
    });
  });

  describe("generatePresignedUrl", () => {
    it("should generate presigned URL", () => {
      const fileId = "test-file-id";
      const filename = "test-image.jpg";
      const mimeType = "image/jpeg";

      const result = upload.generatePresignedUrl(fileId, filename, mimeType);

      expect(result).toBeDefined();
      expect(result.presignedUrl).toBeDefined();
      expect(result.fileId).toBe(fileId);
      expect(result.expiresIn).toBe(3600);
    });

    it("should include fileId in presigned URL", () => {
      const fileId = "unique-file-id";
      const filename = "test-image.jpg";
      const mimeType = "image/jpeg";

      const result = upload.generatePresignedUrl(fileId, filename, mimeType);

      expect(result.presignedUrl).toContain(fileId);
    });

    it("should handle presigned URL generation errors", () => {
      // Mock process.env to be undefined to test error handling
      const originalEnv = process.env.UPLOAD_BASE_URL;
      delete process.env.UPLOAD_BASE_URL;

      const fileId = "test-file-id";
      const filename = "test-image.jpg";
      const mimeType = "image/jpeg";

      const result = upload.generatePresignedUrl(fileId, filename, mimeType);

      expect(result.presignedUrl).toContain("http://localhost:3000");

      // Restore original environment
      if (originalEnv) {
        process.env.UPLOAD_BASE_URL = originalEnv;
      }
    });
  });

  describe("generateFileId", () => {
    it("should generate unique file ID", () => {
      const fileId1 = upload.generateFileId();
      const fileId2 = upload.generateFileId();

      expect(fileId1).toBeDefined();
      expect(typeof fileId1).toBe("string");
      expect(fileId1.length).toBe(32); // 16 bytes = 32 hex characters
      expect(fileId1).not.toBe(fileId2);
    });

    it("should generate hex format file ID", () => {
      const fileId = upload.generateFileId();

      // Should be 32 hex characters
      expect(fileId).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe("updateFileUrl", () => {
    it("should update file URL successfully", async () => {
      const fileId = "test-file-id";
      const url = "https://example.com/uploads/test-file.jpg";

      // Should not throw an error
      await expect(upload.updateFileUrl(fileId, url)).resolves.not.toThrow();
    });

    it("should handle update errors gracefully", async () => {
      const fileId = "test-file-id";
      const url = "https://example.com/uploads/test-file.jpg";

      // Mock logger to throw an error
      const logger = require("../../../src/utils/logger");
      const originalInfo = logger.info;
      logger.info = jest.fn().mockImplementation(() => {
        throw new Error("Database error");
      });

      await expect(upload.updateFileUrl(fileId, url)).rejects.toThrow(
        "Failed to update file URL"
      );

      // Restore original logger
      logger.info = originalInfo;
    });
  });

  describe("constants", () => {
    it("should have correct MAX_FILE_SIZE", () => {
      expect(upload.MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
    });

    it("should have correct ALLOWED_MIME_TYPES", () => {
      const expectedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ];

      expect(upload.ALLOWED_MIME_TYPES).toEqual(expectedTypes);
    });
  });

  describe("file size validation", () => {
    it("should accept files within size limit", () => {
      const validSizes = [
        1024, // 1KB
        1024 * 1024, // 1MB
        5 * 1024 * 1024, // 5MB
        10 * 1024 * 1024, // 10MB (exact limit)
      ];

      validSizes.forEach((size) => {
        const fileData = {
          filename: "test-file.jpg",
          mimeType: "image/jpeg",
          sizeBytes: size,
        };

        expect(() => upload.validateFileUpload(fileData)).not.toThrow();
      });
    });

    it("should reject files exceeding size limit", () => {
      const invalidSizes = [
        10 * 1024 * 1024 + 1, // 10MB + 1 byte
        15 * 1024 * 1024, // 15MB
        100 * 1024 * 1024, // 100MB
      ];

      invalidSizes.forEach((size) => {
        const fileData = {
          filename: "large-file.jpg",
          mimeType: "image/jpeg",
          sizeBytes: size,
        };

        expect(() => upload.validateFileUpload(fileData)).toThrow(
          "File size must be less than 10 MB"
        );
      });
    });
  });

  describe("mime type validation", () => {
    it("should reject unsupported mime types", () => {
      const unsupportedTypes = [
        "text/plain",
        "application/json",
        "video/mp4",
        "audio/mp3",
        "application/zip",
        "text/html",
      ];

      unsupportedTypes.forEach((mimeType) => {
        const fileData = {
          filename: "test-file",
          mimeType: mimeType,
          sizeBytes: 1024 * 1024,
        };

        expect(() => upload.validateFileUpload(fileData)).toThrow(
          "Invalid mime type"
        );
      });
    });
  });
});
