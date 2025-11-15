/**
 * Cache Monitoring API Route Tests
 * 測試快取監控功能
 */

import { GET, DELETE } from '../route';
import { NextRequest } from 'next/server';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { redisCacheService } from '@/lib/cache/redis-cache-service';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock cache services
jest.mock('@/lib/cache/distributed-cache-service', () => ({
  distributedCacheService: {
    getStats: jest.fn(),
    clear: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/lib/cache/redis-cache-service', () => ({
  redisCacheService: {
    getStats: jest.fn(),
  },
}));

// Mock console methods
const mockConsoleError = createMockConsoleError();

describe('/api/monitoring/cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET - Cache Status and Actions', () => {
    const mockDistributedStats = {
      hits: 100,
      misses: 20,
      hitRate: 0.833,
      size: 5000,
      keys: 50,
    };

    const mockRedisStats = {
      hits: 200,
      misses: 30,
      hitRate: 0.870,
      connected: true,
      memory: '2MB',
    };

    it('should return default cache status when no action specified', async () => {
      (distributedCacheService.getStats as jest.Mock).mockResolvedValue(mockDistributedStats);

      const request = new NextRequest('http://localhost:3000/api/monitoring/cache');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        stats: mockDistributedStats,
        actions: {
          clear: '/api/monitoring/cache?action=clear',
          stats: '/api/monitoring/cache?action=stats',
        },
      });
      expect(data.timestamp).toBeDefined();
      expect(distributedCacheService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should return combined stats when action=stats', async () => {
      (distributedCacheService.getStats as jest.Mock).mockResolvedValue(mockDistributedStats);
      (redisCacheService.getStats as jest.Mock).mockResolvedValue(mockRedisStats);

      const request = new NextRequest('http://localhost:3000/api/monitoring/cache?action=stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        distributed: mockDistributedStats,
        redis: mockRedisStats,
      });
      expect(data.timestamp).toBeDefined();
      expect(distributedCacheService.getStats).toHaveBeenCalledTimes(1);
      expect(redisCacheService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should clear all caches when action=clear', async () => {
      (distributedCacheService.clear as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/monitoring/cache?action=clear');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'All caches cleared',
      });
      expect(data.timestamp).toBeDefined();
      expect(distributedCacheService.clear).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when getting stats fails', async () => {
      const error = new Error('Redis connection failed');
      (distributedCacheService.getStats as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/monitoring/cache');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to get cache status' });
      expect(mockConsoleError).toHaveBeenCalledWith('Error in cache monitoring:', error);
    });

    it('should handle errors when clearing cache fails', async () => {
      const error = new Error('Clear operation failed');
      (distributedCacheService.clear as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/monitoring/cache?action=clear');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to get cache status' });
      expect(mockConsoleError).toHaveBeenCalledWith('Error in cache monitoring:', error);
    });
  });

  describe('DELETE - Cache Deletion', () => {
    it('should delete specific cache key when key parameter provided', async () => {
      (distributedCacheService.delete as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/monitoring/cache?key=test-key');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Cache key "test-key" deleted',
      });
      expect(data.timestamp).toBeDefined();
      expect(distributedCacheService.delete).toHaveBeenCalledWith('test-key');
      expect(distributedCacheService.clear).not.toHaveBeenCalled();
    });

    it('should clear all caches when no key parameter provided', async () => {
      (distributedCacheService.clear as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/monitoring/cache');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'All caches cleared',
      });
      expect(data.timestamp).toBeDefined();
      expect(distributedCacheService.clear).toHaveBeenCalledTimes(1);
      expect(distributedCacheService.delete).not.toHaveBeenCalled();
    });

    it('should handle errors when deleting specific key fails', async () => {
      const error = new Error('Key not found');
      (distributedCacheService.delete as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/monitoring/cache?key=missing-key');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to clear cache' });
      expect(mockConsoleError).toHaveBeenCalledWith('Error clearing cache:', error);
    });

    it('should handle errors when clearing all caches fails', async () => {
      const error = new Error('Clear operation failed');
      (distributedCacheService.clear as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/monitoring/cache');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to clear cache' });
      expect(mockConsoleError).toHaveBeenCalledWith('Error clearing cache:', error);
    });

    it('should handle special characters in cache keys', async () => {
      (distributedCacheService.delete as jest.Mock).mockResolvedValue(undefined);

      const specialKey = 'cache:user:123/profile#data';
      const encodedKey = encodeURIComponent(specialKey);
      const request = new NextRequest(`http://localhost:3000/api/monitoring/cache?key=${encodedKey}`);
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe(`Cache key "${specialKey}" deleted`);
      expect(distributedCacheService.delete).toHaveBeenCalledWith(specialKey);
    });
  });

  describe('Edge Cases', () => {
    it('should handle parallel stats requests', async () => {
      (distributedCacheService.getStats as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ hits: 100 }), 10))
      );
      (redisCacheService.getStats as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ hits: 200 }), 20))
      );

      const request = new NextRequest('http://localhost:3000/api/monitoring/cache?action=stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.distributed.hits).toBe(100);
      expect(data.redis.hits).toBe(200);
    });

    it('should handle when redis stats fail but distributed stats succeed', async () => {
      const mockStats = { hits: 100, misses: 20 };
      (distributedCacheService.getStats as jest.Mock).mockResolvedValue(mockStats);
      (redisCacheService.getStats as jest.Mock).mockRejectedValue(new Error('Redis down'));

      const request = new NextRequest('http://localhost:3000/api/monitoring/cache?action=stats');
      const response = await GET(request);
      const data = await response.json();

      // Should fail because Promise.all rejects if any promise rejects
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to get cache status' });
    });
  });
});

/**
 * Cache Monitoring Considerations:
 *
 * 1. Performance Impact:
 *    - Getting stats should be lightweight
 *    - Clear operations may impact performance
 *
 * 2. Security:
 *    - Should require admin authentication in production
 *    - Cache keys might contain sensitive data patterns
 *
 * 3. Multi-tier Cache:
 *    - Distributed cache (memory + localStorage)
 *    - Redis cache (centralized)
 *    - Both need monitoring
 *
 * 4. Error Handling:
 *    - Redis might be unavailable
 *    - Clear operations might partially fail
 *
 * 5. Metrics to Track:
 *    - Hit rate
 *    - Memory usage
 *    - Key count
 *    - Eviction stats
 */
