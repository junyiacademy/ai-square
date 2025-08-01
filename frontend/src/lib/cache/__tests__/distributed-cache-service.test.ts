import { DistributedCacheService } from '../distributed-cache-service';
import { cacheService } from '../cache-service';
import { redisCacheService } from '../redis-cache-service';

// Mock dependencies
jest.mock('../cache-service');
jest.mock('../redis-cache-service');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockRedisCacheService = redisCacheService as jest.Mocked<typeof redisCacheService>;

describe('DistributedCacheService', () => {
  let service: DistributedCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DistributedCacheService();
    
    // Mock Redis connection states
    mockRedisCacheService.isConnected = jest.fn().mockReturnValue(true);
  });

  describe('get', () => {
    it('retrieves from Redis when connected', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockRedisCacheService.get.mockResolvedValue(mockData);

      const result = await service.get('test-key');

      expect(mockRedisCacheService.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(mockData);
    });

    it('falls back to local cache when Redis is not connected', async () => {
      mockRedisCacheService.isConnected.mockReturnValue(false);
      const mockData = { id: 2, name: 'Local' };
      mockCacheService.get.mockResolvedValue(mockData);

      const result = await service.get('test-key');

      expect(mockRedisCacheService.get).not.toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(mockData);
    });

    it('falls back to local cache when Redis throws error', async () => {
      mockRedisCacheService.get.mockRejectedValue(new Error('Redis error'));
      const mockData = { id: 3, name: 'Fallback' };
      mockCacheService.get.mockResolvedValue(mockData);

      const result = await service.get('test-key');

      expect(mockCacheService.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(mockData);
    });

    it('returns null when not found in any cache', async () => {
      mockRedisCacheService.get.mockResolvedValue(null);
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('sets in both Redis and local cache when Redis is connected', async () => {
      const data = { id: 4, name: 'Test Set' };
      const options = { ttl: 3600000 };

      await service.set('test-key', data, options);

      expect(mockRedisCacheService.set).toHaveBeenCalledWith('test-key', data, options);
      expect(mockCacheService.set).toHaveBeenCalledWith('test-key', data, options);
    });

    it('only sets in local cache when Redis is not connected', async () => {
      mockRedisCacheService.isConnected.mockReturnValue(false);
      const data = { id: 5, name: 'Local Only' };

      await service.set('test-key', data);

      expect(mockRedisCacheService.set).not.toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalledWith('test-key', data, undefined);
    });

    it('still sets local cache when Redis set fails', async () => {
      mockRedisCacheService.set.mockRejectedValue(new Error('Redis set error'));
      const data = { id: 6, name: 'Error Test' };

      await service.set('test-key', data);

      expect(mockCacheService.set).toHaveBeenCalledWith('test-key', data, undefined);
    });
  });

  describe('delete', () => {
    it('deletes from both caches when Redis is connected', async () => {
      await service.delete('test-key');

      expect(mockRedisCacheService.delete).toHaveBeenCalledWith('test-key');
      expect(mockCacheService.delete).toHaveBeenCalledWith('test-key');
    });

    it('only deletes from local cache when Redis is not connected', async () => {
      mockRedisCacheService.isConnected.mockReturnValue(false);

      await service.delete('test-key');

      expect(mockRedisCacheService.delete).not.toHaveBeenCalled();
      expect(mockCacheService.delete).toHaveBeenCalledWith('test-key');
    });

    it('still deletes from local cache when Redis delete fails', async () => {
      mockRedisCacheService.delete.mockRejectedValue(new Error('Redis delete error'));

      await service.delete('test-key');

      expect(mockCacheService.delete).toHaveBeenCalledWith('test-key');
    });
  });

  describe('clear', () => {
    it('clears both caches when Redis is connected', async () => {
      await service.clear();

      expect(mockRedisCacheService.clear).toHaveBeenCalled();
      expect(mockCacheService.clear).toHaveBeenCalled();
    });

    it('only clears local cache when Redis is not connected', async () => {
      mockRedisCacheService.isConnected.mockReturnValue(false);

      await service.clear();

      expect(mockRedisCacheService.clear).not.toHaveBeenCalled();
      expect(mockCacheService.clear).toHaveBeenCalled();
    });

    it('still clears local cache when Redis clear fails', async () => {
      mockRedisCacheService.clear.mockRejectedValue(new Error('Redis clear error'));

      await service.clear();

      expect(mockCacheService.clear).toHaveBeenCalled();
    });
  });

  describe('getWithRevalidation', () => {
    it('returns cached data when available and not stale', async () => {
      const mockData = { id: 7, name: 'Fresh', timestamp: Date.now() };
      mockRedisCacheService.get.mockResolvedValue(mockData);
      const fetcher = jest.fn();

      const result = await service.getWithRevalidation('test-key', fetcher, {
        ttl: 3600000,
        staleWhileRevalidate: 7200000
      });

      expect(result).toEqual(mockData);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('fetches new data when cache miss', async () => {
      mockRedisCacheService.get.mockResolvedValue(null);
      const freshData = { id: 8, name: 'Fresh Fetch' };
      const fetcher = jest.fn().mockResolvedValue(freshData);

      const result = await service.getWithRevalidation('test-key', fetcher, {
        ttl: 3600000
      });

      expect(fetcher).toHaveBeenCalled();
      expect(mockRedisCacheService.set).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining(freshData),
        { ttl: 3600000 }
      );
      expect(result).toEqual(expect.objectContaining(freshData));
    });

    it('returns stale data while revalidating in background', async () => {
      const staleData = { 
        id: 9, 
        name: 'Stale', 
        timestamp: Date.now() - 4000000 // 4 hours old
      };
      mockRedisCacheService.get.mockResolvedValue(staleData);
      const freshData = { id: 9, name: 'Fresh' };
      const fetcher = jest.fn().mockResolvedValue(freshData);

      const result = await service.getWithRevalidation('test-key', fetcher, {
        ttl: 3600000, // 1 hour
        staleWhileRevalidate: 7200000 // 2 hours
      });

      // Should return stale data immediately
      expect(result).toEqual(staleData);
      
      // Fetcher should be called in background
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(fetcher).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('returns combined stats from both caches', async () => {
      const localStats = {
        hits: 100,
        misses: 20,
        sets: 80,
        deletes: 10,
        hitRate: 0.833
      };
      const redisStats = {
        redisConnected: true,
        redisHits: 500,
        redisMisses: 50,
        redisSets: 450,
        redisDeletes: 30
      };

      mockCacheService.getStats.mockReturnValue(localStats);
      mockRedisCacheService.getStats.mockResolvedValue(redisStats);

      const stats = await service.getStats();

      expect(stats).toEqual({
        localCacheSize: localStats.sets - localStats.deletes,
        localCacheStats: localStats,
        redisStats,
        hitRate: localStats.hitRate
      });
    });

    it('handles Redis stats error gracefully', async () => {
      const localStats = {
        hits: 50,
        misses: 10,
        sets: 40,
        deletes: 5,
        hitRate: 0.833
      };

      mockCacheService.getStats.mockReturnValue(localStats);
      mockRedisCacheService.getStats.mockRejectedValue(new Error('Stats error'));

      const stats = await service.getStats();

      expect(stats).toEqual({
        localCacheSize: 35,
        localCacheStats: localStats,
        redisStats: null,
        hitRate: localStats.hitRate
      });
    });
  });

  describe('pattern-based operations', () => {
    it('deletes by pattern from both caches', async () => {
      mockCacheService.keys.mockReturnValue(['user:1', 'user:2', 'other:1']);

      await service.deletePattern('user:*');

      expect(mockRedisCacheService.deletePattern).toHaveBeenCalledWith('user:*');
      expect(mockCacheService.delete).toHaveBeenCalledWith('user:1');
      expect(mockCacheService.delete).toHaveBeenCalledWith('user:2');
      expect(mockCacheService.delete).not.toHaveBeenCalledWith('other:1');
    });

    it('handles pattern delete when Redis is not connected', async () => {
      mockRedisCacheService.isConnected.mockReturnValue(false);
      mockCacheService.keys.mockReturnValue(['test:1', 'test:2']);

      await service.deletePattern('test:*');

      expect(mockRedisCacheService.deletePattern).not.toHaveBeenCalled();
      expect(mockCacheService.delete).toHaveBeenCalledWith('test:1');
      expect(mockCacheService.delete).toHaveBeenCalledWith('test:2');
    });
  });
});
