const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const Redis = require("ioredis");
const logger = require("../utils/logger");

// Initialize Redis client with enhanced configuration
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Reconnection settings
  retryDelayOnClusterDown: 300,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Redis connection event handling
redis.on("error", (err) => {
  logger.warn("Redis rate limiter error:", err.message);
});

redis.on("connect", () => {
  logger.info("Redis connected for rate limiting");
});

redis.on("ready", () => {
  logger.info("Redis ready for rate limiting operations");
});

redis.on("close", () => {
  logger.warn("Redis connection closed for rate limiting");
});

redis.on("reconnecting", () => {
  logger.info("Redis reconnecting for rate limiting");
});

// Custom sliding window store using Redis
class SlidingWindowRedisStore {
  constructor(options = {}) {
    // Validate options
    if (options && typeof options !== "object") {
      throw new Error("Options must be an object");
    }

    this.prefix = (options && options.prefix) || "rl:";
    this.windowMs = (options && options.windowMs) || 60000;
    this.redis = redis;

    // Validate windowMs
    if (typeof this.windowMs !== "number" || this.windowMs <= 0) {
      throw new Error("windowMs must be a positive number");
    }

    // Validate prefix
    if (typeof this.prefix !== "string") {
      throw new Error("prefix must be a string");
    }
  }

  async increment(key) {
    // Input validation
    if (!key || typeof key !== "string") {
      throw new Error("Key must be a non-empty string");
    }

    const now = Date.now();
    const window = this.windowMs;
    const redisKey = `${this.prefix}${key}`;

    try {
      // Ensure Redis is connected
      if (this.redis.status !== "ready") {
        await this.redis.connect();
      }

      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove expired entries (sliding window)
      pipeline.zremrangebyscore(redisKey, 0, now - window);

      // Add current request with timestamp and unique identifier
      const uniqueId = `${now}-${Math.random().toString(36).substring(2)}`;
      pipeline.zadd(redisKey, now, uniqueId);

      // Count current entries
      pipeline.zcard(redisKey);

      // Set expiration for cleanup (add buffer time)
      pipeline.expire(redisKey, Math.ceil(window / 1000) + 10);

      const results = await pipeline.exec();

      // Check for pipeline errors
      const hasError = results.some((result) => result[0] !== null);
      if (hasError) {
        const errors = results
          .filter((result) => result[0] !== null)
          .map((result) => result[0]);
        throw new Error(`Pipeline errors: ${errors.join(", ")}`);
      }

      const count = results[2][1]; // Get count from zcard result

      return {
        totalHits: count,
        resetTime: new Date(now + window),
      };
    } catch (error) {
      logger.warn("Sliding window Redis error:", error.message);
      // Return safe defaults if Redis fails
      return {
        totalHits: 1,
        resetTime: new Date(now + window),
        error: error.message,
      };
    }
  }

  async decrement(key) {
    // Input validation
    if (!key || typeof key !== "string") {
      throw new Error("Key must be a non-empty string");
    }

    try {
      // Ensure Redis is connected
      if (this.redis.status !== "ready") {
        await this.redis.connect();
      }

      const redisKey = `${this.prefix}${key}`;
      const now = Date.now();

      // Remove the most recent entry
      await this.redis.zremrangebyrank(redisKey, -1, -1);

      return { success: true };
    } catch (error) {
      logger.warn("Redis decrement error:", error.message);
      return { success: false, error: error.message };
    }
  }

  async resetKey(key) {
    // Input validation
    if (!key || typeof key !== "string") {
      throw new Error("Key must be a non-empty string");
    }

    try {
      // Ensure Redis is connected
      if (this.redis.status !== "ready") {
        await this.redis.connect();
      }

      const result = await this.redis.del(`${this.prefix}${key}`);
      return { success: true, deletedCount: result };
    } catch (error) {
      logger.warn("Redis reset error:", error.message);
      return { success: false, error: error.message };
    }
  }
}

// Limit to 5 requests per hour per IP for resend-verification
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: {
      message:
        "Too many resend verification requests from this IP, please try again after an hour.",
    },
  },
  store: new SlidingWindowRedisStore({
    prefix: "rl:resend:",
    windowMs: 60 * 60 * 1000,
  }),
  standardHeaders: true,
  legacyHeaders: false,
  // Skip failed requests (don't count errors against limit)
  skipFailedRequests: true,
});

