/**
 * Redis-based cache service for distributed systems
 * Provides high-performance caching with Redis backend
 */

import { Redis } from 'ioredis';

interface CacheItem<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  serialize?: boolean; // Whether to serialize the value (default: true)
}

class RedisCacheService {
  private redis: Redis | null = null;
  private isConnected = false;
  private fallbackCache = new Map<string, CacheItem<unknown>>();
  private readonly MAX_FALLBACK_SIZE = 1000;
  private errorCount = 0;
  private breakerOpenUntil = 0;

  private applyPrefix(key: string): string {
    const prefix = process.env.CACHE_KEY_PREFIX || '';
    return prefix ? `${prefix}:${key}` : key;
  }

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Allow hard disable via env, but permit explicit enable in tests
      const explicitlyEnabled = String(process.env.REDIS_ENABLED || '').toLowerCase() === 'true';
      if (
        !explicitlyEnabled && (
          process.env.NODE_ENV === 'test' ||
          Boolean(process.env.JEST_WORKER_ID) ||
          String(process.env.REDIS_ENABLED || '').toLowerCase() === 'false'
        )
      ) {
        console.warn('Redis disabled by REDIS_ENABLED=false, using in-memory fallback');
        return;
      }

      const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING;
      const host = process.env.REDIS_HOST;
      const port = process.env.REDIS_PORT;
      const password = process.env.REDIS_PASSWORD;
      const db = process.env.REDIS_DB;

      const urlFromHostPort = host
        ? `redis://${password ? `:${password}@` : ''}${host}${port ? `:${port}` : ''}${db ? `/${db}` : ''}`
        : undefined;
       
      const connectionString = redisUrl || urlFromHostPort;

      if (!connectionString) {
        console.warn('Redis URL not configured, using in-memory fallback');
        return;
      }

