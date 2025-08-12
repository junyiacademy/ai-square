import { withPerformanceTracking, performanceMonitor, getPerformanceReport } from '../performance-monitor';

describe('performance-monitor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    performanceMonitor.clearMetrics();
  });

  afterEach(() => {
    jest.useRealTimers();
    performanceMonitor.clearMetrics();
  });

  describe('withPerformanceTracking', () => {
    it('records success metric with cache hit', async () => {
      const result = await withPerformanceTracking(async () => ({ cacheHit: true }), '/api/test', 'GET', 'u1');
      expect(result).toEqual({ cacheHit: true });
      const recent = performanceMonitor.getRecentMetrics(10);
      expect(recent.length).toBeGreaterThan(0);
      const last = recent[recent.length - 1];
      expect(last.endpoint).toBe('/api/test');
      expect(last.cacheHit).toBe(true);
      expect(last.statusCode).toBe(200);
      expect(last.userId).toBe('u1');
    });

    it('records success metric without cache hit', async () => {
      const result = await withPerformanceTracking(async () => ({ data: 'test' }), '/api/test2', 'POST');
      expect(result).toEqual({ data: 'test' });
      const recent = performanceMonitor.getRecentMetrics(10);
      const last = recent[recent.length - 1];
      expect(last.endpoint).toBe('/api/test2');
      expect(last.cacheHit).toBe(false);
      expect(last.statusCode).toBe(200);
      expect(last.method).toBe('POST');
    });

    it('records error metric and rethrows', async () => {
      await expect(withPerformanceTracking(async () => { throw new Error('boom'); }, '/api/fail', 'GET', 'u2')).rejects.toThrow('boom');
      const recent = performanceMonitor.getRecentMetrics(10);
      const last = recent[recent.length - 1];
      expect(last.endpoint).toBe('/api/fail');
      expect(last.statusCode).toBe(500);
      expect(last.errorMessage).toBe('boom');
    });

    it('handles null results', async () => {
      const result = await withPerformanceTracking(async () => null, '/api/null', 'DELETE');
      expect(result).toBeNull();
      const recent = performanceMonitor.getRecentMetrics(10);
      const last = recent[recent.length - 1];
      expect(last.cacheHit).toBe(false);
    });

    it('handles non-object results', async () => {
      const result = await withPerformanceTracking(async () => 'string result', '/api/string', 'GET');
      expect(result).toBe('string result');
      const recent = performanceMonitor.getRecentMetrics(10);
      const last = recent[recent.length - 1];
      expect(last.cacheHit).toBe(false);
    });
  });

  describe('PerformanceMonitor', () => {
    it('trims metrics when exceeding max size', () => {
      // Add more than maxMetricsSize metrics
      for (let i = 0; i < 10005; i++) {
        performanceMonitor.recordMetric({
          endpoint: `/api/test${i}`,
          method: 'GET',
          responseTime: 100,
          cacheHit: false,
          statusCode: 200,
          timestamp: new Date().toISOString()
        });
      }
      
      const recent = performanceMonitor.getRecentMetrics(20000);
      expect(recent.length).toBeLessThanOrEqual(10000);
    });

    it('returns null for non-existent metrics', () => {
      const metric = performanceMonitor.getMetrics('/api/nonexistent', 'GET');
      expect(metric).toBeNull();
    });

    it('aggregates metrics periodically', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      // Add some metrics
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordMetric({
          endpoint: '/api/test',
          method: 'GET',
          responseTime: 100 + i * 10,
          cacheHit: i % 2 === 0,
          statusCode: i === 9 ? 500 : 200,
          timestamp: new Date(now).toISOString()
        });
      }

      // Trigger aggregation manually in test
      (performanceMonitor as any).forceAggregation();

      const metric = performanceMonitor.getMetrics('/api/test', 'GET');
      expect(metric).not.toBeNull();
      if (metric) {
        expect(metric.endpoint).toBe('/api/test');
        expect(metric.method).toBe('GET');
        expect(metric.totalRequests).toBe(10);
        expect(metric.averageResponseTime).toBe(145); // average of 100-190
        expect(metric.cacheHitRate).toBe(50); // 5 out of 10
        expect(metric.errorRate).toBe(10); // 1 out of 10
      }
    });

    it('handles empty metrics in aggregation', () => {
      // Trigger aggregation with no metrics
      (performanceMonitor as any).forceAggregation();
      
      const allMetrics = performanceMonitor.getAllMetrics();
      expect(allMetrics).toEqual([]);
    });

    it('calculates p95 response time correctly', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      // Add 100 metrics with varying response times
      for (let i = 0; i < 100; i++) {
        performanceMonitor.recordMetric({
          endpoint: '/api/p95test',
          method: 'GET',
          responseTime: i * 10, // 0, 10, 20, ..., 990
          cacheHit: false,
          statusCode: 200,
          timestamp: new Date(now).toISOString()
        });
      }

      // Trigger aggregation
      (performanceMonitor as any).forceAggregation();

      const metric = performanceMonitor.getMetrics('/api/p95test', 'GET');
      expect(metric).not.toBeNull();
      if (metric) {
        // p95 of 0-990 should be 950 (index 95 of 100)
        expect(metric.p95ResponseTime).toBe(950);
      }
    });

    it('clearMetrics clears all data', () => {
      // Add metrics
      performanceMonitor.recordMetric({
        endpoint: '/api/clear',
        method: 'GET',
        responseTime: 100,
        cacheHit: false,
        statusCode: 200,
        timestamp: new Date().toISOString()
      });

      // Trigger aggregation
      (performanceMonitor as any).forceAggregation();

      // Clear
      performanceMonitor.clearMetrics();

      expect(performanceMonitor.getRecentMetrics(10)).toEqual([]);
      expect(performanceMonitor.getAllMetrics()).toEqual([]);
    });
  });

  describe('getPerformanceReport', () => {
    it('returns empty report when no metrics', () => {
      const report = getPerformanceReport();
      expect(report.summary.totalEndpoints).toBe(0);
      expect(report.summary.averageResponseTime).toBe(0);
      expect(report.summary.averageCacheHitRate).toBe(0);
      expect(report.summary.averageErrorRate).toBe(0);
      expect(report.endpoints).toEqual([]);
      expect(report.alerts).toEqual([]);
    });

    it('generates alerts for slow endpoints', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      // Add a slow endpoint
      performanceMonitor.recordMetric({
        endpoint: '/api/slow',
        method: 'GET',
        responseTime: 6000,
        cacheHit: false,
        statusCode: 200,
        timestamp: new Date(now).toISOString()
      });

      // Trigger aggregation
      (performanceMonitor as any).forceAggregation();

      const report = getPerformanceReport();
      const slowAlert = report.alerts.find(a => a.includes('Slow response time'));
      expect(slowAlert).toBeDefined();
      expect(slowAlert).toContain('/api/slow');
    });

    it('generates alerts for high error rates', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      // Add metrics with errors
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordMetric({
          endpoint: '/api/errors',
          method: 'POST',
          responseTime: 100,
          cacheHit: false,
          statusCode: i < 7 ? 500 : 200, // 70% error rate
          timestamp: new Date(now).toISOString()
        });
      }

      // Trigger aggregation
      (performanceMonitor as any).forceAggregation();

      const report = getPerformanceReport();
      const errorAlert = report.alerts.find(a => a.includes('High error rate'));
      expect(errorAlert).toBeDefined();
      expect(errorAlert).toContain('/api/errors');
    });

    it('generates alerts for low cache hit rate on GET endpoints', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      // Add metrics with low cache hits
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordMetric({
          endpoint: '/api/nocache',
          method: 'GET',
          responseTime: 100,
          cacheHit: false, // 0% cache hit rate
          statusCode: 200,
          timestamp: new Date(now).toISOString()
        });
      }

      // Trigger aggregation
      (performanceMonitor as any).forceAggregation();

      const report = getPerformanceReport();
      const cacheAlert = report.alerts.find(a => a.includes('Low cache hit rate'));
      expect(cacheAlert).toBeDefined();
      expect(cacheAlert).toContain('/api/nocache');
    });

    it('does not alert on low cache for non-GET methods', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      // Add POST metrics with no cache (expected)
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordMetric({
          endpoint: '/api/post',
          method: 'POST',
          responseTime: 100,
          cacheHit: false,
          statusCode: 200,
          timestamp: new Date(now).toISOString()
        });
      }

      // Trigger aggregation
      (performanceMonitor as any).forceAggregation();

      const report = getPerformanceReport();
      const cacheAlert = report.alerts.find(a => a.includes('Low cache hit rate') && a.includes('/api/post'));
      expect(cacheAlert).toBeUndefined();
    });

    it('sorts endpoints by response time', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      // Add metrics for different endpoints
      performanceMonitor.recordMetric({
        endpoint: '/api/fast',
        method: 'GET',
        responseTime: 50,
        cacheHit: true,
        statusCode: 200,
        timestamp: new Date(now).toISOString()
      });

      performanceMonitor.recordMetric({
        endpoint: '/api/medium',
        method: 'GET',
        responseTime: 500,
        cacheHit: false,
        statusCode: 200,
        timestamp: new Date(now).toISOString()
      });

      performanceMonitor.recordMetric({
        endpoint: '/api/slow',
        method: 'GET',
        responseTime: 2000,
        cacheHit: false,
        statusCode: 200,
        timestamp: new Date(now).toISOString()
      });

      // Trigger aggregation
      (performanceMonitor as any).forceAggregation();

      const report = getPerformanceReport();
      expect(report.endpoints.length).toBe(3);
      expect(report.endpoints[0].endpoint).toBe('/api/slow');
      expect(report.endpoints[2].endpoint).toBe('/api/fast');
    });

    it('calculates summary statistics correctly', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      // Add metrics for multiple endpoints
      for (const endpoint of ['/api/a', '/api/b']) {
        for (let i = 0; i < 5; i++) {
          performanceMonitor.recordMetric({
            endpoint,
            method: 'GET',
            responseTime: 200,
            cacheHit: i < 3, // 60% cache hit rate
            statusCode: i === 4 ? 400 : 200, // 20% error rate
            timestamp: new Date(now).toISOString()
          });
        }
      }

      // Trigger aggregation
      (performanceMonitor as any).forceAggregation();

      const report = getPerformanceReport();
      expect(report.summary.totalEndpoints).toBe(2);
      expect(report.summary.averageResponseTime).toBe(200);
      expect(report.summary.averageCacheHitRate).toBe(60);
      expect(report.summary.averageErrorRate).toBe(20);
    });
  });
});