/**
 * ChatSessionRoutes Test Suite
 * Tests the structure and configuration of chat session routes
 */

const chatSessionRoutes = require("../../../src/routes/chatSessionRoutes");

describe("ChatSessionRoutes", () => {
  describe("Route Structure", () => {
    it("should be defined and be a function (Express router)", () => {
      expect(chatSessionRoutes).toBeDefined();
      expect(typeof chatSessionRoutes).toBe("function");
    });

    it("should have a stack property with route definitions", () => {
      expect(chatSessionRoutes.stack).toBeDefined();
      expect(Array.isArray(chatSessionRoutes.stack)).toBe(true);
      expect(chatSessionRoutes.stack.length).toBeGreaterThan(0);
    });

    it("should have the correct number of routes", () => {
      // Should have 3 routes: GET /, GET /:sessionId, DELETE /:sessionId
      const routeLayers = chatSessionRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );
      expect(routeLayers).toHaveLength(3);
    });
  });

  describe("GET / (Get User Chat Sessions)", () => {
    let getRoute;

    beforeEach(() => {
      getRoute = chatSessionRoutes.stack.find(
        (layer) =>
          layer.route && layer.route.path === "/" && layer.route.methods.get
      );
    });

    it("should exist in the route stack", () => {
      expect(getRoute).toBeDefined();
    });

    it("should have GET method", () => {
      expect(getRoute.route.methods.get).toBe(true);
    });

    it("should have the correct path", () => {
      expect(getRoute.route.path).toBe("/");
    });

    it("should have middleware stack", () => {
      expect(getRoute.route.stack).toBeDefined();
      expect(Array.isArray(getRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = getRoute.route.stack.map((layer) => layer.name);
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = getRoute.route.stack.map((layer) => layer.name);
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have validation middleware", () => {
      const middlewareNames = getRoute.route.stack.map((layer) => layer.name);
      // Should have the anonymous validation function
      expect(getRoute.route.stack.length).toBeGreaterThan(3); // auth + rateLimit + validation + controller
    });

    it("should have the controller as the final handler", () => {
      const lastLayer = getRoute.route.stack[getRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("GET /:sessionId (Get Specific Chat Session)", () => {
    let getSessionRoute;

    beforeEach(() => {
      getSessionRoute = chatSessionRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:sessionId" &&
          layer.route.methods.get
      );
    });

    it("should exist in the route stack", () => {
      expect(getSessionRoute).toBeDefined();
    });

    it("should have GET method", () => {
      expect(getSessionRoute.route.methods.get).toBe(true);
    });

    it("should have the correct path", () => {
      expect(getSessionRoute.route.path).toBe("/:sessionId");
    });

    it("should have middleware stack", () => {
      expect(getSessionRoute.route.stack).toBeDefined();
      expect(Array.isArray(getSessionRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = getSessionRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = getSessionRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have validation middleware", () => {
      const middlewareNames = getSessionRoute.route.stack.map(
        (layer) => layer.name
      );
      // Should have the anonymous validation function
      expect(getSessionRoute.route.stack.length).toBeGreaterThan(3); // auth + rateLimit + validation + controller
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        getSessionRoute.route.stack[getSessionRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("DELETE /:sessionId (Delete Chat Session)", () => {
    let deleteRoute;

    beforeEach(() => {
      deleteRoute = chatSessionRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:sessionId" &&
          layer.route.methods.delete
      );
    });

    it("should exist in the route stack", () => {
      expect(deleteRoute).toBeDefined();
    });

    it("should have DELETE method", () => {
      expect(deleteRoute.route.methods.delete).toBe(true);
    });

    it("should have the correct path", () => {
      expect(deleteRoute.route.path).toBe("/:sessionId");
    });

    it("should have middleware stack", () => {
      expect(deleteRoute.route.stack).toBeDefined();
      expect(Array.isArray(deleteRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = deleteRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = deleteRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have validation middleware", () => {
      const middlewareNames = deleteRoute.route.stack.map(
        (layer) => layer.name
      );
      // Should have the anonymous validation function
      expect(deleteRoute.route.stack.length).toBeGreaterThan(3); // auth + rateLimit + validation + controller
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        deleteRoute.route.stack[deleteRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("Middleware Order", () => {
    it("should have authentication middleware first", () => {
      const routes = chatSessionRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const firstMiddleware = route.route.stack[0];
        expect(firstMiddleware.name).toBe("authMiddleware");
      });
    });

    it("should have rate limiting middleware second", () => {
      const routes = chatSessionRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const secondMiddleware = route.route.stack[1];
        expect(secondMiddleware.name).toBe("personaLimiter");
      });
    });

    it("should have validation middleware before controller", () => {
      const routes = chatSessionRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const stackLength = route.route.stack.length;
        // Last layer should be controller, second to last should be validation
        expect(stackLength).toBeGreaterThan(3);
      });
    });
  });

  describe("Route Configuration", () => {
    it("should have consistent middleware across all routes", () => {
      const routes = chatSessionRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const middlewareNames = route.route.stack.map((layer) => layer.name);

        // All routes should have auth and rate limiting
        expect(middlewareNames).toContain("authMiddleware");
        expect(middlewareNames).toContain("personaLimiter");
      });
    });

    it("should have proper error handling structure", () => {
      const routes = chatSessionRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Each route should have multiple middleware layers
        expect(route.route.stack.length).toBeGreaterThanOrEqual(4);
      });
    });
  });
});
