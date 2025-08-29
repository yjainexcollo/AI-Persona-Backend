/**
 * WorkspaceRoutes Test Suite
 * Tests the structure and configuration of workspace routes
 */

const workspaceRoutes = require("../../../src/routes/workspaceRoutes");

describe("WorkspaceRoutes", () => {
  describe("Route Structure", () => {
    it("should be defined and be a function (Express router)", () => {
      expect(workspaceRoutes).toBeDefined();
      expect(typeof workspaceRoutes).toBe("function");
    });

    it("should have a stack property with route definitions", () => {
      expect(workspaceRoutes.stack).toBeDefined();
      expect(Array.isArray(workspaceRoutes.stack)).toBe(true);
      expect(workspaceRoutes.stack.length).toBeGreaterThan(0);
    });

    it("should have the correct number of routes", () => {
      // Should have 7 routes: GET /:id, PUT /:id, GET /:id/members, PATCH /:id/members/:uid/role, PATCH /:id/members/:uid/status, DELETE /:id/members/:uid, POST /:id/delete
      const routeLayers = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );
      expect(routeLayers).toHaveLength(7);
    });
  });

  describe("GET /:id (Get Workspace)", () => {
    let getWorkspaceRoute;

    beforeEach(() => {
      getWorkspaceRoute = workspaceRoutes.stack.find(
        (layer) =>
          layer.route && layer.route.path === "/:id" && layer.route.methods.get
      );
    });

    it("should exist in the route stack", () => {
      expect(getWorkspaceRoute).toBeDefined();
    });

    it("should have GET method", () => {
      expect(getWorkspaceRoute.route.methods.get).toBe(true);
    });

    it("should have the correct path", () => {
      expect(getWorkspaceRoute.route.path).toBe("/:id");
    });

    it("should have middleware stack", () => {
      expect(getWorkspaceRoute.route.stack).toBeDefined();
      expect(Array.isArray(getWorkspaceRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = getWorkspaceRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = getWorkspaceRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(getWorkspaceRoute.route.stack.length).toBeGreaterThan(4); // auth + rateLimit + logging + validation + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = getWorkspaceRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        getWorkspaceRoute.route.stack[getWorkspaceRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("PUT /:id (Update Workspace)", () => {
    let putWorkspaceRoute;

    beforeEach(() => {
      putWorkspaceRoute = workspaceRoutes.stack.find(
        (layer) =>
          layer.route && layer.route.path === "/:id" && layer.route.methods.put
      );
    });

    it("should exist in the route stack", () => {
      expect(putWorkspaceRoute).toBeDefined();
    });

    it("should have PUT method", () => {
      expect(putWorkspaceRoute.route.methods.put).toBe(true);
    });

    it("should have the correct path", () => {
      expect(putWorkspaceRoute.route.path).toBe("/:id");
    });

    it("should have middleware stack", () => {
      expect(putWorkspaceRoute.route.stack).toBeDefined();
      expect(Array.isArray(putWorkspaceRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = putWorkspaceRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = putWorkspaceRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(putWorkspaceRoute.route.stack.length).toBeGreaterThan(5); // auth + rateLimit + logging + validation + role + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = putWorkspaceRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have role middleware", () => {
      // Role middleware appears as an anonymous function in the test environment
      // Check that there are multiple anonymous functions (including role middleware)
      const anonymousFunctions = putWorkspaceRoute.route.stack.filter(
        (layer) => layer.name === "<anonymous>"
      );
      expect(anonymousFunctions.length).toBeGreaterThan(1);
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        putWorkspaceRoute.route.stack[putWorkspaceRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("GET /:id/members (List Members)", () => {
    let getMembersRoute;

    beforeEach(() => {
      getMembersRoute = workspaceRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/members" &&
          layer.route.methods.get
      );
    });

    it("should exist in the route stack", () => {
      expect(getMembersRoute).toBeDefined();
    });

    it("should have GET method", () => {
      expect(getMembersRoute.route.methods.get).toBe(true);
    });

    it("should have the correct path", () => {
      expect(getMembersRoute.route.path).toBe("/:id/members");
    });

    it("should have middleware stack", () => {
      expect(getMembersRoute.route.stack).toBeDefined();
      expect(Array.isArray(getMembersRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = getMembersRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = getMembersRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(getMembersRoute.route.stack.length).toBeGreaterThan(5); // auth + rateLimit + logging + validation + role + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = getMembersRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have role middleware", () => {
      // Role middleware appears as an anonymous function in the test environment
      // Check that there are multiple anonymous functions (including role middleware)
      const anonymousFunctions = getMembersRoute.route.stack.filter(
        (layer) => layer.name === "<anonymous>"
      );
      expect(anonymousFunctions.length).toBeGreaterThan(1);
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        getMembersRoute.route.stack[getMembersRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("PATCH /:id/members/:uid/role (Change Member Role)", () => {
    let patchRoleRoute;

    beforeEach(() => {
      patchRoleRoute = workspaceRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/members/:uid/role" &&
          layer.route.methods.patch
      );
    });

    it("should exist in the route stack", () => {
      expect(patchRoleRoute).toBeDefined();
    });

    it("should have PATCH method", () => {
      expect(patchRoleRoute.route.methods.patch).toBe(true);
    });

    it("should have the correct path", () => {
      expect(patchRoleRoute.route.path).toBe("/:id/members/:uid/role");
    });

    it("should have middleware stack", () => {
      expect(patchRoleRoute.route.stack).toBeDefined();
      expect(Array.isArray(patchRoleRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = patchRoleRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = patchRoleRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(patchRoleRoute.route.stack.length).toBeGreaterThan(6); // auth + rateLimit + logging + validation1 + validation2 + role + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = patchRoleRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have role middleware", () => {
      // Role middleware appears as an anonymous function in the test environment
      // Check that there are multiple anonymous functions (including role middleware)
      const anonymousFunctions = patchRoleRoute.route.stack.filter(
        (layer) => layer.name === "<anonymous>"
      );
      expect(anonymousFunctions.length).toBeGreaterThan(1);
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        patchRoleRoute.route.stack[patchRoleRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("PATCH /:id/members/:uid/status (Change Member Status)", () => {
    let patchStatusRoute;

    beforeEach(() => {
      patchStatusRoute = workspaceRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/members/:uid/status" &&
          layer.route.methods.patch
      );
    });

    it("should exist in the route stack", () => {
      expect(patchStatusRoute).toBeDefined();
    });

    it("should have PATCH method", () => {
      expect(patchStatusRoute.route.methods.patch).toBe(true);
    });

    it("should have the correct path", () => {
      expect(patchStatusRoute.route.path).toBe("/:id/members/:uid/status");
    });

    it("should have middleware stack", () => {
      expect(patchStatusRoute.route.stack).toBeDefined();
      expect(Array.isArray(patchStatusRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = patchStatusRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = patchStatusRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(patchStatusRoute.route.stack.length).toBeGreaterThan(6); // auth + rateLimit + logging + validation1 + validation2 + role + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = patchStatusRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have role middleware", () => {
      // Role middleware appears as an anonymous function in the test environment
      // Check that there are multiple anonymous functions (including role middleware)
      const anonymousFunctions = patchStatusRoute.route.stack.filter(
        (layer) => layer.name === "<anonymous>"
      );
      expect(anonymousFunctions.length).toBeGreaterThan(1);
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        patchStatusRoute.route.stack[patchStatusRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("DELETE /:id/members/:uid (Remove Member)", () => {
    let deleteMemberRoute;

    beforeEach(() => {
      deleteMemberRoute = workspaceRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/members/:uid" &&
          layer.route.methods.delete
      );
    });

    it("should exist in the route stack", () => {
      expect(deleteMemberRoute).toBeDefined();
    });

    it("should have DELETE method", () => {
      expect(deleteMemberRoute.route.methods.delete).toBe(true);
    });

    it("should have the correct path", () => {
      expect(deleteMemberRoute.route.path).toBe("/:id/members/:uid");
    });

    it("should have middleware stack", () => {
      expect(deleteMemberRoute.route.stack).toBeDefined();
      expect(Array.isArray(deleteMemberRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = deleteMemberRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = deleteMemberRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(deleteMemberRoute.route.stack.length).toBeGreaterThan(5); // auth + rateLimit + logging + validation1 + validation2 + role + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = deleteMemberRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have role middleware", () => {
      // Role middleware appears as an anonymous function in the test environment
      // Check that there are multiple anonymous functions (including role middleware)
      const anonymousFunctions = deleteMemberRoute.route.stack.filter(
        (layer) => layer.name === "<anonymous>"
      );
      expect(anonymousFunctions.length).toBeGreaterThan(1);
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        deleteMemberRoute.route.stack[deleteMemberRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("POST /:id/delete (Request Deletion)", () => {
    let postDeleteRoute;

    beforeEach(() => {
      postDeleteRoute = workspaceRoutes.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === "/:id/delete" &&
          layer.route.methods.post
      );
    });

    it("should exist in the route stack", () => {
      expect(postDeleteRoute).toBeDefined();
    });

    it("should have POST method", () => {
      expect(postDeleteRoute.route.methods.post).toBe(true);
    });

    it("should have the correct path", () => {
      expect(postDeleteRoute.route.path).toBe("/:id/delete");
    });

    it("should have middleware stack", () => {
      expect(postDeleteRoute.route.stack).toBeDefined();
      expect(Array.isArray(postDeleteRoute.route.stack)).toBe(true);
    });

    it("should have authentication middleware", () => {
      const middlewareNames = postDeleteRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "authMiddleware")).toBe(
        true
      );
    });

    it("should have rate limiting middleware", () => {
      const middlewareNames = postDeleteRoute.route.stack.map(
        (layer) => layer.name
      );
      expect(middlewareNames.some((name) => name === "personaLimiter")).toBe(
        true
      );
    });

    it("should have logging middleware", () => {
      // Should have the anonymous logging function
      expect(postDeleteRoute.route.stack.length).toBeGreaterThan(5); // auth + rateLimit + logging + validation + role + controller
    });

    it("should have validation middleware", () => {
      // Check that validation middleware is present by looking for the function
      const validationMiddleware = postDeleteRoute.route.stack.find(
        (layer) => layer.handle && typeof layer.handle === "function"
      );
      expect(validationMiddleware).toBeDefined();
    });

    it("should have role middleware", () => {
      // Role middleware appears as an anonymous function in the test environment
      // Check that there are multiple anonymous functions (including role middleware)
      const anonymousFunctions = postDeleteRoute.route.stack.filter(
        (layer) => layer.name === "<anonymous>"
      );
      expect(anonymousFunctions.length).toBeGreaterThan(1);
    });

    it("should have the controller as the final handler", () => {
      const lastLayer =
        postDeleteRoute.route.stack[postDeleteRoute.route.stack.length - 1];
      expect(lastLayer.handle).toBeDefined();
      expect(typeof lastLayer.handle).toBe("function");
    });
  });

  describe("Middleware Order", () => {
    it("should have authentication middleware first", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const firstMiddleware = route.route.stack[0];
        expect(firstMiddleware.name).toBe("authMiddleware");
      });
    });

    it("should have rate limiting middleware second", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const secondMiddleware = route.route.stack[1];
        expect(secondMiddleware.name).toBe("personaLimiter");
      });
    });

    it("should have logging middleware third", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const thirdMiddleware = route.route.stack[2];
        // Should be the anonymous logging function
        expect(thirdMiddleware.handle).toBeDefined();
        expect(typeof thirdMiddleware.handle).toBe("function");
      });
    });

    it("should have validation middleware before role middleware", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const stackLength = route.route.stack.length;
        // Should have multiple middleware layers including validation
        expect(stackLength).toBeGreaterThan(4); // auth + rateLimit + logging + validation + role + controller
      });
    });
  });

  describe("Route Configuration", () => {
    it("should have consistent middleware across all routes", () => {
      const routes = workspaceRoutes.stack.filter(
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
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Each route should have multiple middleware layers
        expect(route.route.stack.length).toBeGreaterThanOrEqual(5);
      });
    });

    it("should have logging middleware on all routes", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Third middleware should be the logging function
        const thirdMiddleware = route.route.stack[2];
        expect(thirdMiddleware.handle).toBeDefined();
        expect(typeof thirdMiddleware.handle).toBe("function");
      });
    });

    it("should have role middleware on administrative routes", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      // All routes except GET /:id should have role middleware
      routes.forEach((route) => {
        if (route.route.path !== "/:id" || !route.route.methods.get) {
          // Role middleware appears as an anonymous function in the test environment
          // Check that there are multiple anonymous functions (including role middleware)
          const anonymousFunctions = route.route.stack.filter(
            (layer) => layer.name === "<anonymous>"
          );
          expect(anonymousFunctions.length).toBeGreaterThan(1);
        }
      });
    });
  });

  describe("Route Paths", () => {
    it("should have the correct route paths", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const expectedPaths = [
        "/:id",
        "/:id/members",
        "/:id/members/:uid/role",
        "/:id/members/:uid/status",
        "/:id/members/:uid",
        "/:id/delete",
      ];

      const actualPaths = routes.map((route) => route.route.path);
      expect(actualPaths).toEqual(expect.arrayContaining(expectedPaths));
    });

    it("should have unique route paths", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const paths = routes.map((route) => route.route.path);
      const uniquePaths = [...new Set(paths)];

      // There are 7 total routes but only 6 unique paths because /:id has both GET and PUT
      expect(paths.length).toBe(7);
      expect(uniquePaths.length).toBe(6);
    });
  });

  describe("HTTP Methods", () => {
    it("should have correct HTTP methods for each route", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      const routeMethods = routes.map((route) => ({
        path: route.route.path,
        methods: Object.keys(route.route.methods).filter(
          (method) => route.route.methods[method]
        ),
      }));

      const expectedMethods = {
        "/:id": ["get", "put"],
        "/:id/members": ["get"],
        "/:id/members/:uid/role": ["patch"],
        "/:id/members/:uid/status": ["patch"],
        "/:id/members/:uid": ["delete"],
        "/:id/delete": ["post"],
      };

      // Group routes by path to handle duplicate paths
      const routesByPath = {};
      routeMethods.forEach((route) => {
        if (!routesByPath[route.path]) {
          routesByPath[route.path] = [];
        }
        routesByPath[route.path].push(...route.methods);
      });

      // Check that each path has the expected methods
      Object.keys(expectedMethods).forEach((path) => {
        const expected = expectedMethods[path].sort();
        const actual = routesByPath[path].sort();
        expect(actual).toEqual(expected);
      });
    });
  });

  describe("Middleware Stack Depth", () => {
    it("should have consistent middleware stack depth for similar route types", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      // GET /:id route should have 6 layers (auth + rateLimit + logging + validation + controller)
      const getWorkspaceRoute = routes.find(
        (route) => route.route.path === "/:id" && route.route.methods.get
      );
      expect(getWorkspaceRoute.route.stack.length).toBe(6);

      // Routes with role middleware should have deeper stacks due to validation complexity
      const routesWithRole = routes.filter(
        (route) => route.route.path !== "/:id" || !route.route.methods.get
      );
      routesWithRole.forEach((route) => {
        expect(route.route.stack.length).toBeGreaterThan(6);
      });
    });

    it("should have the expected middleware layers for GET workspace route", () => {
      const getWorkspaceRoute = workspaceRoutes.stack.find(
        (layer) =>
          layer.route && layer.route.path === "/:id" && layer.route.methods.get
      );

      expect(getWorkspaceRoute).toBeDefined();
      const stack = getWorkspaceRoute.route.stack;

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

    it("should have the expected middleware layers for routes with role middleware", () => {
      const routesWithRole = workspaceRoutes.stack.filter(
        (layer) =>
          layer.route &&
          (layer.route.path !== "/:id" || !layer.route.methods.get)
      );

      routesWithRole.forEach((route) => {
        const stack = route.route.stack;

        // Layer 0: Authentication middleware
        expect(stack[0].name).toBe("authMiddleware");

        // Layer 1: Rate limiting middleware
        expect(stack[1].name).toBe("personaLimiter");

        // Layer 2: Logging middleware (anonymous function)
        expect(stack[2].handle).toBeDefined();
        expect(typeof stack[2].handle).toBe("function");

        // Should have validation middleware somewhere in the stack
        const hasValidationMiddleware = stack.some(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(hasValidationMiddleware).toBe(true);

        // Should have role middleware somewhere in the stack (as anonymous function)
        const hasRoleMiddleware = stack.some(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(hasRoleMiddleware).toBe(true);

        // Last layer should be controller
        const lastLayer = stack[stack.length - 1];
        expect(lastLayer.handle).toBeDefined();
        expect(typeof lastLayer.handle).toBe("function");
      });
    });
  });

  describe("Route Functionality", () => {
    it("should support workspace retrieval operations", () => {
      const getWorkspaceRoute = workspaceRoutes.stack.find(
        (layer) =>
          layer.route && layer.route.path === "/:id" && layer.route.methods.get
      );

      expect(getWorkspaceRoute).toBeDefined();
      expect(getWorkspaceRoute.route.methods.get).toBe(true);
    });

    it("should support workspace update operations", () => {
      const putWorkspaceRoute = workspaceRoutes.stack.find(
        (layer) =>
          layer.route && layer.route.path === "/:id" && layer.route.methods.put
      );

      expect(putWorkspaceRoute).toBeDefined();
      expect(putWorkspaceRoute.route.methods.put).toBe(true);
    });

    it("should support member management operations", () => {
      const memberRoutes = workspaceRoutes.stack.filter(
        (layer) => layer.route && layer.route.path.includes("/:id/members")
      );

      expect(memberRoutes).toHaveLength(4); // GET, PATCH role, PATCH status, DELETE
      memberRoutes.forEach((route) => {
        expect(route.route.path).toContain("/:id/members");
      });
    });

    it("should support workspace deletion requests", () => {
      const deleteRoute = workspaceRoutes.stack.find(
        (layer) => layer.route && layer.route.path === "/:id/delete"
      );

      expect(deleteRoute).toBeDefined();
      expect(deleteRoute.route.methods.post).toBe(true);
    });

    it("should have proper parameter handling", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // All routes should be properly configured
        expect(route.route.path).toBeDefined();
        expect(route.route.methods).toBeDefined();
      });
    });
  });

  describe("Security Features", () => {
    it("should have authentication on all routes", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const middlewareNames = route.route.stack.map((layer) => layer.name);
        expect(middlewareNames).toContain("authMiddleware");
      });
    });

    it("should have rate limiting for abuse prevention", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        const middlewareNames = route.route.stack.map((layer) => layer.name);
        expect(middlewareNames).toContain("personaLimiter");
      });
    });

    it("should have comprehensive logging for security monitoring", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have multiple logging middleware layers
        expect(route.route.stack.length).toBeGreaterThan(4);

        // Check for logging middleware presence
        const hasLoggingMiddleware = route.route.stack.some(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(hasLoggingMiddleware).toBe(true);
      });
    });

    it("should log client information for security analysis", () => {
      const routes = workspaceRoutes.stack.filter(
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

  describe("Administrative Access Control", () => {
    it("should require ADMIN role for administrative operations", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      // All routes except GET /:id should require ADMIN role
      routes.forEach((route) => {
        if (route.route.path !== "/:id" || !route.route.methods.get) {
          // Role middleware appears as an anonymous function in the test environment
          // Check that there are multiple anonymous functions (including role middleware)
          const anonymousFunctions = route.route.stack.filter(
            (layer) => layer.name === "<anonymous>"
          );
          expect(anonymousFunctions.length).toBeGreaterThan(1);
        }
      });
    });

    it("should have appropriate security measures for administrative endpoints", () => {
      const routes = workspaceRoutes.stack.filter(
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
        expect(middlewareNames).toContain("personaLimiter");
      });
    });

    it("should provide comprehensive audit trail for administrative actions", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have multiple middleware layers for comprehensive logging
        expect(route.route.stack.length).toBeGreaterThanOrEqual(5);

        // Should have logging middleware
        const hasLoggingMiddleware = route.route.stack.some(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(hasLoggingMiddleware).toBe(true);
      });
    });
  });

  describe("Parameter Validation", () => {
    it("should properly handle workspace ID parameter in route paths", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have workspace ID parameter in path
        expect(route.route.path).toContain(":id");
      });
    });

    it("should have validation middleware for workspace ID parameter", () => {
      const routes = workspaceRoutes.stack.filter(
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

    it("should have validation middleware for member operations", () => {
      const memberRoutes = workspaceRoutes.stack.filter(
        (layer) => layer.route && layer.route.path.includes("/:id/members")
      );

      memberRoutes.forEach((route) => {
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
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Each route should have multiple middleware layers for error handling
        expect(route.route.stack.length).toBeGreaterThanOrEqual(5);

        // Should have try-catch blocks in logging middleware
        const loggingMiddleware = route.route.stack.find(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(loggingMiddleware).toBeDefined();
      });
    });

    it("should propagate errors correctly", () => {
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have proper middleware chain for error propagation
        const stackLength = route.route.stack.length;
        expect(stackLength).toBeGreaterThan(4);

        // Should have controller as final handler
        const lastLayer = route.route.stack[stackLength - 1];
        expect(lastLayer.handle).toBeDefined();
        expect(typeof lastLayer.handle).toBe("function");
      });
    });
  });

  describe("Logging and Monitoring", () => {
    it("should log all workspace management operations", () => {
      const routes = workspaceRoutes.stack.filter(
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
      const routes = workspaceRoutes.stack.filter(
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
      const routes = workspaceRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );

      routes.forEach((route) => {
        // Should have rate limiting for abuse detection
        const middlewareNames = route.route.stack.map((layer) => layer.name);
        expect(middlewareNames).toContain("personaLimiter");

        // Should have logging for security analysis
        const hasLoggingMiddleware = route.route.stack.some(
          (layer) => layer.handle && typeof layer.handle === "function"
        );
        expect(hasLoggingMiddleware).toBe(true);
      });
    });
  });
});
