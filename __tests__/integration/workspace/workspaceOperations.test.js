const request = require("supertest");
const app = require("../../../src/app");

// Mock the workspace service to use test helpers
jest.mock("../../../src/services/workspaceService", () =>
  require("../../helpers/testWorkspaceService")
);

describe("Workspace Integration Tests", () => {
  let testUser;
  let testWorkspace;
  let testToken;

  beforeEach(async () => {
    // Create test user and workspace
    testUser = await global.testUtils.createTestUser({
      role: "ADMIN",
    });
    testWorkspace = testUser.workspace; // Use the workspace created with the user
    testToken = global.testUtils.createTestToken(testUser);
  });

  describe("GET /api/workspaces/:id", () => {
    it("should get workspace details", async () => {
      const response = await request(app)
        .get(`/api/workspaces/${testWorkspace.id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.workspace.id).toBe(testWorkspace.id);
      expect(response.body.data.workspace.name).toBe(testWorkspace.name);
    });

    it("should reject unauthorized access", async () => {
      // Create a user in a different workspace
      const otherUser = await global.testUtils.createTestUser({
        email: "other@example.com",
      });

      const response = await request(app)
        .get(`/api/workspaces/${testWorkspace.id}`)
        .set(
          "Authorization",
          `Bearer ${global.testUtils.createTestToken(otherUser)}`
        )
        .expect(403);

      expect(response.body.error.message).toContain("Access denied");
    });
  });

  describe("PUT /api/workspaces/:id", () => {
    it("should update workspace settings", async () => {
      const updateData = {
        name: "Updated Workspace",
        timezone: "America/New_York",
        locale: "en-US",
      };

      const response = await request(app)
        .put(`/api/workspaces/${testWorkspace.id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.workspace.name).toBe(updateData.name);
      expect(response.body.data.workspace.timezone).toBe(updateData.timezone);
    });

    it("should reject non-admin users", async () => {
      const memberUser = await global.testUtils.createTestUser({
        email: "member@example.com",
        role: "MEMBER",
        workspaceId: testWorkspace.id,
      });

      const response = await request(app)
        .put(`/api/workspaces/${testWorkspace.id}`)
        .set(
          "Authorization",
          `Bearer ${global.testUtils.createTestToken(memberUser)}`
        )
        .send({ name: "Updated Workspace" })
        .expect(403);

      expect(response.body.error.message).toContain("Insufficient permissions");
    });
  });

  describe("GET /api/workspaces/:id/members", () => {
    it("should list workspace members", async () => {
      // Create additional members in the same workspace
      await global.testUtils.createTestUser({
        email: "member1@example.com",
        name: "Member 1",
        role: "MEMBER",
        workspaceId: testWorkspace.id,
      });

      await global.testUtils.createTestUser({
        email: "member2@example.com",
        name: "Member 2",
        role: "MEMBER",
        workspaceId: testWorkspace.id,
      });

      const response = await request(app)
        .get(`/api/workspaces/${testWorkspace.id}/members`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(3); // Including testUser
    });

    it("should support pagination and filtering", async () => {
      const response = await request(app)
        .get(
          `/api/workspaces/${testWorkspace.id}/members?page=1&limit=10&search=test`
        )
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.pagination).toBeDefined();
    });
  });
});
