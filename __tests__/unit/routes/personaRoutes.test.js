/**
 * PersonaRoutes Test Suite
 * Tests the structure and configuration of persona routes
 */

const personaRoutes = require("../../../src/routes/personaRoutes");

describe("PersonaRoutes", () => {
  describe("Route Structure", () => {
    it("should be defined and be a function (Express router)", () => {
      expect(personaRoutes).toBeDefined();
      expect(typeof personaRoutes).toBe("function");
    });

    it("should have a stack property with route definitions", () => {
      expect(personaRoutes.stack).toBeDefined();
      expect(Array.isArray(personaRoutes.stack)).toBe(true);
      expect(personaRoutes.stack.length).toBeGreaterThan(0);
    });

    it("should have the correct number of routes", () => {
      // Should have 4 routes: GET /, GET /:id, POST /:id/favourite, POST /:id/chat
      const routeLayers = personaRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );
      expect(routeLayers).toHaveLength(4);
    });
  });

  describe("GET / (List All Personas)", () => {
    let getRoute;

    beforeEach(() => {
      getRoute = personaRoutes.stack.find(
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
      expect(getRoute.route.stack.length).toBeGreaterThan(3); // auth + rateLimit + logging + controller
    });

    it("should have the controller as the final handler", () => {
      const lastLayer = getRoute.route.stack[getRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("GET /:id (Get Persona Details)", () => {
    let getByIdRoute;

    beforeEach(() => {
      getByIdRoute = personaRoutes.stack.find(
        (layer) =>
          layer.route && layer.route.path === "/:id" && layer.route.methods.get
      );
    });

    it("should exist in the route stack", () => {
      expect(getByIdRoute).toBeDefined();
    });

    it("should have GET method", () => {
      expect(getByIdRoute.route.methods.get).toBe(true);
    });

    it("should have the correct path", () => {
      expect(getByIdRoute.route.path).toBe("/:id");
    });

    it("should have middleware stack", () => {
      expect(getByIdRoute.route.stack).toBeDefined();
      expect(Array.isArray(getByIdRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = getByIdRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = getByIdRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(getByIdRoute.route.stack.length).toBeGreaterThan(4); // auth + rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = getByIdRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        getByIdRoute.route.stack[getByIdRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("POST /:id/favourite (Toggle Favourite)", () => {
    let postFavouriteRoute;

    beforeEach(() => {
      postFavouriteRoute = personaRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/favourite" &&
          layer.route.methods.post
      );
    });

    it("should exist in the route stack", () => {
      expect(postFavouriteRoute).toBeDefined();
    });

    it("should have POST method", () => {
      expect(postFavouriteRoute.route.methods.post).toBe(true);
    });

    it("should have the correct path", () => {
      expect(postFavouriteRoute.route.path).toBe("/:id/favourite");
    });

    it("should have middleware stack", () => {
      expect(postFavouriteRoute.route.stack).toBeDefined();
      expect(Array.isArray(postFavouriteRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = postFavouriteRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = postFavouriteRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(postFavouriteRoute.route.stack.length).toBeGreaterThan(4); // auth + rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = postFavouriteRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        postFavouriteRoute.route.stack[
          postFavouriteRoute.route.stack.length - 1
        ];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("POST /:id/chat (Send Message)", () => {
    let postChatRoute;

    beforeEach(() => {
      postChatRoute = personaRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/chat" &&
          layer.route.methods.post
      );
    });

    it("should exist in the route stack", () => {
      expect(postChatRoute).toBeDefined();
    });

    it("should have POST method", () => {
      expect(postChatRoute.route.methods.post).toBe(true);
    });

    it("should have the correct path", () => {
      expect(postChatRoute.route.path).toBe("/:id/chat");
    });

    it("should have middleware stack", () => {
      expect(postChatRoute.route.stack).toBeDefined();
      expect(Array.isArray(postChatRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = postChatRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = postChatRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "chatLimiter")).toBe(true);
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(postChatRoute.route.stack.length).toBeGreaterThan(4); // auth + rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = postChatRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        postChatRoute.route.stack[postChatRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("Middleware Order", () => {
    it("should have authentication middleware first", () => {
      const routes = personaRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const firstMiddleware = route.route.stack[0];
        expect(firstMiddleware.name).toBe("authMiddleware");
      });
    });

    it("should have rate limiting middleware second", () => {
      const routes = personaRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const secondMiddleware = route.route.stack[1];
        // Different routes use different rate limiters
        expect(
          secondMiddleware.name === "personaLimiter" ||
            secondMiddleware.name === "chatLimiter"
        ).toBe(true);
      });
    });

    it("should have logging middleware third", () => {
      const routes = personaRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const thirdMiddleware = route.route.stack[2];
        // Should be the anonymous logging function
        expect(thirdMiddleware.handle).toBeDefined();
        expect(typeof thirdMiddleware.handle).toBe("function");
      });
    });

    it("should have validation middleware before controller for routes that need it", () => {
      const routes = personaRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const stackLength = route.route.stack.length;
        // Routes with validation should have more middleware layers
        if (route.route.path !== "/") {
          expect(stackLength).toBeGreaterThan(4);
        } else {
          expect(stackLength).toBeGreaterThan(3);
        }
      });
    });
  });

  describe("Route Configuration", () => {
    it("should have consistent middleware across all routes", () => {
      const routes = personaRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const middlewareNames = route.route.stack.map((layer) => layer.name);

        // All routes should have auth
        expect(middlewareNames).toContain("authMiddleware");

        // All routes should have rate limiting (either personaLimiter or chatLimiter)
        expect(
          middlewareNames.includes("personaLimiter") ||
            middlewareNames.includes("chatLimiter")
        ).toBe(true);
      });
    });

    it("should have proper error handling structure", () => {
      const routes = personaRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Each route should have multiple middleware layers
        expect(route.route.stack.length).toBeGreaterThanOrEqual(4);
      });
    });

    it("should have logging middleware on all routes", () => {
      const routes = personaRoutes.stack.filter(
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
      const routes = personaRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const expectedPaths = ["/", "/:id", "/:id/favourite", "/:id/chat"];

      const actualPaths = routes.map((route) => route.route.path);
      expect(actualPaths).toEqual(expect.arrayContaining(expectedPaths));
    });

    it("should have unique route paths", () => {
      const routes = personaRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const paths = routes.map((route) => route.route.path);
      const uniquePaths = [...new Set(paths)];

      expect(paths.length).toBe(uniquePaths.length);
    });
  });

  describe("HTTP Methods", () => {
    it("should have correct HTTP methods for each route", () => {
      const routes = personaRoutes.stack.filter(
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
        "/:id": ["get"],
        "/:id/favourite": ["post"],
        "/:id/chat": ["post"],
      };

      routeMethods.forEach((route) => {
        expect(route.methods).toEqual(expectedMethods[route.path]);
      });
    });
  });

  describe("Rate Limiting Strategy", () => {
    it("should use personaLimiter for persona management routes", () => {
      const personaManagementRoutes = personaRoutes.stack.filter(
        (layer) =>
          layer.route &&
          (layer.route.path === "/" ||
            layer.route.path === "/:id" ||
            layer.route.path === "/:id/favourite")
      );

      personaManagementRoutes.forEach((route) => {
        const middlewareNames = route.route.stack.map((layer) => layer.name);
        expect(middlewareNames).toContain("personaLimiter");
      });
    });

    it("should use chatLimiter for chat routes", () => {
      const chatRoute = personaRoutes.stack.find(
        (layer) => layer.route && layer.route.path === "/:id/chat"
      );

      expect(chatRoute).toBeDefined();
      const middlewareNames = chatRoute.route.stack.map((layer) => layer.name);
      expect(middlewareNames).toContain("chatLimiter");
    });
  });

  describe("Middleware Stack Depth", () => {
    it("should have consistent middleware stack depth for similar route types", () => {
      const routes = personaRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      // Routes with basic validation should have 6 layers
      const routesWithBasicValidation = routes.filter(
        (route) =>
          route.route.path === "/:id" || route.route.path === "/:id/favourite"
      );

      routesWithBasicValidation.forEach((route) => {
        expect(route.route.stack.length).toBe(6);
      });

      // Chat route with more complex validation should have 8 layers
      const chatRoute = routes.filter(
        (route) => route.route.path === "/:id/chat"
      );

      chatRoute.forEach((route) => {
        expect(route.route.stack.length).toBe(8);
      });

      // Routes without validation should have 4 layers
      const routesWithoutValidation = routes.filter(
        (route) => route.route.path === "/"
      );

      routesWithoutValidation.forEach((route) => {
        expect(route.route.stack.length).toBe(4);
      });
    });

    it("should have the expected middleware layers for routes with basic validation", () => {
      const routesWithBasicValidation = personaRoutes.stack.filter(
        (layer) =>
          layer.route &&
          (layer.route.path === "/:id" || layer.route.path === "/:id/favourite")
      );

      routesWithBasicValidation.forEach((route) => {
        const stack = route.route.stack;

        // Layer 0: Authentication middleware
        expect(stack[0].name).toBe("authMiddleware");

        // Layer 1: Rate limiting middleware
        expect(stack[1].name).toBe("personaLimiter");

        // Layer 2: Logging middleware (anonymous function)
        expect(stack[2].handle).toBeDefined();
        expect(typeof stack[2].handle).toBe("function");

        // Layer 3: Validation middleware (first validation function)
        expect(stack[3].name).toBe("middleware");

        // Layer 4: Validation middleware (handleValidationErrors)
        expect(stack[4].name).toBe("handleValidationErrors");

        // Layer 5: Controller
        expect(stack[5].handle).toBeDefined();
        expect(typeof stack[5].handle).toBe("function");
      });
    });

    it("should have the expected middleware layers for chat route", () => {
      const chatRoute = personaRoutes.stack.find(
        (layer) => layer.route && layer.route.path === "/:id/chat"
      );

      expect(chatRoute).toBeDefined();
      const stack = chatRoute.route.stack;

      // Layer 0: Authentication middleware
      expect(stack[0].name).toBe("authMiddleware");

      // Layer 1: Rate limiting middleware
      expect(stack[1].name).toBe("chatLimiter");

      // Layer 2: Logging middleware (anonymous function)
      expect(stack[2].handle).toBeDefined();
      expect(typeof stack[2].handle).toBe("function");

      // Layer 3-5: Validation middleware (multiple validation functions)
      expect(stack[3].name).toBe("middleware");
      expect(stack[4].name).toBe("middleware");
      expect(stack[5].name).toBe("middleware");

      // Layer 6: Validation middleware (handleValidationErrors)
      expect(stack[6].name).toBe("handleValidationErrors");

      // Layer 7: Controller
      expect(stack[7].handle).toBeDefined();
      expect(typeof stack[7].handle).toBe("function");
    });

    it("should have the expected middleware layers for routes without validation", () => {
      const routesWithoutValidation = personaRoutes.stack.filter(
        (layer) => layer.route && layer.route.path === "/"
      );

      routesWithoutValidation.forEach((route) => {
        const stack = route.route.stack;

        // Layer 0: Authentication middleware
        expect(stack[0].name).toBe("authMiddleware");

        // Layer 1: Rate limiting middleware
        expect(stack[1].name).toBe("personaLimiter");

        // Layer 2: Logging middleware (anonymous function)
        expect(stack[2].handle).toBeDefined();
        expect(typeof stack[2].handle).toBe("function");

        // Layer 3: Controller
        expect(stack[3].handle).toBeDefined();
        expect(typeof stack[3].handle).toBe("function");
      });
    });
  });

  describe("Route Functionality", () => {
    it("should support persona listing operations", () => {
      const listRoute = personaRoutes.stack.find(
        (layer) =>
          layer.route && layer.route.path === "/" && layer.route.methods.get
      );

      expect(listRoute).toBeDefined();
      expect(listRoute.route.methods.get).toBe(true);
    });

    it("should support persona retrieval operations", () => {
      const getByIdRoute = personaRoutes.stack.find(
        (layer) =>
          layer.route && layer.route.path === "/:id" && layer.route.methods.get
      );

      expect(getByIdRoute).toBeDefined();
      expect(getByIdRoute.route.methods.get).toBe(true);
    });

    it("should support favourite toggle operations", () => {
      const favouriteRoute = personaRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/favourite" &&
          layer.route.methods.post
      );

      expect(favouriteRoute).toBeDefined();
      expect(favouriteRoute.route.methods.post).toBe(true);
    });

    it("should support chat operations", () => {
      const chatRoute = personaRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/chat" &&
          layer.route.methods.post
      );

      expect(chatRoute).toBeDefined();
      expect(chatRoute.route.methods.post).toBe(true);
    });

    it("should have proper parameter handling", () => {
      const routes = personaRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        if (route.route.path !== "/") {
          // All non-root routes should have the :id parameter
          expect(route.route.path).toContain(":id");
        }
      });
    });
  });
});
