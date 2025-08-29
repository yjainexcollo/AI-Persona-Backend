const asyncHandler = require("../../../src/utils/asyncHandler");

// Mock logger - move jest.mock before mockLogger declaration
jest.mock("../../../src/utils/logger", () => ({
  error: jest.fn(),
}));

const mockLogger = require("../../../src/utils/logger");

describe("AsyncHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("asyncHandler", () => {
    it("should handle successful async function", async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFunction = async (req, res, next) => {
        return "success";
      };

      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle async function that throws error", async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFunction = async (req, res, next) => {
        throw new Error("Test error");
      };

      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe("Test error");
    });

    it("should handle async function that returns promise rejection", async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFunction = async (req, res, next) => {
        return Promise.reject(new Error("Promise rejection"));
      };

      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(mockReq, mockRes, mockNext);

      // Wait a bit for the promise to be handled
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe("Promise rejection");
    });

    it("should handle synchronous function that throws error", async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const syncFunction = (req, res, next) => {
        throw new Error("Sync error");
      };

      const wrappedFunction = asyncHandler(syncFunction);

      await wrappedFunction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe("Sync error");
    });

    it("should handle function that calls next with error", async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFunction = async (req, res, next) => {
        next(new Error("Manual error"));
      };

      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe("Manual error");
    });

    it("should handle function that returns value", async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFunction = async (req, res, next) => {
        return "return value";
      };

      const wrappedFunction = asyncHandler(asyncFunction);

      const result = await wrappedFunction(mockReq, mockRes, mockNext);

      // asyncHandler doesn't return the result, it just catches errors
      expect(result).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle function that modifies response", async () => {
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      const asyncFunction = async (req, res, next) => {
        res.status(200).json({ message: "Success" });
      };

      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Success" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle function that accesses request properties", async () => {
      const mockReq = {
        user: { id: "user123", email: "test@example.com" },
        params: { id: "123" },
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFunction = async (req, res, next) => {
        return {
          userId: req.user.id,
          paramId: req.params.id,
        };
      };

      const wrappedFunction = asyncHandler(asyncFunction);

      const result = await wrappedFunction(mockReq, mockRes, mockNext);

      // asyncHandler doesn't return the result, it just catches errors
      expect(result).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should throw TypeError for non-function input", () => {
      expect(() => {
        asyncHandler("not a function");
      }).toThrow(TypeError);
    });

    it("should handle function that returns null", async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFunction = async (req, res, next) => {
        return null;
      };

      const wrappedFunction = asyncHandler(asyncFunction);

      const result = await wrappedFunction(mockReq, mockRes, mockNext);

      expect(result).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle function that returns undefined", async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFunction = async (req, res, next) => {
        return undefined;
      };

      const wrappedFunction = asyncHandler(asyncFunction);

      const result = await wrappedFunction(mockReq, mockRes, mockNext);

      expect(result).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle function that returns a non-promise value", async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const syncFunction = (req, res, next) => {
        return "non-promise value";
      };

      const wrappedFunction = asyncHandler(syncFunction);

      const result = await wrappedFunction(mockReq, mockRes, mockNext);

      expect(result).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should log errors with proper context", async () => {
      const mockReq = {
        method: "POST",
        originalUrl: "/api/test",
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFunction = async (req, res, next) => {
        throw new Error("Test error for logging");
      };

      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Async error in route %s %s: %o",
        "POST",
        "/api/test",
        expect.any(Error)
      );
    });
  });
});
