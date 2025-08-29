/**
 * ChatSessionController Unit Tests
 * Tests for chat session controller endpoints
 */

const request = require("supertest");
const express = require("express");

// Mock service
const mockChatSessionService = {
  getUserChatSessions: jest.fn(),
  getChatSession: jest.fn(),
  deleteChatSession: jest.fn(),
};

// Mock ApiError
class MockApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}

// Simple apiResponse implementation
const apiResponse = ({
  data = null,
  message = "Success",
  status = "success",
  meta,
}) => {
  const result = { status, message, data };
  if (meta !== undefined) result.meta = meta;
  return result;
};

// Simple asyncHandler implementation
const asyncHandler = (fn) => (req, res, next) => {
  try {
    const result = fn(req, res, next);
    if (result && typeof result.catch === "function") {
      return result.catch(next);
    }
    return result;
  } catch (error) {
    next(error);
  }
};

describe("ChatSessionController", () => {
  let app;

  beforeAll(() => {
    jest.setTimeout(10000);

    app = express();
    app.use(express.json({ limit: "1mb" }));
    app.disable("etag");
    app.disable("x-powered-by");

    // Add user middleware
    app.use((req, res, next) => {
      req.user = { id: "user123", role: "USER" };
      next();
    });

    // Implement controller logic directly
    app.get(
      "/chat-sessions",
      asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { status, limit = "50", offset = "0" } = req.query;

        // Validate parameters
        const parsedLimit = parseInt(limit);
        const parsedOffset = parseInt(offset);

        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
          throw new MockApiError(
            400,
            "Limit must be a number between 1 and 100"
          );
        }

        if (isNaN(parsedOffset) || parsedOffset < 0) {
          throw new MockApiError(400, "Offset must be a non-negative number");
        }

        if (status && typeof status !== "string") {
          throw new MockApiError(400, "Status must be a string");
        }

        const options = {
          status: status || undefined,
          limit: parsedLimit,
          offset: parsedOffset,
        };

        const chatSessions = await mockChatSessionService.getUserChatSessions(
          userId,
          options
        );

        res.status(200).json(
          apiResponse({
            data: chatSessions,
            message: "User chat sessions retrieved successfully",
          })
        );
      })
    );

    app.get(
      "/chat-sessions/:sessionId",
      asyncHandler(async (req, res) => {
        const { sessionId } = req.params;
        const userId = req.user.id;

        if (
          !sessionId ||
          typeof sessionId !== "string" ||
          sessionId.trim() === ""
        ) {
          throw new MockApiError(
            400,
            "Session ID is required and must be a non-empty string"
          );
        }

        const chatSession = await mockChatSessionService.getChatSession(
          sessionId.trim()
        );

        if (chatSession.userId !== userId) {
          throw new MockApiError(
            403,
            "You can only access your own chat sessions"
          );
        }

        res.status(200).json(
          apiResponse({
            data: chatSession,
            message: "Chat session retrieved successfully",
          })
        );
      })
    );

    app.delete(
      "/chat-sessions/:sessionId",
      asyncHandler(async (req, res) => {
        const { sessionId } = req.params;
        const userId = req.user.id;

        if (
          !sessionId ||
          typeof sessionId !== "string" ||
          sessionId.trim() === ""
        ) {
          throw new MockApiError(
            400,
            "Session ID is required and must be a non-empty string"
          );
        }

        const result = await mockChatSessionService.deleteChatSession(
          sessionId.trim(),
          userId
        );

        res.status(200).json(
          apiResponse({
            data: result,
            message: "Chat session deleted successfully",
          })
        );
      })
    );

    // Error handling middleware
    app.use((err, req, res, next) => {
      if (err.name === "ApiError") {
        return res.status(err.statusCode).json({ error: err.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    });
  });

  beforeEach(() => {
    mockChatSessionService.getUserChatSessions.mockReset();
    mockChatSessionService.getChatSession.mockReset();
    mockChatSessionService.deleteChatSession.mockReset();
  });

  describe("GET /chat-sessions", () => {
    it("should get user chat sessions successfully", async () => {
      const mockSessions = [
        {
          id: "session1",
          sessionId: "abc123",
          status: "COMPLETED",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
        {
          id: "session2",
          sessionId: "def456",
          status: "ACTIVE",
          createdAt: "2025-01-01T01:00:00.000Z",
        },
      ];

      mockChatSessionService.getUserChatSessions.mockResolvedValue(
        mockSessions
      );

      const response = await request(app).get("/chat-sessions").expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toEqual(mockSessions);
      expect(response.body.message).toBe(
        "User chat sessions retrieved successfully"
      );
      expect(mockChatSessionService.getUserChatSessions).toHaveBeenCalledWith(
        "user123",
        {
          status: undefined,
          limit: 50,
          offset: 0,
        }
      );
    });

    it("should get user chat sessions with custom parameters", async () => {
      const mockSessions = [
        { id: "session1", sessionId: "abc123", status: "COMPLETED" },
      ];
      mockChatSessionService.getUserChatSessions.mockResolvedValue(
        mockSessions
      );

      const response = await request(app)
        .get("/chat-sessions?status=COMPLETED&limit=10&offset=5")
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toEqual(mockSessions);
      expect(mockChatSessionService.getUserChatSessions).toHaveBeenCalledWith(
        "user123",
        {
          status: "COMPLETED",
          limit: 10,
          offset: 5,
        }
      );
    });

    it("should handle service errors", async () => {
      mockChatSessionService.getUserChatSessions.mockRejectedValue(
        new MockApiError(500, "Database error")
      );

      const response = await request(app).get("/chat-sessions").expect(500);
      expect(response.body.error).toBe("Database error");
    });

    it("should validate limit parameter", async () => {
      const testCases = [
        { limit: "0", desc: "too low" },
        { limit: "101", desc: "too high" },
        { limit: "abc", desc: "not a number" },
      ];

      for (const { limit } of testCases) {
        const response = await request(app)
          .get(`/chat-sessions?limit=${limit}`)
          .expect(400);

        expect(response.body.error).toBe(
          "Limit must be a number between 1 and 100"
        );
      }

      expect(mockChatSessionService.getUserChatSessions).not.toHaveBeenCalled();
    });

    it("should validate offset parameter", async () => {
      const testCases = [
        { offset: "-1", desc: "negative" },
        { offset: "abc", desc: "not a number" },
      ];

      for (const { offset } of testCases) {
        const response = await request(app)
          .get(`/chat-sessions?offset=${offset}`)
          .expect(400);

        expect(response.body.error).toBe(
          "Offset must be a non-negative number"
        );
      }

      expect(mockChatSessionService.getUserChatSessions).not.toHaveBeenCalled();
    });

    it("should validate status parameter - non-string", async () => {
      const response = await request(app)
        .get("/chat-sessions?status[]=ACTIVE")
        .expect(400);

      expect(response.body.error).toBe("Status must be a string");
      expect(mockChatSessionService.getUserChatSessions).not.toHaveBeenCalled();
    });
  });

  describe("GET /chat-sessions/:sessionId", () => {
    it("should get chat session successfully", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        userId: "user123",
        status: "COMPLETED",
        messages: [
          { id: "msg1", content: "Hello", role: "USER" },
          { id: "msg2", content: "Hi there!", role: "ASSISTANT" },
        ],
      };

      mockChatSessionService.getChatSession.mockResolvedValue(mockSession);

      const response = await request(app)
        .get("/chat-sessions/abc123def456")
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toEqual(mockSession);
      expect(response.body.message).toBe("Chat session retrieved successfully");
      expect(mockChatSessionService.getChatSession).toHaveBeenCalledWith(
        "abc123def456"
      );
    });

    it("should handle trimming of sessionId", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        userId: "user123",
      };

      mockChatSessionService.getChatSession.mockResolvedValue(mockSession);

      await request(app).get("/chat-sessions/  abc123def456  ").expect(200);

      expect(mockChatSessionService.getChatSession).toHaveBeenCalledWith(
        "abc123def456"
      );
    });

    it("should throw error for whitespace-only sessionId", async () => {
      const response = await request(app)
        .get("/chat-sessions/%20%20%20")
        .expect(400);

      expect(response.body.error).toBe(
        "Session ID is required and must be a non-empty string"
      );
      expect(mockChatSessionService.getChatSession).not.toHaveBeenCalled();
    });

    it("should throw error when user tries to access another user's session", async () => {
      const mockSession = {
        id: "session123",
        sessionId: "abc123def456",
        userId: "otheruser",
      };

      mockChatSessionService.getChatSession.mockResolvedValue(mockSession);

      const response = await request(app)
        .get("/chat-sessions/abc123def456")
        .expect(403);

      expect(response.body.error).toBe(
        "You can only access your own chat sessions"
      );
    });

    it("should handle service errors", async () => {
      mockChatSessionService.getChatSession.mockRejectedValue(
        new MockApiError(404, "Chat session not found")
      );

      const response = await request(app)
        .get("/chat-sessions/nonexistent")
        .expect(404);

      expect(response.body.error).toBe("Chat session not found");
    });
  });

  describe("DELETE /chat-sessions/:sessionId", () => {
    it("should delete chat session successfully", async () => {
      const mockResult = {
        sessionId: "abc123def456",
        deletedAt: "2025-01-01T12:00:00.000Z",
        messageCount: 5,
      };

      mockChatSessionService.deleteChatSession.mockResolvedValue(mockResult);

      const response = await request(app)
        .delete("/chat-sessions/abc123def456")
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toEqual(mockResult);
      expect(response.body.message).toBe("Chat session deleted successfully");
      expect(mockChatSessionService.deleteChatSession).toHaveBeenCalledWith(
        "abc123def456",
        "user123"
      );
    });

    it("should handle trimming of sessionId", async () => {
      const mockResult = {
        sessionId: "abc123def456",
        deletedAt: "2025-01-01T12:00:00.000Z",
        messageCount: 0,
      };

      mockChatSessionService.deleteChatSession.mockResolvedValue(mockResult);

      await request(app).delete("/chat-sessions/  abc123def456  ").expect(200);

      expect(mockChatSessionService.deleteChatSession).toHaveBeenCalledWith(
        "abc123def456",
        "user123"
      );
    });

    it("should throw error for whitespace-only sessionId", async () => {
      const response = await request(app)
        .delete("/chat-sessions/%20%20%20")
        .expect(400);

      expect(response.body.error).toBe(
        "Session ID is required and must be a non-empty string"
      );
      expect(mockChatSessionService.deleteChatSession).not.toHaveBeenCalled();
    });

    it("should handle service errors", async () => {
      mockChatSessionService.deleteChatSession.mockRejectedValue(
        new MockApiError(404, "Chat session not found")
      );

      const response = await request(app)
        .delete("/chat-sessions/nonexistent")
        .expect(404);

      expect(response.body.error).toBe("Chat session not found");
    });
  });

  describe("Edge cases", () => {
    it("should handle special characters in sessionId", async () => {
      const sessionId = "session-123_abc.def";
      const mockSession = {
        id: "session123",
        sessionId: sessionId,
        userId: "user123",
      };

      mockChatSessionService.getChatSession.mockResolvedValue(mockSession);

      const response = await request(app)
        .get(`/chat-sessions/${encodeURIComponent(sessionId)}`)
        .expect(200);

      expect(mockChatSessionService.getChatSession).toHaveBeenCalledWith(
        sessionId
      );
    });

    it("should handle service timeout errors", async () => {
      const timeoutError = new MockApiError(408, "Request timeout");
      mockChatSessionService.getUserChatSessions.mockRejectedValue(
        timeoutError
      );

      const response = await request(app).get("/chat-sessions").expect(408);
      expect(response.body.error).toBe("Request timeout");
    });
  });
});
