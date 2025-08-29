#!/usr/bin/env node
/**
 * Redis monitoring script for rate limiting
 * Usage: node redis-monitor.js
 */

const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function monitorRateLimits() {
  console.log("🔍 Redis Rate Limit Monitor");
  console.log("Press Ctrl+C to exit\n");

  setInterval(async () => {
    try {
      // Get all rate limit keys
      const keys = await redis.keys("rl:*");

      if (keys.length === 0) {
        console.log(`${new Date().toISOString()} - No active rate limits`);
        return;
      }

      console.log(`\n${new Date().toISOString()} - Active Rate Limits:`);
      console.log("=".repeat(70));

      for (const key of keys) {
        const type = await redis.type(key);

        if (type === "zset") {
          const count = await redis.zcard(key);
          const ttl = await redis.ttl(key);

          // Get the oldest and newest entries
          const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
          const newest = await redis.zrange(key, -1, -1, "WITHSCORES");

          const oldestTime = oldest[1] ? new Date(parseInt(oldest[1])) : null;
          const newestTime = newest[1] ? new Date(parseInt(newest[1])) : null;

          console.log(`📊 ${key}`);
          console.log(`   Count: ${count} requests`);
          console.log(`   TTL: ${ttl}s`);
          if (oldestTime) {
            console.log(`   Oldest: ${oldestTime.toISOString()}`);
            console.log(`   Newest: ${newestTime.toISOString()}`);
          }
          console.log("");
        }
      }
    } catch (error) {
      console.error("❌ Monitor error:", error.message);
    }
  }, 5000); // Update every 5 seconds
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Stopping monitor...");
  redis.disconnect();
  process.exit(0);
});

monitorRateLimits();
