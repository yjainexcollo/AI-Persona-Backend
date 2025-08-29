// Mock axios BEFORE importing the service, so the service picks up the mock
jest.mock("axios", () => ({ get: jest.fn(), post: jest.fn() }));

// Ensure we use the real implementation of the service (override global mock from setup)
jest.unmock("../../../src/services/breachCheckService");
const breachCheckService = jest.requireActual(
  "../../../src/services/breachCheckService"
);

describe("BreachCheckService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Force deterministic SHA1 for tests
    const crypto = require("crypto");
    crypto.createHash.mockImplementation(() => ({
      update: () => ({
        // 5-char prefix + 35-char suffix (total 40 hex chars)
        digest: () => "ABCDE" + "1234567890ABCDEF1234567890ABCDEF123",
      }),
    }));
  });

  describe("checkPasswordBreach", () => {
    it("should return not breached for secure password", async () => {
      const password = "SecurePassword123!";
      const prefix = "ABCDE";
      // Deliberately provide unrelated suffixes so it isn't found
      const mockResponse = {
        data: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:1\r\nEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE:5\r\n",
      };

      const axios = require("axios");
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await breachCheckService.checkPasswordBreach(password);

      expect(result).toEqual({
        breached: false,
        count: 0,
        severity: "safe",
      });
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get.mock.calls[0][0]).toBe(
        `https://api.pwnedpasswords.com/range/${prefix}`
      );
    });

    it("should return breached for compromised password", async () => {
      const password = "password123";
      const prefix = "ABCDE";
      const suffix = "1234567890ABCDEF1234567890ABCDEF123";
      const mockResponse = {
        data: `${suffix}:1998\r\nABCDE0987654321ABCDEF:5\r\n`,
      };

      const axios = require("axios");
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await breachCheckService.checkPasswordBreach(password);

      expect(result).toEqual({
        breached: true,
        count: 1998,
        severity: "high",
      });
    });

    it("should include required headers when calling HIBP", async () => {
      const password = "AnyPassword1!";
      const prefix = "ABCDE";
      const axios = require("axios");
      axios.get.mockResolvedValueOnce({ data: "" });

      await breachCheckService.checkPasswordBreach(password);

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get.mock.calls[0][0]).toBe(
        `https://api.pwnedpasswords.com/range/${prefix}`
      );
      expect(axios.get.mock.calls[0][1]).toMatchObject({
        headers: {
          "User-Agent": "AI-Persona-Backend/1.0.0",
          "Add-Padding": "true",
        },
      });
    });

    it("should handle API errors gracefully", async () => {
      const password = "SecurePassword123!";

      const axios = require("axios");
      axios.get.mockRejectedValueOnce(new Error("Network error"));

      const result = await breachCheckService.checkPasswordBreach(password);

      expect(result).toEqual({
        breached: false,
        count: 0,
        error: "Service unavailable",
        severity: "unknown",
      });
    });

    it("should handle network timeouts", async () => {
      const password = "SecurePassword123!";

      const axios = require("axios");
      axios.get.mockRejectedValueOnce(new Error("timeout"));

      const result = await breachCheckService.checkPasswordBreach(password);

      expect(result).toEqual({
        breached: false,
        count: 0,
        error: "Service unavailable",
        severity: "unknown",
      });
    });

    it("should handle empty response", async () => {
      const password = "SecurePassword123!";
      const mockResponse = { data: "" };

      const axios = require("axios");
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await breachCheckService.checkPasswordBreach(password);

      expect(result).toEqual({
        breached: false,
        count: 0,
        severity: "safe",
      });
    });

    it("should handle malformed response", async () => {
      const password = "SecurePassword123!";
      const mockResponse = { data: "invalid:format:data" };

      const axios = require("axios");
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await breachCheckService.checkPasswordBreach(password);

      expect(result).toEqual({
        breached: false,
        count: 0,
        severity: "safe",
      });
    });
  });

  describe("validatePasswordWithBreachCheck", () => {
    it("should validate secure password", async () => {
      const password = "SecurePassword123!";
      const mockResponse = {
        data: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:1\r\nABCDE0987654321ABCDEF:5\r\n",
      };

      const axios = require("axios");
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await breachCheckService.validatePasswordWithBreachCheck(
        password
      );

      expect(result).toEqual({
        isValid: true,
        reason: "Password is secure",
        severity: "safe",
      });
    });

    it("should reject breached password", async () => {
      const password = "password123";
      const suffix = "1234567890ABCDEF1234567890ABCDEF123";
      const mockResponse = {
        data: `${suffix}:1998\r\nABCDE0987654321ABCDEF:5\r\n`,
      };

      const axios = require("axios");
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await breachCheckService.validatePasswordWithBreachCheck(
        password
      );

      expect(result).toEqual({
        isValid: false,
        reason: "Password has been breached 1998 times",
        severity: "high",
        count: 1998,
      });
    });

    it("should handle service unavailable", async () => {
      const password = "SecurePassword123!";

      const axios = require("axios");
      axios.get.mockRejectedValue(new Error("Service unavailable"));

      const result = await breachCheckService.validatePasswordWithBreachCheck(
        password
      );

      expect(result).toEqual({
        isValid: true,
        reason: "Password is secure",
        severity: "safe",
      });
    });

    it("should handle high severity breaches", async () => {
      const password = "password123";
      const suffix = "1234567890ABCDEF1234567890ABCDEF123";
      const mockResponse = {
        data: `${suffix}:50000\r\nABCDE0987654321ABCDEF:5\r\n`,
      };

      const axios = require("axios");
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await breachCheckService.validatePasswordWithBreachCheck(
        password
      );

      expect(result).toEqual({
        isValid: false,
        reason: "Password has been breached 50000 times",
        severity: "critical",
        count: 50000,
      });
    });

    it("should accept strong but breached password with warning", async () => {
      const password = "StrongP@ssw0rd!"; // meets all complexity requirements
      const suffix = "1234567890ABCDEF1234567890ABCDEF123";
      const mockResponse = {
        data: `${suffix}:15\r\nABCDE0987654321ABCDEF:5\r\n`,
      };

      const axios = require("axios");
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await breachCheckService.validatePasswordWithBreachCheck(
        password
      );

      expect(result).toEqual({
        isValid: true,
        reason:
          "Password accepted (strong complexity) but has been breached 15 times. Consider using a different password.",
        severity: "medium",
        count: 15,
        warning: true,
      });
    });
  });

  describe("getSeverityLevel", () => {
    it("should return safe for count 0", () => {
      const result = breachCheckService.getSeverityLevel(0);
      expect(result).toBe("safe");
    });

    it("should return low for count 1-10", () => {
      const result = breachCheckService.getSeverityLevel(5);
      expect(result).toBe("low");
    });

    it("should return medium for count 11-1000", () => {
      const result = breachCheckService.getSeverityLevel(500);
      expect(result).toBe("medium");
    });

    it("should return high for count 1001-10000", () => {
      const result = breachCheckService.getSeverityLevel(5000);
      expect(result).toBe("high");
    });

    it("should return critical for count over 10000", () => {
      const result = breachCheckService.getSeverityLevel(50000);
      expect(result).toBe("critical");
    });

    it("should handle boundary values correctly", () => {
      expect(breachCheckService.getSeverityLevel(10)).toBe("low");
      expect(breachCheckService.getSeverityLevel(11)).toBe("medium");
      expect(breachCheckService.getSeverityLevel(1000)).toBe("medium");
      expect(breachCheckService.getSeverityLevel(1001)).toBe("high");
      expect(breachCheckService.getSeverityLevel(10000)).toBe("high");
      expect(breachCheckService.getSeverityLevel(10001)).toBe("critical");
    });
  });
});
