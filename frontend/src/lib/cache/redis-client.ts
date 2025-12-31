/**
 * Redis Client for Session Storage and Caching
 *
 * Provides a singleton Redis client with automatic connection management
 * and fallback to null if Redis is not available
 */

import Redis from "ioredis";

let redisClient: Redis | null = null;
let connectionAttempted = false;

/**
 * Get or create Redis client instance
 */
export async function getRedisClient(): Promise<Redis | null> {
  // If we already tried and failed, don't retry
  if (connectionAttempted && !redisClient) {
    return null;
  }

  // If client exists and is ready, return it
  if (redisClient && redisClient.status === "ready") {
    return redisClient;
  }

  // Try to create new client
  if (!connectionAttempted) {
    connectionAttempted = true;

    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            // Silently fallback to in-memory storage
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        },
        reconnectOnError: (err) => {
          const targetErrors = ["READONLY", "ECONNREFUSED", "ENOTFOUND"];
          if (targetErrors.some((e) => err.message.includes(e))) {
            return true; // Reconnect for these errors
          }
          return false;
        },
        lazyConnect: true,
        enableReadyCheck: true,
      });

      // Set up event handlers
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      redisClient.on("error", (_err) => {
        // Silently ignore Redis connection errors - will fallback to memory
        // console.error('[Redis] Connection error:', err.message);
      });

      redisClient.on("connect", () => {
        // Redis connected
      });

      redisClient.on("ready", () => {
        // Redis ready
      });

      // Try to connect
      await redisClient.connect();

      // Test the connection
      await redisClient.ping();

      return redisClient;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Silently fallback to in-memory storage
      redisClient = null;
      return null;
    }
  }

  return null;
}

/**
 * Export the client for modules that need direct access
 */
export { redisClient };

/**
 * Gracefully close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    connectionAttempted = false;
  }
}
