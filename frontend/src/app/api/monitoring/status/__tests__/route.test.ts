/**
 * Monitoring Status API Route Tests
 * 測試系統監控狀態功能
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { productionMonitor } from '@/lib/monitoring/production-monitor';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

// Mock monitoring services
jest.mock('@/lib/monitoring/production-monitor', () => ({
  productionMonitor: {
    getStatus: jest.fn(),
  },
}));

jest.mock('@/lib/cache/distributed-cache-service', () => ({
  distributedCacheService: {
    getStats: jest.fn(),
  },
}));

jest.mock('@/lib/monitoring/performance-monitor', () => ({
  performanceMonitor: {
    getAllMetrics: jest.fn(),
    getRecentMetrics: jest.fn(),
  },
}));

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('/api/monitoring/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET - System Status', () => {
    const mockMonitoringStatus = {
      enabled: true,
      alertThresholds: {
        errorRate: 0.05,
        responseTime: 1000,
        cacheHitRate: 0.7,
      },
    };

    const mockCacheStats = {
      redisConnected: true,
      localCacheSize: 150,
      activeRevalidations: 3,
      hits: 1000,
      misses: 200,
      hitRate: 0.833,
    };

    const mockPerfMetrics = [
      {
        endpoint: '/api/pbl/scenarios',
        totalRequests: 1000,
        averageResponseTime: 150,
        cacheHitRate: 0.85,
        errorRate: 0.02,
        lastUpdated: new Date().toISOString(),
      },
      {
        endpoint: '/api/assessment/scenarios',
        totalRequests: 800,
        averageResponseTime: 200,
        cacheHitRate: 0.80,
        errorRate: 0.01,
        lastUpdated: new Date().toISOString(),
      },
    ];

    it('should return basic status without detailed parameter', async () => {
      (productionMonitor.getStatus as jest.Mock).mockReturnValue(mockMonitoringStatus);
      (distributedCacheService.getStats as jest.Mock).mockResolvedValue(mockCacheStats);
      (performanceMonitor.getAllMetrics as jest.Mock).mockReturnValue(mockPerfMetrics);

      const request = new NextRequest('http://localhost:3000/api/monitoring/status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        timestamp: expect.any(String),
        monitoring: {
          enabled: true,
          services: [],
          thresholds: mockMonitoringStatus.alertThresholds,
        },
        cache: {
          redis: true,
          local: 150,
          revalidations: 3,
        },
        performance: {
          totalEndpoints: 2,
          averageResponseTime: 175, // (150 + 200) / 2
          cacheHitRate: 0.825, // (0.85 + 0.80) / 2
          errorRate: 0.015, // (0.02 + 0.01) / 2
        },
        health: 'healthy',
      });
      expect(data.detailed).toBeUndefined();
    });

    it('should return detailed status when detailed=true', async () => {
      const mockRecentMetrics = [
        { timestamp: new Date().toISOString(), endpoint: '/api/test', responseTime: 100 },
      ];

      (productionMonitor.getStatus as jest.Mock).mockReturnValue(mockMonitoringStatus);
      (distributedCacheService.getStats as jest.Mock).mockResolvedValue(mockCacheStats);
      (performanceMonitor.getAllMetrics as jest.Mock).mockReturnValue(mockPerfMetrics);
      (performanceMonitor.getRecentMetrics as jest.Mock).mockReturnValue(mockRecentMetrics);

      const request = new NextRequest('http://localhost:3000/api/monitoring/status?detailed=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.health).toBe('healthy');
      expect(data.detailed).toMatchObject({
        endpoints: mockPerfMetrics,
        alerts: [],
        cacheDetails: mockCacheStats,
        recentMetrics: mockRecentMetrics,
      });
      expect(performanceMonitor.getRecentMetrics).toHaveBeenCalledWith(50);
    });

    it('should handle case when no performance metrics available', async () => {
      (productionMonitor.getStatus as jest.Mock).mockReturnValue(mockMonitoringStatus);
      (distributedCacheService.getStats as jest.Mock).mockResolvedValue(mockCacheStats);
      (performanceMonitor.getAllMetrics as jest.Mock).mockReturnValue([]);

      const request = new NextRequest('http://localhost:3000/api/monitoring/status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.performance).toEqual({
        totalEndpoints: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
      });
    });

    it('should handle case when redis is not connected', async () => {
      const cacheStatsNoRedis = {
        ...mockCacheStats,
        redisConnected: false,
      };

      (productionMonitor.getStatus as jest.Mock).mockReturnValue(mockMonitoringStatus);
      (distributedCacheService.getStats as jest.Mock).mockResolvedValue(cacheStatsNoRedis);
      (performanceMonitor.getAllMetrics as jest.Mock).mockReturnValue(mockPerfMetrics);

      const request = new NextRequest('http://localhost:3000/api/monitoring/status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cache.redis).toBe(false);
      expect(data.health).toBe('healthy'); // Still healthy even without Redis
    });

    it('should handle errors and return unhealthy status', async () => {
      const error = new Error('Monitoring service unavailable');
      (productionMonitor.getStatus as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const request = new NextRequest('http://localhost:3000/api/monitoring/status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        error: 'Failed to get monitoring status',
        timestamp: expect.any(String),
        health: 'unhealthy',
      });
      expect(mockConsoleError).toHaveBeenCalledWith('Error getting monitoring status:', error);
    });

    it('should handle partial service failures gracefully', async () => {
      (productionMonitor.getStatus as jest.Mock).mockReturnValue(mockMonitoringStatus);
      (distributedCacheService.getStats as jest.Mock).mockRejectedValue(new Error('Cache error'));
      (performanceMonitor.getAllMetrics as jest.Mock).mockReturnValue(mockPerfMetrics);

      const request = new NextRequest('http://localhost:3000/api/monitoring/status');
      const response = await GET(request);
      const data = await response.json();

      // Should fail because getStats is await-ed
      expect(response.status).toBe(500);
      expect(data.health).toBe('unhealthy');
    });

    it('should calculate correct averages for multiple endpoints', async () => {
      const manyMetrics = [
        { endpoint: '/api/1', totalRequests: 100, averageResponseTime: 100, cacheHitRate: 0.9, errorRate: 0.01 },
        { endpoint: '/api/2', totalRequests: 200, averageResponseTime: 200, cacheHitRate: 0.8, errorRate: 0.02 },
        { endpoint: '/api/3', totalRequests: 300, averageResponseTime: 300, cacheHitRate: 0.7, errorRate: 0.03 },
        { endpoint: '/api/4', totalRequests: 400, averageResponseTime: 400, cacheHitRate: 0.6, errorRate: 0.04 },
      ];

      (productionMonitor.getStatus as jest.Mock).mockReturnValue(mockMonitoringStatus);
      (distributedCacheService.getStats as jest.Mock).mockResolvedValue(mockCacheStats);
      (performanceMonitor.getAllMetrics as jest.Mock).mockReturnValue(manyMetrics);

      const request = new NextRequest('http://localhost:3000/api/monitoring/status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.performance.totalEndpoints).toBe(4);
      expect(data.performance.averageResponseTime).toBe(250);
      expect(data.performance.cacheHitRate).toBeCloseTo(0.75, 5);
      expect(data.performance.errorRate).toBe(0.025);
    });

    it('should handle cache stats without redisConnected property', async () => {
      const minimalCacheStats = {
        localCacheSize: 100,
        activeRevalidations: 2,
      };

      (productionMonitor.getStatus as jest.Mock).mockReturnValue(mockMonitoringStatus);
      (distributedCacheService.getStats as jest.Mock).mockResolvedValue(minimalCacheStats);
      (performanceMonitor.getAllMetrics as jest.Mock).mockReturnValue(mockPerfMetrics);

      const request = new NextRequest('http://localhost:3000/api/monitoring/status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cache.redis).toBe(false); // Default to false when not present
    });
  });
});

/**
 * Monitoring Status Considerations:
 * 
 * 1. Health Indicators:
 *    - Redis connectivity
 *    - Error rates
 *    - Response times
 *    - Cache hit rates
 * 
 * 2. Performance Metrics:
 *    - Aggregated across all endpoints
 *    - Recent trends available in detailed view
 * 
 * 3. Alert Thresholds:
 *    - Configurable per metric
 *    - Used for health determination
 * 
 * 4. Detailed View:
 *    - Provides granular endpoint metrics
 *    - Recent metric history
 *    - Active alerts
 * 
 * 5. Error Handling:
 *    - Partial failures should be handled
 *    - Always return health status
 */