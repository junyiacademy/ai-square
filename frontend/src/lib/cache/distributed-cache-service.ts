/**
 * Distributed cache service that automatically switches between Redis and in-memory cache
 * Provides seamless fallback and optimal performance
 */

import { redisCacheService } from './redis-cache-service';
import { cacheService } from './cache-service';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  useRedis?: boolean; // Whether to use Redis (default: true)
  staleWhileRevalidate?: number; // Serve stale content while revalidating
}

interface CacheItem<T> {
  value: T;
  expiresAt: number;
  staleAt: number;
  createdAt: number;
}

class DistributedCacheService {
  private localCache = new Map<string, CacheItem<unknown>>();
  private readonly MAX_LOCAL_SIZE = 500;
  private revalidationPromises = new Map<string, Promise<unknown>>();

  /**
   * Get value from cache with automatic fallback
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try local cache first for speed
      const localItem = this.localCache.get(key);
      if (localItem && localItem.expiresAt > Date.now()) {
        return localItem.value as T;
      }

      // Try Redis cache
      const redisValue = await redisCacheService.get<T>(key);
      if (redisValue !== null) {
        // Cache locally for future requests
        this.setLocal(key, redisValue, { ttl: 60000 }); // 1 minute local cache
        return redisValue;
      }

      // Try original cache service as final fallback
      return await cacheService.get<T>(key);
    } catch (error) {
      console.error('Distributed cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in distributed cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttl = 300000, useRedis = true } = options;

    try {
      // Set in local cache
      this.setLocal(key, value, { ttl });

      // Set in Redis if enabled
      if (useRedis) {
        await redisCacheService.set(key, value, { ttl });
      }

      // Set in fallback cache
      await cacheService.set(key, value, { ttl });
    } catch (error) {
      console.error('Distributed cache set error:', error);
    }
  }

  /**
   * Get with stale-while-revalidate support
   */
  async getWithRevalidation<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = 300000 } = options;

    try {
      // Check local cache first
      const localItem = this.localCache.get(key);
      if (localItem) {
        if (localItem.expiresAt > Date.now()) {
          // Fresh data
          return localItem.value as T;
        } else if (localItem.staleAt > Date.now()) {
          // Stale data - return it but trigger revalidation
          this.revalidateInBackground(key, fetcher, options);
          return localItem.value as T;
        }
      }

      // Check Redis cache
      const redisValue = await redisCacheService.get<T>(key);
      if (redisValue !== null) {
        this.setLocal(key, redisValue, { ttl });
        return redisValue;
      }

      // Check fallback cache
      const fallbackValue = await cacheService.get<T>(key);
      if (fallbackValue !== null) {
        this.setLocal(key, fallbackValue, { ttl });
        await redisCacheService.set(key, fallbackValue, { ttl });
        return fallbackValue;
      }

      // Fetch fresh data
      return await this.fetchAndCache(key, fetcher, options);
    } catch (error) {
      console.error('Distributed cache getWithRevalidation error:', error);
      // Try to return stale data on error
      const localItem = this.localCache.get(key);
      if (localItem) {
        return localItem.value as T;
      }
      throw error;
    }
  }

  /**
   * Delete from all caches
   */
  async delete(key: string): Promise<void> {
    try {
      // Delete from local cache
      this.localCache.delete(key);

      // Delete from Redis
      await redisCacheService.delete(key);

      // Delete from fallback cache
      await cacheService.delete(key);

      // Cancel any pending revalidation
      this.revalidationPromises.delete(key);
    } catch (error) {
      console.error('Distributed cache delete error:', error);
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    try {
      // Clear local cache
      this.localCache.clear();

      // Clear Redis
      await redisCacheService.clear();

      // Clear fallback cache
      await cacheService.clear();

      // Clear revalidation promises
      this.revalidationPromises.clear();
    } catch (error) {
      console.error('Distributed cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    localCacheSize: number;
    redisStats: unknown;
    fallbackCacheSize: number;
    activeRevalidations: number;
  }> {
    try {
      const redisStats = await redisCacheService.getStats();
      
      return {
        localCacheSize: this.localCache.size,
        redisStats,
        fallbackCacheSize: 0, // cacheService doesn't expose size
        activeRevalidations: this.revalidationPromises.size
      };
    } catch (error) {
      console.error('Distributed cache stats error:', error);
      return {
        localCacheSize: this.localCache.size,
        redisStats: null,
        fallbackCacheSize: 0,
        activeRevalidations: this.revalidationPromises.size
      };
    }
  }

  /**
   * Batch operations
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      // Try Redis first for batch operation
      const redisValues = await redisCacheService.mget<T>(keys);
      
      // Fill in missing values from local cache
      const results: (T | null)[] = [];
      for (let i = 0; i < keys.length; i++) {
        if (redisValues[i] !== null) {
          results[i] = redisValues[i];
        } else {
          const localItem = this.localCache.get(keys[i]);
          if (localItem && localItem.expiresAt > Date.now()) {
            results[i] = localItem.value as T;
          } else {
            results[i] = null;
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Distributed cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Batch set operations
   */
  async mset<T>(pairs: Array<[string, T]>, options: CacheOptions = {}): Promise<void> {
    try {
      // Set in local cache
      pairs.forEach(([key, value]) => {
        this.setLocal(key, value, options);
      });

      // Set in Redis
      if (options.useRedis !== false) {
        await redisCacheService.mset(pairs, options);
      }

      // Set in fallback cache
      await Promise.all(
        pairs.map(([key, value]) => cacheService.set(key, value, options))
      );
    } catch (error) {
      console.error('Distributed cache mset error:', error);
    }
  }

  /**
   * Set value in local cache with cleanup
   */
  private setLocal<T>(key: string, value: T, options: CacheOptions = {}): void {
    const { ttl = 300000, staleWhileRevalidate = 3600000 } = options;
    const now = Date.now();

    this.localCache.set(key, {
      value,
      expiresAt: now + ttl,
      staleAt: now + ttl + staleWhileRevalidate,
      createdAt: now
    });

    // Cleanup if cache is too large
    if (this.localCache.size > this.MAX_LOCAL_SIZE) {
      this.cleanupLocalCache();
    }
  }

  /**
   * Revalidate data in background
   */
  private revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): void {
    // Avoid duplicate revalidations
    if (this.revalidationPromises.has(key)) {
      return;
    }

    const promise = this.fetchAndCache(key, fetcher, options)
      .catch(error => {
        console.error('Background revalidation failed:', error);
      })
      .finally(() => {
        this.revalidationPromises.delete(key);
      });

    this.revalidationPromises.set(key, promise);
  }

  /**
   * Fetch data and cache it
   */
  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Clean up expired items from local cache
   */
  private cleanupLocalCache(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [key, item] of this.localCache.entries()) {
      if (item.staleAt <= now) {
        expired.push(key);
      }
    }

    // Remove expired items
    expired.forEach(key => this.localCache.delete(key));

    // If still too large, remove oldest items
    if (this.localCache.size > this.MAX_LOCAL_SIZE) {
      const entries = Array.from(this.localCache.entries());
      entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
      
      const toRemove = entries.slice(0, this.localCache.size - this.MAX_LOCAL_SIZE);
      toRemove.forEach(([key]) => this.localCache.delete(key));
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await redisCacheService.close();
  }
}

// Export singleton instance
export const distributedCacheService = new DistributedCacheService();
export default distributedCacheService;