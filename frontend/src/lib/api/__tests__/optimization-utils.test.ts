import { NextRequest, NextResponse } from 'next/server';
import { cachedGET, createPaginatedResponse, getPaginationParams, batchQueries, compressedResponse } from '../optimization-utils';
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

  describe('getPaginationParams', () => {
    it('extracts pagination parameters from request', () => {
      const request = new NextRequest('http://localhost:3000/api/test?page=2&limit=50');
      const params = getPaginationParams(request);
      
      expect(params).toEqual({
        page: 2,
        limit: 50,
      });
    });

    it('returns default values when no parameters provided', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = getPaginationParams(request);
      
      expect(params).toEqual({
        page: 1,
        limit: 20,
      });
    });

    it('handles offset parameter', () => {
      const request = new NextRequest('http://localhost:3000/api/test?offset=100&limit=25');
      const params = getPaginationParams(request);
      
      expect(params).toEqual({
        offset: 100,
        limit: 25,
      });
    });
  });

  describe('createPaginatedResponse', () => {
    const testData = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    it('creates paginated response with correct structure', () => {
      const result = createPaginatedResponse(testData, 20, 1, 50);
      
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
      const result = createPaginatedResponse(testData.slice(40), 20, 3, 50);
      
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
      const result = createPaginatedResponse([], 20, 1, 0);
      
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