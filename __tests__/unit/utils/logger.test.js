const logger = require("../../../src/utils/logger");

describe("Logger", () => {
  let originalConsoleLog;
  let originalConsoleError;
  let originalConsoleWarn;
  let originalConsoleInfo;

  beforeEach(() => {
    // Store original console methods
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleInfo = console.info;

    // Mock console methods to capture output
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
  });

  describe("Logger Interface", () => {
    it("should have required methods", () => {
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });
  });

  describe("Logger Functionality", () => {
    it("should log info messages without throwing", () => {
      const message = "Test info message";

      expect(() => {
        logger.info(message);
      }).not.toThrow();
    });

    it("should log error messages without throwing", () => {
      const message = "Test error message";

      expect(() => {
        logger.error(message);
      }).not.toThrow();
    });

    it("should log warning messages without throwing", () => {
      const message = "Test warning message";

      expect(() => {
        logger.warn(message);
      }).not.toThrow();
    });

    it("should log debug messages without throwing", () => {
      const message = "Test debug message";

      expect(() => {
        logger.debug(message);
      }).not.toThrow();
    });

    it("should handle objects and arrays without throwing", () => {
      const testObject = { key: "value", number: 123 };
      const testArray = [1, 2, 3];

      expect(() => {
        logger.info("Object:", testObject);
        logger.info("Array:", testArray);
      }).not.toThrow();
    });

    it("should handle structured logging without throwing", () => {
      const data = {
        userId: "123",
        action: "login",
        timestamp: new Date().toISOString(),
      };

      expect(() => {
        logger.info("User action", data);
      }).not.toThrow();
    });

    it("should handle errors with stack traces without throwing", () => {
      const error = new Error("Test error");

      expect(() => {
        logger.error("Error occurred:", error);
      }).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle logger method errors gracefully", () => {
      // Test that logger methods don't throw when called
      expect(() => {
        logger.info("test message");
      }).not.toThrow();
    });
  });

  describe("Integration Tests", () => {
    it("should log different message types without throwing", () => {
      expect(() => {
        logger.info("Info message");
        logger.error("Error message");
        logger.warn("Warning message");
        logger.debug("Debug message");
      }).not.toThrow();
    });

    it("should handle structured logging with metadata without throwing", () => {
      const metadata = {
        userId: "123",
        action: "login",
        timestamp: new Date().toISOString(),
      };

      expect(() => {
        logger.info("User action", metadata);
      }).not.toThrow();
    });

    it("should handle error logging with stack traces without throwing", () => {
      const error = new Error("Database connection failed");
      error.stack =
        "Error: Database connection failed\n    at connect (/app/db.js:10:15)";

      expect(() => {
        logger.error("Database error:", error);
      }).not.toThrow();
    });
  });

  describe("Environment Configuration", () => {
    it("should work in development environment", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      expect(() => {
        logger.info("Development test message");
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it("should work in production environment", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      expect(() => {
        logger.info("Production test message");
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
