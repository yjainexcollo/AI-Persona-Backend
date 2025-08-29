const ApiError = require("../../../src/utils/apiError");

describe("ApiError", () => {
  describe("constructor", () => {
    it("should create ApiError with status code and message", () => {
      const statusCode = 400;
      const message = "Bad Request";

      const error = new ApiError(statusCode, message);

      expect(error.statusCode).toBe(statusCode);
      expect(error.message).toBe(message);
      expect(error.name).toBe("ApiError");
    });

    it("should create ApiError with details", () => {
      const statusCode = 400;
      const message = "Bad Request";
      const details = { field: "email", reason: "invalid format" };

      const error = new ApiError(statusCode, message, details);

      expect(error.statusCode).toBe(statusCode);
      expect(error.message).toBe(message);
      expect(error.details).toEqual(details);
    });

    it("should inherit from Error", () => {
      const error = new ApiError(404, "Not Found");

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApiError");
    });

    it("should handle empty string message", () => {
      const error = new ApiError(400, "");

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("");
      expect(error.name).toBe("ApiError");
    });

    it("should handle null message", () => {
      const error = new ApiError(400, null);

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("null");
      expect(error.name).toBe("ApiError");
    });

    it("should handle undefined message", () => {
      const error = new ApiError(400, undefined);

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("");
      expect(error.name).toBe("ApiError");
    });

    it("should handle zero status code", () => {
      const error = new ApiError(0, "Zero Status");

      expect(error.statusCode).toBe(0);
      expect(error.message).toBe("Zero Status");
    });

    it("should handle negative status code", () => {
      const error = new ApiError(-1, "Negative Status");

      expect(error.statusCode).toBe(-1);
      expect(error.message).toBe("Negative Status");
    });

    it("should handle very large status code", () => {
      const error = new ApiError(999999, "Large Status");

      expect(error.statusCode).toBe(999999);
      expect(error.message).toBe("Large Status");
    });
  });

  describe("different status codes", () => {
    it("should handle 400 Bad Request", () => {
      const error = new ApiError(400, "Bad Request");

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Bad Request");
    });

    it("should handle 401 Unauthorized", () => {
      const error = new ApiError(401, "Unauthorized");

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Unauthorized");
    });

    it("should handle 403 Forbidden", () => {
      const error = new ApiError(403, "Forbidden");

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Forbidden");
    });

    it("should handle 404 Not Found", () => {
      const error = new ApiError(404, "Not Found");

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Not Found");
    });

    it("should handle 422 Unprocessable Entity", () => {
      const error = new ApiError(422, "Unprocessable Entity");

      expect(error.statusCode).toBe(422);
      expect(error.message).toBe("Unprocessable Entity");
    });

    it("should handle 429 Too Many Requests", () => {
      const error = new ApiError(429, "Too Many Requests");

      expect(error.statusCode).toBe(429);
      expect(error.message).toBe("Too Many Requests");
    });

    it("should handle 500 Internal Server Error", () => {
      const error = new ApiError(500, "Internal Server Error");

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Internal Server Error");
    });

    it("should handle 502 Bad Gateway", () => {
      const error = new ApiError(502, "Bad Gateway");

      expect(error.statusCode).toBe(502);
      expect(error.message).toBe("Bad Gateway");
    });

    it("should handle 503 Service Unavailable", () => {
      const error = new ApiError(503, "Service Unavailable");

      expect(error.statusCode).toBe(503);
      expect(error.message).toBe("Service Unavailable");
    });
  });

  describe("error handling", () => {
    it("should be throwable", () => {
      const error = new ApiError(400, "Bad Request");

      expect(() => {
        throw error;
      }).toThrow(ApiError);
    });

    it("should maintain stack trace", () => {
      const error = new ApiError(500, "Internal Server Error");

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe("string");
    });

    it("should be serializable", () => {
      const error = new ApiError(404, "Not Found");

      const serialized = JSON.stringify({
        statusCode: error.statusCode,
        message: error.message,
        name: error.name,
      });

      expect(serialized).toContain("404");
      expect(serialized).toContain("Not Found");
      expect(serialized).toContain("ApiError");
    });

    it("should be catchable in try-catch blocks", () => {
      let caughtError = null;

      try {
        throw new ApiError(400, "Bad Request");
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.statusCode).toBe(400);
      expect(caughtError.message).toBe("Bad Request");
    });

    it("should work with instanceof checks", () => {
      const error = new ApiError(500, "Internal Error");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ApiError).toBe(true);
    });
  });

  describe("details handling", () => {
    it("should include details when provided", () => {
      const details = { field: "email", reason: "invalid format" };
      const error = new ApiError(400, "Bad Request", details);

      expect(error.details).toEqual(details);
    });

    it("should not include details when not provided", () => {
      const error = new ApiError(404, "Not Found");

      expect(error.details).toBeUndefined();
    });

    it("should handle undefined details", () => {
      const error = new ApiError(500, "Internal Error", undefined);

      expect(error.details).toBeUndefined();
    });

    it("should handle null details", () => {
      const error = new ApiError(400, "Bad Request", null);

      expect(error.details).toBe(null);
    });

    it("should handle empty object details", () => {
      const details = {};
      const error = new ApiError(400, "Bad Request", details);

      expect(error.details).toEqual(details);
    });

    it("should handle array details", () => {
      const details = ["error1", "error2", "error3"];
      const error = new ApiError(400, "Bad Request", details);

      expect(error.details).toEqual(details);
    });

    it("should handle nested object details", () => {
      const details = {
        validation: {
          email: ["invalid format"],
          password: ["too short", "missing uppercase"],
        },
        timestamp: "2023-01-01T00:00:00Z",
      };
      const error = new ApiError(400, "Validation Error", details);

      expect(error.details).toEqual(details);
    });

    it("should handle function details (though not recommended)", () => {
      const details = () => "test function";
      const error = new ApiError(400, "Bad Request", details);

      expect(error.details).toBe(details);
    });
  });

  describe("error properties", () => {
    it("should have correct property descriptors", () => {
      const error = new ApiError(400, "Bad Request", { test: "value" });

      expect(error).toHaveProperty("statusCode");
      expect(error).toHaveProperty("message");
      expect(error).toHaveProperty("name");
      expect(error).toHaveProperty("details");
      expect(error).toHaveProperty("stack");
    });

    it("should have enumerable properties", () => {
      const error = new ApiError(400, "Bad Request", { test: "value" });
      const keys = Object.keys(error);

      expect(keys).toContain("statusCode");
      expect(keys).toContain("name");
      expect(keys).toContain("details");
      // Note: 'message' is inherited from Error and may not be enumerable
    });

    it("should maintain property values after assignment", () => {
      const error = new ApiError(400, "Bad Request");

      error.statusCode = 500;
      error.message = "Updated Message";

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Updated Message");
    });
  });

  describe("error comparison", () => {
    it("should not be equal to another ApiError with same values", () => {
      const error1 = new ApiError(400, "Bad Request");
      const error2 = new ApiError(400, "Bad Request");

      expect(error1).not.toBe(error2);
      expect(error1.statusCode).toBe(error2.statusCode);
      expect(error1.message).toBe(error2.message);
    });

    it("should be equal to itself", () => {
      const error = new ApiError(400, "Bad Request");

      expect(error).toBe(error);
    });
  });

  describe("error inheritance chain", () => {
    it("should be instance of Error", () => {
      const error = new ApiError(400, "Bad Request");
      expect(error).toBeInstanceOf(Error);
    });

    it("should be instance of ApiError", () => {
      const error = new ApiError(400, "Bad Request");
      expect(error).toBeInstanceOf(ApiError);
    });

    it("should not be instance of other error types", () => {
      const error = new ApiError(400, "Bad Request");
      expect(error).not.toBeInstanceOf(TypeError);
      expect(error).not.toBeInstanceOf(ReferenceError);
    });
  });

  describe("error creation performance", () => {
    it("should create multiple errors efficiently", () => {
      const errors = [];
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        errors.push(new ApiError(400, `Error ${i}`));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(errors).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
      expect(errors[0]).toBeInstanceOf(ApiError);
      expect(errors[999].message).toBe("Error 999");
    });
  });
});
