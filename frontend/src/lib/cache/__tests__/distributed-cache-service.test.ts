import { distributedCacheService } from '../distributed-cache-service';
import { cacheService } from '../cache-service';
import { redisCacheService } from '../redis-cache-service';

// Mock dependencies
jest.mock('../cache-service');
jest.mock('../redis-cache-service');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockRedisCacheService = redisCacheService as jest.Mocked<typeof redisCacheService>;

describe('DistributedCacheService', () => {
  let service: typeof distributedCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = distributedCacheService;
    
    // Mock Redis getStats to indicate connected state
    mockRedisCacheService.getStats = jest.fn().mockResolvedValue({
      redisConnected: true,
      fallbackCacheSize: 0
    });
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
      // Simulate Redis not connected by making get throw an error
      mockRedisCacheService.get.mockRejectedValue(new Error('Redis not connected'));
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
      // Simulate Redis not connected by making get throw an error
      mockRedisCacheService.get.mockRejectedValue(new Error('Redis not connected'));
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
      // Simulate Redis not connected by making get throw an error
      mockRedisCacheService.get.mockRejectedValue(new Error('Redis not connected'));

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
      // Simulate Redis not connected by making get throw an error
      mockRedisCacheService.get.mockRejectedValue(new Error('Redis not connected'));

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
      const redisStats = {
        redisConnected: true,
        fallbackCacheSize: 10,
        redisInfo: 'memory info'
      };

      mockRedisCacheService.getStats.mockResolvedValue(redisStats);

      const stats = await service.getStats();

      expect(stats).toMatchObject({
        localCacheSize: expect.any(Number),
        redisStats,
        fallbackCacheSize: 0,
        activeRevalidations: expect.any(Number)
      });
    });

    it('handles Redis stats error gracefully', async () => {
      mockRedisCacheService.getStats.mockRejectedValue(new Error('Stats error'));

      const stats = await service.getStats();

      expect(stats).toMatchObject({
        localCacheSize: expect.any(Number),
        redisStats: null,
        fallbackCacheSize: 0,
        activeRevalidations: expect.any(Number)
      });
    });
  });

  // TODO: Implement pattern-based operations tests when deletePattern method is added
  // describe('pattern-based operations', () => {
  //   it('deletes by pattern from both caches', async () => {
  //     // Test implementation
  //   });
  // });
});