// Rate limiting for chat messages (120 requests/min per persona) - SLIDING WINDOW
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute (doubled from 60)
  message: {
    error: {
      message: "Too many chat requests, please try again later.",
    },
  },
  keyGenerator: (req) => {
    // Rate limit per persona + user combination
    return `chat:${req.user.id}:${req.params.id}`;
  },
  store: new SlidingWindowRedisStore({
    prefix: "rl:chat:",
    windowMs: 60 * 1000,
  }),
  standardHeaders: true,
  legacyHeaders: false,
  // Don't count failed requests
  skipFailedRequests: true,
});

// Rate limiting for general persona requests - SLIDING WINDOW
const personaLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute (doubled from 100)
  message: {
    error: {
      message: "Too many requests, please try again later.",
    },
  },
  keyGenerator: (req) => {
    // Rate limit per user for authenticated requests, fallback to IP with IPv6 support
    return `persona:${req.user?.id || ipKeyGenerator(req)}`;
  },
  store: new SlidingWindowRedisStore({
    prefix: "rl:persona:",
    windowMs: 60 * 1000,
  }),
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
});

// Rate limiting for public routes (stricter limits) - SLIDING WINDOW
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute (doubled from 30)
  message: {
    error: {
      message: "Too many requests from this IP, please try again later.",
    },
  },
  keyGenerator: (req) => {
    // Rate limit per IP for public routes (no user authentication)
    return `public:${ipKeyGenerator(req)}`;
  },
  store: new SlidingWindowRedisStore({
    prefix: "rl:public:",
    windowMs: 60 * 1000,
  }),
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
});

// Development-friendly rate limiter (much more lenient for development)
const devLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute for development
  message: {
    error: {
      message: "Development rate limit exceeded. Please try again later.",
    },
  },
  keyGenerator: (req) => {
    // Rate limit per user for authenticated requests, fallback to IP
    return `dev:${req.user?.id || ipKeyGenerator(req)}`;
  },
  store: new SlidingWindowRedisStore({
    prefix: "rl:dev:",
    windowMs: 60 * 1000,
  }),
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
});

/**
 * Check Redis health and connection status
 * @returns {Promise<Object>} Health status object
 */
const checkRedisHealth = async () => {
  try {
    // Check current connection status
    const status = redis.status;

    // Try to connect if not ready
    if (status !== "ready") {
      try {
        await redis.connect();
      } catch (connectError) {
        logger.warn("Redis connection attempt failed:", connectError.message);
        return {
          healthy: false,
          status,
          message: `Redis connection failed: ${connectError.message}`,
        };
      }
    }

    // Ping Redis to verify it's responding
    const pingResult = await redis.ping();
    const finalStatus = redis.status;

    return {
      healthy: true,
      status: finalStatus,
      message: "Redis connected and responding",
      pingResult,
    };
  } catch (error) {
    logger.error("Redis health check failed:", error.message);
    return {
      healthy: false,
      status: redis.status,
      message: error.message || "Redis health check failed",
      error: error.name || "UnknownError",
    };
  }
};

/**
 * Clear rate limits for a specific key pattern (for admin/testing)
 * @param {string} key - The key pattern to clear
 * @param {string} prefix - The prefix to use (default: "rl:")
 * @returns {Promise<Object>} Result of the clear operation
 */
