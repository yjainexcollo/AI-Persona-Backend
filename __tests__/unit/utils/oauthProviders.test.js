describe("oauthProviders config mapping", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("maps google config fields and default scope", () => {
    // Provide explicit OAuth config
    jest.doMock("../../../src/config", () => ({
      googleClientId: "test-google-client-id",
      googleClientSecret: "test-google-client-secret",
      oauthCallbackUrl: "https://example.com/api/auth/google/callback",
    }));

    jest.isolateModules(() => {
      const oauthProviders = require("../../../src/utils/oauthProviders");

      expect(oauthProviders).toBeDefined();
      expect(oauthProviders.google).toBeDefined();
      expect(oauthProviders.google.clientID).toBe("test-google-client-id");
      expect(oauthProviders.google.clientSecret).toBe(
        "test-google-client-secret"
      );
      expect(oauthProviders.google.callbackURL).toBe(
        "https://example.com/api/auth/google/callback"
      );
      expect(Array.isArray(oauthProviders.google.scope)).toBe(true);
      expect(oauthProviders.google.scope).toEqual(["profile", "email"]);
    });
  });

  test("handles missing optional google config values", () => {
    // No oauth fields; they are optional in config
    jest.doMock("../../../src/config", () => ({}));

    jest.isolateModules(() => {
      const oauthProviders = require("../../../src/utils/oauthProviders");

      expect(oauthProviders).toBeDefined();
      expect(oauthProviders.google).toBeDefined();
      expect(oauthProviders.google.clientID).toBeUndefined();
      expect(oauthProviders.google.clientSecret).toBeUndefined();
      expect(oauthProviders.google.callbackURL).toBeUndefined();
      expect(oauthProviders.google.scope).toEqual(["profile", "email"]);
    });
  });
});
