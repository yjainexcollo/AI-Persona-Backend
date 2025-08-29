const personaService = require("../../../src/services/personaService");
const ApiError = require("../../../src/utils/apiError");

// Mock axios
jest.mock("axios", () => ({
  post: jest.fn(),
}));

// Mock encrypt and decrypt
jest.mock("../../../src/utils/encrypt", () => ({
  encrypt: jest.fn((data) => `encrypted:${data}`),
  decrypt: jest.fn((data) => {
    if (typeof data === "string" && data.startsWith("encrypted:")) {
      return data.replace("encrypted:", "");
    }
    return data;
  }),
}));

// Mock circuit breaker
const mockCircuitBreaker = {
  isOpen: jest.fn(() => false),
  onSuccess: jest.fn(),
  onFailure: jest.fn(),
};

jest.mock("../../../src/utils/circuitBreaker", () => ({
  getCircuitBreaker: jest.fn(() => mockCircuitBreaker),
}));

// Mock chat session service
jest.mock("../../../src/services/chatSessionService", () => ({
  createChatSession: jest.fn(),
}));

// Mock auth service
jest.mock("../../../src/services/authService", () => ({
  createAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

// Mock upload utils
jest.mock("../../../src/utils/upload", () => ({
  validateFileUpload: jest.fn(),
  generateFileId: jest.fn(() => "file123"),
  generatePresignedUrl: jest.fn(() => ({
    presignedUrl: "https://test.com/upload",
  })),
}));

// Mock token utils
jest.mock("../../../src/utils/token", () => ({
  generateConversationToken: jest.fn(() => "token123"),
  validateToken: jest.fn(() => true),
}));

// Mock logger
jest.mock("../../../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe("PersonaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    global.mockFindMany.mockReset();
    global.mockFindUnique.mockReset();
    global.mockFindFirst.mockReset();
    global.mockCreate.mockReset();
    global.mockUpdate.mockReset();
    global.mockDelete.mockReset();
    global.mockDeleteMany.mockReset();
    if (global.mockUpsert) {
      global.mockUpsert.mockReset();
    }

    // Reset service mocks
    const chatSessionService = require("../../../src/services/chatSessionService");
    chatSessionService.createChatSession.mockReset();

    const authService = require("../../../src/services/authService");
    authService.createAuditEvent.mockReset();

    // Reset axios mock
    const axios = require("axios");
    axios.post.mockReset();

    // Reset circuit breaker mock
    const { getCircuitBreaker } = require("../../../src/utils/circuitBreaker");
    getCircuitBreaker.mockReturnValue(mockCircuitBreaker);
    mockCircuitBreaker.isOpen.mockReturnValue(false);
    mockCircuitBreaker.onSuccess.mockReset();
    mockCircuitBreaker.onFailure.mockReset();

    // Reset encrypt/decrypt mocks
    const { encrypt, decrypt } = require("../../../src/utils/encrypt");
    encrypt.mockImplementation((data) => `encrypted:${data}`);
    decrypt.mockImplementation((data, key) => {
      if (typeof data === "string" && data.startsWith("encrypted:")) {
        return data.replace("encrypted:", "");
      }
      return data;
    });

    // Reset transaction mock
    global.mockPrisma.$transaction.mockImplementation((callback) =>
      callback(global.mockPrisma)
    );

    // Set up environment
    process.env.ENCRYPTION_KEY = "test-encryption-key";
    process.env.APP_BASE_URL = "http://localhost:3000";
  });

  describe("getPersonas", () => {
    it("should return all active personas", async () => {
      const userId = "user123";
      const mockPersonas = [
        {
          id: "p1",
          name: "Test Persona 1",
          personaRole: "Test Role 1",
          about: "About test persona 1",
          traits: "Analytical; Strategic",
          painPoints: "Complex processes; Time constraints",
          coreExpertise: "Testing; Quality Assurance",
          communicationStyle: "Direct and clear",
          keyResponsibility: "Ensuring quality; Managing tests",
          description: "Test Description",
          avatarUrl: "https://test.com/avatar1.jpg",
          webhookUrl: "https://test.com/webhook1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          favourites: [],
          _count: { conversations: 2, messages: 5 },
        },
        {
          id: "p2",
          name: "Test Persona 2",
          personaRole: "Test Role 2",
          about: "About test persona 2",
          traits: "Creative; Collaborative",
          painPoints: "Resource limitations; Tight deadlines",
          coreExpertise: "Design; User Experience",
          communicationStyle: "Collaborative and visual",
          keyResponsibility: "Creating designs; User research",
          description: "Test Description 2",
          avatarUrl: "https://test.com/avatar2.jpg",
          webhookUrl: "https://test.com/webhook2",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          favourites: [],
          _count: { conversations: 1, messages: 3 },
        },
      ];
      global.mockFindMany.mockResolvedValue(mockPersonas);

      const personas = await personaService.getPersonas(userId);

      expect(personas).toHaveLength(2);
      expect(personas[0].name).toBe("Test Persona 1");
      expect(personas[0].personaRole).toBe("Test Role 1");
      expect(personas[0].about).toBe("About test persona 1");
      expect(personas[0].traits).toBe("Analytical; Strategic");
      expect(personas[0].painPoints).toBe(
        "Complex processes; Time constraints"
      );
      expect(personas[0].coreExpertise).toBe("Testing; Quality Assurance");
      expect(personas[0].communicationStyle).toBe("Direct and clear");
      expect(personas[0].keyResponsibility).toBe(
        "Ensuring quality; Managing tests"
      );
      expect(personas[0].description).toBe("Test Description");
      expect(personas[0].avatarUrl).toBe("https://test.com/avatar1.jpg");
      expect(personas[0].isActive).toBe(true);
      expect(personas[0]._count.conversations).toBe(2);
      expect(personas[0]._count.messages).toBe(5);
      expect(personas[0].isFavourited).toBe(false);
      expect(personas[0].webhookUrl).toBeUndefined(); // Should be hidden
    });

    it("should filter favourites when requested", async () => {
      const userId = "user123";
      const mockPersonas = [
        {
          id: "p1",
          name: "Test Persona",
          personaRole: "Test Role",
          about: "About test persona",
          traits: "Test traits",
          painPoints: "Test pain points",
          coreExpertise: "Test expertise",
          communicationStyle: "Test communication style",
          keyResponsibility: "Test responsibilities",
          description: "Test Description",
          avatarUrl: "https://test.com/avatar.jpg",
          webhookUrl: "https://test.com/webhook",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          favourites: [{ userId }],
          _count: { conversations: 0, messages: 0 },
        },
      ];
      global.mockFindMany.mockResolvedValue(mockPersonas);

      const personas = await personaService.getPersonas(userId, {
        favouritesOnly: true,
      });

      expect(personas).toHaveLength(1);
      expect(personas[0].isFavourited).toBe(true);
    });

    it("should throw error for missing userId", async () => {
      await expect(personaService.getPersonas(null)).rejects.toThrow(
        "Valid userId is required"
      );

      await expect(personaService.getPersonas("")).rejects.toThrow(
        "Valid userId is required"
      );

      await expect(personaService.getPersonas(123)).rejects.toThrow(
        "Valid userId is required"
      );
    });

    it("should handle database errors", async () => {
      const userId = "user123";
      global.mockFindMany.mockRejectedValue(new Error("Database error"));

      await expect(personaService.getPersonas(userId)).rejects.toThrow(
        "Failed to fetch personas"
      );
    });

    it("should return empty array when no personas found", async () => {
      const userId = "user123";
      global.mockFindMany.mockResolvedValue([]);

      const personas = await personaService.getPersonas(userId);

      expect(personas).toEqual([]);
    });
  });

  describe("getPersonaById", () => {
    it("should return persona by ID with availability status", async () => {
      const personaId = "persona123";
      const userId = "user123";
      const mockPersona = {
        id: personaId,
        name: "Test Persona",
        personaRole: "Test Role",
        about: "About test persona",
        traits: "Test traits",
        painPoints: "Test pain points",
        coreExpertise: "Test expertise",
        communicationStyle: "Test communication style",
        keyResponsibility: "Test responsibilities",
        description: "Test Description",
        avatarUrl: "https://test.com/avatar.jpg",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        favourites: [],
        _count: { conversations: 2, messages: 5 },
      };

      global.mockFindUnique.mockResolvedValue(mockPersona);

      const persona = await personaService.getPersonaById(personaId, userId);

      expect(persona).toBeDefined();
      expect(persona.id).toBe(personaId);
      expect(persona.name).toBe("Test Persona");
      expect(persona.isAvailable).toBe(true); // Circuit breaker is closed
      expect(persona.isFavourited).toBe(false);
    });

    it("should show persona as unavailable when circuit breaker is open", async () => {
      const personaId = "persona123";
      const userId = "user123";
      const mockPersona = {
        id: personaId,
        name: "Test Persona",
        personaRole: "Test Role",
        about: "About test persona",
        traits: "Test traits",
        painPoints: "Test pain points",
        coreExpertise: "Test expertise",
        communicationStyle: "Test communication style",
        keyResponsibility: "Test responsibilities",
        description: "Test Description",
        avatarUrl: "https://test.com/avatar.jpg",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        favourites: [],
        _count: { conversations: 0, messages: 0 },
      };

      global.mockFindUnique.mockResolvedValue(mockPersona);
      mockCircuitBreaker.isOpen.mockReturnValue(true);

      const persona = await personaService.getPersonaById(personaId, userId);

      expect(persona.isAvailable).toBe(false);
    });

    it("should throw error for missing personaId", async () => {
      await expect(
        personaService.getPersonaById(null, "user123")
      ).rejects.toThrow("Valid personaId is required");

      await expect(
        personaService.getPersonaById("", "user123")
      ).rejects.toThrow("Valid personaId is required");
    });

    it("should throw error for missing userId", async () => {
      await expect(
        personaService.getPersonaById("persona123", null)
      ).rejects.toThrow("Valid userId is required");
    });

    it("should throw error for non-existent persona", async () => {
      global.mockFindUnique.mockResolvedValue(null);

      await expect(
        personaService.getPersonaById("non-existent", "user123")
      ).rejects.toThrow("Persona not found");
    });

    it("should handle database errors", async () => {
      global.mockFindUnique.mockRejectedValue(new Error("Database error"));

      await expect(
        personaService.getPersonaById("persona123", "user123")
      ).rejects.toThrow("Failed to fetch persona");
    });
  });

  describe("toggleFavourite", () => {
    it("should add persona to favourites", async () => {
      const personaId = "persona123";
      const userId = "user123";
      const mockPersona = {
        id: personaId,
        name: "Test Persona",
      };

      global.mockFindUnique
        .mockResolvedValueOnce(mockPersona) // Persona exists
        .mockResolvedValueOnce(null); // No existing favourite
      global.mockCreate.mockResolvedValue({
        userId,
        personaId,
      });

      const result = await personaService.toggleFavourite(personaId, userId);

      expect(result.isFavourited).toBe(true);
      expect(global.mockCreate).toHaveBeenCalledWith({
        data: { userId, personaId },
      });
      const authService = require("../../../src/services/authService");
      expect(authService.createAuditEvent).toHaveBeenCalledWith(
        userId,
        "PERSONA_FAVOURITED",
        { personaId, personaName: "Test Persona" }
      );
    });

    it("should remove persona from favourites", async () => {
      const personaId = "persona123";
      const userId = "user123";
      const mockPersona = {
        id: personaId,
        name: "Test Persona",
      };
      const mockExistingFavourite = {
        userId,
        personaId,
      };

      global.mockFindUnique
        .mockResolvedValueOnce(mockPersona) // Persona exists
        .mockResolvedValueOnce(mockExistingFavourite); // Existing favourite
      global.mockDelete.mockResolvedValue({});

      const result = await personaService.toggleFavourite(personaId, userId);

      expect(result.isFavourited).toBe(false);
      expect(global.mockDelete).toHaveBeenCalledWith({
        where: {
          userId_personaId: {
            userId,
            personaId,
          },
        },
      });
      const authService = require("../../../src/services/authService");
      expect(authService.createAuditEvent).toHaveBeenCalledWith(
        userId,
        "PERSONA_UNFAVOURITED",
        { personaId, personaName: "Test Persona" }
      );
    });

    it("should throw error for missing parameters", async () => {
      await expect(
        personaService.toggleFavourite(null, "user123")
      ).rejects.toThrow("Valid personaId is required");

      await expect(
        personaService.toggleFavourite("persona123", null)
      ).rejects.toThrow("Valid userId is required");
    });

    it("should throw error for non-existent persona", async () => {
      global.mockFindUnique.mockResolvedValue(null);

      await expect(
        personaService.toggleFavourite("non-existent", "user123")
      ).rejects.toThrow("Persona not found");
    });

    it("should handle database errors", async () => {
      global.mockFindUnique.mockRejectedValue(new Error("Database error"));

      await expect(
        personaService.toggleFavourite("persona123", "user123")
      ).rejects.toThrow("Failed to toggle favourite");
    });
  });

  describe("sendMessage", () => {
    it("should send message to persona webhook and create new conversation", async () => {
      const personaId = "persona123";
      const message = "Hello!";
      const userId = "user123";

      const mockPersona = {
        id: personaId,
        name: "Test Persona",
        isActive: true,
        webhookUrl: "encrypted:https://test.com/webhook",
      };

      const mockChatSession = {
        id: "session123",
        sessionId: "sess-123",
      };

      // Set up mocks in the correct order
      global.mockFindUnique.mockResolvedValueOnce(mockPersona); // Find persona
      global.mockCreate
        .mockResolvedValueOnce({ id: "conv1" }) // Conversation creation
        .mockResolvedValueOnce({ id: "msg1" }) // User message creation
        .mockResolvedValueOnce({ id: "msg2" }); // Assistant message creation

      // Reset circuit breaker to ensure it's not open
      mockCircuitBreaker.isOpen.mockReturnValue(false);

      const chatSessionService = require("../../../src/services/chatSessionService");
      chatSessionService.createChatSession.mockResolvedValue(mockChatSession);

      const axios = require("axios");
      axios.post.mockResolvedValue({ data: { reply: "Hello back!" } });

      const authService = require("../../../src/services/authService");
      authService.createAuditEvent.mockResolvedValue(undefined);

      const result = await personaService.sendMessage(
        personaId,
        message,
        null,
        userId
      );

      expect(result).toBeDefined();
      expect(result.reply).toBe("Hello back!");
      expect(result.conversationId).toBe("conv1");
      expect(result.messageId).toBe("msg2");
      expect(result.sessionId).toBe("sess-123");
      const { decrypt } = require("../../../src/utils/encrypt");
      expect(decrypt).toHaveBeenCalledWith(
        "encrypted:https://test.com/webhook",
        "test-encryption-key"
      );
      expect(axios.post).toHaveBeenCalledWith(
        "https://test.com/webhook",
        {
          message,
          conversationId: "conv1",
          personaId,
          userId,
          sessionId: "sess-123",
        },
        expect.any(Object)
      );
    });

    it("should use existing conversation when conversationId provided", async () => {
      const personaId = "persona123";
      const message = "Hello again!";
      const conversationId = "conv1";
      const userId = "user123";

      const mockPersona = {
        id: personaId,
        name: "Test Persona",
        isActive: true,
        webhookUrl: "encrypted:https://test.com/webhook",
      };

      const mockConversation = {
        id: conversationId,
        userId,
        personaId,
        isActive: true,
      };

      const mockChatSession = {
        id: "session123",
        sessionId: "sess-123",
      };

      global.mockFindUnique.mockResolvedValueOnce(mockPersona); // Find persona
      global.mockFindFirst.mockResolvedValueOnce(mockConversation); // Find conversation
      global.mockCreate
        .mockResolvedValueOnce({ id: "msg1" }) // User message creation
        .mockResolvedValueOnce({ id: "msg2" }); // Assistant message creation

      // Reset circuit breaker to ensure it's not open
      mockCircuitBreaker.isOpen.mockReturnValue(false);

      const chatSessionService = require("../../../src/services/chatSessionService");
      chatSessionService.createChatSession.mockResolvedValue(mockChatSession);

      const axios = require("axios");
      axios.post.mockResolvedValue({ data: { reply: "Hello again!" } });

      const result = await personaService.sendMessage(
        personaId,
        message,
        conversationId,
        userId
      );

      expect(result.conversationId).toBe(conversationId);
      expect(global.mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: conversationId,
          userId,
          personaId,
          isActive: true,
        },
      });
    });

    it("should handle file attachment", async () => {
      const personaId = "persona123";
      const message = "Check this file";
      const userId = "user123";
      const fileId = "file123";

      const mockPersona = {
        id: personaId,
        name: "Test Persona",
        isActive: true,
        webhookUrl: "encrypted:https://test.com/webhook",
      };

      const mockFile = {
        id: fileId,
        filename: "test.pdf",
        uploadedAt: new Date(),
      };

      const mockChatSession = {
        id: "session123",
        sessionId: "sess-123",
      };

      global.mockFindUnique.mockResolvedValueOnce(mockPersona); // Find persona
      global.mockFindFirst.mockResolvedValueOnce(mockFile); // Find file
      global.mockCreate
        .mockResolvedValueOnce({ id: "conv1" }) // Conversation creation
        .mockResolvedValueOnce({ id: "msg1" }) // User message creation
        .mockResolvedValueOnce({ id: "msg2" }); // Assistant message creation

      // Reset circuit breaker to ensure it's not open
      mockCircuitBreaker.isOpen.mockReturnValue(false);

      const chatSessionService = require("../../../src/services/chatSessionService");
      chatSessionService.createChatSession.mockResolvedValue(mockChatSession);

      const axios = require("axios");
      axios.post.mockResolvedValue({ data: { reply: "File received!" } });

      const result = await personaService.sendMessage(
        personaId,
        message,
        null,
        userId,
        fileId
      );

      expect(result.reply).toBe("File received!");
      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          conversationId: "conv1",
          personaId,
          userId,
          content: message,
          fileId,
          role: "USER",
          chatSessionId: "session123",
        },
      });
    });

    it("should throw error for missing parameters", async () => {
      await expect(
        personaService.sendMessage(null, "Hello", null, "user123")
      ).rejects.toThrow("Valid personaId is required");

      await expect(
        personaService.sendMessage("persona123", null, null, "user123")
      ).rejects.toThrow("Valid message is required");

      await expect(
        personaService.sendMessage("persona123", "Hello", null, null)
      ).rejects.toThrow("Valid userId is required");
    });

    it("should throw error for non-existent persona", async () => {
      global.mockFindUnique.mockResolvedValue(null);

      await expect(
        personaService.sendMessage("non-existent", "Hello", null, "user123")
      ).rejects.toThrow("Persona not found");
    });

    it("should throw error for inactive persona", async () => {
      const mockPersona = {
        id: "persona123",
        name: "Test Persona",
        isActive: false,
      };
      global.mockFindUnique.mockResolvedValue(mockPersona);

      await expect(
        personaService.sendMessage("persona123", "Hello", null, "user123")
      ).rejects.toThrow("Persona is not active");
    });

    it("should throw error when circuit breaker is open", async () => {
      const mockPersona = {
        id: "persona123",
        name: "Test Persona",
        isActive: true,
      };
      global.mockFindUnique.mockResolvedValueOnce(mockPersona); // Find persona
      mockCircuitBreaker.isOpen.mockReturnValue(true);

      await expect(
        personaService.sendMessage("persona123", "Hello", null, "user123")
      ).rejects.toThrow("Persona is temporarily unavailable");
    });

    it("should throw error for non-existent conversation", async () => {
      const mockPersona = {
        id: "persona123",
        name: "Test Persona",
        isActive: true,
      };
      global.mockFindUnique.mockResolvedValueOnce(mockPersona); // Find persona
      global.mockFindFirst.mockResolvedValueOnce(null); // Conversation not found

      // Reset circuit breaker to ensure it's not open
      mockCircuitBreaker.isOpen.mockReturnValue(false);

      await expect(
        personaService.sendMessage(
          "persona123",
          "Hello",
          "invalid-conv",
          "user123"
        )
      ).rejects.toThrow("Conversation not found");
    });

    it("should throw error for invalid file", async () => {
      const mockPersona = {
        id: "persona123",
        name: "Test Persona",
        isActive: true,
      };
      global.mockFindUnique.mockResolvedValueOnce(mockPersona); // Find persona
      global.mockCreate.mockResolvedValueOnce({ id: "conv1" }); // Conversation creation
      global.mockFindFirst.mockResolvedValueOnce(null); // File not found

      // Reset circuit breaker to ensure it's not open
      mockCircuitBreaker.isOpen.mockReturnValue(false);

      await expect(
        personaService.sendMessage(
          "persona123",
          "Hello",
          null,
          "user123",
          "invalid-file"
        )
      ).rejects.toThrow("Invalid file ID or file not uploaded");
    });

    it("should handle webhook failures with circuit breaker", async () => {
      const mockPersona = {
        id: "persona123",
        name: "Test Persona",
        isActive: true,
        webhookUrl: "encrypted:https://test.com/webhook",
      };

      const mockChatSession = {
        id: "session123",
        sessionId: "sess-123",
      };

      global.mockFindUnique.mockResolvedValueOnce(mockPersona); // Find persona
      global.mockCreate
        .mockResolvedValueOnce({ id: "conv1" }) // Conversation creation
        .mockResolvedValueOnce({ id: "msg1" }); // User message creation

      // Reset circuit breaker to ensure it's not open
      mockCircuitBreaker.isOpen.mockReturnValue(false);

      const chatSessionService = require("../../../src/services/chatSessionService");
      chatSessionService.createChatSession.mockResolvedValue(mockChatSession);

      const axios = require("axios");
      axios.post.mockRejectedValue(new Error("Webhook failed"));

      await expect(
        personaService.sendMessage("persona123", "Hello", null, "user123")
      ).rejects.toThrow("Failed to get response from persona");

      expect(mockCircuitBreaker.onFailure).toHaveBeenCalled();
      const authService = require("../../../src/services/authService");
      expect(authService.createAuditEvent).toHaveBeenCalledWith(
        "user123",
        "WEBHOOK_FAILED",
        expect.objectContaining({
          personaId: "persona123",
          conversationId: "conv1",
          sessionId: "sess-123",
          message: "Hello",
        })
      );
    });

    it("should handle webhook retry logic", async () => {
      const mockPersona = {
        id: "persona123",
        name: "Test Persona",
        isActive: true,
        webhookUrl: "encrypted:https://test.com/webhook",
      };

      const mockChatSession = {
        id: "session123",
        sessionId: "sess-123",
      };

      global.mockFindUnique.mockResolvedValueOnce(mockPersona); // Find persona
      global.mockCreate
        .mockResolvedValueOnce({ id: "conv1" }) // Conversation creation
        .mockResolvedValueOnce({ id: "msg1" }) // User message creation
        .mockResolvedValueOnce({ id: "msg2" }); // Assistant message creation

      // Reset circuit breaker to ensure it's not open
      mockCircuitBreaker.isOpen.mockReturnValue(false);

      const chatSessionService = require("../../../src/services/chatSessionService");
      chatSessionService.createChatSession.mockResolvedValue(mockChatSession);

      const axios = require("axios");
      axios.post
        .mockRejectedValueOnce(new Error("First attempt failed"))
        .mockRejectedValueOnce(new Error("Second attempt failed"))
        .mockResolvedValueOnce({ data: { reply: "Success on retry!" } });

      const result = await personaService.sendMessage(
        "persona123",
        "Hello",
        null,
        "user123"
      );

      expect(result.reply).toBe("Success on retry!");
      expect(axios.post).toHaveBeenCalledTimes(3);
      expect(mockCircuitBreaker.onSuccess).toHaveBeenCalled();
    });

    it("should handle different webhook response formats", async () => {
      const mockPersona = {
        id: "persona123",
        name: "Test Persona",
        isActive: true,
        webhookUrl: "encrypted:https://test.com/webhook",
      };

      const mockChatSession = {
        id: "session123",
        sessionId: "sess-123",
      };

      // Reset circuit breaker to ensure it's not open
      mockCircuitBreaker.isOpen.mockReturnValue(false);

      const chatSessionService = require("../../../src/services/chatSessionService");
      chatSessionService.createChatSession.mockResolvedValue(mockChatSession);

      const axios = require("axios");

      // Test different response formats
      const testCases = [
        { data: { reply: "From reply field" }, expected: "From reply field" },
        {
          data: { message: "From message field" },
          expected: "From message field",
        },
        {
          data: { response: "From response field" },
          expected: "From response field",
        },
        {
          data: { output: "From output field" },
          expected: "From output field",
        },
        { data: { data: "From data field" }, expected: "From data field" },
        { data: "Direct string response", expected: "Direct string response" },
        { data: {} }, // No valid field, should get default
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];

        // Set up fresh mocks for each iteration
        global.mockFindUnique.mockResolvedValueOnce(mockPersona); // Find persona
        global.mockCreate
          .mockResolvedValueOnce({ id: `conv${i}` }) // Conversation creation
          .mockResolvedValueOnce({ id: `msg1_${i}` }) // User message creation
          .mockResolvedValueOnce({ id: `msg2_${i}` }); // Assistant message creation

        axios.post.mockResolvedValueOnce(testCase);

        const result = await personaService.sendMessage(
          "persona123",
          `Hello ${i}`,
          null,
          "user123"
        );

        if (testCase.expected) {
          expect(result.reply).toBe(testCase.expected);
        } else {
          expect(result.reply).toBe("No response received");
        }
      }
    });
  });

  describe("getConversations", () => {
    it("should return conversations for user", async () => {
      const userId = "user123";
      const workspaceId = "workspace123";
      const mockConversations = [
        {
          id: "conv1",
          title: "Chat with AI Assistant",
          visibility: "PRIVATE",
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          persona: {
            id: "persona1",
            name: "AI Assistant",
            avatarUrl: "https://test.com/avatar.jpg",
          },
          user: {
            id: userId,
            name: "Test User",
            email: "test@example.com",
          },
          messages: [
            {
              content: "Hello, how can I help?",
            },
          ],
          _count: {
            messages: 5,
          },
        },
      ];

      global.mockFindMany.mockResolvedValue(mockConversations);

      const conversations = await personaService.getConversations(
        userId,
        workspaceId
      );

      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe("conv1");
      expect(conversations[0].title).toBe("Chat with AI Assistant");
      expect(conversations[0].persona.name).toBe("AI Assistant");
      expect(conversations[0].owner.name).toBe("Test User");
      expect(conversations[0].lastMessage).toBe("Hello, how can I help?");
      expect(conversations[0].messageCount).toBe(5);
    });

    it("should filter archived conversations", async () => {
      const userId = "user123";
      const workspaceId = "workspace123";

      global.mockFindMany.mockResolvedValue([]);

      await personaService.getConversations(userId, workspaceId, {
        archived: true,
      });

      expect(global.mockFindMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          archivedAt: { not: null },
        }),
        include: expect.any(Object),
        orderBy: { updatedAt: "desc" },
      });
    });

    it("should throw error for missing parameters", async () => {
      await expect(
        personaService.getConversations(null, "workspace123")
      ).rejects.toThrow("Valid userId is required");

      await expect(
        personaService.getConversations("user123", null)
      ).rejects.toThrow("Valid workspaceId is required");
    });

    it("should handle database errors", async () => {
      global.mockFindMany.mockRejectedValue(new Error("Database error"));

      await expect(
        personaService.getConversations("user123", "workspace123")
      ).rejects.toThrow("Failed to fetch conversations");
    });

    it("should handle conversations without messages", async () => {
      const userId = "user123";
      const workspaceId = "workspace123";
      const mockConversations = [
        {
          id: "conv1",
          title: "Empty Chat",
          visibility: "PRIVATE",
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          persona: {
            id: "persona1",
            name: "AI Assistant",
            avatarUrl: "https://test.com/avatar.jpg",
          },
          user: {
            id: userId,
            name: "Test User",
            email: "test@example.com",
          },
          messages: [], // No messages
          _count: {
            messages: 0,
          },
        },
      ];

      global.mockFindMany.mockResolvedValue(mockConversations);

      const conversations = await personaService.getConversations(
        userId,
        workspaceId
      );

      expect(conversations[0].lastMessage).toBe(null);
      expect(conversations[0].messageCount).toBe(0);
    });
  });
});