const clearRateLimit = async (key, prefix = "rl:") => {
  // Input validation
  if (!key || typeof key !== "string") {
    return { error: "Key must be a non-empty string" };
  }

  if (typeof prefix !== "string") {
    return { error: "Prefix must be a string" };
  }

  try {
    // Ensure Redis is connected
    if (redis.status !== "ready") {
      await redis.connect();
    }

    const pattern = `${prefix}${key}*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      const deletedCount = await redis.del(...keys);
      logger.info(
        `Cleared ${deletedCount} rate limit keys for pattern: ${pattern}`
      );
      return {
        success: true,
        cleared: deletedCount,
        pattern,
        keys: keys.length,
      };
    }

    return {
      success: true,
      cleared: 0,
      pattern,
      message: "No keys found to clear",
    };
  } catch (error) {
    logger.warn("Error clearing rate limits:", error.message);
    return {
      success: false,
      error: error.message,
      pattern: `${prefix}${key}*`,
    };
  }
};

/**
 * Get current rate limit status for a key
 * @param {string} key - The key to check
 * @param {string} prefix - The prefix to use (default: "rl:")
 * @returns {Promise<Object>} Rate limit status object
 */
const getRateLimitStatus = async (key, prefix = "rl:") => {
  // Input validation
  if (!key || typeof key !== "string") {
    return {
      error: "Key must be a non-empty string",
      key: null,
      currentCount: 0,
      ttlSeconds: -1,
      exists: false,
    };
  }

  if (typeof prefix !== "string") {
    return {
      error: "Prefix must be a string",
      key: null,
      currentCount: 0,
      ttlSeconds: -1,
      exists: false,
    };
  }

  const redisKey = `${prefix}${key}`;

  try {
    // Ensure Redis is connected
    if (redis.status !== "ready") {
      await redis.connect();
    }

    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    pipeline.zcard(redisKey);
    pipeline.ttl(redisKey);
    pipeline.exists(redisKey);

    const results = await pipeline.exec();

    // Check for pipeline errors
    const hasError = results.some((result) => result[0] !== null);
    if (hasError) {
      const errors = results
        .filter((result) => result[0] !== null)
        .map((result) => result[0]);
      throw new Error(`Pipeline errors: ${errors.join(", ")}`);
    }

    const count = results[0][1];
    const ttl = results[1][1];
    const exists = results[2][1] === 1;

    return {
      key: redisKey,
      currentCount: count,
      ttlSeconds: ttl,
      exists,
      status: redis.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.warn("Error getting rate limit status:", error.message);
    return {
      key: redisKey,
      currentCount: 0,
      ttlSeconds: -1,
      exists: false,
      status: redis.status,
      error: error.message || "Redis operation failed",
      timestamp: new Date().toISOString(),
    };
  }
};

// Auth-specific rate limiters (used by authRoutes.js)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour per IP (increased from 5)
  message: {
    error: {
      message: "Too many registration attempts, please try again later.",
    },
  },
  store: new SlidingWindowRedisStore({
    prefix: "rl:register:",
    windowMs: 60 * 60 * 1000,
  }),
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 minutes per IP (increased from 10)
  message: {
    error: {
      message: "Too many login attempts, please try again later.",
    },
  },
  store: new SlidingWindowRedisStore({
    prefix: "rl:login:",
    windowMs: 15 * 60 * 1000,
  }),
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour per IP (increased from 3)
  message: {
    error: {
      message: "Too many password reset attempts, please try again later.",
    },
  },
  store: new SlidingWindowRedisStore({
    prefix: "rl:password-reset:",
    windowMs: 60 * 60 * 1000,
  }),
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
});

/**
 * Cleanup Redis connection and resources
 * @returns {Promise<void>}
 */
const cleanup = async () => {
  try {
    if (redis && redis.status !== "end") {
      await redis.disconnect();
      logger.info("Redis connection closed for rate limiting");
    }
  } catch (error) {
    logger.warn("Error during Redis cleanup:", error.message);
  }
};

/**
 * Get Redis connection status
 * @returns {Object} Connection status information
 */
const getRedisStatus = () => {
  return {
    status: redis.status,
    connected: redis.status === "ready",
    uptime:
      redis.status === "ready"
        ? Date.now() - (redis.connectTime || Date.now())
        : 0,
  };
};

module.exports = {
  // Persona & Chat rate limiters
  resendVerificationLimiter,
  chatLimiter,
  personaLimiter,
  publicLimiter,
  devLimiter,
  // Auth rate limiters
  registerLimiter,
  loginLimiter,
  passwordResetLimiter,
  // Utilities for monitoring and admin
  redis,
  checkRedisHealth,
  clearRateLimit,
  getRateLimitStatus,
  cleanup,
  getRedisStatus,
  // Classes for testing and extension
  SlidingWindowRedisStore,
};
