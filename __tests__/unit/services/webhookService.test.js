// Mock auth service
jest.mock("../../../src/services/authService", () => ({
  createAuditEvent: jest.fn(),
}));

// Mock logger
jest.mock("../../../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const webhookService = require("../../../src/services/webhookService");
const authService = require("../../../src/services/authService");

describe("WebhookService", () => {
  let mockPersona;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset global Prisma mocks
    global.mockFindFirst.mockReset();
    global.mockUpdate.mockReset();

    mockPersona = {
      id: "persona123",
      name: "HR Ops / Payroll Manager",
      personaRole: "HR Ops / Payroll Manager",
      about: "Test about",
      traits: ["trait1", "trait2"],
      painPoints: ["pain1", "pain2"],
      coreExpertise: ["expertise1", "expertise2"],
      communicationStyle: "Test style",
      keyResponsibility: ["resp1", "resp2"],
      avatarUrl: "test.jpg",
      isActive: true,
      updatedAt: new Date(),
    };
  });

  describe("validateWebhookPayload", () => {
    it("should validate correct payload", () => {
      const payload = {
        personaName: "HR Ops / Payroll Manager",
        metadata: {
          about: "Test about",
          coreExpertise: ["expertise1"],
          communicationStyle: "Test style",
          traits: ["trait1"],
          painPoints: ["pain1"],
          keyResponsibilities: ["resp1"],
        },
      };

      const result = webhookService.validateWebhookPayload(payload);
      expect(result.isValid).toBe(true);
    });

    it("should reject payload without personaName", () => {
      const payload = {
        metadata: {
          about: "Test about",
          coreExpertise: ["expertise1"],
          communicationStyle: "Test style",
          traits: ["trait1"],
          painPoints: ["pain1"],
          keyResponsibilities: ["resp1"],
        },
      };

      const result = webhookService.validateWebhookPayload(payload);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("personaName is required");
    });

    it("should reject payload without metadata", () => {
      const payload = {
        personaName: "HR Ops / Payroll Manager",
      };

      const result = webhookService.validateWebhookPayload(payload);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("metadata is required");
    });
  });

  describe("findPersonaByName", () => {
    it("should find persona by exact name", async () => {
      global.mockFindFirst.mockResolvedValue(mockPersona);

      const result = await webhookService.findPersonaByName(
        "HR Ops / Payroll Manager"
      );

      expect(result).toEqual(mockPersona);
      expect(global.mockFindFirst).toHaveBeenCalledWith({
        where: {
          name: "HR Ops / Payroll Manager",
          isActive: true,
        },
      });
    });

    it("should return null if persona not found", async () => {
      global.mockFindFirst.mockResolvedValue(null);

      const result = await webhookService.findPersonaByName(
        "Non-existent Persona"
      );

      expect(result).toBeNull();
    });
  });

  describe("updatePersonaTraits", () => {
    it("should update persona traits successfully", async () => {
      const payload = {
        personaName: "HR Ops / Payroll Manager",
        metadata: {
          about: "Updated about",
          coreExpertise: ["Updated expertise"],
          communicationStyle: "Updated style",
          traits: ["Updated trait"],
          painPoints: ["Updated pain"],
          keyResponsibilities: ["Updated responsibility"],
        },
      };

      const updatedPersona = { ...mockPersona, ...payload.metadata };
      global.mockFindFirst.mockResolvedValue(mockPersona);
      global.mockUpdate.mockResolvedValue(updatedPersona);
      authService.createAuditEvent.mockResolvedValue(undefined);

      const result = await webhookService.updatePersonaTraits(
        payload,
        "user123"
      );

      expect(result).toEqual(updatedPersona);
      expect(global.mockUpdate).toHaveBeenCalledWith({
        where: { id: mockPersona.id },
        data: {
          about: payload.metadata.about,
          coreExpertise: payload.metadata.coreExpertise,
          communicationStyle: payload.metadata.communicationStyle,
          traits: payload.metadata.traits,
          painPoints: payload.metadata.painPoints,
          keyResponsibility: payload.metadata.keyResponsibilities,
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(authService.createAuditEvent).toHaveBeenCalledWith(
        "user123",
        "WEBHOOK_SUCCESS",
        expect.objectContaining({
          personaId: mockPersona.id,
          personaName: mockPersona.name,
          webhookSource: "n8n",
          operation: "traits_update",
        })
      );
    });

    it("should throw error if persona not found", async () => {
      const payload = {
        personaName: "Non-existent Persona",
        metadata: {
          about: "Updated about",
          coreExpertise: ["Updated expertise"],
          communicationStyle: "Updated style",
          traits: ["Updated trait"],
          painPoints: ["Updated pain"],
          keyResponsibilities: ["Updated responsibility"],
        },
      };

      global.mockFindFirst.mockResolvedValue(null);

      await expect(
        webhookService.updatePersonaTraits(payload, "user123")
      ).rejects.toThrow('Persona with name "Non-existent Persona" not found');
    });
  });

  describe("processWebhook", () => {
    it("should process valid webhook successfully", async () => {
      const payload = {
        personaName: "HR Ops / Payroll Manager",
        metadata: {
          about: "Updated about",
          coreExpertise: ["Updated expertise"],
          communicationStyle: "Updated style",
          traits: ["Updated trait"],
          painPoints: ["Updated pain"],
          keyResponsibilities: ["Updated responsibility"],
        },
      };

      const updatedPersona = { ...mockPersona, ...payload.metadata };
      global.mockFindFirst.mockResolvedValue(mockPersona);
      global.mockUpdate.mockResolvedValue(updatedPersona);
      authService.createAuditEvent.mockResolvedValue(undefined);

      const result = await webhookService.processWebhook(payload, "user123");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Persona traits updated successfully");
      expect(result.persona).toEqual(updatedPersona);
    });

    it("should handle validation errors", async () => {
      const invalidPayload = {
        personaName: "HR Ops / Payroll Manager",
        // Missing metadata
      };

      await expect(
        webhookService.processWebhook(invalidPayload, "user123")
      ).rejects.toThrow("Webhook validation failed: metadata is required");
    });
  });
});
