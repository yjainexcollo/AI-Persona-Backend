/**
 * ChatSessionService Unit Tests
 * Tests for chat session management functionality
 */

const chatSessionService = require("../../../src/services/chatSessionService");

describe("ChatSessionService", () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = global.mockPrisma;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createChatSession", () => {
    it("should create a new chat session", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        conversationId: "conv123",
        personaId: "persona123",
        userId: "user123",
        status: "ACTIVE",
        metadata: {
          userAgent: "test-agent",
          ipAddress: "127.0.0.1",
        },
      };

      mockPrisma.chatSession.create.mockResolvedValue(mockSession);

      const result = await chatSessionService.createChatSession(
        "conv123",
        "persona123",
        "user123",
        { userAgent: "test-agent", ipAddress: "127.0.0.1" }
      );

      expect(result).toEqual(mockSession);
      expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
        data: {
          conversationId: "conv123",
          personaId: "persona123",
          userId: "user123",
          sessionId: expect.any(String),
          metadata: {
            userAgent: "test-agent",
            ipAddress: "127.0.0.1",
            deviceInfo: null,
          },
        },
        include: {
          conversation: true,
          persona: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it("should throw error for missing conversationId", async () => {
      await expect(
        chatSessionService.createChatSession(null, "persona123", "user123")
      ).rejects.toThrow("conversationId must be a non-empty string");
    });

    it("should throw error for empty conversationId", async () => {
      await expect(
        chatSessionService.createChatSession("", "persona123", "user123")
      ).rejects.toThrow("conversationId must be a non-empty string");
    });

    it("should throw error for non-string conversationId", async () => {
      await expect(
        chatSessionService.createChatSession(123, "persona123", "user123")
      ).rejects.toThrow("conversationId must be a non-empty string");
    });

    it("should throw error for whitespace-only conversationId", async () => {
      await expect(
        chatSessionService.createChatSession("   ", "persona123", "user123")
      ).rejects.toThrow("conversationId must be a non-empty string");
    });

    it("should throw error for missing personaId", async () => {
      await expect(
        chatSessionService.createChatSession("conv123", null, "user123")
      ).rejects.toThrow("personaId must be a non-empty string");
    });

    it("should throw error for empty personaId", async () => {
      await expect(
        chatSessionService.createChatSession("conv123", "", "user123")
      ).rejects.toThrow("personaId must be a non-empty string");
    });

    it("should throw error for non-string personaId", async () => {
      await expect(
        chatSessionService.createChatSession("conv123", 123, "user123")
      ).rejects.toThrow("personaId must be a non-empty string");
    });

    it("should throw error for missing userId", async () => {
      await expect(
        chatSessionService.createChatSession("conv123", "persona123", null)
      ).rejects.toThrow("userId must be a non-empty string");
    });

    it("should throw error for empty userId", async () => {
      await expect(
        chatSessionService.createChatSession("conv123", "persona123", "")
      ).rejects.toThrow("userId must be a non-empty string");
    });

    it("should throw error for non-string userId", async () => {
      await expect(
        chatSessionService.createChatSession("conv123", "persona123", 123)
      ).rejects.toThrow("userId must be a non-empty string");
    });

    it("should throw error for invalid metadata type", async () => {
      await expect(
        chatSessionService.createChatSession(
          "conv123",
          "persona123",
          "user123",
          "invalid"
        )
      ).rejects.toThrow("metadata must be an object");
    });

    it("should handle metadata as null", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        conversationId: "conv123",
        personaId: "persona123",
        userId: "user123",
        metadata: { deviceInfo: null },
      };

      mockPrisma.chatSession.create.mockResolvedValue(mockSession);

      const result = await chatSessionService.createChatSession(
        "conv123",
        "persona123",
        "user123",
        null
      );

      expect(result).toEqual(mockSession);
    });

    it("should sanitize input parameters", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        conversationId: "conv123",
        personaId: "persona123",
        userId: "user123",
      };

      mockPrisma.chatSession.create.mockResolvedValue(mockSession);

      await chatSessionService.createChatSession(
        "  conv123  ",
        "  persona123  ",
        "  user123  ",
        { test: "data" }
      );

      expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
        data: {
          conversationId: "conv123",
          personaId: "persona123",
          userId: "user123",
          sessionId: expect.any(String),
          metadata: {
            userAgent: undefined,
            ipAddress: undefined,
            deviceInfo: null,
            test: "data",
          },
        },
        include: expect.any(Object),
      });
    });

    it("should handle creation errors", async () => {
      mockPrisma.chatSession.create.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        chatSessionService.createChatSession("conv123", "persona123", "user123")
      ).rejects.toThrow("Failed to create chat session");
    });
  });

  describe("updateChatSessionStatus", () => {
    it("should update session status to completed", async () => {
      const mockUpdatedSession = {
        id: "session123",
        sessionId: "abc123def456",
        status: "COMPLETED",
        endedAt: new Date(),
      };

      mockPrisma.chatSession.update.mockResolvedValue(mockUpdatedSession);

      const result = await chatSessionService.updateChatSessionStatus(
        "abc123def456",
        "COMPLETED"
      );

      expect(result).toEqual(mockUpdatedSession);
      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { sessionId: "abc123def456" },
        data: {
          status: "COMPLETED",
          lastActivityAt: expect.any(Date),
          endedAt: expect.any(Date),
        },
        include: {
          conversation: true,
          persona: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it("should update session status with error message", async () => {
      const mockUpdatedSession = {
        id: "session123",
        sessionId: "abc123def456",
        status: "FAILED",
        errorMessage: "Webhook timeout",
      };

      mockPrisma.chatSession.update.mockResolvedValue(mockUpdatedSession);

      const result = await chatSessionService.updateChatSessionStatus(
        "abc123def456",
        "FAILED",
        "Webhook timeout"
      );

      expect(result).toEqual(mockUpdatedSession);
      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { sessionId: "abc123def456" },
        data: {
          status: "FAILED",
          lastActivityAt: expect.any(Date),
          endedAt: expect.any(Date),
          errorMessage: "Webhook timeout",
        },
        include: {
          conversation: true,
          persona: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it("should throw error for missing sessionId", async () => {
      await expect(
        chatSessionService.updateChatSessionStatus(null, "COMPLETED")
      ).rejects.toThrow("sessionId must be a non-empty string");
    });

    it("should throw error for empty sessionId", async () => {
      await expect(
        chatSessionService.updateChatSessionStatus("", "COMPLETED")
      ).rejects.toThrow("sessionId must be a non-empty string");
    });

    it("should throw error for non-string sessionId", async () => {
      await expect(
        chatSessionService.updateChatSessionStatus(123, "COMPLETED")
      ).rejects.toThrow("sessionId must be a non-empty string");
    });

    it("should throw error for missing status", async () => {
      await expect(
        chatSessionService.updateChatSessionStatus("abc123def456", null)
      ).rejects.toThrow("status must be a non-empty string");
    });

    it("should throw error for empty status", async () => {
      await expect(
        chatSessionService.updateChatSessionStatus("abc123def456", "")
      ).rejects.toThrow("status must be a non-empty string");
    });

    it("should throw error for non-string status", async () => {
      await expect(
        chatSessionService.updateChatSessionStatus("abc123def456", 123)
      ).rejects.toThrow("status must be a non-empty string");
    });

    it("should throw error for invalid errorMessage type", async () => {
      await expect(
        chatSessionService.updateChatSessionStatus(
          "abc123def456",
          "FAILED",
          123
        )
      ).rejects.toThrow("errorMessage must be a string or null");
    });

    it("should normalize status to uppercase", async () => {
      const mockUpdatedSession = {
        id: "session123",
        sessionId: "abc123def456",
        status: "COMPLETED",
        endedAt: new Date(),
      };

      mockPrisma.chatSession.update.mockResolvedValue(mockUpdatedSession);

      const result = await chatSessionService.updateChatSessionStatus(
        "abc123def456",
        "completed"
      );

      expect(result).toEqual(mockUpdatedSession);
      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { sessionId: "abc123def456" },
        data: {
          status: "COMPLETED",
          lastActivityAt: expect.any(Date),
          endedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it("should sanitize sessionId input", async () => {
      const mockUpdatedSession = {
        id: "session123",
        sessionId: "abc123def456",
        status: "COMPLETED",
      };

      mockPrisma.chatSession.update.mockResolvedValue(mockUpdatedSession);

      await chatSessionService.updateChatSessionStatus(
        "  abc123def456  ",
        "COMPLETED"
      );

      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { sessionId: "abc123def456" },
        data: expect.any(Object),
        include: expect.any(Object),
      });
    });

    it("should throw error for invalid status", async () => {
      await expect(
        chatSessionService.updateChatSessionStatus(
          "abc123def456",
          "INVALID_STATUS"
        )
      ).rejects.toThrow(
        "Invalid status. Must be one of: ACTIVE, COMPLETED, FAILED, TIMEOUT, CANCELLED"
      );
    });

    it("should handle CANCELLED status as terminal", async () => {
      const mockUpdatedSession = {
        id: "session123",
        sessionId: "abc123def456",
        status: "CANCELLED",
        endedAt: new Date(),
      };

      mockPrisma.chatSession.update.mockResolvedValue(mockUpdatedSession);

      const result = await chatSessionService.updateChatSessionStatus(
        "abc123def456",
        "CANCELLED"
      );

      expect(result).toEqual(mockUpdatedSession);
      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { sessionId: "abc123def456" },
        data: {
          status: "CANCELLED",
          lastActivityAt: expect.any(Date),
          endedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });
  });

  describe("getChatSession", () => {
    it("should return chat session by session ID", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        userId: "user123",
        messages: [
          { id: "msg1", content: "Hello", role: "USER" },
          { id: "msg2", content: "Hi there!", role: "ASSISTANT" },
        ],
      };

      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);

      const result = await chatSessionService.getChatSession("abc123def456");

      expect(result).toEqual(mockSession);
      expect(mockPrisma.chatSession.findUnique).toHaveBeenCalledWith({
        where: { sessionId: "abc123def456" },
        include: {
          conversation: true,
          persona: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              content: true,
              role: true,
              createdAt: true,
            },
          },
        },
      });
    });

    it("should throw error when session not found", async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      await expect(
        chatSessionService.getChatSession("nonexistent")
      ).rejects.toThrow("Chat session not found");
    });

    it("should throw error for missing sessionId", async () => {
      await expect(chatSessionService.getChatSession(null)).rejects.toThrow(
        "sessionId must be a non-empty string"
      );
    });

    it("should throw error for empty sessionId", async () => {
      await expect(chatSessionService.getChatSession("")).rejects.toThrow(
        "sessionId must be a non-empty string"
      );
    });

    it("should throw error for non-string sessionId", async () => {
      await expect(chatSessionService.getChatSession(123)).rejects.toThrow(
        "sessionId must be a non-empty string"
      );
    });

    it("should throw error for whitespace-only sessionId", async () => {
      await expect(chatSessionService.getChatSession("   ")).rejects.toThrow(
        "sessionId must be a non-empty string"
      );
    });

    it("should sanitize sessionId input", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        userId: "user123",
        messages: [],
      };

      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);

      await chatSessionService.getChatSession("  abc123def456  ");

      expect(mockPrisma.chatSession.findUnique).toHaveBeenCalledWith({
        where: { sessionId: "abc123def456" },
        include: expect.any(Object),
      });
    });
  });

  describe("getUserChatSessions", () => {
    it("should return user's chat sessions", async () => {
      const mockSessions = [
        {
          id: "session1",
          sessionId: "abc123",
          status: "COMPLETED",
        },
        {
          id: "session2",
          sessionId: "def456",
          status: "ACTIVE",
        },
      ];

      mockPrisma.chatSession.findMany.mockResolvedValue(mockSessions);

      const result = await chatSessionService.getUserChatSessions("user123", {
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual(mockSessions);
      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
        where: { userId: "user123" },
        include: {
          conversation: true,
          persona: true,
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              content: true,
              role: true,
              createdAt: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
        take: 10,
        skip: 0,
      });
    });

    it("should filter by status", async () => {
      const mockSessions = [
        {
          id: "session1",
          sessionId: "abc123",
          status: "COMPLETED",
        },
      ];

      mockPrisma.chatSession.findMany.mockResolvedValue(mockSessions);

      const result = await chatSessionService.getUserChatSessions("user123", {
        status: "COMPLETED",
      });

      expect(result).toEqual(mockSessions);
      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
        where: { userId: "user123", status: "COMPLETED" },
        include: expect.any(Object),
        orderBy: { startedAt: "desc" },
        take: 50,
        skip: 0,
      });
    });

    it("should throw error for missing userId", async () => {
      await expect(
        chatSessionService.getUserChatSessions(null)
      ).rejects.toThrow("userId must be a non-empty string");
    });

    it("should throw error for empty userId", async () => {
      await expect(chatSessionService.getUserChatSessions("")).rejects.toThrow(
        "userId must be a non-empty string"
      );
    });

    it("should throw error for non-string userId", async () => {
      await expect(chatSessionService.getUserChatSessions(123)).rejects.toThrow(
        "userId must be a non-empty string"
      );
    });

    it("should throw error for invalid options type", async () => {
      await expect(
        chatSessionService.getUserChatSessions("user123", "invalid")
      ).rejects.toThrow("options must be an object");
    });

    it("should throw error for invalid status", async () => {
      await expect(
        chatSessionService.getUserChatSessions("user123", { status: "INVALID" })
      ).rejects.toThrow(
        "Invalid status. Must be one of: ACTIVE, COMPLETED, FAILED, TIMEOUT, CANCELLED"
      );
    });

    it("should throw error for empty status", async () => {
      await expect(
        chatSessionService.getUserChatSessions("user123", { status: "" })
      ).rejects.toThrow("status must be a non-empty string");
    });

    it("should throw error for non-string status", async () => {
      await expect(
        chatSessionService.getUserChatSessions("user123", { status: 123 })
      ).rejects.toThrow("status must be a non-empty string");
    });

    it("should normalize status to uppercase", async () => {
      const mockSessions = [
        {
          id: "session1",
          sessionId: "abc123",
          status: "COMPLETED",
        },
      ];

      mockPrisma.chatSession.findMany.mockResolvedValue(mockSessions);

      const result = await chatSessionService.getUserChatSessions("user123", {
        status: "completed",
      });

      expect(result).toEqual(mockSessions);
      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
        where: { userId: "user123", status: "COMPLETED" },
        include: expect.any(Object),
        orderBy: { startedAt: "desc" },
        take: 50,
        skip: 0,
      });
    });

    it("should throw error for invalid limit", async () => {
      await expect(
        chatSessionService.getUserChatSessions("user123", { limit: 0 })
      ).rejects.toThrow("Limit must be an integer between 1 and 100");

      await expect(
        chatSessionService.getUserChatSessions("user123", { limit: 101 })
      ).rejects.toThrow("Limit must be an integer between 1 and 100");

      await expect(
        chatSessionService.getUserChatSessions("user123", { limit: 1.5 })
      ).rejects.toThrow("Limit must be an integer between 1 and 100");

      await expect(
        chatSessionService.getUserChatSessions("user123", { limit: "10" })
      ).rejects.toThrow("Limit must be an integer between 1 and 100");
    });

    it("should throw error for invalid offset", async () => {
      await expect(
        chatSessionService.getUserChatSessions("user123", { offset: -1 })
      ).rejects.toThrow("Offset must be a non-negative integer");

      await expect(
        chatSessionService.getUserChatSessions("user123", { offset: 1.5 })
      ).rejects.toThrow("Offset must be a non-negative integer");

      await expect(
        chatSessionService.getUserChatSessions("user123", { offset: "0" })
      ).rejects.toThrow("Offset must be a non-negative integer");
    });

    it("should sanitize userId input", async () => {
      mockPrisma.chatSession.findMany.mockResolvedValue([]);

      await chatSessionService.getUserChatSessions("  user123  ");

      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
        where: { userId: "user123" },
        include: expect.any(Object),
        orderBy: { startedAt: "desc" },
        take: 50,
        skip: 0,
      });
    });
  });

  describe("cleanupExpiredSessions", () => {
    it("should clean up expired sessions", async () => {
      mockPrisma.chatSession.updateMany.mockResolvedValue({ count: 5 });

      const result = await chatSessionService.cleanupExpiredSessions(24);

      expect(result).toBe(5);
      expect(mockPrisma.chatSession.updateMany).toHaveBeenCalledWith({
        where: {
          status: "ACTIVE",
          lastActivityAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: "TIMEOUT",
          endedAt: expect.any(Date),
          errorMessage: "Session timed out due to inactivity",
        },
      });
    });

    it("should throw error for invalid inactiveHours", async () => {
      await expect(
        chatSessionService.cleanupExpiredSessions(-1)
      ).rejects.toThrow("inactiveHours must be a positive number");

      await expect(
        chatSessionService.cleanupExpiredSessions(0)
      ).rejects.toThrow("inactiveHours must be a positive number");

      await expect(
        chatSessionService.cleanupExpiredSessions("24")
      ).rejects.toThrow("inactiveHours must be a positive number");

      await expect(
        chatSessionService.cleanupExpiredSessions(Infinity)
      ).rejects.toThrow("inactiveHours must be a positive number");

      await expect(
        chatSessionService.cleanupExpiredSessions(NaN)
      ).rejects.toThrow("inactiveHours must be a positive number");
    });

    it("should use default value for inactiveHours", async () => {
      mockPrisma.chatSession.updateMany.mockResolvedValue({ count: 3 });

      const result = await chatSessionService.cleanupExpiredSessions();

      expect(result).toBe(3);
      // Should use default 24 hours
      expect(mockPrisma.chatSession.updateMany).toHaveBeenCalled();
    });
  });

  describe("getChatSessionStats", () => {
    it("should return session statistics", async () => {
      const mockStats = [
        { status: "ACTIVE", _count: { id: 3 } },
        { status: "COMPLETED", _count: { id: 10 } },
        { status: "FAILED", _count: { id: 2 } },
      ];

      mockPrisma.chatSession.groupBy.mockResolvedValue(mockStats);
      mockPrisma.chatSession.count
        .mockResolvedValueOnce(15) // total
        .mockResolvedValueOnce(3); // active

      const result = await chatSessionService.getChatSessionStats("user123");

      expect(result).toEqual({
        total: 15,
        active: 3,
        byStatus: {
          ACTIVE: 3,
          COMPLETED: 10,
          FAILED: 2,
        },
      });
    });

    it("should throw error for missing userId", async () => {
      await expect(
        chatSessionService.getChatSessionStats(null)
      ).rejects.toThrow("userId must be a non-empty string");
    });

    it("should throw error for empty userId", async () => {
      await expect(chatSessionService.getChatSessionStats("")).rejects.toThrow(
        "userId must be a non-empty string"
      );
    });

    it("should throw error for non-string userId", async () => {
      await expect(chatSessionService.getChatSessionStats(123)).rejects.toThrow(
        "userId must be a non-empty string"
      );
    });

    it("should sanitize userId input", async () => {
      const mockStats = [];
      mockPrisma.chatSession.groupBy.mockResolvedValue(mockStats);
      mockPrisma.chatSession.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0); // active

      await chatSessionService.getChatSessionStats("  user123  ");

      expect(mockPrisma.chatSession.groupBy).toHaveBeenCalledWith({
        by: ["status"],
        where: { userId: "user123" },
        _count: { id: true },
      });
    });

    it("should handle empty statistics", async () => {
      mockPrisma.chatSession.groupBy.mockResolvedValue([]);
      mockPrisma.chatSession.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0); // active

      const result = await chatSessionService.getChatSessionStats("user123");

      expect(result).toEqual({
        total: 0,
        active: 0,
        byStatus: {},
      });
    });

    it("should handle database errors", async () => {
      mockPrisma.chatSession.groupBy.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        chatSessionService.getChatSessionStats("user123")
      ).rejects.toThrow("Failed to get chat session stats");
    });
  });

  describe("deleteChatSession", () => {
    it("should delete a chat session with messages", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        userId: "user123",
        messages: [
          { id: "msg1", content: "Hello" },
          { id: "msg2", content: "World" },
        ],
      };

      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.$transaction.mockImplementation((callback) =>
        callback(mockPrisma)
      );
      mockPrisma.message.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.chatSession.delete.mockResolvedValue(mockSession);

      const result = await chatSessionService.deleteChatSession(
        "abc123def456",
        "user123"
      );

      expect(result).toEqual({
        sessionId: "abc123def456",
        deletedAt: expect.any(Date),
        messageCount: 2,
      });

      expect(mockPrisma.chatSession.findUnique).toHaveBeenCalledWith({
        where: { sessionId: "abc123def456" },
        include: { messages: true },
      });

      expect(mockPrisma.message.deleteMany).toHaveBeenCalledWith({
        where: { chatSessionId: "session123" },
      });

      expect(mockPrisma.chatSession.delete).toHaveBeenCalledWith({
        where: { id: "session123" },
      });
    });

    it("should throw error for missing sessionId", async () => {
      await expect(
        chatSessionService.deleteChatSession(null, "user123")
      ).rejects.toThrow("sessionId must be a non-empty string");
    });

    it("should throw error for empty sessionId", async () => {
      await expect(
        chatSessionService.deleteChatSession("", "user123")
      ).rejects.toThrow("sessionId must be a non-empty string");
    });

    it("should throw error for non-string sessionId", async () => {
      await expect(
        chatSessionService.deleteChatSession(123, "user123")
      ).rejects.toThrow("sessionId must be a non-empty string");
    });

    it("should throw error for missing userId", async () => {
      await expect(
        chatSessionService.deleteChatSession("abc123def456", null)
      ).rejects.toThrow("userId must be a non-empty string");
    });

    it("should throw error for empty userId", async () => {
      await expect(
        chatSessionService.deleteChatSession("abc123def456", "")
      ).rejects.toThrow("userId must be a non-empty string");
    });

    it("should throw error for non-string userId", async () => {
      await expect(
        chatSessionService.deleteChatSession("abc123def456", 123)
      ).rejects.toThrow("userId must be a non-empty string");
    });

    it("should sanitize input parameters", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        userId: "user123",
        messages: [],
      };

      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.$transaction.mockImplementation((callback) =>
        callback(mockPrisma)
      );
      mockPrisma.message.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.chatSession.delete.mockResolvedValue(mockSession);

      await chatSessionService.deleteChatSession(
        "  abc123def456  ",
        "  user123  "
      );

      expect(mockPrisma.chatSession.findUnique).toHaveBeenCalledWith({
        where: { sessionId: "abc123def456" },
        include: { messages: true },
      });
    });

    it("should throw error when session not found", async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      await expect(
        chatSessionService.deleteChatSession("nonexistent", "user123")
      ).rejects.toThrow("Chat session not found");
    });

    it("should throw error when user doesn't own session", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        userId: "otheruser",
        messages: [],
      };

      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);

      await expect(
        chatSessionService.deleteChatSession("abc123def456", "user123")
      ).rejects.toThrow("You can only delete your own chat sessions");
    });

    it("should handle database errors during deletion", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        userId: "user123",
        messages: [],
      };

      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.$transaction.mockRejectedValue(new Error("Database error"));

      await expect(
        chatSessionService.deleteChatSession("abc123def456", "user123")
      ).rejects.toThrow("Failed to delete chat session");
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle createChatSession with empty metadata", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        conversationId: "conv123",
        personaId: "persona123",
        userId: "user123",
        metadata: { deviceInfo: null },
      };

      mockPrisma.chatSession.create.mockResolvedValue(mockSession);

      const result = await chatSessionService.createChatSession(
        "conv123",
        "persona123",
        "user123"
      );

      expect(result).toEqual(mockSession);
      expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
        data: {
          conversationId: "conv123",
          personaId: "persona123",
          userId: "user123",
          sessionId: expect.any(String),
          metadata: {
            userAgent: undefined,
            ipAddress: undefined,
            deviceInfo: null,
          },
        },
        include: expect.any(Object),
      });
    });

    it("should handle updateChatSessionStatus with ACTIVE status", async () => {
      const mockUpdatedSession = {
        id: "session123",
        sessionId: "abc123def456",
        status: "ACTIVE",
        lastActivityAt: new Date(),
      };

      mockPrisma.chatSession.update.mockResolvedValue(mockUpdatedSession);

      const result = await chatSessionService.updateChatSessionStatus(
        "abc123def456",
        "ACTIVE"
      );

      expect(result).toEqual(mockUpdatedSession);
      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { sessionId: "abc123def456" },
        data: {
          status: "ACTIVE",
          lastActivityAt: expect.any(Date),
          endedAt: undefined,
        },
        include: expect.any(Object),
      });
    });

    it("should handle updateChatSessionStatus database error", async () => {
      mockPrisma.chatSession.update.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        chatSessionService.updateChatSessionStatus("abc123def456", "COMPLETED")
      ).rejects.toThrow("Failed to update chat session status");
    });

    it("should handle getChatSession database error", async () => {
      mockPrisma.chatSession.findUnique.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        chatSessionService.getChatSession("abc123def456")
      ).rejects.toThrow("Failed to get chat session");
    });

    it("should handle getUserChatSessions database error", async () => {
      mockPrisma.chatSession.findMany.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        chatSessionService.getUserChatSessions("user123")
      ).rejects.toThrow("Failed to get user chat sessions");
    });

    it("should handle cleanupExpiredSessions database error", async () => {
      mockPrisma.chatSession.updateMany.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        chatSessionService.cleanupExpiredSessions(24)
      ).rejects.toThrow("Failed to cleanup expired chat sessions");
    });

    it("should generate unique session IDs", async () => {
      const mockSession = {
        id: "session123",
        sessionId: expect.any(String),
      };

      mockPrisma.chatSession.create.mockResolvedValue(mockSession);

      await chatSessionService.createChatSession(
        "conv123",
        "persona123",
        "user123"
      );

      const sessionIdCall =
        mockPrisma.chatSession.create.mock.calls[0][0].data.sessionId;
      expect(sessionIdCall).toMatch(/^[a-f0-9]{32}$/); // 32 hex chars
    });

    it("should use default values for getUserChatSessions options", async () => {
      mockPrisma.chatSession.findMany.mockResolvedValue([]);

      await chatSessionService.getUserChatSessions("user123");

      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
        where: { userId: "user123" },
        include: expect.any(Object),
        orderBy: { startedAt: "desc" },
        take: 50,
        skip: 0,
      });
    });

    it("should calculate correct cutoff time for cleanupExpiredSessions", async () => {
      const mockDate = new Date("2023-01-01T12:00:00Z");
      jest.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

      mockPrisma.chatSession.updateMany.mockResolvedValue({ count: 0 });

      await chatSessionService.cleanupExpiredSessions(2); // 2 hours

      const expectedCutoff = new Date(mockDate.getTime() - 2 * 60 * 60 * 1000);

      expect(mockPrisma.chatSession.updateMany).toHaveBeenCalledWith({
        where: {
          status: "ACTIVE",
          lastActivityAt: { lt: expectedCutoff },
        },
        data: {
          status: "TIMEOUT",
          endedAt: expect.any(Date),
          errorMessage: "Session timed out due to inactivity",
        },
      });

      Date.now.mockRestore();
    });
  });
});
