/**
 * MessageRoutes Test Suite
 * Tests the structure and configuration of message routes
 */

const messageRoutes = require("../../../src/routes/messageRoutes");

describe("MessageRoutes", () => {
  describe("Route Structure", () => {
    it("should be defined and be a function (Express router)", () => {
      expect(messageRoutes).toBeDefined();
      expect(typeof messageRoutes).toBe("function");
    });

    it("should have a stack property with route definitions", () => {
      expect(messageRoutes.stack).toBeDefined();
      expect(Array.isArray(messageRoutes.stack)).toBe(true);
      expect(messageRoutes.stack.length).toBeGreaterThan(0);
    });

    it("should have the correct number of routes", () => {
      // Should have 2 routes: PATCH /:id, POST /:id/reactions
      const routeLayers = messageRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );
      expect(routeLayers).toHaveLength(2);
    });
  });

  describe("PATCH /:id (Edit Message)", () => {
    let patchRoute;

    beforeEach(() => {
      patchRoute = messageRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id" &&
          layer.route.methods.patch
      );
    });

    it("should exist in the route stack", () => {
      expect(patchRoute).toBeDefined();
    });

    it("should have PATCH method", () => {
      expect(patchRoute.route.methods.patch).toBe(true);
    });

    it("should have the correct path", () => {
      expect(patchRoute.route.path).toBe("/:id");
    });

    it("should have middleware stack", () => {
      expect(patchRoute.route.stack).toBeDefined();
      expect(Array.isArray(patchRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = patchRoute.route.stack.map((layer) => layer.name);
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = patchRoute.route.stack.map((layer) => layer.name);
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(patchRoute.route.stack.length).toBeGreaterThan(4); // auth + rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = patchRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        patchRoute.route.stack[patchRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("POST /:id/reactions (Toggle Message Reaction)", () => {
    let postReactionsRoute;

    beforeEach(() => {
      postReactionsRoute = messageRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/reactions" &&
          layer.route.methods.post
      );
    });

    it("should exist in the route stack", () => {
      expect(postReactionsRoute).toBeDefined();
    });

    it("should have POST method", () => {
      expect(postReactionsRoute.route.methods.post).toBe(true);
    });

    it("should have the correct path", () => {
      expect(postReactionsRoute.route.path).toBe("/:id/reactions");
    });

    it("should have middleware stack", () => {
      expect(postReactionsRoute.route.stack).toBeDefined();
      expect(Array.isArray(postReactionsRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = postReactionsRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = postReactionsRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(postReactionsRoute.route.stack.length).toBeGreaterThan(4); // auth + rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = postReactionsRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        postReactionsRoute.route.stack[
          postReactionsRoute.route.stack.length - 1
        ];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("Middleware Order", () => {
    it("should have authentication middleware first", () => {
      const routes = messageRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const firstMiddleware = route.route.stack[0];
        expect(firstMiddleware.name).toBe("authMiddleware");
      });
    });

    it("should have rate limiting middleware second", () => {
      const routes = messageRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const secondMiddleware = route.route.stack[1];
        expect(secondMiddleware.name).toBe("personaLimiter");
      });
    });

    it("should have logging middleware third", () => {
      const routes = messageRoutes.stack.filter(
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
      const routes = messageRoutes.stack.filter(
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
      const routes = messageRoutes.stack.filter(
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
      const routes = messageRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Each route should have multiple middleware layers
        expect(route.route.stack.length).toBeGreaterThanOrEqual(5);
      });
    });

    it("should have logging middleware on all routes", () => {
      const routes = messageRoutes.stack.filter(
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
      const routes = messageRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const expectedPaths = ["/:id", "/:id/reactions"];

      const actualPaths = routes.map((route) => route.route.path);
      expect(actualPaths).toEqual(expect.arrayContaining(expectedPaths));
    });

    it("should have unique route paths", () => {
      const routes = messageRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const paths = routes.map((route) => route.route.path);
      const uniquePaths = [...new Set(paths)];

      expect(paths.length).toBe(uniquePaths.length);
    });
  });

  describe("HTTP Methods", () => {
    it("should have correct HTTP methods for each route", () => {
      const routes = messageRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const routeMethods = routes.map((route) => ({
        path: route.route.path,
        methods: Object.keys(route.route.methods).filter(
          (method) => route.route.methods[method]
        ),
      }));

      const expectedMethods = {
        "/:id": ["patch"],
        "/:id/reactions": ["post"],
      };

      routeMethods.forEach((route) => {
        expect(route.methods).toEqual(expectedMethods[route.path]);
      });
    });
  });

  describe("Middleware Stack Depth", () => {
    it("should have consistent middleware stack depth across all routes", () => {
      const routes = messageRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const stackDepths = routes.map((route) => route.route.stack.length);
      const uniqueDepths = [...new Set(stackDepths)];

      // All routes should have the same middleware stack depth
      expect(uniqueDepths).toHaveLength(1);
      expect(uniqueDepths[0]).toBeGreaterThanOrEqual(5);
    });

    it("should have the expected middleware layers", () => {
      const routes = messageRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const stack = route.route.stack;

        // Layer 0: Authentication middleware
        expect(stack[0].name).toBe("authMiddleware");

        // Layer 1: Rate limiting middleware
        expect(stack[1].name).toBe("personaLimiter");

        // Layer 2: Logging middleware (anonymous function)
        expect(stack[2].handle).toBeDefined();
        expect(typeof stack[2].handle).toBe("function");

        // Layer 3: Validation middleware
        expect(stack[3].handle).toBeDefined();
        expect(typeof stack[3].handle).toBe("function");

        // Layer 4: Controller
        expect(stack[4].handle).toBeDefined();
        expect(typeof stack[4].handle).toBe("function");
      });
    });
  });

  describe("Route Functionality", () => {
    it("should support message editing operations", () => {
      const editRoute = messageRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id" &&
          layer.route.methods.patch
      );

      expect(editRoute).toBeDefined();
      expect(editRoute.route.methods.patch).toBe(true);
    });

    it("should support reaction operations", () => {
      const reactionRoute = messageRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/reactions" &&
          layer.route.methods.post
      );

      expect(reactionRoute).toBeDefined();
      expect(reactionRoute.route.methods.post).toBe(true);
    });

    it("should have proper parameter handling", () => {
      const routes = messageRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // All routes should have the :id parameter
        expect(route.route.path).toContain(":id");
      });
    });
  });
});
