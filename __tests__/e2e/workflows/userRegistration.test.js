const request = require("supertest");
const app = require("../../../src/app");

describe("User Registration Workflow", () => {
  it("should complete basic user registration", async () => {
    const uniqueEmail = `workflow-${Date.now()}@example.com`;

    // Step 1: Register user
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        email: uniqueEmail,
        password: "TestPassword123!",
        name: "Workflow User",
      })
      .expect(201);

    const { user, workspace } = registerResponse.body.data;
    expect(user.status).toBe("PENDING_VERIFY");
    expect(user.email).toBe(uniqueEmail);
    expect(workspace).toBeDefined();
  });

  it("should handle basic password reset request", async () => {
    const uniqueEmail = `reset-${Date.now()}@example.com`;

    // Step 1: Create verified user
    const user = await global.testUtils.createTestUser({
      email: uniqueEmail,
      status: "ACTIVE",
      emailVerified: true,
    });

    // Step 2: Request password reset
    const resetRequestResponse = await request(app)
      .post("/api/auth/request-password-reset")
      .send({
        email: uniqueEmail,
      })
      .expect(200);

    expect(resetRequestResponse.body.status).toBe("success");
  });
});
