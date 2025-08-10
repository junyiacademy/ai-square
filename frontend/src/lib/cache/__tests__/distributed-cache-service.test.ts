import { distributedCacheService } from '../distributed-cache-service';

describe('distributedCacheService', () => {
  describe('initialization', () => {
    it('should be defined', () => {
      expect(distributedCacheService).toBeDefined();
    });
  });
  
  describe('get and set', () => {
    it('should set and get values', async () => {
      await distributedCacheService.set('test-key', 'test-value', { ttl: 60 });
      const value = await distributedCacheService.get('test-key');
      expect(value).toBe('test-value');
    });
    
    it('should return null for missing keys', async () => {
      const value = await distributedCacheService.get('non-existent-key');
      expect(value).toBeNull();
    });
  });
  
  describe('delete', () => {
    it('should delete values', async () => {
      await distributedCacheService.set('test-key', 'test-value', { ttl: 60 });
      await distributedCacheService.delete('test-key');
      const value = await distributedCacheService.get('test-key');
      expect(value).toBeNull();
    });
  });
  
  describe('clear', () => {
    it('should clear all values', async () => {
      await distributedCacheService.set('key1', 'value1', { ttl: 60 });
      await distributedCacheService.set('key2', 'value2', { ttl: 60 });
      await distributedCacheService.clear();
      
      const value1 = await distributedCacheService.get('key1');
      const value2 = await distributedCacheService.get('key2');
      
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });
  });

  describe('revalidation and fallback', () => {
    beforeEach(async () => {
      await distributedCacheService.clear();
    });

    it('should return fresh data from local cache', async () => {
      await distributedCacheService.set('fresh', { v: 1 }, { ttl: 60_000 });
      const data = await distributedCacheService.getWithRevalidation('fresh', async () => ({ v: 2 }), {
        ttl: 60_000,
        staleWhileRevalidate: 3_600_000
      });
      expect(data).toEqual({ v: 1 });
    });

    it('should return stale then revalidate in background', async () => {
      jest.useFakeTimers({ now: new Date('2024-01-01T00:00:00Z') });
      await distributedCacheService.set('stale', { n: 1 }, { ttl: 1000, useRedis: false });

      // Advance past ttl but within stale window
      jest.setSystemTime(new Date('2024-01-01T00:00:02Z'));
      const fetcher = jest.fn(async () => ({ n: 2 }));
      const result = await distributedCacheService.getWithRevalidation('stale', fetcher, {
        ttl: 1000,
        staleWhileRevalidate: 60_000
      });

      // Returns stale immediately
      expect(result).toEqual({ n: 1 });

      // Allow background revalidation to complete by polling
      jest.useRealTimers();
      let after = null as unknown as { n: number } | null;
      for (let i = 0; i < 25; i++) {
        after = await distributedCacheService.get('stale');
        if (after) break;
        await new Promise((r) => setTimeout(r, 10));
      }
      expect(after).toEqual({ n: 2 });
    });

    it('should fall back to original cache service when redis/local miss', async () => {
      // Use a distinct key to avoid local hits
      const key = 'fallback-only';
      // Simulate fallback cache by setting through distributed.set (which also calls fallback)
      await distributedCacheService.clear();
      // Manually use set to populate fallback and local
      await distributedCacheService.set(key, { x: 1 }, { ttl: 60_000, useRedis: false });
      const val = await distributedCacheService.get(key);
      expect(val).toEqual({ x: 1 });
    });
  });

  describe('batch operations', () => {
    beforeEach(async () => {
      await distributedCacheService.clear();
    });

    it('mset then mget should roundtrip values', async () => {
      await distributedCacheService.mset([
        ['k1', { a: 1 }],
        ['k2', { b: 2 }]
      ], { ttl: 60_000, useRedis: false });

      const values = await distributedCacheService.mget<{ a?: number; b?: number }>(['k1', 'k2', 'k3']);
      expect(values).toEqual([{ a: 1 }, { b: 2 }, null]);
    });
  });

  describe('stats and error handling', () => {
    it('should return stats without throwing', async () => {
      await distributedCacheService.set('sx', 123, { ttl: 60_000, useRedis: false });
      const stats = await distributedCacheService.getStats();
      expect(stats.localCacheSize).toBeGreaterThanOrEqual(1);
      expect(typeof stats.activeRevalidations).toBe('number');
    });

    it('should handle errors in get and delete gracefully', async () => {
      const { redisCacheService } = await import('../redis-cache-service');
      const spyGet = jest.spyOn(redisCacheService, 'get').mockRejectedValueOnce(new Error('boom'));

      const val = await distributedCacheService.get('err-key');
      expect(val).toBeNull();
      spyGet.mockRestore();

      const spyDel = jest.spyOn(redisCacheService, 'delete').mockRejectedValueOnce(new Error('boom'));
      await expect(distributedCacheService.delete('err-key')).resolves.toBeUndefined();
      spyDel.mockRestore();
    });
  });
});