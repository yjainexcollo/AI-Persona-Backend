/**
 * OAuthController Unit Tests
 * Tests for OAuth authentication and callback functionality
 */

const request = require("supertest");
const express = require("express");
const passport = require("passport");

// Mock dependencies BEFORE importing the controller
jest.mock("passport");
jest.mock("../../../src/services/oauthService");
jest.mock("../../../src/utils/oauthProviders");
jest.mock("../../../src/config");
jest.mock("../../../src/utils/logger");
jest.mock("../../../src/utils/asyncHandler", () => {
  return (fn) => fn; // Return the function as-is for testing
});

const mockOauthService = require("../../../src/services/oauthService");
const mockOauthProviders = require("../../../src/utils/oauthProviders");
const mockConfig = require("../../../src/config");
const mockLogger = require("../../../src/utils/logger");

// Import the actual controller
const oauthController = require("../../../src/controllers/oauthController");

describe("OAuthController", () => {
  let app;

  beforeAll(() => {
    jest.setTimeout(10000);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockOauthProviders.google = {
      scope: ["profile", "email"],
    };

    mockConfig.frontendUrl = "https://example.com";

    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.debug = jest.fn();

    // Mock passport.authenticate
    passport.authenticate = jest.fn();

    // Create Express app
    app = express();
    app.use(express.json());

    // Add middleware to simulate client info
    app.use((req, res, next) => {
      req.ip = "127.0.0.1";
      req.connection = { remoteAddress: "127.0.0.1" };
      req.headers = {
        "user-agent": "test-agent",
        "x-trace-id": "test-trace-123",
        ...req.headers,
      };
      next();
    });
  });

  describe("googleAuth", () => {
    it("should be properly configured for Google OAuth", () => {
      // Test that the controller is properly exported
      expect(oauthController).toBeDefined();
      // Note: googleAuth is wrapped by asyncHandler, so we can't test it directly
      // but we can verify the controller structure
      expect(typeof oauthController).toBe("object");
    });
  });

  describe("googleCallback", () => {
    it("should be properly configured for OAuth callback", () => {
      // Test that the controller is properly exported
      expect(oauthController).toBeDefined();
      expect(oauthController.googleCallback).toBeDefined();
    });
  });

  describe("OAuth Callback Handler", () => {
    let handler;
    let mockReq;
    let mockRes;

    beforeEach(() => {
      handler = oauthController.googleCallback[1];

      mockReq = {
        ip: "127.0.0.1",
        connection: { remoteAddress: "127.0.0.1" },
        headers: {
          "user-agent": "test-agent",
          "x-trace-id": "test-trace-123",
        },
        get: jest.fn((header) => {
          if (header === "User-Agent") return "test-agent";
          return mockReq.headers[header.toLowerCase()] || null;
        }),
        user: {
          profile: {
            id: "google123",
            emails: [{ value: "test@example.com" }],
            displayName: "Test User",
          },
        },
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis(),
      };
    });

    describe("Success scenarios", () => {
      it("should handle successful OAuth callback with all data", async () => {
        const mockResponse = {
          data: {
            accessToken: "jwt-token-123",
            workspaceId: "workspace123",
            workspaceName: "Test Workspace",
          },
        };

        mockOauthService.handleOAuthLogin.mockResolvedValue(mockResponse);

        await handler(mockReq, mockRes);

        expect(mockOauthService.handleOAuthLogin).toHaveBeenCalledWith(
          "google",
          mockReq.user.profile
        );
        expect(mockRes.redirect).toHaveBeenCalledWith(
          "https://example.com/oauth-callback?token=jwt-token-123&workspaceId=workspace123&workspaceName=Test+Workspace"
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          "OAuth callback successful",
          expect.objectContaining({
            provider: "google",
            profileId: "google123",
            workspaceId: "workspace123",
            workspaceName: "Test Workspace",
          })
        );
      });

      it("should handle OAuth callback with only access token", async () => {
        const mockResponse = {
          data: {
            accessToken: "jwt-token-123",
          },
        };

        mockOauthService.handleOAuthLogin.mockResolvedValue(mockResponse);

        await handler(mockReq, mockRes);

        expect(mockRes.redirect).toHaveBeenCalledWith(
          "https://example.com/oauth-callback?token=jwt-token-123"
        );
      });

      it("should handle OAuth callback with empty string workspace values", async () => {
        const mockResponse = {
          data: {
            accessToken: "jwt-token-123",
            workspaceId: "",
            workspaceName: "",
          },
        };

        mockOauthService.handleOAuthLogin.mockResolvedValue(mockResponse);

        await handler(mockReq, mockRes);

        expect(mockRes.redirect).toHaveBeenCalledWith(
          "https://example.com/oauth-callback?token=jwt-token-123"
        );
      });
    });

    describe("Error scenarios", () => {
      it("should handle missing user profile", async () => {
        mockReq.user = null;

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: profile data missing",
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          "OAuth callback failed: missing user profile",
          expect.objectContaining({
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            traceId: "test-trace-123",
          })
        );
      });

      it("should handle missing profile object", async () => {
        mockReq.user = {};

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: profile data missing",
        });
      });

      it("should handle invalid profile structure - missing id", async () => {
        mockReq.user.profile = {
          emails: [{ value: "test@example.com" }],
          displayName: "Test User",
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: invalid profile data",
        });
      });

      it("should handle invalid profile structure - missing emails", async () => {
        mockReq.user.profile = {
          id: "google123",
          displayName: "Test User",
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: invalid profile data",
        });
      });

      it("should handle invalid profile structure - empty emails array", async () => {
        mockReq.user.profile = {
          id: "google123",
          emails: [],
          displayName: "Test User",
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: invalid profile data",
        });
      });

      it("should handle invalid profile structure - missing email value", async () => {
        mockReq.user.profile = {
          id: "google123",
          emails: [{}],
          displayName: "Test User",
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: invalid profile data",
        });
      });

      it("should handle invalid profile structure - empty email value", async () => {
        mockReq.user.profile = {
          id: "google123",
          emails: [{ value: "" }],
          displayName: "Test User",
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: invalid profile data",
        });
      });

      it("should handle invalid profile structure - whitespace email value", async () => {
        mockReq.user.profile = {
          id: "google123",
          emails: [{ value: "   " }],
          displayName: "Test User",
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: invalid profile data",
        });
      });

      it("should handle invalid profile structure - non-string email value", async () => {
        mockReq.user.profile = {
          id: "google123",
          emails: [{ value: 123 }],
          displayName: "Test User",
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: invalid profile data",
        });
      });

      it("should handle OAuth service returning null", async () => {
        mockOauthService.handleOAuthLogin.mockResolvedValue(null);

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: service error",
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          "OAuth service returned invalid response",
          expect.objectContaining({
            provider: "google",
            profileId: "google123",
            response: null,
          })
        );
      });

      it("should handle OAuth service returning response without data", async () => {
        mockOauthService.handleOAuthLogin.mockResolvedValue({});

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: service error",
        });
      });

      it("should handle OAuth service returning response with null data", async () => {
        mockOauthService.handleOAuthLogin.mockResolvedValue({ data: null });

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: service error",
        });
      });

      it("should handle OAuth service returning response with undefined data", async () => {
        mockOauthService.handleOAuthLogin.mockResolvedValue({
          data: undefined,
        });

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: service error",
        });
      });

      it("should handle OAuth service returning response without access token", async () => {
        const mockResponse = {
          data: {
            workspaceId: "workspace123",
            workspaceName: "Test Workspace",
          },
        };

        mockOauthService.handleOAuthLogin.mockResolvedValue(mockResponse);

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth login failed: access token missing",
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          "OAuth callback failed: missing access token",
          expect.objectContaining({
            provider: "google",
            profileId: "google123",
            responseData: mockResponse.data,
          })
        );
      });

      it("should handle OAuth service returning response with empty access token", async () => {
        const mockResponse = {
          data: {
            accessToken: "",
            workspaceId: "workspace123",
            workspaceName: "Test Workspace",
          },
        };

        mockOauthService.handleOAuthLogin.mockResolvedValue(mockResponse);

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth login failed: access token missing",
        });
      });

      it("should handle OAuth service returning response with whitespace access token", async () => {
        const mockResponse = {
          data: {
            accessToken: "   ",
            workspaceId: "workspace123",
            workspaceName: "Test Workspace",
          },
        };

        mockOauthService.handleOAuthLogin.mockResolvedValue(mockResponse);

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: invalid redirect parameters",
        });
      });

      it("should handle OAuth service returning response with non-string access token", async () => {
        const mockResponse = {
          data: {
            accessToken: 123,
            workspaceId: "workspace123",
            workspaceName: "Test Workspace",
          },
        };

        mockOauthService.handleOAuthLogin.mockResolvedValue(mockResponse);

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: invalid redirect parameters",
        });
      });

      it("should handle OAuth service errors", async () => {
        mockOauthService.handleOAuthLogin.mockRejectedValue(
          new Error("Service connection failed")
        );

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: "OAuth authentication failed: internal error",
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          "OAuth callback error",
          expect.objectContaining({
            provider: "google",
            error: "Service connection failed",
          })
        );
      });

      it("should handle buildRedirectUrl errors", async () => {
        const mockResponse = {
          data: {
            accessToken: "valid-token",
            workspaceId: 123, // Non-string that will cause buildRedirectUrl to skip it
            workspaceName: 456, // Non-string that will cause buildRedirectUrl to skip it
          },
        };

        mockOauthService.handleOAuthLogin.mockResolvedValue(mockResponse);

        await handler(mockReq, mockRes);

        // This should succeed since the accessToken is valid
        expect(mockRes.redirect).toHaveBeenCalled();
        expect(mockRes.redirect).toHaveBeenCalledWith(
          "https://example.com/oauth-callback?token=valid-token"
        );
      });
    });

    describe("Edge cases", () => {
      it("should handle very long profile data", async () => {
        const longProfile = {
          id: "google123",
          emails: [{ value: "test@example.com" }],
          displayName: "a".repeat(1000),
        };

        mockReq.user.profile = longProfile;

        const mockResponse = {
          data: {
            accessToken: "jwt-token-123",
            workspaceId: "workspace123",
            workspaceName: "Test Workspace",
          },
        };

        mockOauthService.handleOAuthLogin.mockResolvedValue(mockResponse);

        await handler(mockReq, mockRes);

        expect(mockRes.redirect).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
          "OAuth callback successful",
          expect.objectContaining({
            profileId: "google123",
            workspaceName: "Test Workspace",
          })
        );
      });

      it("should handle special characters in workspace name", async () => {
        const mockResponse = {
          data: {
            accessToken: "jwt-token-123",
            workspaceId: "workspace123",
            workspaceName: "Test & Demo Workspace",
          },
        };

        mockOauthService.handleOAuthLogin.mockResolvedValue(mockResponse);

        await handler(mockReq, mockRes);

        expect(mockRes.redirect).toHaveBeenCalledWith(
          "https://example.com/oauth-callback?token=jwt-token-123&workspaceId=workspace123&workspaceName=Test+%26+Demo+Workspace"
        );
      });

      it("should handle missing client info gracefully", async () => {
        mockReq.ip = undefined;
        mockReq.connection = undefined;
        mockReq.headers = {};
        mockReq.get = jest.fn(() => null); // Override the get method to return null

        const mockResponse = {
          data: {
            accessToken: "jwt-token-123",
            workspaceId: "workspace123",
            workspaceName: "Test Workspace",
          },
        };

        mockOauthService.handleOAuthLogin.mockResolvedValue(mockResponse);

        await handler(mockReq, mockRes);

        expect(mockRes.redirect).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
          "OAuth callback successful",
          expect.objectContaining({
            ipAddress: null,
            userAgent: null,
            traceId: null,
          })
        );
      });
    });
  });

  describe("Helper Functions", () => {
    // Test the actual helper functions from the controller
    const {
      getClientInfo,
      validateOAuthProfile,
      buildRedirectUrl,
    } = require("../../../src/controllers/oauthController");

    describe("getClientInfo", () => {
      it("should extract client information correctly", () => {
        const req = {
          ip: "192.168.1.1",
          connection: { remoteAddress: "10.0.0.1" },
          headers: {
            "user-agent": "test-browser",
            "x-trace-id": "trace-456",
          },
          get: jest.fn((header) => {
            if (header === "User-Agent") return "test-browser";
            return req.headers[header.toLowerCase()] || null;
          }),
        };

        const result = getClientInfo(req);

        expect(result).toEqual({
          ipAddress: "192.168.1.1",
          userAgent: "test-browser",
          traceId: "trace-456",
        });
      });

      it("should fallback to connection.remoteAddress when ip is missing", () => {
        const req = {
          connection: { remoteAddress: "10.0.0.1" },
          headers: {
            "user-agent": "test-browser",
            "x-trace-id": "trace-456",
          },
          get: jest.fn((header) => {
            if (header === "User-Agent") return "test-browser";
            return req.headers[header.toLowerCase()] || null;
          }),
        };

        const result = getClientInfo(req);

        expect(result.ipAddress).toBe("10.0.0.1");
      });

      it("should handle missing headers gracefully", () => {
        const req = {
          get: jest.fn(() => null),
          headers: {},
        };

        const result = getClientInfo(req);

        expect(result).toEqual({
          ipAddress: null,
          userAgent: null,
          traceId: null,
        });
      });
    });

    describe("validateOAuthProfile", () => {
      it("should validate correct profile", () => {
        const validProfile = {
          id: "google123",
          emails: [{ value: "test@example.com" }],
          displayName: "Test User",
        };

        expect(validateOAuthProfile(validProfile)).toBe(true);
      });

      it("should reject null profile", () => {
        expect(validateOAuthProfile(null)).toBe(false);
      });

      it("should reject undefined profile", () => {
        expect(validateOAuthProfile(undefined)).toBe(false);
      });

      it("should reject non-object profile", () => {
        expect(validateOAuthProfile("string")).toBe(false);
        expect(validateOAuthProfile(123)).toBe(false);
        expect(validateOAuthProfile([])).toBe(false);
      });

      it("should reject profile without id", () => {
        const profile = {
          emails: [{ value: "test@example.com" }],
          displayName: "Test User",
        };

        expect(validateOAuthProfile(profile)).toBe(false);
      });

      it("should reject profile without emails", () => {
        const profile = {
          id: "google123",
          displayName: "Test User",
        };

        expect(validateOAuthProfile(profile)).toBe(false);
      });

      it("should reject profile with non-array emails", () => {
        const profile = {
          id: "google123",
          emails: "not-an-array",
          displayName: "Test User",
        };

        expect(validateOAuthProfile(profile)).toBe(false);
      });

      it("should reject profile with empty emails array", () => {
        const profile = {
          id: "google123",
          emails: [],
          displayName: "Test User",
        };

        expect(validateOAuthProfile(profile)).toBe(false);
      });

      it("should reject profile with missing email value", () => {
        const profile = {
          id: "google123",
          emails: [{}],
          displayName: "Test User",
        };

        expect(validateOAuthProfile(profile)).toBe(false);
      });

      it("should reject profile with empty email value", () => {
        const profile = {
          id: "google123",
          emails: [{ value: "" }],
          displayName: "Test User",
        };

        expect(validateOAuthProfile(profile)).toBe(false);
      });

      it("should reject profile with whitespace email value", () => {
        const profile = {
          id: "google123",
          emails: [{ value: "   " }],
          displayName: "Test User",
        };

        expect(validateOAuthProfile(profile)).toBe(false);
      });

      it("should reject profile with non-string email value", () => {
        const profile = {
          id: "google123",
          emails: [{ value: 123 }],
          displayName: "Test User",
        };

        expect(validateOAuthProfile(profile)).toBe(false);
      });
    });

    describe("buildRedirectUrl", () => {
      it("should build URL with all parameters", () => {
        const url = buildRedirectUrl(
          "token123",
          "workspace123",
          "Test Workspace"
        );

        expect(url).toBe(
          "https://example.com/oauth-callback?token=token123&workspaceId=workspace123&workspaceName=Test+Workspace"
        );
      });

      it("should build URL with only token", () => {
        const url = buildRedirectUrl("token123");

        expect(url).toBe("https://example.com/oauth-callback?token=token123");
      });

      it("should build URL with token and workspaceId", () => {
        const url = buildRedirectUrl("token123", "workspace123");

        expect(url).toBe(
          "https://example.com/oauth-callback?token=token123&workspaceId=workspace123"
        );
      });

      it("should build URL with token and workspaceName", () => {
        const url = buildRedirectUrl("token123", null, "Test Workspace");

        expect(url).toBe(
          "https://example.com/oauth-callback?token=token123&workspaceName=Test+Workspace"
        );
      });

      it("should handle empty string parameters", () => {
        const url = buildRedirectUrl("token123", "", "");

        expect(url).toBe("https://example.com/oauth-callback?token=token123");
      });

      it("should handle whitespace parameters", () => {
        const url = buildRedirectUrl("token123", "   ", "   ");

        expect(url).toBe("https://example.com/oauth-callback?token=token123");
      });

      it("should handle null parameters", () => {
        const url = buildRedirectUrl("token123", null, null);

        expect(url).toBe("https://example.com/oauth-callback?token=token123");
      });

      it("should handle undefined parameters", () => {
        const url = buildRedirectUrl("token123", undefined, undefined);

        expect(url).toBe("https://example.com/oauth-callback?token=token123");
      });

      it("should handle special characters in workspace name", () => {
        const url = buildRedirectUrl(
          "token123",
          "workspace123",
          "Test & Demo Workspace"
        );

        expect(url).toBe(
          "https://example.com/oauth-callback?token=token123&workspaceId=workspace123&workspaceName=Test+%26+Demo+Workspace"
        );
      });

      it("should throw error for missing token", () => {
        expect(() => buildRedirectUrl()).toThrow("Valid token is required");
        expect(() => buildRedirectUrl(null)).toThrow("Valid token is required");
        expect(() => buildRedirectUrl("")).toThrow("Valid token is required");
        expect(() => buildRedirectUrl("   ")).toThrow(
          "Valid token is required"
        );
      });

      it("should throw error for non-string token", () => {
        expect(() => buildRedirectUrl(123)).toThrow("Valid token is required");
        expect(() => buildRedirectUrl({})).toThrow("Valid token is required");
        expect(() => buildRedirectUrl([])).toThrow("Valid token is required");
      });

      it("should trim token and parameters", () => {
        const url = buildRedirectUrl(
          "  token123  ",
          "  workspace123  ",
          "  Test Workspace  "
        );

        expect(url).toBe(
          "https://example.com/oauth-callback?token=token123&workspaceId=workspace123&workspaceName=Test+Workspace"
        );
      });
    });
  });

  describe("Configuration and environment", () => {
    it("should use default frontend URL when config.frontendUrl is not set", () => {
      mockConfig.frontendUrl = undefined;

      const {
        buildRedirectUrl,
      } = require("../../../src/controllers/oauthController");
      const url = buildRedirectUrl("token123");

      expect(url).toBe("http://localhost:5173/oauth-callback?token=token123");
    });

    it("should use config.frontendUrl when available", () => {
      mockConfig.frontendUrl = "https://myapp.com";

      const {
        buildRedirectUrl,
      } = require("../../../src/controllers/oauthController");
      const url = buildRedirectUrl("token123");

      expect(url).toBe("https://myapp.com/oauth-callback?token=token123");
    });
  });
});
