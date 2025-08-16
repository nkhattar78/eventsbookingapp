const Redis = require("ioredis");

// Create Redis client
const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

redis.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

redis.on("ready", () => {
  console.log("🚀 Redis is ready for operations");
});

// Cache helper functions
const cache = {
  // Get data from cache
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error("Redis GET error:", err.message);
      return null;
    }
  },

  // Set data to cache with TTL (in seconds)
  async set(key, data, ttl = 300) {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error("Redis SET error:", err.message);
      return false;
    }
  },

  // Delete specific key
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (err) {
      console.error("Redis DEL error:", err.message);
      return false;
    }
  },

  // Delete keys by pattern
  async delPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(
          `🗑️ Cache invalidated: ${keys.length} keys matching "${pattern}"`
        );
      }
      return true;
    } catch (err) {
      console.error("Redis DEL pattern error:", err.message);
      return false;
    }
  },

  // Increment counter for tracking event views
  async incr(key, ttl = 86400) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, ttl); // Set TTL only on first increment
      }
      return count;
    } catch (err) {
      console.error("Redis INCR error:", err.message);
      return 0;
    }
  },

  // Get sorted set for top events
  async zrevrange(key, start = 0, stop = 4) {
    try {
      return await redis.zrevrange(key, start, stop, "WITHSCORES");
    } catch (err) {
      console.error("Redis ZREVRANGE error:", err.message);
      return [];
    }
  },

  // Add to sorted set
  async zadd(key, score, member) {
    try {
      await redis.zadd(key, score, member);
      return true;
    } catch (err) {
      console.error("Redis ZADD error:", err.message);
      return false;
    }
  },
};

module.exports = { redis, cache };
