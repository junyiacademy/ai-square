import { NextRequest, NextResponse } from 'next/server';
import { cachedGET, paginateResponse, validatePaginationParams, batchProcess, createCacheKey } from '../optimization-utils';
import { cacheService } from '@/lib/cache/cache-service';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { withPerformanceTracking } from '@/lib/monitoring/performance-monitor';

// Mock dependencies
jest.mock('@/lib/cache/cache-service');
jest.mock('@/lib/cache/distributed-cache-service');
jest.mock('@/lib/monitoring/performance-monitor', () => ({
  withPerformanceTracking: jest.fn((fn) => fn()),
}));

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockDistributedCacheService = distributedCacheService as jest.Mocked<typeof distributedCacheService>;

describe('optimization-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cachedGET', () => {
    const mockData = { result: 'test data' };
    const mockHandler = jest.fn().mockResolvedValue(mockData);

    it('returns cached data when available in distributed cache', async () => {
      const cachedData = { ...mockData, cached: true };
      mockDistributedCacheService.get.mockResolvedValue(cachedData);
      
      const request = new NextRequest('http://localhost:3000/api/test?param=value');
      const response = await cachedGET(request, mockHandler);
      const data = await response.json();
      
      expect(mockDistributedCacheService.get).toHaveBeenCalledWith('api:/api/test:?param=value');
      expect(mockHandler).not.toHaveBeenCalled();
      expect(data).toEqual({ ...cachedData, cacheHit: true });
      expect(response.headers.get('X-Cache')).toBe('HIT');
    });

    it('calls handler and caches result when cache miss', async () => {
      mockDistributedCacheService.get.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await cachedGET(request, mockHandler, { ttl: 600 });
      const data = await response.json();
      
      expect(mockHandler).toHaveBeenCalled();
      expect(mockDistributedCacheService.set).toHaveBeenCalledWith(
        'api:/api/test:',
        mockData,
        600000
      );
      expect(data).toEqual({ ...mockData, cacheHit: false });
      expect(response.headers.get('X-Cache')).toBe('MISS');
    });

    it('uses stale-while-revalidate when specified', async () => {
      mockDistributedCacheService.getWithRevalidation.mockResolvedValue(mockData);
      
      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await cachedGET(request, mockHandler, {
        ttl: 300,
        staleWhileRevalidate: 3600,
      });
      const data = await response.json();
      
      expect(mockDistributedCacheService.getWithRevalidation).toHaveBeenCalledWith(
        'api:/api/test:',
        mockHandler,
        {
          ttl: 300000,
          staleWhileRevalidate: 3600000,
        }
      );
      expect(response.headers.get('X-Cache')).toBe('SWR');
      expect(response.headers.get('Cache-Control')).toContain('stale-while-revalidate=3600');
    });

    it('uses local cache when useDistributedCache is false', async () => {
      mockCacheService.get.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/test');
      await cachedGET(request, mockHandler, { useDistributedCache: false });
      
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockDistributedCacheService.get).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      mockDistributedCacheService.get.mockRejectedValue(new Error('Cache error'));
      
      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await cachedGET(request, mockHandler);
      const data = await response.json();
      
      expect(mockHandler).toHaveBeenCalled();
      expect(data).toEqual({ ...mockData, cacheHit: false });
    });
  });

  describe('paginateResponse', () => {
    const testData = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    it('paginates data correctly with default parameters', () => {
      const result = paginateResponse(testData, {});
      
      expect(result.data).toHaveLength(20); // Default limit
      expect(result.data[0]).toEqual({ id: 0, name: 'Item 0' });
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('paginates with custom page and limit', () => {
      const result = paginateResponse(testData, { page: 2, limit: 10 });
      
      expect(result.data).toHaveLength(10);
      expect(result.data[0]).toEqual({ id: 10, name: 'Item 10' });
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('handles offset parameter', () => {
      const result = paginateResponse(testData, { offset: 25, limit: 10 });
      
      expect(result.data).toHaveLength(10);
      expect(result.data[0]).toEqual({ id: 25, name: 'Item 25' });
      expect(result.pagination.page).toBe(3); // Calculated from offset
    });

    it('handles last page correctly', () => {
      const result = paginateResponse(testData, { page: 3, limit: 20 });
      
      expect(result.data).toHaveLength(10); // Only 10 items left
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('handles empty data', () => {
      const result = paginateResponse([], { page: 1, limit: 20 });
      
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNext).toBe(false);
    });
  });

  describe('validatePaginationParams', () => {
    it('returns default values for invalid inputs', () => {
      expect(validatePaginationParams({})).toEqual({ page: 1, limit: 20 });
      expect(validatePaginationParams({ page: 0 })).toEqual({ page: 1, limit: 20 });
      expect(validatePaginationParams({ page: -5 })).toEqual({ page: 1, limit: 20 });
      expect(validatePaginationParams({ limit: 0 })).toEqual({ page: 1, limit: 1 });
      expect(validatePaginationParams({ limit: -10 })).toEqual({ page: 1, limit: 1 });
    });

    it('caps limit at maximum value', () => {
      const result = validatePaginationParams({ limit: 200 });
      expect(result.limit).toBe(100); // Max limit
    });

    it('accepts valid parameters', () => {
      const result = validatePaginationParams({ page: 5, limit: 50 });
      expect(result).toEqual({ page: 5, limit: 50 });
    });

    it('handles string inputs', () => {
      const result = validatePaginationParams({ page: '3' as any, limit: '25' as any });
      expect(result).toEqual({ page: 3, limit: 25 });
    });
  });

  describe('batchProcess', () => {
    it('processes items in batches', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const processor = jest.fn().mockResolvedValue(true);
      
      await batchProcess(items, processor, 10);
      
      expect(processor).toHaveBeenCalledTimes(3); // 3 batches: 10, 10, 5
      expect(processor).toHaveBeenNthCalledWith(1, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(processor).toHaveBeenNthCalledWith(2, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
      expect(processor).toHaveBeenNthCalledWith(3, [20, 21, 22, 23, 24]);
    });

    it('handles empty array', async () => {
      const processor = jest.fn();
      await batchProcess([], processor, 10);
      expect(processor).not.toHaveBeenCalled();
    });

    it('processes single batch when items less than batch size', async () => {
      const items = [1, 2, 3];
      const processor = jest.fn().mockResolvedValue(true);
      
      await batchProcess(items, processor, 10);
      
      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('handles processor errors', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = jest.fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Process failed'));
      
      await expect(batchProcess(items, processor, 2)).rejects.toThrow('Process failed');
      expect(processor).toHaveBeenCalledTimes(2);
    });
  });

  describe('createCacheKey', () => {
    it('creates cache key from URL', () => {
      const url = new URL('http://localhost:3000/api/test?foo=bar&baz=qux');
      const key = createCacheKey(url);
      expect(key).toBe('api:/api/test:?foo=bar&baz=qux');
    });

    it('creates cache key with prefix', () => {
      const url = new URL('http://localhost:3000/api/test');
      const key = createCacheKey(url, 'custom');
      expect(key).toBe('custom:/api/test:');
    });

    it('includes hash in cache key', () => {
      const url = new URL('http://localhost:3000/api/test#section');
      const key = createCacheKey(url);
      expect(key).toBe('api:/api/test:#section');
    });

    it('handles complex query parameters', () => {
      const url = new URL('http://localhost:3000/api/test?array[]=1&array[]=2&obj[key]=value');
      const key = createCacheKey(url);
      expect(key).toBe('api:/api/test:?array[]=1&array[]=2&obj[key]=value');
    });
  });
});