      this.redis = new Redis(connectionString, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 2000,
        // Reconnect settings
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        }
      });

      // Event listeners
      this.redis.on('connect', () => {
        console.log('Redis connected');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.error('Redis error:', err);
        this.isConnected = false;
        this.errorCount += 1;
        if (this.errorCount >= 3) {
          this.breakerOpenUntil = Date.now() + 60_000; // 1min cooldown
        }
      });

      this.redis.on('close', () => {
        console.log('Redis connection closed');
        this.isConnected = false;
      });

      // Test connection
      await this.redis.ping();
      this.isConnected = true;
      this.errorCount = 0;

    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const realKey = this.applyPrefix(key);
      if (Date.now() < this.breakerOpenUntil) {
        // breaker open: skip redis path
      } else if (this.isConnected && this.redis) {
        const value = await this.redis.get(realKey);
        if (value !== null) {
          return JSON.parse(value);
        }
      }

      // Fallback to in-memory cache
      const item = this.fallbackCache.get(realKey);
      if (item && item.expiresAt > Date.now()) {
        return item.value as T;
      }

      // Remove expired item
      if (item) {
        this.fallbackCache.delete(realKey);
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttl = 300000, serialize = true } = options; // Default 5 minutes
    const realKey = this.applyPrefix(key);
    
    const serializedValue = serialize ? JSON.stringify(value) : value;
    try {
      // Try Redis first
      if (Date.now() >= this.breakerOpenUntil && this.isConnected && this.redis) {
        const seconds = Math.max(1, Math.floor(ttl / 1000));
        await this.redis.setex(realKey, seconds, serializedValue as string);
      }
    } catch (error) {
      console.error('Cache set error:', error);
      this.errorCount += 1;
      if (this.errorCount >= 3) {
        this.breakerOpenUntil = Date.now() + 60_000;
      }
    } finally {
      // Always store in fallback cache even if redis set fails
      this.fallbackCache.set(realKey, {
        value,
        expiresAt: Date.now() + ttl,
        createdAt: Date.now()
      });

      // Cleanup fallback cache if too large
      if (this.fallbackCache.size > this.MAX_FALLBACK_SIZE) {
        this.cleanupFallbackCache();
      }
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const realKey = this.applyPrefix(key);
      // Delete from Redis
      if (Date.now() >= this.breakerOpenUntil && this.isConnected && this.redis) {
        await this.redis.del(realKey);
      }

      // Delete from fallback cache
      this.fallbackCache.delete(realKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      // Clear Redis
      if (this.isConnected && this.redis) {
        await this.redis.flushdb();
      }

      // Clear fallback cache
      this.fallbackCache.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Flush all cache entries (Redis FLUSHALL equivalent)
   */
  async flushAll(): Promise<void> {
    try {
      // Flush Redis database
      if (this.isConnected && this.redis) {
        await this.redis.flushall();
      }
      
      // Clear fallback cache
      this.fallbackCache.clear();
    } catch (error) {
      console.error('Cache flushAll error:', error);
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const realKey = this.applyPrefix(key);
      // Check Redis first
      if (Date.now() >= this.breakerOpenUntil && this.isConnected && this.redis) {
        const exists = await this.redis.exists(realKey);
        if (exists) return true;
      }

      // Check fallback cache
      const item = this.fallbackCache.get(realKey);
      if (item && item.expiresAt > Date.now()) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Cache has error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const prefixed = keys.map(k => this.applyPrefix(k));
      // Try Redis first
      if (Date.now() >= this.breakerOpenUntil && this.isConnected && this.redis) {
        const values = await this.redis.mget(...prefixed);
        return values.map(v => v ? JSON.parse(v) as T : null);
      }

      // Fallback to in-memory cache
      return prefixed.map(key => {
        const item = this.fallbackCache.get(key);
        if (item && item.expiresAt > Date.now()) {
          return item.value as T;
        }
        return null;
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once
   */
  async mset<T>(pairs: Array<[string, T]>, options: CacheOptions = {}): Promise<void> {
    try {
      const promises = pairs.map(([key, value]) => this.set(key, value, options));
      await Promise.all(promises);
    } catch (error) {
      console.error('Cache mset error:', error);
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string, amount: number = 1): Promise<number> {
    try {
      const realKey = this.applyPrefix(key);
      // Try Redis first
      if (Date.now() >= this.breakerOpenUntil && this.isConnected && this.redis) {
        return await this.redis.incrby(realKey, amount);
      }

      // Fallback to in-memory cache
      const item = this.fallbackCache.get(realKey);
      const currentValue = typeof item?.value === 'number' ? item.value : 0;
      const newValue = currentValue + amount;
      
      this.fallbackCache.set(realKey, {
        value: newValue,
        expiresAt: Date.now() + 300000, // 5 minutes default
        createdAt: Date.now()
      });

      return newValue;
    } catch (error) {
      console.error('Cache incr error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    redisConnected: boolean;
    fallbackCacheSize: number;
    redisInfo?: string;
  }> {
    try {
      const stats = {
        redisConnected: this.isConnected,
        fallbackCacheSize: this.fallbackCache.size,
        redisInfo: undefined as string | undefined
      };

      if (this.isConnected && this.redis) {
        stats.redisInfo = await this.redis.info('memory');
      }

      return stats;
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        redisConnected: false,
        fallbackCacheSize: this.fallbackCache.size
      };
    }
  }

  /**
   * Clean up expired items from fallback cache
   */
  private cleanupFallbackCache(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [key, item] of this.fallbackCache.entries()) {
      if (item.expiresAt <= now) {
        expired.push(key);
      }
    }

    // Remove expired items
    expired.forEach(key => this.fallbackCache.delete(key));

    // If still too large, remove oldest items
    if (this.fallbackCache.size > this.MAX_FALLBACK_SIZE) {
      const entries = Array.from(this.fallbackCache.entries());
      entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
      
      const toRemove = entries.slice(0, this.fallbackCache.size - this.MAX_FALLBACK_SIZE);
      toRemove.forEach(([key]) => this.fallbackCache.delete(key));
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Export singleton instance
export const redisCacheService = new RedisCacheService();
export default redisCacheService;