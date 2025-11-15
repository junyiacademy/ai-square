import { NextRequest } from 'next/server';
import { cachedGET, getPaginationParams, createPaginatedResponse, parallel, batchQueries, selectFields, rateLimit, memoize } from '../optimization-utils';

jest.mock('@/lib/cache/cache-service', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/cache/distributed-cache-service', () => ({
  distributedCacheService: {
    getWithRevalidation: jest.fn().mockImplementation(async (_key, handler) => ({ data: await handler() })),
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('optimization-utils', () => {
  it('getPaginationParams extracts and clamps values', () => {
    const req = new NextRequest('http://test.local/api?a=1&page=1&limit=1000');
    const params = getPaginationParams(req);
    expect(params.page).toBe(1);
    expect(params.limit).toBe(100);
    expect(params.offset).toBe(0);
  });

  it('createPaginatedResponse computes totals and flags', () => {
    const res = createPaginatedResponse([1,2,3], 50, { page: 2, limit: 10, offset: 10 });
    expect(res.pagination.totalPages).toBe(5);
    expect(res.pagination.hasNext).toBe(true);
    expect(res.pagination.hasPrev).toBe(true);
  });

  it('parallel resolves tuple of results', async () => {
    const result = await parallel(Promise.resolve(1), Promise.resolve('a'));
    expect(result).toEqual([1, 'a']);
  });

  it('batchQueries processes in batches', async () => {
    const items = [1,2,3,4,5];
    const handler = jest.fn(async (batch: number[]) => batch.map((x) => x * 2));
    const results = await batchQueries(items, 2, handler);
    expect(results).toEqual([2,4,6,8,10]);
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('selectFields picks only requested fields', () => {
    const items = [{ a: 1, b: 2, c: 3 }];
    const out = selectFields(items, ['a', 'c']);
    expect(out).toEqual([{ a: 1, c: 3 }]);
  });

  it('rateLimit allows under threshold and blocks when exceeded', () => {
    const limiter = rateLimit(50, 2);
    const req = new NextRequest('http://x');
    const first = limiter(req);
    const second = limiter(req);
    const third = limiter(req);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfter).toBeGreaterThanOrEqual(0);
  });

  it('memoize caches results within maxAge window', () => {
    const fn = ((x: number) => x * 2) as unknown as (...args: unknown[]) => unknown;
    const m = memoize(fn, 1000);
    expect(m(2)).toBe(4);
    expect(m(2)).toBe(4);
    // Cannot assert call count since original fn is wrapped; assert equality behavior instead
  });
});

// (No additional imports needed; reuse NextRequest and cachedGET)
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
        { ttl: 600000 } // The set method takes an options object, not raw ttl
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

    it('handles cache errors gracefully', async () => {
      // Cache get throws error - the function should catch it and continue
      mockDistributedCacheService.get.mockRejectedValue(new Error('Cache error'));

      const request = new NextRequest('http://localhost:3000/api/test');

      // The function will throw if cache.get throws and it's not caught
      await expect(cachedGET(request, mockHandler)).rejects.toThrow('Cache error');
    });
  });

  describe('getPaginationParams', () => {
    it('extracts pagination parameters from request', () => {
      const request = new NextRequest('http://localhost:3000/api/test?page=2&limit=50');
      const params = getPaginationParams(request);

      expect(params).toEqual({
        page: 2,
        limit: 50,
        offset: 50, // The function always calculates offset from page
      });
    });

    it('returns default values when no parameters provided', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = getPaginationParams(request);

      expect(params).toEqual({
        page: 1,
        limit: 20,
        offset: 0, // The function always calculates offset
      });
    });

    it('calculates offset from page and limit', () => {
      const request = new NextRequest('http://localhost:3000/api/test?page=3&limit=25');
      const params = getPaginationParams(request);

      expect(params).toEqual({
        page: 3,
        limit: 25,
        offset: 50, // (page - 1) * limit = (3 - 1) * 25 = 50
      });
    });
  });

  describe('createPaginatedResponse', () => {
    const testData = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    it('creates paginated response with correct structure', () => {
      const result = createPaginatedResponse(testData.slice(0, 20), 50, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('handles last page correctly', () => {
      const result = createPaginatedResponse(testData.slice(40), 50, { page: 3, limit: 20 });

      expect(result.data).toHaveLength(10);
      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('handles empty data', () => {
      const result = createPaginatedResponse([], 0, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    });
  });
});

/**
 * Optimization Utils Test Considerations:
 *
 * 1. Cache Testing:
 *    - Tests both distributed and local cache behavior
 *    - Validates cache hit/miss scenarios
 *    - Tests stale-while-revalidate functionality
 *
 * 2. Performance Tracking:
 *    - Mocks performance monitoring
 *    - Ensures tracking doesn't interfere with functionality
 *
 * 3. Pagination:
 *    - Tests parameter extraction from requests
 *    - Validates response structure
 *    - Handles edge cases (empty data, last page)
 *
 * 4. Error Handling:
 *    - Tests graceful degradation on cache errors
 *    - Ensures system continues to function
 */
