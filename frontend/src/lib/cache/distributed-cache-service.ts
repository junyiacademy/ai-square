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
  onStatus?: (status: 'HIT' | 'MISS' | 'STALE') => void;
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
  private stats = { hits: 0, misses: 0, stale: 0, revalidate: 0 };

  private applyPrefix(key: string): string {
    const prefix = process.env.CACHE_KEY_PREFIX || '';
    return prefix ? `${prefix}:${key}` : key;
  }

  private withJitter(ms: number | undefined): number | undefined {
    if (!ms) return ms;
    if (process.env.NODE_ENV === 'test') return ms;
    const jitter = 0.1; // ±10%
    const factor = 1 + (Math.random() * 2 * jitter - jitter);
    return Math.max(1, Math.floor(ms * factor));
  }

  /**
   * Get value from cache with automatic fallback
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const realKey = this.applyPrefix(key);
      // Try local cache first for speed
      const localItem = this.localCache.get(realKey);
      if (localItem && localItem.expiresAt > Date.now()) {
        this.stats.hits += 1;
        return localItem.value as T;
      }

      // Try Redis cache
      const redisValue = await redisCacheService.get<T>(realKey);
      if (redisValue !== null) {
        // Cache locally for future requests
        this.setLocal(realKey, redisValue, { ttl: 60000 }); // 1 minute local cache
        this.stats.hits += 1;
        return redisValue;
      }

      // Try original cache service as final fallback
      const fallback = await cacheService.get<T>(realKey);
      if (fallback !== null) {
        this.stats.hits += 1;
      } else {
        this.stats.misses += 1;
      }
      return fallback;
    } catch (error) {
      console.error('Distributed cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in distributed cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { useRedis = true } = options;
    const realKey = this.applyPrefix(key);
    const ttl = this.withJitter(options.ttl) ?? 300000;

    try {
      // Set in local cache
      this.setLocal(realKey, value, { ttl });

      // Set in Redis if enabled
      if (useRedis) {
        await redisCacheService.set(realKey, value, { ttl });
      }

      // Set in fallback cache
      await cacheService.set(realKey, value, { ttl });
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
    const { onStatus } = options;
    const ttl = this.withJitter(options.ttl) ?? 300000;
    const realKey = this.applyPrefix(key);

    try {
      // Check local cache first
      const localItem = this.localCache.get(realKey);
      if (localItem) {
        if (localItem.expiresAt > Date.now()) {
          // Fresh data
          this.stats.hits += 1;
          onStatus?.('HIT');
          return localItem.value as T;
        } else if (localItem.staleAt > Date.now()) {
          // Stale data - return it but trigger revalidation
          this.revalidateInBackground(realKey, fetcher, { ...options, ttl });
          this.stats.stale += 1;
          this.stats.revalidate += 1;
          onStatus?.('STALE');
          return localItem.value as T;
        }
      }

      // Check Redis cache
      const redisValue = await redisCacheService.get<T>(realKey);
      if (redisValue !== null) {
        this.setLocal(realKey, redisValue, { ttl });
        this.stats.hits += 1;
        onStatus?.('HIT');
        return redisValue;
      }

      // Check fallback cache
      const fallbackValue = await cacheService.get<T>(realKey);
      if (fallbackValue !== null) {
        this.setLocal(realKey, fallbackValue, { ttl });
        await redisCacheService.set(realKey, fallbackValue, { ttl });
        this.stats.hits += 1;
        onStatus?.('HIT');
        return fallbackValue;
      }

      // Fetch fresh data
      this.stats.misses += 1;
      onStatus?.('MISS');
      return await this.fetchAndCache(realKey, fetcher, { ...options, ttl });
    } catch (error) {
      console.error('Distributed cache getWithRevalidation error:', error);
      // Try to return stale data on error
      const localItem = this.localCache.get(realKey);
      if (localItem) {
        this.stats.stale += 1;
        onStatus?.('STALE');
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
      const realKey = this.applyPrefix(key);
      // Delete from local cache
      this.localCache.delete(realKey);

      // Delete from Redis
      await redisCacheService.delete(realKey);

      // Delete from fallback cache
      await cacheService.delete(realKey);

      // Cancel any pending revalidation
      this.revalidationPromises.delete(realKey);
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
    hitRate?: number;
    counters?: { hits: number; misses: number; stale: number; revalidate: number };
  }> {
    try {
      const redisStats = await redisCacheService.getStats();
      
      const summary = {
        localCacheSize: this.localCache.size,
        redisStats,
        fallbackCacheSize: 0, // cacheService doesn't expose size
        activeRevalidations: this.revalidationPromises.size,
        hitRate: (this.stats.hits + this.stats.misses) > 0 ? Math.round((this.stats.hits * 100) / (this.stats.hits + this.stats.misses)) : 0,
        counters: { ...this.stats }
      };
      return summary;
    } catch (error) {
      console.error('Distributed cache stats error:', error);
      return {
        localCacheSize: this.localCache.size,
        redisStats: null,
        fallbackCacheSize: 0,
        activeRevalidations: this.revalidationPromises.size,
        hitRate: (this.stats.hits + this.stats.misses) > 0 ? Math.round((this.stats.hits * 100) / (this.stats.hits + this.stats.misses)) : 0,
        counters: { ...this.stats }
      };
    }
  }

  /**
   * Batch operations
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      // Try Redis first for batch operation
      const prefixed = keys.map(k => this.applyPrefix(k));
      const redisValues = await redisCacheService.mget<T>(prefixed);
      
      // Fill in missing values from local cache
      const results: (T | null)[] = [];
      for (let i = 0; i < prefixed.length; i++) {
        if (redisValues[i] !== null) {
          results[i] = redisValues[i];
        } else {
          const localItem = this.localCache.get(prefixed[i]);
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
    const ttl = this.withJitter(options.ttl) ?? 300000;
    const staleWhileRevalidate = this.withJitter(options.staleWhileRevalidate) ?? 3600000;
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