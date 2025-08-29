const {
  CircuitBreaker,
  getCircuitBreaker,
  getAllCircuitBreakerStates,
  resetAllCircuitBreakers,
  clearAllCircuitBreakers,
  removeCircuitBreaker,
  getCircuitBreakerCount,
} = require("../../../src/utils/circuitBreaker");

// Mock logger
jest.mock("../../../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe("Circuit Breaker", () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockLogger = require("../../../src/utils/logger");
    // Clear all circuit breakers before each test
    clearAllCircuitBreakers();
  });

  afterEach(() => {
    jest.useRealTimers();
    // Clean up all circuit breakers after each test
    clearAllCircuitBreakers();
  });

  describe("CircuitBreaker Class", () => {
    describe("constructor", () => {
      it("should create circuit breaker with default options", () => {
        const breaker = new CircuitBreaker();

        expect(breaker.failureThreshold).toBe(5);
        expect(breaker.resetTimeout).toBe(5 * 60 * 1000);
        expect(breaker.failures).toBe(0);
        expect(breaker.lastFailureTime).toBeNull();
        expect(breaker.state).toBe("CLOSED");
      });

      it("should create circuit breaker with custom options", () => {
        const options = {
          failureThreshold: 3,
          resetTimeout: 2 * 60 * 1000, // 2 minutes
        };
        const breaker = new CircuitBreaker(options);

        expect(breaker.failureThreshold).toBe(3);
        expect(breaker.resetTimeout).toBe(2 * 60 * 1000);
        expect(breaker.state).toBe("CLOSED");
      });
    });

    describe("isOpen", () => {
      it("should return false when circuit breaker is CLOSED", () => {
        const breaker = new CircuitBreaker();
        expect(breaker.isOpen()).toBe(false);
      });

      it("should return true when circuit breaker is OPEN", () => {
        const breaker = new CircuitBreaker({ failureThreshold: 1 });
        breaker.onFailure();
        expect(breaker.isOpen()).toBe(true);
      });

      it("should transition to HALF_OPEN after reset timeout", () => {
        const breaker = new CircuitBreaker({
          failureThreshold: 1,
          resetTimeout: 100, // 100ms for testing
        });

        breaker.onFailure(); // Should open the circuit
        expect(breaker.isOpen()).toBe(true);

        // Wait for reset timeout
        jest.advanceTimersByTime(150);
        expect(breaker.isOpen()).toBe(false);
        expect(breaker.state).toBe("HALF_OPEN");
      });

      it("should return false when in HALF_OPEN state", () => {
        const breaker = new CircuitBreaker({
          failureThreshold: 1,
          resetTimeout: 100,
        });

        breaker.onFailure();
        jest.advanceTimersByTime(150);

        expect(breaker.isOpen()).toBe(false);
        expect(breaker.state).toBe("HALF_OPEN");
      });
    });

    describe("onSuccess", () => {
      it("should reset circuit breaker to CLOSED state", () => {
        const breaker = new CircuitBreaker({ failureThreshold: 1 });
        breaker.onFailure(); // Open the circuit
        expect(breaker.state).toBe("OPEN");

        breaker.onSuccess();
        expect(breaker.state).toBe("CLOSED");
        expect(breaker.failures).toBe(0);
        expect(breaker.lastFailureTime).toBeNull();
      });

      it("should reset failures count", () => {
        const breaker = new CircuitBreaker();
        breaker.onFailure();
        breaker.onFailure();
        expect(breaker.failures).toBe(2);

        breaker.onSuccess();
        expect(breaker.failures).toBe(0);
      });

      it("should log success message", () => {
        const breaker = new CircuitBreaker();
        breaker.onSuccess();

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Circuit breaker reset to CLOSED state"
        );
      });

      it("should handle HALF_OPEN to CLOSED transition", () => {
        const breaker = new CircuitBreaker({
          failureThreshold: 1,
          resetTimeout: 100,
        });

        breaker.onFailure();
        jest.advanceTimersByTime(150); // Transition to HALF_OPEN
        breaker.isOpen(); // Trigger the state transition
        expect(breaker.state).toBe("HALF_OPEN");

        breaker.onSuccess();
        expect(breaker.state).toBe("CLOSED");
      });
    });

    describe("onFailure", () => {
      it("should increment failure count", () => {
        const breaker = new CircuitBreaker();
        expect(breaker.failures).toBe(0);

        breaker.onFailure();
        expect(breaker.failures).toBe(1);

        breaker.onFailure();
        expect(breaker.failures).toBe(2);
      });

      it("should set last failure time", () => {
        const breaker = new CircuitBreaker();
        const beforeTime = Date.now();

        breaker.onFailure();
        const afterTime = Date.now();

        expect(breaker.lastFailureTime).toBeGreaterThanOrEqual(beforeTime);
        expect(breaker.lastFailureTime).toBeLessThanOrEqual(afterTime);
      });

      it("should open circuit when failure threshold is reached", () => {
        const breaker = new CircuitBreaker({ failureThreshold: 3 });

        breaker.onFailure(); // 1
        expect(breaker.state).toBe("CLOSED");

        breaker.onFailure(); // 2
        expect(breaker.state).toBe("CLOSED");

        breaker.onFailure(); // 3 - threshold reached
        expect(breaker.state).toBe("OPEN");
      });

      it("should log warning when circuit opens", () => {
        const breaker = new CircuitBreaker({ failureThreshold: 1 });
        breaker.onFailure();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Circuit breaker opened after 1 consecutive failures"
        );
      });

      it("should return to OPEN state from HALF_OPEN on failure", () => {
        const breaker = new CircuitBreaker({
          failureThreshold: 1,
          resetTimeout: 100,
        });

        breaker.onFailure(); // Open circuit
        jest.advanceTimersByTime(150); // Transition to HALF_OPEN
        breaker.isOpen(); // Trigger the state transition
        expect(breaker.state).toBe("HALF_OPEN");

        breaker.onFailure(); // Should go back to OPEN
        expect(breaker.state).toBe("OPEN");
        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Circuit breaker returned to OPEN state after HALF_OPEN failure"
        );
      });
    });

    describe("getState", () => {
      it("should return current state information", () => {
        const breaker = new CircuitBreaker({
          failureThreshold: 3,
          resetTimeout: 60000,
        });

        const state = breaker.getState();

        expect(state).toEqual({
          state: "CLOSED",
          failures: 0,
          lastFailureTime: null,
          failureThreshold: 3,
          resetTimeout: 60000,
        });
      });

      it("should return updated state after failures", () => {
        const breaker = new CircuitBreaker();
        breaker.onFailure();
        breaker.onFailure();

        const state = breaker.getState();

        expect(state.failures).toBe(2);
        expect(state.lastFailureTime).toBeDefined();
        expect(state.state).toBe("CLOSED");
      });
    });

    describe("reset", () => {
      it("should reset circuit breaker to initial state", () => {
        const breaker = new CircuitBreaker();
        breaker.onFailure();
        breaker.onFailure();

        breaker.reset();

        expect(breaker.failures).toBe(0);
        expect(breaker.state).toBe("CLOSED");
        expect(breaker.lastFailureTime).toBeNull();
      });

      it("should log reset message", () => {
        const breaker = new CircuitBreaker();
        breaker.reset();

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Circuit breaker manually reset"
        );
      });
    });

    describe("isHalfOpen", () => {
      it("should return true when in HALF_OPEN state", () => {
        const breaker = new CircuitBreaker({
          failureThreshold: 1,
          resetTimeout: 100,
        });

        breaker.onFailure();
        jest.advanceTimersByTime(150);
        breaker.isOpen(); // Trigger the state transition

        expect(breaker.isHalfOpen()).toBe(true);
      });

      it("should return false when not in HALF_OPEN state", () => {
        const breaker = new CircuitBreaker();
        expect(breaker.isHalfOpen()).toBe(false);
      });
    });

    describe("isClosed", () => {
      it("should return true when in CLOSED state", () => {
        const breaker = new CircuitBreaker();
        expect(breaker.isClosed()).toBe(true);
      });

      it("should return false when not in CLOSED state", () => {
        const breaker = new CircuitBreaker({ failureThreshold: 1 });
        breaker.onFailure();
        expect(breaker.isClosed()).toBe(false);
      });
    });
  });

  describe("Global Functions", () => {
    describe("getCircuitBreaker", () => {
      it("should create new circuit breaker for new persona", () => {
        const breaker = getCircuitBreaker("persona1");

        expect(breaker).toBeInstanceOf(CircuitBreaker);
        expect(breaker.state).toBe("CLOSED");
      });

      it("should return existing circuit breaker for same persona", () => {
        const breaker1 = getCircuitBreaker("persona1");
        const breaker2 = getCircuitBreaker("persona1");

        expect(breaker1).toBe(breaker2);
      });

      it("should create separate circuit breakers for different personas", () => {
        const breaker1 = getCircuitBreaker("persona1");
        const breaker2 = getCircuitBreaker("persona2");

        expect(breaker1).not.toBe(breaker2);
      });

      it("should throw error for invalid persona ID", () => {
        expect(() => getCircuitBreaker(null)).toThrow(
          "Persona ID must be a non-empty string"
        );
        expect(() => getCircuitBreaker(undefined)).toThrow(
          "Persona ID must be a non-empty string"
        );
        expect(() => getCircuitBreaker("")).toThrow(
          "Persona ID must be a non-empty string"
        );
        expect(() => getCircuitBreaker(123)).toThrow(
          "Persona ID must be a non-empty string"
        );
      });
    });

    describe("getAllCircuitBreakerStates", () => {
      it("should return empty object when no circuit breakers exist", () => {
        clearAllCircuitBreakers(); // Ensure clean state
        const states = getAllCircuitBreakerStates();
        expect(states).toEqual({});
      });

      it("should return states for all circuit breakers", () => {
        clearAllCircuitBreakers(); // Ensure clean state
        const breaker1 = getCircuitBreaker("persona1");
        const breaker2 = getCircuitBreaker("persona2");

        breaker1.onFailure();
        breaker2.onFailure();
        breaker2.onFailure();

        const states = getAllCircuitBreakerStates();

        expect(Object.keys(states)).toHaveLength(2);
        expect(states.persona1).toBeDefined();
        expect(states.persona2).toBeDefined();
        expect(states.persona1.failures).toBe(1);
        expect(states.persona2.failures).toBe(2);
      });
    });

    describe("resetAllCircuitBreakers", () => {
      it("should reset all circuit breakers", () => {
        const breaker1 = getCircuitBreaker("persona1");
        const breaker2 = getCircuitBreaker("persona2");

        breaker1.onFailure();
        breaker2.onFailure();
        breaker2.onFailure();

        resetAllCircuitBreakers();

        expect(breaker1.failures).toBe(0);
        expect(breaker2.failures).toBe(0);
        expect(breaker1.state).toBe("CLOSED");
        expect(breaker2.state).toBe("CLOSED");
      });

      it("should log reset message", () => {
        resetAllCircuitBreakers();

        expect(mockLogger.info).toHaveBeenCalledWith(
          "All circuit breakers reset"
        );
      });
    });

    describe("removeCircuitBreaker", () => {
      it("should remove existing circuit breaker", () => {
        clearAllCircuitBreakers(); // Ensure clean state
        const breaker = getCircuitBreaker("persona1");
        expect(getCircuitBreakerCount()).toBe(1);

        removeCircuitBreaker("persona1");
        expect(getCircuitBreakerCount()).toBe(0);
      });

      it("should not throw error when removing non-existent circuit breaker", () => {
        expect(() => removeCircuitBreaker("nonexistent")).not.toThrow();
      });

      it("should throw error for invalid persona ID", () => {
        expect(() => removeCircuitBreaker(null)).toThrow(
          "Persona ID must be a non-empty string"
        );
        expect(() => removeCircuitBreaker("")).toThrow(
          "Persona ID must be a non-empty string"
        );
      });

      it("should log removal message", () => {
        getCircuitBreaker("persona1");
        removeCircuitBreaker("persona1");

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Circuit breaker removed for persona: persona1"
        );
      });
    });

    describe("getCircuitBreakerCount", () => {
      it("should return 0 when no circuit breakers exist", () => {
        clearAllCircuitBreakers(); // Ensure clean state
        expect(getCircuitBreakerCount()).toBe(0);
      });

      it("should return correct count of circuit breakers", () => {
        clearAllCircuitBreakers(); // Ensure clean state
        expect(getCircuitBreakerCount()).toBe(0);

        getCircuitBreaker("persona1");
        expect(getCircuitBreakerCount()).toBe(1);

        getCircuitBreaker("persona2");
        expect(getCircuitBreakerCount()).toBe(2);

        removeCircuitBreaker("persona1");
        expect(getCircuitBreakerCount()).toBe(1);
      });
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete circuit breaker lifecycle", () => {
      const breaker = getCircuitBreaker("test-persona");

      // Initial state
      expect(breaker.isClosed()).toBe(true);
      expect(breaker.isOpen()).toBe(false);

      // Fail multiple times to open circuit
      breaker.onFailure();
      breaker.onFailure();
      breaker.onFailure();
      breaker.onFailure();
      breaker.onFailure();

      expect(breaker.state).toBe("OPEN");
      expect(breaker.isOpen()).toBe(true);

      // Wait for reset timeout and try again
      jest.advanceTimersByTime(5 * 60 * 1000 + 100);
      breaker.isOpen(); // Trigger the state transition
      expect(breaker.state).toBe("HALF_OPEN");
      expect(breaker.isOpen()).toBe(false);

      // Success should close circuit
      breaker.onSuccess();
      expect(breaker.state).toBe("CLOSED");
      expect(breaker.isClosed()).toBe(true);
    });

    it("should handle multiple personas independently", () => {
      const breaker1 = getCircuitBreaker("persona1");
      const breaker2 = getCircuitBreaker("persona2");

      // Fail persona1 to open its circuit
      for (let i = 0; i < 5; i++) {
        breaker1.onFailure();
      }

      expect(breaker1.state).toBe("OPEN");
      expect(breaker2.state).toBe("CLOSED");

      // Fail persona2 to open its circuit
      for (let i = 0; i < 5; i++) {
        breaker2.onFailure();
      }

      expect(breaker1.state).toBe("OPEN");
      expect(breaker2.state).toBe("OPEN");
    });
  });
});
