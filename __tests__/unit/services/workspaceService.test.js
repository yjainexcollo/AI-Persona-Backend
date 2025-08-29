const workspaceService = require("../../../src/services/workspaceService");

// Mock logger
jest.mock("../../../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe("WorkspaceService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    global.mockFindUnique.mockReset();
    global.mockFindMany.mockReset();
    global.mockCreate.mockReset();
    global.mockUpdate.mockReset();
    global.mockDelete.mockReset();
    global.mockCount.mockReset();
    if (global.mockUpdateMany) {
      global.mockUpdateMany.mockReset();
    }

    // Reset transaction mock
    global.mockPrisma.$transaction.mockImplementation((callback) =>
      callback(global.mockPrisma)
    );
  });

  describe("getWorkspace", () => {
    it("should return workspace details for authorized user", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
      };

      const mockWorkspace = {
        id: workspaceId,
        name: "Test Workspace",
        domain: "test.com",
        timezone: "UTC",
        locale: "en",
        isActive: true,
        maxMembers: 10,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the first call to findUnique (user lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockUser);
      // Mock the second call to findUnique (workspace lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockWorkspace);

      const result = await workspaceService.getWorkspace(workspaceId, userId);

      expect(result).toEqual(mockWorkspace);
      expect(global.mockFindUnique).toHaveBeenCalledTimes(2);
    });

    it("should throw error for unauthorized user", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";

      const mockUser = {
        id: userId,
        workspaceId: "different-workspace",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        workspaceService.getWorkspace(workspaceId, userId)
      ).rejects.toThrow("Access denied to this workspace");
    });

    it("should throw error for non-existent user", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";

      global.mockFindUnique.mockResolvedValue(null);

      await expect(
        workspaceService.getWorkspace(workspaceId, userId)
      ).rejects.toThrow("Access denied to this workspace");
    });

    it("should throw error for non-existent workspace", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
      };

      // Mock the first call to findUnique (user lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockUser);
      // Mock the second call to findUnique (workspace lookup) - returns null
      global.mockFindUnique.mockResolvedValueOnce(null);

      await expect(
        workspaceService.getWorkspace(workspaceId, userId)
      ).rejects.toThrow("Workspace not found");
    });

    it("should throw error for invalid workspaceId", async () => {
      await expect(
        workspaceService.getWorkspace(null, "user123")
      ).rejects.toThrow("Valid workspaceId is required");

      await expect(
        workspaceService.getWorkspace("", "user123")
      ).rejects.toThrow("Valid workspaceId is required");

      await expect(
        workspaceService.getWorkspace(123, "user123")
      ).rejects.toThrow("Valid workspaceId is required");
    });

    it("should throw error for invalid userId", async () => {
      await expect(
        workspaceService.getWorkspace("workspace123", null)
      ).rejects.toThrow("Valid userId is required");

      await expect(
        workspaceService.getWorkspace("workspace123", "")
      ).rejects.toThrow("Valid userId is required");

      await expect(
        workspaceService.getWorkspace("workspace123", 123)
      ).rejects.toThrow("Valid userId is required");
    });
  });

  describe("updateWorkspace", () => {
    it("should update workspace for admin user", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";
      const updateData = {
        name: "Updated Workspace",
        timezone: "America/New_York",
        locale: "en-US",
      };

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      const mockWorkspace = {
        id: workspaceId,
        name: "Updated Workspace",
        domain: "test.com",
        timezone: "America/New_York",
        locale: "en-US",
        isActive: true,
        maxMembers: 10,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the first call to findUnique (user lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockUser);
      global.mockUpdate.mockResolvedValue(mockWorkspace);
      global.mockCreate.mockResolvedValue({}); // For audit event creation

      const result = await workspaceService.updateWorkspace(
        workspaceId,
        userId,
        updateData
      );

      expect(result).toEqual(mockWorkspace);
      expect(global.mockUpdate).toHaveBeenCalledWith({
        where: { id: workspaceId },
        data: updateData,
        select: expect.any(Object),
      });
    });

    it("should throw error for non-admin user", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";
      const updateData = { name: "Updated Workspace" };

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
        role: "MEMBER",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        workspaceService.updateWorkspace(workspaceId, userId, updateData)
      ).rejects.toThrow("Only workspace admins can update workspace settings");
    });

    it("should throw error for invalid timezone", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";
      const updateData = { timezone: "Invalid/Timezone" };

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        workspaceService.updateWorkspace(workspaceId, userId, updateData)
      ).rejects.toThrow("Invalid timezone");
    });

    it("should throw error for invalid locale", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";
      const updateData = { locale: "invalid-locale" };

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        workspaceService.updateWorkspace(workspaceId, userId, updateData)
      ).rejects.toThrow("Invalid locale");
    });

    it("should throw error for invalid input parameters", async () => {
      await expect(
        workspaceService.updateWorkspace(null, "user123", {})
      ).rejects.toThrow("Valid workspaceId is required");

      await expect(
        workspaceService.updateWorkspace("workspace123", null, {})
      ).rejects.toThrow("Valid userId is required");

      await expect(
        workspaceService.updateWorkspace("workspace123", "user123", null)
      ).rejects.toThrow("Valid updateData is required");
    });
  });

  describe("listMembers", () => {
    it("should return workspace members", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";
      const options = { page: 1, limit: 10 };

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      const mockMembers = [
        {
          id: "user1",
          name: "User 1",
          email: "user1@example.com",
          role: "ADMIN",
          status: "ACTIVE",
        },
        {
          id: "user2",
          name: "User 2",
          email: "user2@example.com",
          role: "MEMBER",
          status: "ACTIVE",
        },
      ];

      global.mockFindUnique.mockResolvedValue(mockUser);
      global.mockFindMany.mockResolvedValue(mockMembers);
      global.mockCount.mockResolvedValue(2);

      const result = await workspaceService.listMembers(
        workspaceId,
        userId,
        options
      );

      expect(result).toEqual({ members: mockMembers, total: 2 });
      expect(global.mockFindMany).toHaveBeenCalledWith({
        where: { workspaceId },
        select: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: expect.any(Object),
      });
    });

    it("should throw error for unauthorized user", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";

      const mockUser = {
        id: userId,
        workspaceId: "different-workspace",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        workspaceService.listMembers(workspaceId, userId)
      ).rejects.toThrow("Access denied to this workspace");
    });

    it("should throw error for non-admin user", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
        role: "MEMBER",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        workspaceService.listMembers(workspaceId, userId)
      ).rejects.toThrow("Only workspace admins can view member list");
    });
  });

  describe("changeMemberRole", () => {
    it("should change member role successfully", async () => {
      const workspaceId = "workspace123";
      const userId = "admin123";
      const memberId = "member123";
      const newRole = "ADMIN";

      const mockAdmin = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      const mockMember = {
        id: memberId,
        workspaceId: workspaceId,
        role: "MEMBER",
        status: "ACTIVE",
      };

      // Mock the first call to findUnique (admin lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockAdmin);
      // Mock the second call to findUnique (member lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockMember);
      global.mockUpdate.mockResolvedValue({
        ...mockMember,
        role: newRole,
      });
      global.mockCreate.mockResolvedValue({}); // For audit event creation

      const result = await workspaceService.changeMemberRole(
        workspaceId,
        userId,
        memberId,
        newRole
      );

      expect(result.role).toBe(newRole);
      expect(global.mockUpdate).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { role: newRole },
        select: expect.any(Object),
      });
    });

    it("should throw error for non-admin user", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";
      const memberId = "member123";
      const newRole = "ADMIN";

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
        role: "MEMBER",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        workspaceService.changeMemberRole(
          workspaceId,
          userId,
          memberId,
          newRole
        )
      ).rejects.toThrow("Only workspace admins can change member roles");
    });

    it("should throw error for non-existent member", async () => {
      const workspaceId = "workspace123";
      const userId = "admin123";
      const memberId = "member123";
      const newRole = "ADMIN";

      const mockAdmin = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      // Mock the first call to findUnique (admin lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockAdmin);
      // Mock the second call to findUnique (member lookup) - returns null
      global.mockFindUnique.mockResolvedValueOnce(null);

      await expect(
        workspaceService.changeMemberRole(
          workspaceId,
          userId,
          memberId,
          newRole
        )
      ).rejects.toThrow("Member not found");
    });

    it("should throw error for invalid input parameters", async () => {
      await expect(
        workspaceService.changeMemberRole(null, "user123", "member123", "ADMIN")
      ).rejects.toThrow("Valid workspaceId is required");

      await expect(
        workspaceService.changeMemberRole(
          "workspace123",
          null,
          "member123",
          "ADMIN"
        )
      ).rejects.toThrow("Valid userId is required");

      await expect(
        workspaceService.changeMemberRole(
          "workspace123",
          "user123",
          null,
          "ADMIN"
        )
      ).rejects.toThrow("Valid memberId is required");

      await expect(
        workspaceService.changeMemberRole(
          "workspace123",
          "user123",
          "member123",
          "INVALID"
        )
      ).rejects.toThrow("Valid newRole is required");

      await expect(
        workspaceService.changeMemberRole(
          "workspace123",
          "user123",
          "member123",
          null
        )
      ).rejects.toThrow("Valid newRole is required");
    });

    it("should prevent admin from demoting themselves if they're the only admin", async () => {
      const workspaceId = "workspace123";
      const userId = "admin123";
      const memberId = "admin123"; // Same as userId
      const newRole = "MEMBER";

      const mockAdmin = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      const mockMember = {
        id: memberId,
        workspaceId: workspaceId,
        role: "ADMIN",
        status: "ACTIVE",
      };

      // Mock the first call to findUnique (admin lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockAdmin);
      // Mock the second call to findUnique (member lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockMember);
      // Mock count to return 1 (only one admin)
      global.mockCount.mockResolvedValue(1);

      await expect(
        workspaceService.changeMemberRole(
          workspaceId,
          userId,
          memberId,
          newRole
        )
      ).rejects.toThrow("Cannot demote the only admin in the workspace");
    });
  });

  describe("changeMemberStatus", () => {
    it("should change member status successfully", async () => {
      const workspaceId = "workspace123";
      const userId = "admin123";
      const memberId = "member123";
      const newStatus = "DEACTIVATED";

      const mockAdmin = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      const mockMember = {
        id: memberId,
        workspaceId: workspaceId,
        role: "MEMBER",
        status: "ACTIVE",
      };

      // Mock the first call to findUnique (admin lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockAdmin);
      // Mock the second call to findUnique (member lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockMember);
      // Mock the count call for admin count check
      global.mockCount.mockResolvedValue(2);
      // Mock the transaction
      global.mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(global.mockPrisma);
      });
      global.mockUpdate.mockResolvedValue({
        id: memberId,
        email: "member@example.com",
        name: "Test Member",
        role: "MEMBER",
        status: newStatus,
        lastLoginAt: new Date(),
        createdAt: new Date(),
      });
      global.mockCreate.mockResolvedValue({}); // For audit event creation

      const result = await workspaceService.changeMemberStatus(
        workspaceId,
        userId,
        memberId,
        newStatus
      );

      expect(result.status).toBe(newStatus);
      expect(global.mockUpdate).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { status: newStatus },
        select: expect.any(Object),
      });
    });

    it("should throw error for non-admin user", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";
      const memberId = "member123";
      const newStatus = "DEACTIVATED";

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
        role: "MEMBER",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        workspaceService.changeMemberStatus(
          workspaceId,
          userId,
          memberId,
          newStatus
        )
      ).rejects.toThrow("Only workspace admins can change member status");
    });

    it("should prevent deactivating the last admin", async () => {
      const workspaceId = "workspace123";
      const userId = "admin123";
      const memberId = "admin123";
      const newStatus = "DEACTIVATED";

      const mockAdmin = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      const mockMember = {
        id: memberId,
        workspaceId: workspaceId,
        role: "ADMIN",
        status: "ACTIVE",
      };

      // Mock the first call to findUnique (admin lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockAdmin);
      // Mock the second call to findUnique (member lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockMember);
      // Mock count to return 1 (only one active admin)
      global.mockCount.mockResolvedValue(1);

      await expect(
        workspaceService.changeMemberStatus(
          workspaceId,
          userId,
          memberId,
          newStatus
        )
      ).rejects.toThrow("Cannot deactivate the last admin in the workspace");
    });

    it("should revoke sessions when deactivating member", async () => {
      const workspaceId = "workspace123";
      const userId = "admin123";
      const memberId = "member123";
      const newStatus = "DEACTIVATED";

      const mockAdmin = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      const mockMember = {
        id: memberId,
        workspaceId: workspaceId,
        role: "MEMBER",
        status: "ACTIVE",
      };

      // Mock the first call to findUnique (admin lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockAdmin);
      // Mock the second call to findUnique (member lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockMember);
      // Mock count for admin count check
      global.mockCount.mockResolvedValue(2);

      // Mock the transaction
      global.mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(global.mockPrisma);
      });

      global.mockUpdate.mockResolvedValue({
        id: memberId,
        email: "member@example.com",
        name: "Test Member",
        role: "MEMBER",
        status: newStatus,
        lastLoginAt: new Date(),
        createdAt: new Date(),
      });
      global.mockUpdateMany.mockResolvedValue({ count: 3 }); // 3 sessions revoked
      global.mockCreate.mockResolvedValue({}); // For audit event creation

      const result = await workspaceService.changeMemberStatus(
        workspaceId,
        userId,
        memberId,
        newStatus
      );

      expect(result.status).toBe(newStatus);
      expect(global.mockUpdateMany).toHaveBeenCalledWith({
        where: { userId: memberId },
        data: { isActive: false },
      });
    });
  });

  describe("removeMember", () => {
    it("should remove member successfully", async () => {
      const workspaceId = "workspace123";
      const userId = "admin123";
      const memberId = "member123";

      const mockAdmin = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      const mockMember = {
        id: memberId,
        workspaceId: workspaceId,
        role: "MEMBER",
        status: "ACTIVE",
      };

      // Mock the first call to findUnique (admin lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockAdmin);
      // Mock the second call to findUnique (member lookup)
      global.mockFindUnique.mockResolvedValueOnce(mockMember);
      global.mockUpdate.mockResolvedValue({
        ...mockMember,
        status: "DEACTIVATED",
      });
      global.mockCreate.mockResolvedValue({}); // For audit event creation

      await workspaceService.removeMember(workspaceId, userId, memberId);

      expect(global.mockUpdate).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { status: "DEACTIVATED" },
      });
    });

    it("should throw error for non-admin user", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";
      const memberId = "member123";

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
        role: "MEMBER",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        workspaceService.removeMember(workspaceId, userId, memberId)
      ).rejects.toThrow("Only workspace admins can remove members");
    });
  });

  describe("requestDeletion", () => {
    it("should request workspace deletion successfully", async () => {
      const workspaceId = "workspace123";
      const userId = "admin123";
      const reason = "No longer needed";

      const mockAdmin = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      // Mock user lookup (admin check)
      global.mockFindUnique.mockResolvedValueOnce(mockAdmin);
      // Mock existing deletion check (returns null - no existing deletion)
      global.mockFindUnique.mockResolvedValueOnce(null);

      // Mock workspace deletion creation
      global.mockCreate
        .mockResolvedValueOnce({
          id: "deletion123",
          workspaceId: workspaceId,
          requestedBy: userId,
          reason: reason,
          requestedAt: new Date(),
        })
        .mockResolvedValueOnce({}); // For audit event creation

      // Mock workspace status update
      global.mockUpdate.mockResolvedValue({
        id: workspaceId,
        status: "PENDING_DELETION",
      });

      await workspaceService.requestDeletion(workspaceId, userId, reason);

      expect(global.mockCreate).toHaveBeenCalledWith({
        data: {
          workspaceId: workspaceId,
          requestedBy: userId,
          reason: reason,
          purgeAfter: expect.any(Date),
        },
      });

      expect(global.mockUpdate).toHaveBeenCalledWith({
        where: { id: workspaceId },
        data: { status: "PENDING_DELETION" },
      });
    });

    it("should throw error for non-admin user", async () => {
      const workspaceId = "workspace123";
      const userId = "user123";
      const reason = "No longer needed";

      const mockUser = {
        id: userId,
        workspaceId: workspaceId,
        role: "MEMBER",
      };

      global.mockFindUnique.mockResolvedValue(mockUser);

      await expect(
        workspaceService.requestDeletion(workspaceId, userId, reason)
      ).rejects.toThrow("Only workspace admins can request workspace deletion");
    });

    it("should throw error for already requested deletion", async () => {
      const workspaceId = "workspace123";
      const userId = "admin123";
      const reason = "No longer needed";

      const mockAdmin = {
        id: userId,
        workspaceId: workspaceId,
        role: "ADMIN",
      };

      const existingDeletion = {
        id: "deletion123",
        workspaceId: workspaceId,
      };

      // Mock user lookup (admin check)
      global.mockFindUnique.mockResolvedValueOnce(mockAdmin);
      // Mock existing deletion check (returns existing deletion)
      global.mockFindUnique.mockResolvedValueOnce(existingDeletion);

      await expect(
        workspaceService.requestDeletion(workspaceId, userId, reason)
      ).rejects.toThrow("Workspace deletion has already been requested");
    });
  });

  describe("isValidTimezone", () => {
    it("should validate correct timezone", () => {
      const result = workspaceService.isValidTimezone("America/New_York");
      expect(result).toBe(true);
    });

    it("should validate UTC timezone", () => {
      const result = workspaceService.isValidTimezone("UTC");
      expect(result).toBe(true);
    });

    it("should reject invalid timezone", () => {
      const result = workspaceService.isValidTimezone("Invalid/Timezone");
      expect(result).toBe(false);
    });

    it("should reject malformed timezones", () => {
      expect(workspaceService.isValidTimezone("")).toBe(false);
      expect(workspaceService.isValidTimezone("not-a-timezone")).toBe(false);
      expect(workspaceService.isValidTimezone(null)).toBe(false);
      expect(workspaceService.isValidTimezone(undefined)).toBe(false);
    });
  });

  describe("isValidLocale", () => {
    it("should validate correct locale", () => {
      const result = workspaceService.isValidLocale("en-US");
      expect(result).toBe(true);
    });

    it("should validate language-only locale", () => {
      const result = workspaceService.isValidLocale("en");
      expect(result).toBe(true);
    });

    it("should validate different valid locales", () => {
      expect(workspaceService.isValidLocale("fr-FR")).toBe(true);
      expect(workspaceService.isValidLocale("de-DE")).toBe(true);
      expect(workspaceService.isValidLocale("es")).toBe(true);
    });

    it("should reject invalid locale", () => {
      const result = workspaceService.isValidLocale("invalid-locale");
      expect(result).toBe(false);
    });

    it("should reject malformed locales", () => {
      expect(workspaceService.isValidLocale("e")).toBe(false); // Too short
      expect(workspaceService.isValidLocale("EN-us")).toBe(false); // Wrong case
      expect(workspaceService.isValidLocale("en-us-extra")).toBe(false); // Too many parts
      expect(workspaceService.isValidLocale("123-45")).toBe(false); // Numbers
      expect(workspaceService.isValidLocale("")).toBe(false);
      expect(workspaceService.isValidLocale(null)).toBe(false);
      expect(workspaceService.isValidLocale(undefined)).toBe(false);
    });
  });
});
