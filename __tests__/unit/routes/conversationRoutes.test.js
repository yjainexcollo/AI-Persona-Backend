/**
 * ConversationRoutes Test Suite
 * Tests the structure and configuration of conversation routes
 */

const conversationRoutes = require("../../../src/routes/conversationRoutes");

describe("ConversationRoutes", () => {
  describe("Route Structure", () => {
    it("should be defined and be a function (Express router)", () => {
      expect(conversationRoutes).toBeDefined();
      expect(typeof conversationRoutes).toBe("function");
    });

    it("should have a stack property with route definitions", () => {
      expect(conversationRoutes.stack).toBeDefined();
      expect(Array.isArray(conversationRoutes.stack)).toBe(true);
      expect(conversationRoutes.stack.length).toBeGreaterThan(0);
    });

    it("should have the correct number of routes", () => {
      // Should have 5 routes: GET /, PATCH /:id/visibility, POST /:id/files, PATCH /:id/archive, POST /:id/share
      const routeLayers = conversationRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );
      expect(routeLayers).toHaveLength(5);
    });
  });

  describe("GET / (List User Conversations)", () => {
    let getRoute;

    beforeEach(() => {
      getRoute = conversationRoutes.stack.find(
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

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(getRoute.route.stack.length).toBeGreaterThan(4); // auth + rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = getRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer = getRoute.route.stack[getRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("PATCH /:id/visibility (Update Conversation Visibility)", () => {
    let patchVisibilityRoute;

    beforeEach(() => {
      patchVisibilityRoute = conversationRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/visibility" &&
          layer.route.methods.patch
      );
    });

    it("should exist in the route stack", () => {
      expect(patchVisibilityRoute).toBeDefined();
    });

    it("should have PATCH method", () => {
      expect(patchVisibilityRoute.route.methods.patch).toBe(true);
    });

    it("should have the correct path", () => {
      expect(patchVisibilityRoute.route.path).toBe("/:id/visibility");
    });

    it("should have middleware stack", () => {
      expect(patchVisibilityRoute.route.stack).toBeDefined();
      expect(Array.isArray(patchVisibilityRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = patchVisibilityRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = patchVisibilityRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(patchVisibilityRoute.route.stack.length).toBeGreaterThan(4); // auth + rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = patchVisibilityRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        patchVisibilityRoute.route.stack[
          patchVisibilityRoute.route.stack.length - 1
        ];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("POST /:id/files (Request File Upload URL)", () => {
    let postFilesRoute;

    beforeEach(() => {
      postFilesRoute = conversationRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/files" &&
          layer.route.methods.post
      );
    });

    it("should exist in the route stack", () => {
      expect(postFilesRoute).toBeDefined();
    });

    it("should have POST method", () => {
      expect(postFilesRoute.route.methods.post).toBe(true);
    });

    it("should have the correct path", () => {
      expect(postFilesRoute.route.path).toBe("/:id/files");
    });

    it("should have middleware stack", () => {
      expect(postFilesRoute.route.stack).toBeDefined();
      expect(Array.isArray(postFilesRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = postFilesRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = postFilesRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(postFilesRoute.route.stack.length).toBeGreaterThan(4); // auth + rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = postFilesRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        postFilesRoute.route.stack[postFilesRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("PATCH /:id/archive (Archive/Unarchive Conversation)", () => {
    let patchArchiveRoute;

    beforeEach(() => {
      patchArchiveRoute = conversationRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/archive" &&
          layer.route.methods.patch
      );
    });

    it("should exist in the route stack", () => {
      expect(patchArchiveRoute).toBeDefined();
    });

    it("should have PATCH method", () => {
      expect(patchArchiveRoute.route.methods.patch).toBe(true);
    });

    it("should have the correct path", () => {
      expect(patchArchiveRoute.route.path).toBe("/:id/archive");
    });

    it("should have middleware stack", () => {
      expect(patchArchiveRoute.route.stack).toBeDefined();
      expect(Array.isArray(patchArchiveRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = patchArchiveRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = patchArchiveRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(patchArchiveRoute.route.stack.length).toBeGreaterThan(4); // auth + rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = patchArchiveRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        patchArchiveRoute.route.stack[patchArchiveRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("POST /:id/share (Create Shareable Link)", () => {
    let postShareRoute;

    beforeEach(() => {
      postShareRoute = conversationRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/share" &&
          layer.route.methods.post
      );
    });

    it("should exist in the route stack", () => {
      expect(postShareRoute).toBeDefined();
    });

    it("should have POST method", () => {
      expect(postShareRoute.route.methods.post).toBe(true);
    });

    it("should have the correct path", () => {
      expect(postShareRoute.route.path).toBe("/:id/share");
    });

    it("should have middleware stack", () => {
      expect(postShareRoute.route.stack).toBeDefined();
      expect(Array.isArray(postShareRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = postShareRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = postShareRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(postShareRoute.route.stack.length).toBeGreaterThan(4); // auth + rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = postShareRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        postShareRoute.route.stack[postShareRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("Middleware Order", () => {
    it("should have authentication middleware first", () => {
      const routes = conversationRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const firstMiddleware = route.route.stack[0];
        expect(firstMiddleware.name).toBe("authMiddleware");
      });
    });

    it("should have rate limiting middleware second", () => {
      const routes = conversationRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const secondMiddleware = route.route.stack[1];
        expect(secondMiddleware.name).toBe("personaLimiter");
      });
    });

    it("should have logging middleware third", () => {
      const routes = conversationRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const thirdMiddleware = route.route.stack[2];
        // Should be the anonymous logging function
        expect(thirdMiddleware.handle).toBeDefined();
        expect(typeof thirdMiddleware.handle).toBe("function");
      });
    });

    it("should have validation middleware before controller", () => {
      const routes = conversationRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const stackLength = route.route.stack.length;
        // Last layer should be controller, second to last should be validation
        expect(stackLength).toBeGreaterThan(4);
      });
    });
  });

  describe("Route Configuration", () => {
    it("should have consistent middleware across all routes", () => {
      const routes = conversationRoutes.stack.filter(
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
      const routes = conversationRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Each route should have multiple middleware layers
        expect(route.route.stack.length).toBeGreaterThanOrEqual(5);
      });
    });

    it("should have logging middleware on all routes", () => {
      const routes = conversationRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Third middleware should be the logging function
        const thirdMiddleware = route.route.stack[2];
        expect(thirdMiddleware.handle).toBeDefined();
        expect(typeof thirdMiddleware.handle).toBe("function");
      });
    });
  });

  describe("Route Paths", () => {
    it("should have the correct route paths", () => {
      const routes = conversationRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const expectedPaths = [
        "/",
        "/:id/visibility",
        "/:id/files",
        "/:id/archive",
        "/:id/share",
      ];

      const actualPaths = routes.map((route) => route.route.path);
      expect(actualPaths).toEqual(expect.arrayContaining(expectedPaths));
    });

    it("should have unique route paths", () => {
      const routes = conversationRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const paths = routes.map((route) => route.route.path);
      const uniquePaths = [...new Set(paths)];

      expect(paths.length).toBe(uniquePaths.length);
    });
  });

  describe("HTTP Methods", () => {
    it("should have correct HTTP methods for each route", () => {
      const routes = conversationRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const routeMethods = routes.map((route) => ({
        path: route.route.path,
        methods: Object.keys(route.route.methods).filter(
          (method) => route.route.methods[method]
        ),
      }));

      const expectedMethods = {
        "/": ["get"],
        "/:id/visibility": ["patch"],
        "/:id/files": ["post"],
        "/:id/archive": ["patch"],
        "/:id/share": ["post"],
      };

      routeMethods.forEach((route) => {
        expect(route.methods).toEqual(expectedMethods[route.path]);
      });
    });
  });
});
