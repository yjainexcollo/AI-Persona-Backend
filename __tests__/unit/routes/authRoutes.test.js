/**
 * AuthRoutes Unit Tests
 * Tests route configuration and structure
 */

const authRoutes = require("../../../src/routes/authRoutes");

describe("AuthRoutes", () => {
  describe("Route Configuration", () => {
    it("should export router correctly", () => {
      expect(authRoutes).toBeDefined();
      expect(typeof authRoutes).toBe("function");
    });

    it("should have router stack configured", () => {
      expect(authRoutes.stack).toBeDefined();
      expect(Array.isArray(authRoutes.stack)).toBe(true);
    });

    it("should have routes configured", () => {
      // Check that the router has some routes configured
      expect(authRoutes.stack.length).toBeGreaterThan(0);
    });
  });

  describe("Route Structure", () => {
    it("should have register route", () => {
      const hasRegisterRoute = authRoutes.stack.some(
        (layer) => layer.route && layer.route.path === "/register"
      );
      expect(hasRegisterRoute).toBe(true);
    });

    it("should have login route", () => {
      const hasLoginRoute = authRoutes.stack.some(
        (layer) => layer.route && layer.route.path === "/login"
      );
      expect(hasLoginRoute).toBe(true);
    });

    it("should have health check route", () => {
      const hasHealthRoute = authRoutes.stack.some(
        (layer) => layer.route && layer.route.path === "/health"
      );
      expect(hasHealthRoute).toBe(true);
    });

    it("should have OAuth routes", () => {
      const hasGoogleRoute = authRoutes.stack.some(
        (layer) => layer.route && layer.route.path === "/google"
      );
      const hasCallbackRoute = authRoutes.stack.some(
        (layer) => layer.route && layer.route.path === "/google/callback"
      );

      expect(hasGoogleRoute).toBe(true);
      expect(hasCallbackRoute).toBe(true);
    });

    it("should have protected routes", () => {
      const hasSessionsRoute = authRoutes.stack.some(
        (layer) => layer.route && layer.route.path === "/sessions"
      );
      const hasLogoutRoute = authRoutes.stack.some(
        (layer) => layer.route && layer.route.path === "/logout"
      );

      expect(hasSessionsRoute).toBe(true);
      expect(hasLogoutRoute).toBe(true);
    });
  });

  describe("HTTP Methods", () => {
    it("should support POST for register route", () => {
      const registerLayer = authRoutes.stack.find(
        (layer) => layer.route && layer.route.path === "/register"
      );

      if (registerLayer && registerLayer.route) {
        expect(registerLayer.route.methods.post).toBe(true);
      } else {
        fail("Register route not found");
      }
    });

    it("should support POST for login route", () => {
      const loginLayer = authRoutes.stack.find(
        (layer) => layer.route && layer.route.path === "/login"
      );

      if (loginLayer && loginLayer.route) {
        expect(loginLayer.route.methods.post).toBe(true);
      } else {
        fail("Login route not found");
      }
    });

    it("should support GET for health check route", () => {
      const healthLayer = authRoutes.stack.find(
        (layer) => layer.route && layer.route.path === "/health"
      );

      if (healthLayer && healthLayer.route) {
        expect(healthLayer.route.methods.get).toBe(true);
      } else {
        fail("Health check route not found");
      }
    });

    it("should support GET for OAuth routes", () => {
      const googleLayer = authRoutes.stack.find(
        (layer) => layer.route && layer.route.path === "/google"
      );

      if (googleLayer && googleLayer.route) {
        expect(googleLayer.route.methods.get).toBe(true);
      } else {
        fail("Google OAuth route not found");
      }
    });
  });

  describe("Middleware Stack", () => {
    it("should have middleware functions configured", () => {
      // Check that the router has middleware layers
      const hasMiddleware = authRoutes.stack.some(
        (layer) => layer.name === "router" || layer.handle
      );
      expect(hasMiddleware).toBe(true);
    });

    it("should have route handlers configured", () => {
      // Check that the router has route layers
      const hasRoutes = authRoutes.stack.some((layer) => layer.route);
      expect(hasRoutes).toBe(true);
    });
  });
});
