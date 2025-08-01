import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock dependencies
const mockGetMetrics = jest.fn();
jest.mock('@/lib/cache/performance-monitor', () => ({
  performanceMonitor: {
    getMetrics: mockGetMetrics,
  },
}));

describe('/api/monitoring/performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns performance metrics successfully', async () => {
      const mockMetrics = {
        apiLatency: {
          p50: 45,
          p95: 120,
          p99: 250,
          count: 1523,
        },
        cacheHitRate: 0.82,
        errorRate: 0.02,
        activeConnections: 15,
        memoryUsage: {
          heapUsed: 45.2,
          heapTotal: 128,
          external: 12.5,
        },
        uptime: 86400,
      };

      mockGetMetrics.mockResolvedValue(mockMetrics);

      const request = new NextRequest('http://localhost:3000/api/monitoring/performance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        metrics: mockMetrics,
        timestamp: expect.any(String),
      });
    });

    it('handles error when retrieving metrics fails', async () => {
      mockGetMetrics.mockRejectedValue(new Error('Metrics service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/monitoring/performance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to retrieve performance metrics',
        details: 'Metrics service unavailable',
      });
    });

    it('returns empty metrics when monitor returns null', async () => {
      mockGetMetrics.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/monitoring/performance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        metrics: {},
        timestamp: expect.any(String),
      });
    });

    it('includes request metadata in response', async () => {
      mockGetMetrics.mockResolvedValue({
        requestCount: 100,
        averageResponseTime: 50,
      });

      const request = new NextRequest('http://localhost:3000/api/monitoring/performance?detailed=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});