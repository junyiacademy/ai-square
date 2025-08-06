/**
 * Performance Monitoring API Route Tests
 * 測試效能監控 API
 */

import { NextRequest } from 'next/server';
import { GET, DELETE } from '../route';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/monitoring/performance-monitor', () => ({
  performanceMonitor: {
    getMetrics: jest.fn(),
    getAllMetrics: jest.fn(),
    clearMetrics: jest.fn(),
  },
  getPerformanceReport: jest.fn(),
}));

// Mock console methods
const mockConsoleError = createMockConsoleError();

// Get references to the mocked functions
import { performanceMonitor, getPerformanceReport } from '@/lib/monitoring/performance-monitor';

describe('/api/monitoring/performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  const mockPerformanceReport = {
    summary: {
      totalEndpoints: 8,
      averageResponseTime: 145,
      averageCacheHitRate: 85,
      averageErrorRate: 1.5,
      totalRequests: 50000,
      requestsPerMinute: 250,
      uptime: 86400,
    },
    endpoints: [
      {
        endpoint: '/api/pbl/scenarios',
        method: 'GET',
        metrics: {
          count: 1250,
          avgResponseTime: 120,
          minResponseTime: 45,
          maxResponseTime: 890,
          errorCount: 12,
          errorRate: 0.96,
          cacheHitRate: 92,
        },
        recentRequests: [
          { timestamp: '2025-01-01T12:00:00Z', responseTime: 110, status: 200 },
          { timestamp: '2025-01-01T12:01:00Z', responseTime: 95, status: 200 },
        ],
      },
      {
        endpoint: '/api/discovery/chat',
        method: 'POST',
        metrics: {
          count: 890,
          avgResponseTime: 2500,
          minResponseTime: 1200,
          maxResponseTime: 8900,
          errorCount: 45,
          errorRate: 5.06,
          cacheHitRate: 0, // AI endpoints don't cache
        },
      },
    ],
    alerts: [
      {
        type: 'high_response_time',
        endpoint: '/api/discovery/chat',
        threshold: 2000,
        current: 2500,
        severity: 'warning',
        timestamp: '2025-01-01T12:00:00Z',
      },
    ],
    timestamp: '2025-01-01T12:05:00Z',
  };

  const mockSingleEndpointMetrics = {
    endpoint: '/api/pbl/scenarios',
    method: 'GET',
    count: 1250,
    avgResponseTime: 120,
    minResponseTime: 45,
    maxResponseTime: 890,
    errorCount: 12,
    errorRate: 0.96,
    cacheHitRate: 92,
    recentRequests: [
      { timestamp: '2025-01-01T12:00:00Z', responseTime: 110, status: 200 },
    ],
  };

  describe('GET - Performance Metrics', () => {
    describe('Full Performance Report', () => {
      it('should return complete performance report by default', async () => {
        (getPerformanceReport as jest.Mock).mockReturnValue(mockPerformanceReport);

        const request = new NextRequest('http://localhost:3000/api/monitoring/performance');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockPerformanceReport);
        expect(getPerformanceReport).toHaveBeenCalledTimes(1);
      });

      it('should return summary format when format=summary', async () => {
        (getPerformanceReport as jest.Mock).mockReturnValue(mockPerformanceReport);

        const request = new NextRequest('http://localhost:3000/api/monitoring/performance?format=summary');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
          summary: mockPerformanceReport.summary,
          alertCount: mockPerformanceReport.alerts.length,
        });
        expect(getPerformanceReport).toHaveBeenCalledTimes(1);
      });
    });

    describe('Specific Endpoint Metrics', () => {
      it('should return metrics for specific endpoint', async () => {
        (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(mockSingleEndpointMetrics);

        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/performance?endpoint=/api/pbl/scenarios'
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ metrics: mockSingleEndpointMetrics });
        expect(performanceMonitor.getMetrics).toHaveBeenCalledWith('/api/pbl/scenarios', 'GET');
        expect(getPerformanceReport).not.toHaveBeenCalled();
      });

      it('should use specified method when getting endpoint metrics', async () => {
        (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(mockSingleEndpointMetrics);

        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/performance?endpoint=/api/discovery/chat&method=POST'
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(performanceMonitor.getMetrics).toHaveBeenCalledWith('/api/discovery/chat', 'POST');
      });

      it('should return 404 when endpoint metrics not found', async () => {
        (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(null);

        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/performance?endpoint=/api/nonexistent'
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data).toEqual({ error: 'No metrics found for this endpoint' });
      });
    });

    describe('Query Parameter Handling', () => {
      beforeEach(() => {
        (getPerformanceReport as jest.Mock).mockReturnValue(mockPerformanceReport);
      });

      it('should handle missing query parameters gracefully', async () => {
        const request = new NextRequest('http://localhost:3000/api/monitoring/performance');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockPerformanceReport);
      });

      it('should handle invalid format parameter', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/performance?format=invalid'
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockPerformanceReport); // Falls back to full report
      });

      it('should handle empty endpoint parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/monitoring/performance?endpoint=');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockPerformanceReport); // Falls back to full report
        expect(performanceMonitor.getMetrics).not.toHaveBeenCalled();
      });

      it('should URL decode endpoint parameters', async () => {
        const encodedEndpoint = encodeURIComponent('/api/pbl/scenarios/[id]');
        (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(mockSingleEndpointMetrics);

        const request = new NextRequest(
          `http://localhost:3000/api/monitoring/performance?endpoint=${encodedEndpoint}`
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(performanceMonitor.getMetrics).toHaveBeenCalledWith('/api/pbl/scenarios/[id]', 'GET');
      });
    });

    describe('Error Handling', () => {
      it('should handle errors when getting performance report fails', async () => {
        const error = new Error('Performance monitor unavailable');
        (getPerformanceReport as jest.Mock).mockImplementation(() => {
          throw error;
        });

        const request = new NextRequest('http://localhost:3000/api/monitoring/performance');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: 'Failed to get performance metrics' });
        expect(mockConsoleError).toHaveBeenCalledWith('Error getting performance metrics:', error);
      });

      it('should handle errors when getting specific endpoint metrics fails', async () => {
        const error = new Error('Endpoint metrics unavailable');
        (performanceMonitor.getMetrics as jest.Mock).mockImplementation(() => {
          throw error;
        });

        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/performance?endpoint=/api/test'
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: 'Failed to get performance metrics' });
        expect(mockConsoleError).toHaveBeenCalledWith('Error getting performance metrics:', error);
      });
    });

    describe('Response Format Validation', () => {
      it('should include all required fields in summary format', async () => {
        (getPerformanceReport as jest.Mock).mockReturnValue(mockPerformanceReport);

        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/performance?format=summary'
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('summary');
        expect(data).toHaveProperty('alertCount');
        expect(data.summary).toHaveProperty('totalEndpoints');
        expect(data.summary).toHaveProperty('averageResponseTime');
        expect(data.summary).toHaveProperty('averageCacheHitRate');
        expect(data.summary).toHaveProperty('averageErrorRate');
        expect(typeof data.alertCount).toBe('number');
      });

      it('should include all required fields in full report', async () => {
        (getPerformanceReport as jest.Mock).mockReturnValue(mockPerformanceReport);

        const request = new NextRequest('http://localhost:3000/api/monitoring/performance');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('summary');
        expect(data).toHaveProperty('endpoints');
        expect(data).toHaveProperty('alerts');
        expect(data).toHaveProperty('timestamp');
        expect(Array.isArray(data.endpoints)).toBe(true);
        expect(Array.isArray(data.alerts)).toBe(true);
      });
    });
  });

  describe('DELETE - Clear Metrics', () => {
    it('should clear all performance metrics successfully', async () => {
      (performanceMonitor.clearMetrics as jest.Mock).mockResolvedValue(undefined);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Performance metrics cleared',
      });
      expect(performanceMonitor.clearMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when clearing metrics fails', async () => {
      const error = new Error('Clear operation failed');
      (performanceMonitor.clearMetrics as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to clear performance metrics' });
      expect(mockConsoleError).toHaveBeenCalledWith('Error clearing performance metrics:', error);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle concurrent requests for different endpoints', async () => {
      const metrics1 = { ...mockSingleEndpointMetrics, endpoint: '/api/pbl/scenarios' };
      const metrics2 = { ...mockSingleEndpointMetrics, endpoint: '/api/discovery/chat' };
      
      (performanceMonitor.getMetrics as jest.Mock)
        .mockImplementationOnce(() => metrics1)
        .mockImplementationOnce(() => metrics2);

      const [response1, response2] = await Promise.all([
        GET(new NextRequest('http://localhost:3000/api/monitoring/performance?endpoint=/api/pbl/scenarios')),
        GET(new NextRequest('http://localhost:3000/api/monitoring/performance?endpoint=/api/discovery/chat'))
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      const data1 = await response1.json();
      const data2 = await response2.json();
      
      expect(data1.metrics.endpoint).toBe('/api/pbl/scenarios');
      expect(data2.metrics.endpoint).toBe('/api/discovery/chat');
    });

    it('should handle edge case with no performance data', async () => {
      (getPerformanceReport as jest.Mock).mockReturnValue({
        summary: {
          totalEndpoints: 0,
          averageResponseTime: 0,
          averageCacheHitRate: 0,
          averageErrorRate: 0,
        },
        endpoints: [],
        alerts: [],
        timestamp: new Date().toISOString(),
      });

      const request = new NextRequest('http://localhost:3000/api/monitoring/performance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalEndpoints).toBe(0);
      expect(data.endpoints).toHaveLength(0);
      expect(data.alerts).toHaveLength(0);
    });

    it('should handle malformed query parameters gracefully', async () => {
      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(null);

      // Test with special characters in endpoint - this should return 404 since endpoint doesn't exist
      const request = new NextRequest(
        'http://localhost:3000/api/monitoring/performance?endpoint=/api/test%20route&method=GET%20POST'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'No metrics found for this endpoint' });
      expect(performanceMonitor.getMetrics).toHaveBeenCalledWith('/api/test route', 'GET POST');
    });

    it('should handle very long endpoint names', async () => {
      const longEndpoint = '/api/' + 'a'.repeat(500);
      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/monitoring/performance?endpoint=${encodeURIComponent(longEndpoint)}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'No metrics found for this endpoint' });
      expect(performanceMonitor.getMetrics).toHaveBeenCalledWith(longEndpoint, 'GET');
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle multiple format parameters', async () => {
      (getPerformanceReport as jest.Mock).mockReturnValue(mockPerformanceReport);

      const request = new NextRequest(
        'http://localhost:3000/api/monitoring/performance?format=summary&format=full'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should use first format parameter
      expect(data).toEqual({
        summary: mockPerformanceReport.summary,
        alertCount: mockPerformanceReport.alerts.length,
      });
    });

    it('should handle performance report with null/undefined fields', async () => {
      const incompleteReport = {
        summary: {
          totalEndpoints: 0,
          averageResponseTime: null,
          averageCacheHitRate: undefined,
          averageErrorRate: 0,
        },
        endpoints: null,
        alerts: undefined,
        timestamp: null,
      };

      (getPerformanceReport as jest.Mock).mockReturnValue(incompleteReport);

      const request = new NextRequest('http://localhost:3000/api/monitoring/performance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(incompleteReport);
    });

    it('should handle case-insensitive method parameter', async () => {
      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(mockSingleEndpointMetrics);

      const request = new NextRequest(
        'http://localhost:3000/api/monitoring/performance?endpoint=/api/test&method=post'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(performanceMonitor.getMetrics).toHaveBeenCalledWith('/api/test', 'post');
    });
  });
});

/**
 * Performance Monitoring API Considerations:
 * 
 * 1. Real-time Metrics:
 *    - Response times (p50, p95, p99)
 *    - Error rates by endpoint
 *    - Cache hit rates
 *    - Request throughput
 * 
 * 2. Resource Monitoring:
 *    - Memory usage patterns
 *    - CPU utilization
 *    - Active connections
 *    - Database query performance
 * 
 * 3. Alert System:
 *    - High response time alerts
 *    - Error rate thresholds
 *    - Resource exhaustion warnings
 *    - Cache miss rate alerts
 * 
 * 4. Historical Data:
 *    - Trend analysis
 *    - Performance regression detection
 *    - Capacity planning insights
 *    - Usage pattern identification
 * 
 * 5. Security Considerations:
 *    - Admin-only access in production
 *    - Rate limiting for monitoring endpoints
 *    - Sensitive data filtering in metrics
 *    - Audit trail for metric access
 */