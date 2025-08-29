/**
 * WorkspaceController Unit Tests
 * Comprehensive tests for workspace management functionality
 */

// Mock dependencies
jest.mock("../../../src/services/workspaceService");
jest.mock("../../../src/utils/asyncHandler", () => {
  return (fn) => fn; // Return the function as-is for testing
});
jest.mock("../../../src/utils/apiError");
jest.mock("../../../src/utils/logger");

const mockWorkspaceService = require("../../../src/services/workspaceService");
const mockApiError = require("../../../src/utils/apiError");
const mockLogger = require("../../../src/utils/logger");

// Import the actual controller
const workspaceController = require("../../../src/controllers/workspaceController");

describe("WorkspaceController", () => {
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
        role: "ADMIN",
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
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("getWorkspace", () => {
    describe("Success scenarios", () => {
      it("should retrieve workspace successfully", async () => {
        const mockWorkspace = {
          id: "workspace123",
          name: "Test Workspace",
          domain: "test.com",
          timezone: "UTC",
          locale: "en",
          isActive: true,
          maxMembers: 1000,
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockWorkspaceService.getWorkspace.mockResolvedValue(mockWorkspace);
        mockReq.params = { id: "workspace123" };

        await workspaceController.getWorkspace(mockReq, mockRes);

        expect(mockWorkspaceService.getWorkspace).toHaveBeenCalledWith(
          "workspace123",
          "user123"
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          data: { workspace: mockWorkspace },
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Workspace retrieval requested",
          expect.objectContaining({
            userId: "user123",
            workspaceId: "workspace123",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Workspace retrieved successfully",
          expect.objectContaining({
            userId: "user123",
            workspaceId: "workspace123",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });
    });

    describe("Validation scenarios", () => {
      it("should handle missing workspace ID", async () => {
        mockReq.params = { id: "" };

        await expect(
          workspaceController.getWorkspace(mockReq, mockRes)
        ).rejects.toThrow("Invalid workspace ID");

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Workspace retrieval failed: invalid workspace ID",
          expect.objectContaining({
            userId: "user123",
            workspaceId: "",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });

      it("should handle undefined workspace ID", async () => {
        mockReq.params = { id: undefined };

        await expect(
          workspaceController.getWorkspace(mockReq, mockRes)
        ).rejects.toThrow("Invalid workspace ID");
      });

      it("should handle whitespace-only workspace ID", async () => {
        mockReq.params = { id: "   " };

        await expect(
          workspaceController.getWorkspace(mockReq, mockRes)
        ).rejects.toThrow("Invalid workspace ID");
      });
    });

    describe("Error scenarios", () => {
      it("should handle service errors", async () => {
        mockReq.params = { id: "workspace123" };
        const serviceError = new Error("Workspace not found");
        mockWorkspaceService.getWorkspace.mockRejectedValue(serviceError);

        await expect(
          workspaceController.getWorkspace(mockReq, mockRes)
        ).rejects.toThrow("Workspace not found");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Workspace retrieval failed",
          expect.objectContaining({
            userId: "user123",
            workspaceId: "workspace123",
            error: "Workspace not found",
            stack: serviceError.stack,
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });
    });
  });

  describe("updateWorkspace", () => {
    describe("Success scenarios", () => {
      it("should update workspace successfully", async () => {
        const mockUpdatedWorkspace = {
          id: "workspace123",
          name: "Updated Workspace",
          domain: "test.com",
          timezone: "America/New_York",
          locale: "es",
          isActive: true,
          maxMembers: 1000,
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockWorkspaceService.updateWorkspace.mockResolvedValue(
          mockUpdatedWorkspace
        );
        mockReq.params = { id: "workspace123" };
        mockReq.body = {
          name: "Updated Workspace",
          timezone: "America/New_York",
          locale: "es",
        };

        await workspaceController.updateWorkspace(mockReq, mockRes);

        expect(mockWorkspaceService.updateWorkspace).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          {
            name: "Updated Workspace",
            timezone: "America/New_York",
            locale: "es",
          }
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          message: "Workspace updated successfully",
          data: { workspace: mockUpdatedWorkspace },
        });
      });

      it("should handle partial updates", async () => {
        const mockUpdatedWorkspace = {
          id: "workspace123",
          name: "Partially Updated",
        };

        mockWorkspaceService.updateWorkspace.mockResolvedValue(
          mockUpdatedWorkspace
        );
        mockReq.params = { id: "workspace123" };
        mockReq.body = { name: "Partially Updated" };

        await workspaceController.updateWorkspace(mockReq, mockRes);

        expect(mockWorkspaceService.updateWorkspace).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          { name: "Partially Updated" }
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it("should trim input values", async () => {
        const mockUpdatedWorkspace = {
          id: "workspace123",
          name: "Trimmed Name",
        };
        mockWorkspaceService.updateWorkspace.mockResolvedValue(
          mockUpdatedWorkspace
        );

        mockReq.params = { id: "workspace123" };
        mockReq.body = {
          name: "  Trimmed Name  ",
          timezone: "  America/New_York  ",
        };

        await workspaceController.updateWorkspace(mockReq, mockRes);

        expect(mockWorkspaceService.updateWorkspace).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          {
            name: "Trimmed Name",
            timezone: "America/New_York",
          }
        );
      });
    });

    describe("Validation scenarios", () => {
      it("should handle missing workspace ID", async () => {
        mockReq.params = { id: "" };
        mockReq.body = { name: "Test" };

        await expect(
          workspaceController.updateWorkspace(mockReq, mockRes)
        ).rejects.toThrow("Invalid workspace ID");
      });

      it("should handle empty name", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.body = { name: "" };

        await expect(
          workspaceController.updateWorkspace(mockReq, mockRes)
        ).rejects.toThrow("Validation failed: Name must be a non-empty string");
      });

      it("should handle name too long", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.body = { name: "a".repeat(101) };

        await expect(
          workspaceController.updateWorkspace(mockReq, mockRes)
        ).rejects.toThrow(
          "Validation failed: Name must be no more than 100 characters long"
        );
      });

      it("should handle invalid timezone", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.body = { timezone: "invalid-timezone" };

        await expect(
          workspaceController.updateWorkspace(mockReq, mockRes)
        ).rejects.toThrow(
          "Validation failed: Timezone must be in valid IANA format (e.g., 'America/New_York')"
        );
      });

      it("should handle invalid locale", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.body = { locale: "invalid-locale" };

        await expect(
          workspaceController.updateWorkspace(mockReq, mockRes)
        ).rejects.toThrow(
          "Validation failed: Locale must be in valid ISO format (e.g., 'en' or 'en-US')"
        );
      });

      it("should handle no fields provided", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.body = {};

        await expect(
          workspaceController.updateWorkspace(mockReq, mockRes)
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
          mockReq.params = { id: "workspace123" };
          mockReq.body = { timezone };
          mockWorkspaceService.updateWorkspace.mockResolvedValue({
            id: "workspace123",
            timezone,
          });

          await workspaceController.updateWorkspace(mockReq, mockRes);

          expect(mockWorkspaceService.updateWorkspace).toHaveBeenCalledWith(
            "workspace123",
            "user123",
            { timezone }
          );
        }
      });

      it("should accept valid locale formats", async () => {
        const validLocales = ["en", "es", "fr", "en-US", "es-MX", "fr-CA"];

        for (const locale of validLocales) {
          mockReq.params = { id: "workspace123" };
          mockReq.body = { locale };
          mockWorkspaceService.updateWorkspace.mockResolvedValue({
            id: "workspace123",
            locale,
          });

          await workspaceController.updateWorkspace(mockReq, mockRes);

          expect(mockWorkspaceService.updateWorkspace).toHaveBeenCalledWith(
            "workspace123",
            "user123",
            { locale }
          );
        }
      });
    });

    describe("Error scenarios", () => {
      it("should handle service errors", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.body = { name: "Test" };
        const serviceError = new Error("Database error");
        mockWorkspaceService.updateWorkspace.mockRejectedValue(serviceError);

        await expect(
          workspaceController.updateWorkspace(mockReq, mockRes)
        ).rejects.toThrow("Database error");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Workspace update failed",
          expect.objectContaining({
            userId: "user123",
            workspaceId: "workspace123",
            error: "Database error",
            stack: serviceError.stack,
          })
        );
      });
    });
  });

  describe("listMembers", () => {
    describe("Success scenarios", () => {
      it("should list workspace members successfully", async () => {
        const mockMembers = [
          {
            id: "user1",
            name: "John Doe",
            email: "john@example.com",
            role: "MEMBER",
            status: "ACTIVE",
            joinedAt: new Date(),
          },
          {
            id: "user2",
            name: "Jane Smith",
            email: "jane@example.com",
            role: "ADMIN",
            status: "ACTIVE",
            joinedAt: new Date(),
          },
        ];

        mockWorkspaceService.listMembers.mockResolvedValue({
          members: mockMembers,
          total: 2,
        });

        mockReq.params = { id: "workspace123" };
        mockReq.query = {};

        await workspaceController.listMembers(mockReq, mockRes);

        expect(mockWorkspaceService.listMembers).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          {
            search: undefined,
            status: undefined,
            role: undefined,
            page: 1,
            limit: 20,
          }
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          data: mockMembers,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
          },
        });
      });

      it("should support pagination", async () => {
        const mockMembers = {
          members: [],
          total: 15,
        };

        mockWorkspaceService.listMembers.mockResolvedValue(mockMembers);
        mockReq.params = { id: "workspace123" };
        mockReq.query = { page: "2", limit: "5" };

        await workspaceController.listMembers(mockReq, mockRes);

        expect(mockWorkspaceService.listMembers).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          {
            search: undefined,
            status: undefined,
            role: undefined,
            page: 2,
            limit: 5,
          }
        );
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          data: [],
          pagination: {
            page: 2,
            limit: 5,
            total: 15,
          },
        });
      });

      it("should support search and filters", async () => {
        const mockMembers = [
          {
            id: "user1",
            name: "John Doe",
            email: "john@example.com",
            role: "MEMBER",
            status: "ACTIVE",
            joinedAt: new Date(),
          },
        ];

        mockWorkspaceService.listMembers.mockResolvedValue({
          members: mockMembers,
          total: 1,
        });

        mockReq.params = { id: "workspace123" };
        mockReq.query = {
          search: "John",
          status: "active",
          role: "member",
        };

        await workspaceController.listMembers(mockReq, mockRes);

        expect(mockWorkspaceService.listMembers).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          {
            search: "John",
            status: "ACTIVE",
            role: "MEMBER",
            page: 1,
            limit: 20,
          }
        );
      });
    });

    describe("Validation scenarios", () => {
      it("should handle missing workspace ID", async () => {
        mockReq.params = { id: "" };
        mockReq.query = {};

        await expect(
          workspaceController.listMembers(mockReq, mockRes)
        ).rejects.toThrow("Invalid workspace ID");
      });

      it("should handle invalid pagination parameters", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.query = { page: "invalid", limit: "invalid" };

        await expect(
          workspaceController.listMembers(mockReq, mockRes)
        ).rejects.toThrow("Invalid pagination parameters");
      });

      it("should handle page too low", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.query = { page: "0", limit: "20" };

        await expect(
          workspaceController.listMembers(mockReq, mockRes)
        ).rejects.toThrow(
          "Pagination validation failed: Page must be at least 1"
        );
      });

      it("should handle limit too low", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.query = { page: "1", limit: "0" };

        await expect(
          workspaceController.listMembers(mockReq, mockRes)
        ).rejects.toThrow(
          "Pagination validation failed: Limit must be between 1 and 100"
        );
      });

      it("should handle limit too high", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.query = { page: "1", limit: "101" };

        await expect(
          workspaceController.listMembers(mockReq, mockRes)
        ).rejects.toThrow(
          "Pagination validation failed: Limit must be between 1 and 100"
        );
      });

      it("should handle invalid status", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.query = { status: "invalid-status" };

        await expect(
          workspaceController.listMembers(mockReq, mockRes)
        ).rejects.toThrow("Invalid status value");
      });

      it("should handle invalid role", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.query = { role: "invalid-role" };

        await expect(
          workspaceController.listMembers(mockReq, mockRes)
        ).rejects.toThrow("Invalid role value");
      });
    });

    describe("Error scenarios", () => {
      it("should handle service errors", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.query = {};
        const serviceError = new Error("Access denied");
        mockWorkspaceService.listMembers.mockRejectedValue(serviceError);

        await expect(
          workspaceController.listMembers(mockReq, mockRes)
        ).rejects.toThrow("Access denied");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Member listing failed",
          expect.objectContaining({
            userId: "user123",
            workspaceId: "workspace123",
            error: "Access denied",
            stack: serviceError.stack,
          })
        );
      });
    });
  });

  describe("changeRole", () => {
    describe("Success scenarios", () => {
      it("should change member role successfully", async () => {
        const mockUpdatedMember = {
          id: "member123",
          name: "John Doe",
          role: "ADMIN",
        };

        mockWorkspaceService.changeMemberRole.mockResolvedValue(
          mockUpdatedMember
        );
        mockReq.params = { id: "workspace123", uid: "member123" };
        mockReq.body = { role: "admin" };

        await workspaceController.changeRole(mockReq, mockRes);

        expect(mockWorkspaceService.changeMemberRole).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          "member123",
          "ADMIN"
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          message: "Member role updated successfully",
          data: { member: mockUpdatedMember },
        });
      });
    });

    describe("Validation scenarios", () => {
      it("should handle missing workspace ID", async () => {
        mockReq.params = { id: "", uid: "member123" };
        mockReq.body = { role: "admin" };

        await expect(
          workspaceController.changeRole(mockReq, mockRes)
        ).rejects.toThrow("Invalid workspace ID");
      });

      it("should handle missing member ID", async () => {
        mockReq.params = { id: "workspace123", uid: "" };
        mockReq.body = { role: "admin" };

        await expect(
          workspaceController.changeRole(mockReq, mockRes)
        ).rejects.toThrow("Invalid member ID");
      });

      it("should handle missing role", async () => {
        mockReq.params = { id: "workspace123", uid: "member123" };
        mockReq.body = {};

        await expect(
          workspaceController.changeRole(mockReq, mockRes)
        ).rejects.toThrow("Missing required fields: role");
      });

      it("should handle invalid role", async () => {
        mockReq.params = { id: "workspace123", uid: "member123" };
        mockReq.body = { role: "invalid-role" };

        await expect(
          workspaceController.changeRole(mockReq, mockRes)
        ).rejects.toThrow("Invalid role value");
      });

      it("should accept valid roles", async () => {
        const validRoles = ["member", "admin", "owner"];

        for (const role of validRoles) {
          mockReq.params = { id: "workspace123", uid: "member123" };
          mockReq.body = { role };
          mockWorkspaceService.changeMemberRole.mockResolvedValue({
            id: "member123",
            role: role.toUpperCase(),
          });

          await workspaceController.changeRole(mockReq, mockRes);

          expect(mockWorkspaceService.changeMemberRole).toHaveBeenCalledWith(
            "workspace123",
            "user123",
            "member123",
            role.toUpperCase()
          );
        }
      });
    });

    describe("Error scenarios", () => {
      it("should handle service errors", async () => {
        mockReq.params = { id: "workspace123", uid: "member123" };
        mockReq.body = { role: "admin" };
        const serviceError = new Error("Permission denied");
        mockWorkspaceService.changeMemberRole.mockRejectedValue(serviceError);

        await expect(
          workspaceController.changeRole(mockReq, mockRes)
        ).rejects.toThrow("Permission denied");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Member role change failed",
          expect.objectContaining({
            userId: "user123",
            workspaceId: "workspace123",
            memberId: "member123",
            error: "Permission denied",
            stack: serviceError.stack,
          })
        );
      });
    });
  });

  describe("changeStatus", () => {
    describe("Success scenarios", () => {
      it("should change member status successfully", async () => {
        const mockUpdatedMember = {
          id: "member123",
          name: "John Doe",
          status: "DEACTIVATED",
        };

        mockWorkspaceService.changeMemberStatus.mockResolvedValue(
          mockUpdatedMember
        );
        mockReq.params = { id: "workspace123", uid: "member123" };
        mockReq.body = { status: "deactivated" };

        await workspaceController.changeStatus(mockReq, mockRes);

        expect(mockWorkspaceService.changeMemberStatus).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          "member123",
          "DEACTIVATED"
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          message: "Member status updated successfully",
          data: { member: mockUpdatedMember },
        });
      });
    });

    describe("Validation scenarios", () => {
      it("should handle missing workspace ID", async () => {
        mockReq.params = { id: "", uid: "member123" };
        mockReq.body = { status: "deactivated" };

        await expect(
          workspaceController.changeStatus(mockReq, mockRes)
        ).rejects.toThrow("Invalid workspace ID");
      });

      it("should handle missing member ID", async () => {
        mockReq.params = { id: "workspace123", uid: "" };
        mockReq.body = { status: "deactivated" };

        await expect(
          workspaceController.changeStatus(mockReq, mockRes)
        ).rejects.toThrow("Invalid member ID");
      });

      it("should handle missing status", async () => {
        mockReq.params = { id: "workspace123", uid: "member123" };
        mockReq.body = {};

        await expect(
          workspaceController.changeStatus(mockReq, mockRes)
        ).rejects.toThrow("Missing required fields: status");
      });

      it("should handle invalid status", async () => {
        mockReq.params = { id: "workspace123", uid: "member123" };
        mockReq.body = { status: "invalid-status" };

        await expect(
          workspaceController.changeStatus(mockReq, mockRes)
        ).rejects.toThrow("Invalid status value");
      });

      it("should accept valid statuses", async () => {
        const validStatuses = ["active", "deactivated", "pending_verify"];

        for (const status of validStatuses) {
          mockReq.params = { id: "workspace123", uid: "member123" };
          mockReq.body = { status };
          mockWorkspaceService.changeMemberStatus.mockResolvedValue({
            id: "member123",
            status: status.toUpperCase(),
          });

          await workspaceController.changeStatus(mockReq, mockRes);

          expect(mockWorkspaceService.changeMemberStatus).toHaveBeenCalledWith(
            "workspace123",
            "user123",
            "member123",
            status.toUpperCase()
          );
        }
      });
    });

    describe("Error scenarios", () => {
      it("should handle service errors", async () => {
        mockReq.params = { id: "workspace123", uid: "member123" };
        mockReq.body = { status: "deactivated" };
        const serviceError = new Error("Permission denied");
        mockWorkspaceService.changeMemberStatus.mockRejectedValue(serviceError);

        await expect(
          workspaceController.changeStatus(mockReq, mockRes)
        ).rejects.toThrow("Permission denied");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Member status change failed",
          expect.objectContaining({
            userId: "user123",
            workspaceId: "workspace123",
            memberId: "member123",
            error: "Permission denied",
            stack: serviceError.stack,
          })
        );
      });
    });
  });

  describe("removeMember", () => {
    describe("Success scenarios", () => {
      it("should remove member successfully", async () => {
        mockWorkspaceService.removeMember.mockResolvedValue();
        mockReq.params = { id: "workspace123", uid: "member123" };

        await workspaceController.removeMember(mockReq, mockRes);

        expect(mockWorkspaceService.removeMember).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          "member123"
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          message: "Member removed successfully",
        });
      });
    });

    describe("Validation scenarios", () => {
      it("should handle missing workspace ID", async () => {
        mockReq.params = { id: "", uid: "member123" };

        await expect(
          workspaceController.removeMember(mockReq, mockRes)
        ).rejects.toThrow("Invalid workspace ID");
      });

      it("should handle missing member ID", async () => {
        mockReq.params = { id: "workspace123", uid: "" };

        await expect(
          workspaceController.removeMember(mockReq, mockRes)
        ).rejects.toThrow("Invalid member ID");
      });
    });

    describe("Error scenarios", () => {
      it("should handle service errors", async () => {
        mockReq.params = { id: "workspace123", uid: "member123" };
        const serviceError = new Error("Permission denied");
        mockWorkspaceService.removeMember.mockRejectedValue(serviceError);

        await expect(
          workspaceController.removeMember(mockReq, mockRes)
        ).rejects.toThrow("Permission denied");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Member removal failed",
          expect.objectContaining({
            userId: "user123",
            workspaceId: "workspace123",
            memberId: "member123",
            error: "Permission denied",
            stack: serviceError.stack,
          })
        );
      });
    });
  });

  describe("requestDeletion", () => {
    describe("Success scenarios", () => {
      it("should request workspace deletion successfully", async () => {
        mockWorkspaceService.requestDeletion.mockResolvedValue();
        mockReq.params = { id: "workspace123" };
        mockReq.body = { reason: "Company restructuring" };

        await workspaceController.requestDeletion(mockReq, mockRes);

        expect(mockWorkspaceService.requestDeletion).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          "Company restructuring"
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: "success",
          message: "Workspace deletion requested successfully",
        });
      });

      it("should handle deletion without reason", async () => {
        mockWorkspaceService.requestDeletion.mockResolvedValue();
        mockReq.params = { id: "workspace123" };
        mockReq.body = {};

        await workspaceController.requestDeletion(mockReq, mockRes);

        expect(mockWorkspaceService.requestDeletion).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          undefined
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it("should trim reason", async () => {
        mockWorkspaceService.requestDeletion.mockResolvedValue();
        mockReq.params = { id: "workspace123" };
        mockReq.body = { reason: "  Company restructuring  " };

        await workspaceController.requestDeletion(mockReq, mockRes);

        expect(mockWorkspaceService.requestDeletion).toHaveBeenCalledWith(
          "workspace123",
          "user123",
          "Company restructuring"
        );
      });
    });

    describe("Validation scenarios", () => {
      it("should handle missing workspace ID", async () => {
        mockReq.params = { id: "" };
        mockReq.body = { reason: "Test" };

        await expect(
          workspaceController.requestDeletion(mockReq, mockRes)
        ).rejects.toThrow("Invalid workspace ID");
      });

      it("should handle empty reason", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.body = { reason: "" };

        await expect(
          workspaceController.requestDeletion(mockReq, mockRes)
        ).rejects.toThrow("Reason must be a non-empty string");
      });

      it("should handle reason too long", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.body = { reason: "a".repeat(501) };

        await expect(
          workspaceController.requestDeletion(mockReq, mockRes)
        ).rejects.toThrow("Reason must be no more than 500 characters long");
      });
    });

    describe("Error scenarios", () => {
      it("should handle service errors", async () => {
        mockReq.params = { id: "workspace123" };
        mockReq.body = { reason: "Test" };
        const serviceError = new Error("Permission denied");
        mockWorkspaceService.requestDeletion.mockRejectedValue(serviceError);

        await expect(
          workspaceController.requestDeletion(mockReq, mockRes)
        ).rejects.toThrow("Permission denied");

        expect(mockLogger.error).toHaveBeenCalledWith(
          "Workspace deletion request failed",
          expect.objectContaining({
            userId: "user123",
            workspaceId: "workspace123",
            error: "Permission denied",
            stack: serviceError.stack,
          })
        );
      });
    });
  });

  describe("Helper Functions", () => {
    describe("getClientInfo", () => {
      it("should extract client information correctly", async () => {
        const result = workspaceController.getClientInfo(mockReq);

        expect(result).toEqual({
          ipAddress: "127.0.0.1",
          userAgent: "test-agent",
          traceId: "test-trace-123",
          requestId: "test-request-456",
        });
      });

      it("should handle missing headers gracefully", async () => {
        mockReq.ip = undefined;
        mockReq.connection = undefined;
        mockReq.headers = {};
        mockReq.get = jest.fn(() => null);

        const result = workspaceController.getClientInfo(mockReq);

        expect(result).toEqual({
          ipAddress: null,
          userAgent: null,
          traceId: null,
          requestId: null,
        });
      });
    });

    describe("validateRequiredFields", () => {
      it("should validate required fields correctly", async () => {
        const body = { field1: "value1", field2: "value2" };
        const requiredFields = ["field1", "field2"];

        const result = workspaceController.validateRequiredFields(
          body,
          requiredFields
        );

        expect(result.isValid).toBe(true);
        expect(result.missingFields).toEqual([]);
      });

      it("should detect missing required fields", async () => {
        const body = { field1: "value1" };
        const requiredFields = ["field1", "field2", "field3"];

        const result = workspaceController.validateRequiredFields(
          body,
          requiredFields
        );

        expect(result.isValid).toBe(false);
        expect(result.missingFields).toEqual(["field2", "field3"]);
      });

      it("should handle falsy values as missing", async () => {
        const body = {
          field1: "",
          field2: null,
          field3: undefined,
          field4: false,
        };
        const requiredFields = ["field1", "field2", "field3", "field4"];

        const result = workspaceController.validateRequiredFields(
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
      it("should validate non-empty strings correctly", async () => {
        expect(workspaceController.validateNonEmptyString("valid")).toBe(true);
        expect(workspaceController.validateNonEmptyString("  valid  ")).toBe(
          true
        );
      });

      it("should reject invalid inputs", async () => {
        expect(workspaceController.validateNonEmptyString("")).toBe(false);
        expect(workspaceController.validateNonEmptyString("   ")).toBe(false);
        expect(workspaceController.validateNonEmptyString(null)).toBe(false);
        expect(workspaceController.validateNonEmptyString(undefined)).toBe(
          false
        );
        expect(workspaceController.validateNonEmptyString(123)).toBe(false);
        expect(workspaceController.validateNonEmptyString({})).toBe(false);
        expect(workspaceController.validateNonEmptyString([])).toBe(false);
      });
    });

    describe("validateTimezone", () => {
      it("should validate valid timezone formats", async () => {
        const validTimezones = [
          "America/New_York",
          "Europe/London",
          "Asia/Tokyo",
          "UTC",
          "GMT",
        ];

        validTimezones.forEach((timezone) => {
          expect(workspaceController.validateTimezone(timezone)).toBe(true);
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
          expect(workspaceController.validateTimezone(timezone)).toBe(false);
        });
      });
    });

    describe("validateLocale", () => {
      it("should validate valid locale formats", async () => {
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
          expect(workspaceController.validateLocale(locale)).toBe(true);
        });
      });

      it("should reject invalid locale formats", async () => {
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
          expect(workspaceController.validateLocale(locale)).toBe(false);
        });
      });
    });

    describe("validateRole", () => {
      it("should validate valid role values", async () => {
        const validRoles = [
          "member",
          "admin",
          "owner",
          "MEMBER",
          "ADMIN",
          "OWNER",
        ];

        validRoles.forEach((role) => {
          expect(workspaceController.validateRole(role)).toBe(true);
        });
      });

      it("should reject invalid role values", async () => {
        const invalidRoles = [
          "",
          "   ",
          "invalid",
          "moderator",
          "user",
          null,
          undefined,
          123,
        ];

        invalidRoles.forEach((role) => {
          expect(workspaceController.validateRole(role)).toBe(false);
        });
      });
    });

    describe("validateStatus", () => {
      it("should validate valid status values", async () => {
        const validStatuses = [
          "active",
          "deactivated",
          "pending_verify",
          "ACTIVE",
          "DEACTIVATED",
          "PENDING_VERIFY",
        ];

        validStatuses.forEach((status) => {
          expect(workspaceController.validateStatus(status)).toBe(true);
        });
      });

      it("should reject invalid status values", async () => {
        const invalidStatuses = [
          "",
          "   ",
          "invalid",
          "enabled",
          "disabled",
          null,
          undefined,
          123,
        ];

        invalidStatuses.forEach((status) => {
          expect(workspaceController.validateStatus(status)).toBe(false);
        });
      });
    });

    describe("validateId", () => {
      it("should validate valid IDs", async () => {
        const validIds = ["123", "abc", "user-123", "workspace_456"];

        validIds.forEach((id) => {
          expect(workspaceController.validateId(id)).toBe(true);
        });
      });

      it("should reject invalid IDs", async () => {
        const invalidIds = ["", "   ", null, undefined, 123, {}, []];

        invalidIds.forEach((id) => {
          const result = workspaceController.validateId(id);
          expect(result).toBe(false);
        });
      });
    });

    describe("validatePagination", () => {
      it("should validate valid pagination parameters", async () => {
        const validPagination = [
          { page: 1, limit: 1 },
          { page: 1, limit: 50 },
          { page: 10, limit: 100 },
        ];

        validPagination.forEach(({ page, limit }) => {
          const result = workspaceController.validatePagination(page, limit);
          expect(result.isValid).toBe(true);
          expect(result.issues).toEqual([]);
        });
      });

      it("should reject invalid pagination parameters", async () => {
        const invalidPagination = [
          { page: 0, limit: 20, expectedIssue: "Page must be at least 1" },
          {
            page: 1,
            limit: 0,
            expectedIssue: "Limit must be between 1 and 100",
          },
          {
            page: 1,
            limit: 101,
            expectedIssue: "Limit must be between 1 and 100",
          },
        ];

        invalidPagination.forEach(({ page, limit, expectedIssue }) => {
          const result = workspaceController.validatePagination(page, limit);
          expect(result.isValid).toBe(false);
          expect(result.issues).toContain(expectedIssue);
        });
      });
    });
  });
});
