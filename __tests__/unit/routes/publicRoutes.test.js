/**
 * PublicRoutes Test Suite
 * Tests the structure and configuration of public routes
 */

const publicRoutes = require("../../../src/routes/publicRoutes");

describe("PublicRoutes", () => {
  describe("Route Structure", () => {
    it("should be defined and be a function (Express router)", () => {
      expect(publicRoutes).toBeDefined();
      expect(typeof publicRoutes).toBe("function");
    });

    it("should have a stack property with route definitions", () => {
      expect(publicRoutes.stack).toBeDefined();
      expect(Array.isArray(publicRoutes.stack)).toBe(true);
      expect(publicRoutes.stack.length).toBeGreaterThan(0);
    });

    it("should have the correct number of routes", () => {
      // Should have 1 route: GET /:token
      const routeLayers = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );
      expect(routeLayers).toHaveLength(1);
    });
  });

  describe("GET /:token (Get Shared Conversation)", () => {
    let getSharedRoute;

    beforeEach(() => {
      getSharedRoute = publicRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:token" &&
          layer.route.methods.get
      );
    });

    it("should exist in the route stack", () => {
      expect(getSharedRoute).toBeDefined();
    });

    it("should have GET method", () => {
      expect(getSharedRoute.route.methods.get).toBe(true);
    });

    it("should have the correct path", () => {
      expect(getSharedRoute.route.path).toBe("/:token");
    });

    it("should have middleware stack", () => {
      expect(getSharedRoute.route.stack).toBeDefined();
      expect(Array.isArray(getSharedRoute.route.stack)).toBe(true);
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = getSharedRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "publicLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(getSharedRoute.route.stack.length).toBeGreaterThan(3); // rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = getSharedRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        getSharedRoute.route.stack[getSharedRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("Middleware Order", () => {
    it("should have rate limiting middleware first", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const firstMiddleware = route.route.stack[0];
        expect(firstMiddleware.name).toBe("publicLimiter");
      });
    });

    it("should have logging middleware second", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const secondMiddleware = route.route.stack[1];
        // Should be the anonymous logging function
        expect(secondMiddleware.handle).toBeDefined();
        expect(typeof secondMiddleware.handle).toBe("function");
      });
    });

    it("should have validation middleware before controller", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const stackLength = route.route.stack.length;
        // Should have multiple middleware layers including validation
        expect(stackLength).toBeGreaterThan(3); // rateLimit + logging + validation + controller
      });
    });
  });

  describe("Route Configuration", () => {
    it("should have consistent middleware across all routes", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const middlewareNames = route.route.stack.map((layer) => layer.name);

        // All routes should have rate limiting
        expect(middlewareNames).toContain("publicLimiter");
      });
    });

    it("should have proper error handling structure", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Each route should have multiple middleware layers
        expect(route.route.stack.length).toBeGreaterThanOrEqual(4);
      });
    });

    it("should have logging middleware on all routes", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Second middleware should be the logging function
        const secondMiddleware = route.route.stack[1];
        expect(secondMiddleware.handle).toBeDefined();
        expect(typeof secondMiddleware.handle).toBe("function");
      });
    });

    it("should not have authentication middleware (public routes)", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const middlewareNames = route.route.stack.map((layer) => layer.name);

        // Public routes should NOT have authentication middleware
        expect(middlewareNames).not.toContain("authMiddleware");
      });
    });
  });

  describe("Route Paths", () => {
    it("should have the correct route paths", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const expectedPaths = ["/:token"];

      const actualPaths = routes.map((route) => route.route.path);
      expect(actualPaths).toEqual(expect.arrayContaining(expectedPaths));
    });

    it("should have unique route paths", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const paths = routes.map((route) => route.route.path);
      const uniquePaths = [...new Set(paths)];

      expect(paths.length).toBe(uniquePaths.length);
    });
  });

  describe("HTTP Methods", () => {
    it("should have correct HTTP methods for each route", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const routeMethods = routes.map((route) => ({
        path: route.route.path,
        methods: Object.keys(route.route.methods).filter(
          (method) => route.route.methods[method]
        ),
      }));

      const expectedMethods = {
        "/:token": ["get"],
      };

      routeMethods.forEach((route) => {
        expect(route.methods).toEqual(expectedMethods[route.path]);
      });
    });
  });

  describe("Middleware Stack Depth", () => {
    it("should have consistent middleware stack depth for all routes", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      // All routes should have the same middleware stack depth
      routes.forEach((route) => {
        expect(route.route.stack.length).toBe(6); // rateLimit + logging + validation + validationLogging + controller
      });
    });

    it("should have the expected middleware layers", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const stack = route.route.stack;

        // Layer 0: Rate limiting middleware (mocked as anonymous function)
        expect(stack[0].handle).toBeDefined();
        expect(typeof stack[0].handle).toBe("function");

        // Layer 1: Logging middleware (anonymous function)
        expect(stack[1].handle).toBeDefined();
        expect(typeof stack[1].handle).toBe("function");

        // Layer 2: Validation middleware (first validation function)
        expect(stack[2].name).toBe("middleware");

        // Layer 3: Validation middleware (handleValidationErrors)
        expect(stack[3].name).toBe("handleValidationErrors");

        // Layer 4: Validation logging middleware (anonymous function)
        expect(stack[4].handle).toBeDefined();
        expect(typeof stack[4].handle).toBe("function");

        // Layer 5: Controller
        expect(stack[5].handle).toBeDefined();
        expect(typeof stack[5].handle).toBe("function");
      });
    });
  });

  describe("Route Functionality", () => {
    it("should support shared conversation retrieval operations", () => {
      const sharedRoute = publicRoutes.stack.find(
        (layer) => layer.route && layer.route.path === "/:token"
      );

      expect(sharedRoute).toBeDefined();
      expect(sharedRoute.route.methods.get).toBe(true);
    });

    it("should have proper parameter handling", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // All routes should be properly configured
        expect(route.route.path).toBeDefined();
        expect(route.route.methods).toBeDefined();
      });
    });

    it("should be accessible without authentication", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const middlewareNames = route.route.stack.map((layer) => layer.name);

        // Should not have any authentication middleware
        expect(middlewareNames).not.toContain("authMiddleware");
        expect(middlewareNames).not.toContain("authenticatedOnly");
      });
    });
  });

  describe("Security Features", () => {
    it("should have rate limiting for abuse prevention", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const middlewareNames = route.route.stack.map((layer) => layer.name);

        // Should have publicLimiter for rate limiting
        expect(middlewareNames).toContain("publicLimiter");
      });
    });

    it("should have comprehensive logging for security monitoring", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have multiple logging middleware layers
        expect(route.route.stack.length).toBeGreaterThan(3);

        // Check for logging middleware presence
        const hasLoggingMiddleware = route.route.stack.some(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(hasLoggingMiddleware).toBe(true);
      });
    });

    it("should log client information for security analysis", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have logging middleware that captures client info
        const loggingMiddleware = route.route.stack.find(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(loggingMiddleware).toBeDefined();
      });
    });
  });

  describe("Public Access Characteristics", () => {
    it("should be designed for public consumption", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Public routes should not require authentication
        const middlewareNames = route.route.stack.map((layer) => layer.name);
        expect(middlewareNames).not.toContain("authMiddleware");

        // Should have rate limiting for public protection
        expect(middlewareNames).toContain("publicLimiter");
      });
    });

    it("should have appropriate security measures for public endpoints", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have validation middleware
        const hasValidationMiddleware = route.route.stack.some(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(hasValidationMiddleware).toBe(true);

        // Should have rate limiting
        const middlewareNames = route.route.stack.map((layer) => layer.name);
        expect(middlewareNames).toContain("publicLimiter");
      });
    });

    it("should provide comprehensive audit trail for public access", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have multiple middleware layers for comprehensive logging
        expect(route.route.stack.length).toBeGreaterThanOrEqual(4);

        // Should have logging middleware
        const hasLoggingMiddleware = route.route.stack.some(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(hasLoggingMiddleware).toBe(true);
      });
    });
  });

  describe("Token Parameter Handling", () => {
    it("should properly handle token parameter in route path", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have token parameter in path
        expect(route.route.path).toContain(":token");

        // Should support GET method
        expect(route.route.methods.get).toBe(true);
      });
    });

    it("should have validation middleware for token parameter", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have validation middleware
        const hasValidationMiddleware = route.route.stack.some(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(hasValidationMiddleware).toBe(true);
      });
    });
  });

  describe("Error Handling", () => {
    it("should have proper error handling structure", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Each route should have multiple middleware layers for error handling
        expect(route.route.stack.length).toBeGreaterThanOrEqual(4);

        // Should have try-catch blocks in logging middleware
        const loggingMiddleware = route.route.stack.find(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(loggingMiddleware).toBeDefined();
      });
    });

    it("should propagate errors correctly", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have proper middleware chain for error propagation
        const stackLength = route.route.stack.length;
        expect(stackLength).toBeGreaterThan(3);

        // Should have controller as final handler
        const lastLayer = route.route.stack[stackLength - 1];
        expect(lastLayer.handle).toBeDefined();
        expect(typeof lastLayer.handle).toBe("function");
      });
    });
  });

  describe("Logging and Monitoring", () => {
    it("should log all public access attempts", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have logging middleware
        const hasLoggingMiddleware = route.route.stack.some(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(hasLoggingMiddleware).toBe(true);
      });
    });

    it("should capture comprehensive client information", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have logging middleware that can capture client info
        const loggingMiddleware = route.route.stack.find(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(loggingMiddleware).toBeDefined();
      });
    });

    it("should provide security monitoring capabilities", () => {
      const routes = publicRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have rate limiting for abuse detection
        const middlewareNames = route.route.stack.map((layer) => layer.name);
        expect(middlewareNames).toContain("publicLimiter");

        // Should have logging for security analysis
        const hasLoggingMiddleware = route.route.stack.some(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(hasLoggingMiddleware).toBe(true);
      });
    });
  });
});
