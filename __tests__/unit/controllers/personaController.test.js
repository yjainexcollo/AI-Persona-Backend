/**
 * PersonaController Unit Tests
 * Comprehensive tests for persona management and chat functionality
 */

// Mock dependencies
jest.mock("../../../src/services/personaService");
jest.mock("../../../src/utils/asyncHandler", () => {
  return (fn) => fn; // Return the function as-is for testing
});
jest.mock("../../../src/utils/apiResponse");
jest.mock("../../../src/utils/logger");

const mockPersonaService = require("../../../src/services/personaService");
const mockApiResponse = require("../../../src/utils/apiResponse");
const mockLogger = require("../../../src/utils/logger");

// Import the actual controller
const personaController = require("../../../src/controllers/personaController");

describe("PersonaController", () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockLogger.info = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.error = jest.fn();

    // Mock ApiResponse
    mockApiResponse.mockImplementation((data) => ({
      status: "success",
      ...data,
    }));

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
        "sec-ch-ua": "test-device",
      },
      get: jest.fn((header) => {
        if (header === "User-Agent") return "test-agent";
        return mockReq.headers[header.toLowerCase()] || null;
      }),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("getPersonas", () => {
    it("should retrieve all personas successfully", async () => {
      const mockPersonas = [
        { id: "persona1", name: "Assistant", isFavourited: false },
        { id: "persona2", name: "Writer", isFavourited: true },
      ];

      mockPersonaService.getPersonas.mockResolvedValue(mockPersonas);

      await personaController.getPersonas(mockReq, mockRes);

      expect(mockPersonaService.getPersonas).toHaveBeenCalledWith("user123", {
        favouritesOnly: false,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockPersonas,
        message: "Personas retrieved successfully",
      });
    });

    it("should filter favourites when requested", async () => {
      mockReq.query = { favouritesOnly: "true" };
      const mockPersonas = [
        { id: "persona2", name: "Writer", isFavourited: true },
      ];

      mockPersonaService.getPersonas.mockResolvedValue(mockPersonas);

      await personaController.getPersonas(mockReq, mockRes);

      expect(mockPersonaService.getPersonas).toHaveBeenCalledWith("user123", {
        favouritesOnly: true,
      });
    });

    it("should handle service errors", async () => {
      const serviceError = new Error("Service unavailable");
      mockPersonaService.getPersonas.mockRejectedValue(serviceError);

      await expect(
        personaController.getPersonas(mockReq, mockRes)
      ).rejects.toThrow("Service unavailable");
    });
  });

  describe("getPersonaById", () => {
    it("should retrieve persona by ID successfully", async () => {
      const personaId = "persona123";
      mockReq.params = { id: personaId };
      const mockPersona = { id: personaId, name: "Assistant" };

      mockPersonaService.getPersonaById.mockResolvedValue(mockPersona);

      await personaController.getPersonaById(mockReq, mockRes);

      expect(mockPersonaService.getPersonaById).toHaveBeenCalledWith(
        personaId,
        "user123"
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle missing persona ID", async () => {
      mockReq.params = { id: "" };

      await expect(
        personaController.getPersonaById(mockReq, mockRes)
      ).rejects.toThrow("Invalid persona ID");
    });

    it("should handle service errors", async () => {
      mockReq.params = { id: "persona123" };
      const serviceError = new Error("Persona not found");
      mockPersonaService.getPersonaById.mockRejectedValue(serviceError);

      await expect(
        personaController.getPersonaById(mockReq, mockRes)
      ).rejects.toThrow("Persona not found");
    });
  });

  describe("toggleFavourite", () => {
    it("should add persona to favourites", async () => {
      const personaId = "persona123";
      mockReq.params = { id: personaId };
      const mockResult = { isFavourited: true };

      mockPersonaService.toggleFavourite.mockResolvedValue(mockResult);

      await personaController.toggleFavourite(mockReq, mockRes);

      expect(mockPersonaService.toggleFavourite).toHaveBeenCalledWith(
        personaId,
        "user123"
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle missing persona ID", async () => {
      mockReq.params = { id: "" };

      await expect(
        personaController.toggleFavourite(mockReq, mockRes)
      ).rejects.toThrow("Invalid persona ID");
    });
  });

  describe("sendMessage", () => {
    it("should send message successfully", async () => {
      const personaId = "persona123";
      mockReq.params = { id: personaId };
      mockReq.body = { message: "Hello, how are you?" };

      const mockResult = {
        conversation: { id: "conv123" },
        messages: [{ id: "msg1", text: "Hello, how are you?" }],
      };

      mockPersonaService.sendMessage.mockResolvedValue(mockResult);

      await personaController.sendMessage(mockReq, mockRes);

      expect(mockPersonaService.sendMessage).toHaveBeenCalledWith(
        personaId,
        "Hello, how are you?",
        undefined,
        "user123",
        undefined,
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle missing message", async () => {
      mockReq.params = { id: "persona123" };
      mockReq.body = {};

      await expect(
        personaController.sendMessage(mockReq, mockRes)
      ).rejects.toThrow("Message is required and must not be empty");
    });

    it("should handle message too long", async () => {
      mockReq.params = { id: "persona123" };
      mockReq.body = { message: "a".repeat(10001) };

      await expect(
        personaController.sendMessage(mockReq, mockRes)
      ).rejects.toThrow("Message is too long (maximum 10,000 characters)");
    });
  });

  describe("getConversations", () => {
    it("should retrieve conversations successfully", async () => {
      const mockResult = {
        conversations: [
          { id: "conv1", title: "Chat 1" },
          { id: "conv2", title: "Chat 2" },
        ],
        pagination: { total: 2, page: 1, limit: 10 },
      };

      mockPersonaService.getConversations.mockResolvedValue(mockResult);

      await personaController.getConversations(mockReq, mockRes);

      expect(mockPersonaService.getConversations).toHaveBeenCalledWith(
        "user123",
        "workspace123",
        { archived: false }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("updateConversationVisibility", () => {
    it("should update conversation visibility successfully", async () => {
      const conversationId = "conv123";
      mockReq.params = { id: conversationId };
      mockReq.body = { visibility: "PUBLIC" };

      const mockResult = { id: conversationId, visibility: "PUBLIC" };
      mockPersonaService.updateConversationVisibility.mockResolvedValue(
        mockResult
      );

      await personaController.updateConversationVisibility(mockReq, mockRes);

      expect(
        mockPersonaService.updateConversationVisibility
      ).toHaveBeenCalledWith(conversationId, "user123", "PUBLIC");
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle missing visibility field", async () => {
      mockReq.params = { id: "conv123" };
      mockReq.body = {};

      await expect(
        personaController.updateConversationVisibility(mockReq, mockRes)
      ).rejects.toThrow("Missing required fields: visibility");
    });

    it("should handle invalid visibility value", async () => {
      mockReq.params = { id: "conv123" };
      mockReq.body = { visibility: "INVALID" };

      await expect(
        personaController.updateConversationVisibility(mockReq, mockRes)
      ).rejects.toThrow(
        "Invalid visibility. Must be one of: PUBLIC, PRIVATE, WORKSPACE"
      );
    });
  });

  describe("requestFileUpload", () => {
    it("should generate file upload URL successfully", async () => {
      const conversationId = "conv123";
      mockReq.params = { id: conversationId };
      mockReq.body = {
        filename: "document.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024 * 1024, // 1MB
      };

      const mockResult = {
        uploadUrl: "https://example.com/upload",
        fileId: "file123",
      };
      mockPersonaService.requestFileUpload.mockResolvedValue(mockResult);

      await personaController.requestFileUpload(mockReq, mockRes);

      expect(mockPersonaService.requestFileUpload).toHaveBeenCalledWith(
        conversationId,
        "user123",
        {
          filename: "document.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024 * 1024,
        }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle missing required fields", async () => {
      mockReq.params = { id: "conv123" };
      mockReq.body = { filename: "test.pdf" };

      await expect(
        personaController.requestFileUpload(mockReq, mockRes)
      ).rejects.toThrow("Missing required fields: mimeType, sizeBytes");
    });

    it("should handle file size too large", async () => {
      mockReq.params = { id: "conv123" };
      mockReq.body = {
        filename: "test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 101 * 1024 * 1024, // 101MB
      };

      await expect(
        personaController.requestFileUpload(mockReq, mockRes)
      ).rejects.toThrow("File size must be between 1 byte and 100MB");
    });
  });

  describe("toggleReaction", () => {
    it("should toggle reaction successfully", async () => {
      const messageId = "msg123";
      mockReq.params = { id: messageId };
      mockReq.body = { type: "like" };

      const mockResult = { action: "added", type: "like" };
      mockPersonaService.toggleReaction.mockResolvedValue(mockResult);

      await personaController.toggleReaction(mockReq, mockRes);

      expect(mockPersonaService.toggleReaction).toHaveBeenCalledWith(
        messageId,
        "user123",
        "like"
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle invalid reaction type", async () => {
      mockReq.params = { id: "msg123" };
      mockReq.body = { type: "invalid" };

      await expect(
        personaController.toggleReaction(mockReq, mockRes)
      ).rejects.toThrow(
        "Invalid reaction type. Must be one of: like, love, laugh, wow, sad, angry"
      );
    });
  });

  describe("toggleArchive", () => {
    it("should archive conversation successfully", async () => {
      const conversationId = "conv123";
      mockReq.params = { id: conversationId };
      mockReq.body = { archived: true };

      const mockResult = { archived: true };
      mockPersonaService.toggleArchive.mockResolvedValue(mockResult);

      await personaController.toggleArchive(mockReq, mockRes);

      expect(mockPersonaService.toggleArchive).toHaveBeenCalledWith(
        conversationId,
        "user123",
        true
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle invalid archived value", async () => {
      mockReq.params = { id: "conv123" };
      mockReq.body = { archived: "true" };

      await expect(
        personaController.toggleArchive(mockReq, mockRes)
      ).rejects.toThrow("Archived value must be a boolean");
    });
  });

  describe("createShareableLink", () => {
    it("should create shareable link successfully", async () => {
      const conversationId = "conv123";
      mockReq.params = { id: conversationId };
      mockReq.body = { expiresInDays: 7 };

      const mockResult = { token: "share123", expiresAt: "2024-01-01" };
      mockPersonaService.createShareableLink.mockResolvedValue(mockResult);

      await personaController.createShareableLink(mockReq, mockRes);

      expect(mockPersonaService.createShareableLink).toHaveBeenCalledWith(
        conversationId,
        "user123",
        7
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle invalid expiration days", async () => {
      mockReq.params = { id: "conv123" };
      mockReq.body = { expiresInDays: 366 };

      await expect(
        personaController.createShareableLink(mockReq, mockRes)
      ).rejects.toThrow("Expiration days must be between 1 and 365");
    });
  });

  describe("getSharedConversation", () => {
    it("should retrieve shared conversation successfully", async () => {
      const token = "share123";
      mockReq.params = { token };

      const mockResult = { conversation: { id: "conv123" }, messages: [] };
      mockPersonaService.getSharedConversation.mockResolvedValue(mockResult);

      await personaController.getSharedConversation(mockReq, mockRes);

      expect(mockPersonaService.getSharedConversation).toHaveBeenCalledWith(
        token
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle missing token", async () => {
      mockReq.params = { token: "" };

      await expect(
        personaController.getSharedConversation(mockReq, mockRes)
      ).rejects.toThrow("Invalid or missing token");
    });
  });

  describe("Helper Functions", () => {
    describe("getClientInfo", () => {
      it("should extract client information correctly", () => {
        const result = personaController.getClientInfo(mockReq);

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

        const result = personaController.getClientInfo(mockReq);

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

        const result = personaController.validateRequiredFields(
          body,
          requiredFields
        );

        expect(result.isValid).toBe(true);
        expect(result.missingFields).toEqual([]);
      });

      it("should detect missing required fields", () => {
        const body = { field1: "value1" };
        const requiredFields = ["field1", "field2", "field3"];

        const result = personaController.validateRequiredFields(
          body,
          requiredFields
        );

        expect(result.isValid).toBe(false);
        expect(result.missingFields).toEqual(["field2", "field3"]);
      });
    });

    describe("validateNonEmptyString", () => {
      it("should validate non-empty strings correctly", () => {
        expect(personaController.validateNonEmptyString("valid")).toBe(true);
        expect(personaController.validateNonEmptyString("  valid  ")).toBe(
          true
        );
      });

      it("should reject invalid inputs", () => {
        expect(personaController.validateNonEmptyString("")).toBe(false);
        expect(personaController.validateNonEmptyString("   ")).toBe(false);
        expect(personaController.validateNonEmptyString(null)).toBe(false);
        expect(personaController.validateNonEmptyString(undefined)).toBe(false);
        expect(personaController.validateNonEmptyString(123)).toBe(false);
      });
    });
  });

  describe("Security considerations", () => {
    it("should not log sensitive information", async () => {
      const token = "sensitive-share-token-123";
      mockReq.params = { token };

      mockPersonaService.getSharedConversation.mockResolvedValue({
        conversation: { id: "conv123" },
        messages: [],
      });

      await personaController.getSharedConversation(mockReq, mockRes);

      // Verify full token is never logged
      const logCalls = mockLogger.info.mock.calls;
      logCalls.forEach((call) => {
        const logData = call[1];
        expect(logData.token || "").not.toContain("sensitive-share-token-123");
      });
    });

    it("should log message length but not content", async () => {
      const personaId = "persona123";
      mockReq.params = { id: personaId };
      mockReq.body = { message: "This is a secret message" };

      mockPersonaService.sendMessage.mockResolvedValue({
        conversation: { id: "conv123" },
        messages: [],
      });

      await personaController.sendMessage(mockReq, mockRes);

      // Verify message content is never logged
      const logCalls = mockLogger.info.mock.calls;
      logCalls.forEach((call) => {
        const logData = call[1];
        expect(logData.message).toBeUndefined();
        expect(logData.messageContent).toBeUndefined();
      });
    });
  });
});
