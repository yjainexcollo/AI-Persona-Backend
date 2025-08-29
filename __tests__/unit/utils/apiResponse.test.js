const apiResponse = require("../../../src/utils/apiResponse");

describe("ApiResponse", () => {
  describe("apiResponse function", () => {
    it("should create success response with data", () => {
      const data = { user: { id: "123", name: "Test User" } };
      const message = "User created successfully";

      const response = apiResponse({
        data,
        message,
        status: "success",
      });

      expect(response).toEqual({
        status: "success",
        message,
        data,
      });
    });

    it("should create response with default values", () => {
      const response = apiResponse({});

      expect(response).toEqual({
        status: "success",
        message: "Success",
        data: null,
      });
    });

    it("should include meta when provided", () => {
      const data = { items: [] };
      const meta = { total: 0, page: 1 };

      const response = apiResponse({
        data,
        meta,
      });

      expect(response).toEqual({
        status: "success",
        message: "Success",
        data,
        meta,
      });
    });

    it("should create error response", () => {
      const message = "User not found";

      const response = apiResponse({
        message,
        status: "error",
      });

      expect(response).toEqual({
        status: "error",
        message,
        data: null,
      });
    });

    it("should handle null data", () => {
      const response = apiResponse({
        data: null,
        message: "No data found",
      });

      expect(response).toEqual({
        status: "success",
        message: "No data found",
        data: null,
      });
    });

    it("should handle undefined data", () => {
      const response = apiResponse({
        data: undefined,
        message: "No data found",
      });

      expect(response).toEqual({
        status: "success",
        message: "No data found",
        data: null,
      });
    });

    it("should handle empty string message", () => {
      const response = apiResponse({
        message: "",
        data: { test: "value" },
      });

      expect(response).toEqual({
        status: "success",
        message: "",
        data: { test: "value" },
      });
    });

    it("should handle null message", () => {
      const response = apiResponse({
        message: null,
        data: { test: "value" },
      });

      expect(response).toEqual({
        status: "success",
        message: null,
        data: { test: "value" },
      });
    });

    it("should handle undefined message", () => {
      const response = apiResponse({
        message: undefined,
        data: { test: "value" },
      });

      expect(response).toEqual({
        status: "success",
        message: "Success",
        data: { test: "value" },
      });
    });

    it("should handle different status values", () => {
      const statuses = ["success", "error", "warning", "info", "pending"];

      statuses.forEach((status) => {
        const response = apiResponse({
          status,
          message: `Test ${status}`,
        });

        expect(response).toEqual({
          status,
          message: `Test ${status}`,
          data: null,
        });
      });
    });

    it("should handle empty string status", () => {
      const response = apiResponse({
        status: "",
        message: "Test message",
      });

      expect(response).toEqual({
        status: "",
        message: "Test message",
        data: null,
      });
    });

    it("should handle null status", () => {
      const response = apiResponse({
        status: null,
        message: "Test message",
      });

      expect(response).toEqual({
        status: null,
        message: "Test message",
        data: null,
      });
    });

    it("should handle undefined status", () => {
      const response = apiResponse({
        status: undefined,
        message: "Test message",
      });

      expect(response).toEqual({
        status: "success",
        message: "Test message",
        data: null,
      });
    });

    it("should handle complex data structures", () => {
      const complexData = {
        users: [
          { id: 1, name: "John", roles: ["admin", "user"] },
          { id: 2, name: "Jane", roles: ["user"] },
        ],
        metadata: {
          total: 2,
          filters: {
            active: true,
            department: "engineering",
          },
        },
        nested: {
          level1: {
            level2: {
              level3: "deep value",
            },
          },
        },
      };

      const response = apiResponse({
        data: complexData,
        message: "Complex data retrieved",
      });

      expect(response).toEqual({
        status: "success",
        message: "Complex data retrieved",
        data: complexData,
      });
    });

    it("should handle array data", () => {
      const arrayData = [1, 2, 3, 4, 5];

      const response = apiResponse({
        data: arrayData,
        message: "Array data retrieved",
      });

      expect(response).toEqual({
        status: "success",
        message: "Array data retrieved",
        data: arrayData,
      });
    });

    it("should handle empty array data", () => {
      const response = apiResponse({
        data: [],
        message: "Empty array",
      });

      expect(response).toEqual({
        status: "success",
        message: "Empty array",
        data: [],
      });
    });

    it("should handle function data (though not recommended)", () => {
      const functionData = () => "test function";

      const response = apiResponse({
        data: functionData,
        message: "Function data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Function data",
        data: functionData,
      });
    });

    it("should handle boolean data", () => {
      const response = apiResponse({
        data: true,
        message: "Boolean data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Boolean data",
        data: true,
      });
    });

    it("should handle number data", () => {
      const response = apiResponse({
        data: 42,
        message: "Number data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Number data",
        data: 42,
      });
    });

    it("should handle string data", () => {
      const response = apiResponse({
        data: "string data",
        message: "String data",
      });

      expect(response).toEqual({
        status: "success",
        message: "String data",
        data: "string data",
      });
    });

    it("should handle complex meta object", () => {
      const complexMeta = {
        pagination: {
          page: 1,
          limit: 10,
          total: 100,
          totalPages: 10,
        },
        filters: {
          status: "active",
          category: "technology",
        },
        sorting: {
          field: "created_at",
          order: "desc",
        },
      };

      const response = apiResponse({
        data: { items: [] },
        meta: complexMeta,
        message: "Paginated data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Paginated data",
        data: { items: [] },
        meta: complexMeta,
      });
    });

    it("should handle array meta", () => {
      const arrayMeta = ["meta1", "meta2", "meta3"];

      const response = apiResponse({
        data: { items: [] },
        meta: arrayMeta,
        message: "Array meta",
      });

      expect(response).toEqual({
        status: "success",
        message: "Array meta",
        data: { items: [] },
        meta: arrayMeta,
      });
    });

    it("should handle null meta", () => {
      const response = apiResponse({
        data: { items: [] },
        meta: null,
        message: "Null meta",
      });

      expect(response).toEqual({
        status: "success",
        message: "Null meta",
        data: { items: [] },
        meta: null,
      });
    });

    it("should handle empty object meta", () => {
      const response = apiResponse({
        data: { items: [] },
        meta: {},
        message: "Empty meta",
      });

      expect(response).toEqual({
        status: "success",
        message: "Empty meta",
        data: { items: [] },
        meta: {},
      });
    });

    it("should handle undefined meta (should not include in response)", () => {
      const response = apiResponse({
        data: { items: [] },
        meta: undefined,
        message: "Undefined meta",
      });

      expect(response).toEqual({
        status: "success",
        message: "Undefined meta",
        data: { items: [] },
      });
      expect(response).not.toHaveProperty("meta");
    });

    it("should handle function meta (though not recommended)", () => {
      const functionMeta = () => "meta function";

      const response = apiResponse({
        data: { items: [] },
        meta: functionMeta,
        message: "Function meta",
      });

      expect(response).toEqual({
        status: "success",
        message: "Function meta",
        data: { items: [] },
        meta: functionMeta,
      });
    });

    it("should handle boolean meta", () => {
      const response = apiResponse({
        data: { items: [] },
        meta: true,
        message: "Boolean meta",
      });

      expect(response).toEqual({
        status: "success",
        message: "Boolean meta",
        data: { items: [] },
        meta: true,
      });
    });

    it("should handle number meta", () => {
      const response = apiResponse({
        data: { items: [] },
        meta: 42,
        message: "Number meta",
      });

      expect(response).toEqual({
        status: "success",
        message: "Number meta",
        data: { items: [] },
        meta: 42,
      });
    });

    it("should handle string meta", () => {
      const response = apiResponse({
        data: { items: [] },
        meta: "string meta",
        message: "String meta",
      });

      expect(response).toEqual({
        status: "success",
        message: "String meta",
        data: { items: [] },
        meta: "string meta",
      });
    });

    it("should handle all parameters together", () => {
      const data = { user: { id: "123", name: "Test User" } };
      const message = "User created successfully";
      const meta = { total: 1, page: 1 };
      const status = "success";

      const response = apiResponse({
        data,
        message,
        meta,
        status,
      });

      expect(response).toEqual({
        status,
        message,
        data,
        meta,
      });
    });

    it("should handle no parameters (empty object)", () => {
      const response = apiResponse({});

      expect(response).toEqual({
        status: "success",
        message: "Success",
        data: null,
      });
    });

    it("should handle null parameters object", () => {
      expect(() => apiResponse(null)).toThrow();
    });

    it("should handle undefined parameters object", () => {
      expect(() => apiResponse(undefined)).toThrow();
    });

    it("should handle partial parameters", () => {
      const response = apiResponse({
        data: { test: "value" },
        // message and status will use defaults
      });

      expect(response).toEqual({
        status: "success",
        message: "Success",
        data: { test: "value" },
      });
    });

    it("should handle only message parameter", () => {
      const response = apiResponse({
        message: "Custom message only",
      });

      expect(response).toEqual({
        status: "success",
        message: "Custom message only",
        data: null,
      });
    });

    it("should handle only status parameter", () => {
      const response = apiResponse({
        status: "error",
      });

      expect(response).toEqual({
        status: "error",
        message: "Success",
        data: null,
      });
    });

    it("should handle only data parameter", () => {
      const response = apiResponse({
        data: { test: "value" },
      });

      expect(response).toEqual({
        status: "success",
        message: "Success",
        data: { test: "value" },
      });
    });

    it("should handle only meta parameter", () => {
      const response = apiResponse({
        meta: { test: "meta" },
      });

      expect(response).toEqual({
        status: "success",
        message: "Success",
        data: null,
        meta: { test: "meta" },
      });
    });

    it("should handle data and meta without message", () => {
      const response = apiResponse({
        data: { items: [] },
        meta: { total: 0 },
      });

      expect(response).toEqual({
        status: "success",
        message: "Success",
        data: { items: [] },
        meta: { total: 0 },
      });
    });

    it("should handle message and status without data", () => {
      const response = apiResponse({
        message: "Error occurred",
        status: "error",
      });

      expect(response).toEqual({
        status: "error",
        message: "Error occurred",
        data: null,
      });
    });

    it("should handle data and message without status", () => {
      const response = apiResponse({
        data: { user: "test" },
        message: "User retrieved",
      });

      expect(response).toEqual({
        status: "success",
        message: "User retrieved",
        data: { user: "test" },
      });
    });

    it("should handle data and status without message", () => {
      const response = apiResponse({
        data: { user: "test" },
        status: "warning",
      });

      expect(response).toEqual({
        status: "warning",
        message: "Success",
        data: { user: "test" },
      });
    });

    it("should handle message and meta without data", () => {
      const response = apiResponse({
        message: "List retrieved",
        meta: { total: 10 },
      });

      expect(response).toEqual({
        status: "success",
        message: "List retrieved",
        data: null,
        meta: { total: 10 },
      });
    });

    it("should handle status and meta without data", () => {
      const response = apiResponse({
        status: "info",
        meta: { total: 10 },
      });

      expect(response).toEqual({
        status: "info",
        message: "Success",
        data: null,
        meta: { total: 10 },
      });
    });

    it("should handle data and status and meta without message", () => {
      const response = apiResponse({
        data: { items: [] },
        status: "success",
        meta: { total: 0 },
      });

      expect(response).toEqual({
        status: "success",
        message: "Success",
        data: { items: [] },
        meta: { total: 0 },
      });
    });

    it("should handle data and message and meta without status", () => {
      const response = apiResponse({
        data: { items: [] },
        message: "Items retrieved",
        meta: { total: 0 },
      });

      expect(response).toEqual({
        status: "success",
        message: "Items retrieved",
        data: { items: [] },
        meta: { total: 0 },
      });
    });

    it("should handle message and status and meta without data", () => {
      const response = apiResponse({
        message: "Operation completed",
        status: "info",
        meta: { duration: "1s" },
      });

      expect(response).toEqual({
        status: "info",
        message: "Operation completed",
        data: null,
        meta: { duration: "1s" },
      });
    });

    it("should handle data and message and status without meta", () => {
      const response = apiResponse({
        data: { user: "test" },
        message: "User created",
        status: "success",
      });

      expect(response).toEqual({
        status: "success",
        message: "User created",
        data: { user: "test" },
      });
      expect(response).not.toHaveProperty("meta");
    });

    it("should handle very large data objects", () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`,
          metadata: {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            tags: [`tag${i}`, `category${i % 10}`],
          },
        })),
      };

      const response = apiResponse({
        data: largeData,
        message: "Large dataset retrieved",
      });

      expect(response).toEqual({
        status: "success",
        message: "Large dataset retrieved",
        data: largeData,
      });
      expect(response.data.items).toHaveLength(1000);
    });

    it("should handle nested undefined values in data", () => {
      const dataWithUndefined = {
        user: {
          id: 1,
          name: "Test",
          preferences: undefined,
          settings: {
            theme: "dark",
            notifications: undefined,
          },
        },
      };

      const response = apiResponse({
        data: dataWithUndefined,
        message: "Data with undefined values",
      });

      expect(response).toEqual({
        status: "success",
        message: "Data with undefined values",
        data: dataWithUndefined,
      });
    });

    it("should handle circular references in data (should not crash)", () => {
      const circularData = { name: "test" };
      circularData.self = circularData;

      const response = apiResponse({
        data: circularData,
        message: "Circular data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Circular data",
        data: circularData,
      });
    });

    it("should handle Date objects in data", () => {
      const dateData = {
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
        events: [
          { date: new Date("2023-01-01"), type: "created" },
          { date: new Date("2023-01-02"), type: "updated" },
        ],
      };

      const response = apiResponse({
        data: dateData,
        message: "Date data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Date data",
        data: dateData,
      });
    });

    it("should handle RegExp objects in data", () => {
      const regexData = {
        patterns: [
          /^[a-zA-Z]+$/,
          /^\d{4}-\d{2}-\d{2}$/,
          new RegExp("test", "i"),
        ],
      };

      const response = apiResponse({
        data: regexData,
        message: "Regex data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Regex data",
        data: regexData,
      });
    });

    it("should handle Symbol objects in data", () => {
      const symbolData = {
        symbols: [Symbol("test"), Symbol.for("shared"), Symbol.iterator],
      };

      const response = apiResponse({
        data: symbolData,
        message: "Symbol data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Symbol data",
        data: symbolData,
      });
    });

    it("should handle Map and Set objects in data", () => {
      const mapSetData = {
        userMap: new Map([
          ["id", 1],
          ["name", "Test User"],
        ]),
        userSet: new Set(["admin", "user", "guest"]),
      };

      const response = apiResponse({
        data: mapSetData,
        message: "Map/Set data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Map/Set data",
        data: mapSetData,
      });
    });

    it("should handle Buffer objects in data", () => {
      const bufferData = {
        binary: Buffer.from("Hello World"),
        encoded: Buffer.from("Test", "base64"),
      };

      const response = apiResponse({
        data: bufferData,
        message: "Buffer data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Buffer data",
        data: bufferData,
      });
    });

    it("should handle Error objects in data", () => {
      const errorData = {
        errors: [
          new Error("Test error"),
          new TypeError("Type error"),
          new ReferenceError("Reference error"),
        ],
      };

      const response = apiResponse({
        data: errorData,
        message: "Error data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Error data",
        data: errorData,
      });
    });

    it("should handle Promise objects in data", () => {
      const promiseData = {
        pending: Promise.resolve("resolved"),
        // Note: We avoid Promise.reject to prevent unhandled rejection
        custom: new Promise((resolve) => resolve("custom")),
      };

      const response = apiResponse({
        data: promiseData,
        message: "Promise data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Promise data",
        data: promiseData,
      });
    });

    it("should handle WeakMap and WeakSet objects in data", () => {
      const weakData = {
        weakMap: new WeakMap(),
        weakSet: new WeakSet(),
      };

      const response = apiResponse({
        data: weakData,
        message: "WeakMap/WeakSet data",
      });

      expect(response).toEqual({
        status: "success",
        message: "WeakMap/WeakSet data",
        data: weakData,
      });
    });

    it("should handle BigInt objects in data", () => {
      const bigIntData = {
        largeNumber: BigInt("12345678901234567890"),
        maxSafe: BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1),
      };

      const response = apiResponse({
        data: bigIntData,
        message: "BigInt data",
      });

      expect(response).toEqual({
        status: "success",
        message: "BigInt data",
        data: bigIntData,
      });
    });

    it("should handle all primitive types in data", () => {
      const primitiveData = {
        string: "test string",
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        symbol: Symbol("test"),
        bigint: BigInt(123),
      };

      const response = apiResponse({
        data: primitiveData,
        message: "Primitive data",
      });

      expect(response).toEqual({
        status: "success",
        message: "Primitive data",
        data: primitiveData,
      });
    });

    it("should handle all primitive types in meta", () => {
      const primitiveMeta = {
        string: "test string",
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        symbol: Symbol("test"),
        bigint: BigInt(123),
      };

      const response = apiResponse({
        data: { test: "value" },
        meta: primitiveMeta,
        message: "Primitive meta",
      });

      expect(response).toEqual({
        status: "success",
        message: "Primitive meta",
        data: { test: "value" },
        meta: primitiveMeta,
      });
    });

    it("should handle all primitive types in message", () => {
      const response = apiResponse({
        data: { test: "value" },
        message: "Test message with special chars: !@#$%^&*()",
      });

      expect(response).toEqual({
        status: "success",
        message: "Test message with special chars: !@#$%^&*()",
        data: { test: "value" },
      });
    });

    it("should handle all primitive types in status", () => {
      const response = apiResponse({
        data: { test: "value" },
        status: "custom_status",
      });

      expect(response).toEqual({
        status: "custom_status",
        message: "Success",
        data: { test: "value" },
      });
    });

    it("should handle unicode characters in all fields", () => {
      const unicodeData = {
        message: "Test with unicode: 🚀🌟🎉",
        data: { emoji: "😀🎭🎪" },
        meta: { symbols: "αβγδε" },
        status: "success",
      };

      const response = apiResponse(unicodeData);

      expect(response).toEqual({
        status: "success",
        message: "Test with unicode: 🚀🌟🎉",
        data: { emoji: "😀🎭🎪" },
        meta: { symbols: "αβγδε" },
      });
    });

    it("should handle very long strings in all fields", () => {
      const longString = "a".repeat(10000);
      const longData = {
        message: longString,
        data: { longField: longString },
        meta: { longMeta: longString },
        status: "success",
      };

      const response = apiResponse(longData);

      expect(response).toEqual({
        status: "success",
        message: longString,
        data: { longField: longString },
        meta: { longMeta: longString },
      });
      expect(response.message).toHaveLength(10000);
      expect(response.data.longField).toHaveLength(10000);
      expect(response.meta.longMeta).toHaveLength(10000);
    });

    it("should handle performance with many calls", () => {
      const startTime = Date.now();
      const responses = [];

      for (let i = 0; i < 1000; i++) {
        responses.push(
          apiResponse({
            data: { id: i, name: `User ${i}` },
            message: `Response ${i}`,
            meta: { index: i },
          })
        );
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(responses).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
      expect(responses[0]).toEqual({
        status: "success",
        message: "Response 0",
        data: { id: 0, name: "User 0" },
        meta: { index: 0 },
      });
      expect(responses[999]).toEqual({
        status: "success",
        message: "Response 999",
        data: { id: 999, name: "User 999" },
        meta: { index: 999 },
      });
    });

    it("should handle memory usage with large objects", () => {
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10),
          metadata: {
            created: new Date().toISOString(),
            tags: Array.from({ length: 10 }, (_, j) => `tag${i}_${j}`),
          },
        })),
      };

      const response = apiResponse({
        data: largeObject,
        message: "Large object response",
        meta: { size: JSON.stringify(largeObject).length },
      });

      expect(response).toEqual({
        status: "success",
        message: "Large object response",
        data: largeObject,
        meta: { size: JSON.stringify(largeObject).length },
      });
      expect(response.data.data).toHaveLength(1000);
    });
  });
});
