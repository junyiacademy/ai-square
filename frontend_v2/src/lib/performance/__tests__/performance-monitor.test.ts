import { performanceMonitor } from '../performance-monitor';

// Mock performance API with proper typing
const mockPerformanceNow = jest.fn(() => 1000);
const mockGetEntriesByType = jest.fn();

// Mock both global and window performance
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    getEntriesByType: mockGetEntriesByType,
    mark: jest.fn(),
    measure: jest.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'performance', {
  value: {
    now: mockPerformanceNow,
    getEntriesByType: mockGetEntriesByType,
    mark: jest.fn(),
    measure: jest.fn(),
  },
  writable: true,
});

// Mock console.log for development environment tests
const originalLog = console.log;
const mockConsoleLog = jest.fn();

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
    mockGetEntriesByType.mockReturnValue([]);
    // Reset the metrics array by calling clear
    performanceMonitor.clear();
    console.log = originalLog;
  });

  describe('recordMetric', () => {
    it('records a metric with default unit', () => {
      performanceMonitor.recordMetric('test-metric', 100);
      
      // Use getSummary to check metrics were recorded
      const summary = performanceMonitor.getSummary();
      expect(summary.totalMetrics).toBe(1);
      expect(summary.recentMetrics).toHaveLength(1);
      expect(summary.recentMetrics[0]).toEqual({
        name: 'test-metric',
        value: 100,
        unit: 'ms',
        timestamp: expect.any(Number)
      });
    });

    it('records a metric with custom unit', () => {
      performanceMonitor.recordMetric('memory-usage', 50, 'MB');
      
      const summary = performanceMonitor.getSummary();
      expect(summary.totalMetrics).toBe(1);
      expect(summary.recentMetrics[0]).toEqual({
        name: 'memory-usage',
        value: 50,
        unit: 'MB',
        timestamp: expect.any(Number)
      });
    });

    it('logs to console in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      console.log = mockConsoleLog;

      performanceMonitor.recordMetric('dev-metric', 200);

      expect(mockConsoleLog).toHaveBeenCalledWith('[Performance] dev-metric: 200ms');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('does not log to console in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      console.log = mockConsoleLog;

      performanceMonitor.recordMetric('prod-metric', 300);

      expect(mockConsoleLog).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('prevents memory leak by limiting metrics array size', () => {
      // Add more than MAX_METRICS (1000)
      for (let i = 0; i < 1005; i++) {
        performanceMonitor.recordMetric(`metric-${i}`, i);
      }

      const summary = performanceMonitor.getSummary();
      expect(summary.totalMetrics).toBe(1000);
      // Should keep the latest metrics
      expect(summary.recentMetrics).toHaveLength(10); // Recent metrics shows last 10
    });
  });

  describe('measureAsync', () => {
    it('measures async function execution time', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time

      const asyncFn = jest.fn(async () => {
        return 'result';
      });

      const result = await performanceMonitor.measureAsync('async-operation', asyncFn);

      expect(result).toBe('result');
      expect(asyncFn).toHaveBeenCalledTimes(1);
      
      const summary = performanceMonitor.getSummary();
      expect(summary.totalMetrics).toBe(1);
      expect(summary.recentMetrics[0]).toEqual({
        name: 'async-operation',
        value: 500,
        unit: 'ms',
        timestamp: expect.any(Number)
      });
    });

    it('records error metric when async function throws', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1200); // End time

      const asyncFn = jest.fn(async () => {
        throw new Error('Async error');
      });

      await expect(
        performanceMonitor.measureAsync('failing-async', asyncFn)
      ).rejects.toThrow('Async error');

      const summary = performanceMonitor.getSummary();
      expect(summary.totalMetrics).toBe(1);
      expect(summary.recentMetrics[0]).toEqual({
        name: 'failing-async_error',
        value: 200,
        unit: 'ms',
        timestamp: expect.any(Number)
      });
    });
  });

  describe('measure', () => {
    it('measures sync function execution time', () => {
      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1100); // End time

      const syncFn = jest.fn(() => 'sync-result');

      const result = performanceMonitor.measure('sync-operation', syncFn);

      expect(result).toBe('sync-result');
      expect(syncFn).toHaveBeenCalledTimes(1);
      
      const summary = performanceMonitor.getSummary();
      expect(summary.totalMetrics).toBe(1);
      expect(summary.recentMetrics[0]).toEqual({
        name: 'sync-operation',
        value: 100,
        unit: 'ms',
        timestamp: expect.any(Number)
      });
    });

    it('records error metric when sync function throws', () => {
      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1050); // End time

      const syncFn = jest.fn(() => {
        throw new Error('Sync error');
      });

      expect(() => 
        performanceMonitor.measure('failing-sync', syncFn)
      ).toThrow('Sync error');

      const summary = performanceMonitor.getSummary();
      expect(summary.totalMetrics).toBe(1);
      expect(summary.recentMetrics[0]).toEqual({
        name: 'failing-sync_error',
        value: 50,
        unit: 'ms',
        timestamp: expect.any(Number)
      });
    });
  });

  describe('getCoreWebVitals', () => {
    it('returns null on server side', () => {
      // Mock environment where window is undefined
      const originalWindow = global.window;
      
      // Delete window property from global
      delete (global as any).window;

      const vitals = performanceMonitor.getCoreWebVitals();
      expect(vitals).toBeNull();

      // Restore window
      global.window = originalWindow;
    });

    it('returns core web vitals metrics', () => {
      const mockNavigation = {
        domInteractive: 600,
        loadEventEnd: 800,
        fetchStart: 0
      };

      const mockPaintEntries = [
        { name: 'first-paint', startTime: 100 },
        { name: 'first-contentful-paint', startTime: 150 }
      ];

      const mockLCPEntries = [
        { startTime: 200 },
        { startTime: 300 }
      ];

      mockGetEntriesByType.mockImplementation((type) => {
        switch (type) {
          case 'navigation':
            return [mockNavigation];
          case 'paint':
            return mockPaintEntries;
          case 'largest-contentful-paint':
            return mockLCPEntries;
          default:
            return [];
        }
      });

      const vitals = performanceMonitor.getCoreWebVitals();
      
      expect(vitals).toEqual({
        FCP: 150,
        LCP: 300,
        TTI: 800, // loadEventEnd - fetchStart
        TBT: 200  // loadEventEnd - domInteractive
      });
    });

    it('handles missing performance entries gracefully', () => {
      mockGetEntriesByType.mockReturnValue([]);

      const vitals = performanceMonitor.getCoreWebVitals();
      
      expect(vitals).toEqual({
        FCP: 0,
        LCP: 0,
        TTI: 0,
        TBT: 0
      });
    });
  });

  describe('getResourceTimings', () => {
    it('returns empty array on server side', () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      const timings = performanceMonitor.getResourceTimings();
      expect(timings).toEqual([]);

      global.window = originalWindow;
    });

    it('returns resource timing information', () => {
      const mockResources = [
        {
          name: 'https://example.com/script.js',
          duration: 100,
          transferSize: 5000,
          decodedBodySize: 4500
        },
        {
          name: 'https://example.com/style.css',
          duration: 50,
          transferSize: 0, // Cached
          decodedBodySize: 3000
        }
      ];

      mockGetEntriesByType.mockReturnValue(mockResources);

      const timings = performanceMonitor.getResourceTimings();
      
      expect(timings).toEqual([
        {
          name: 'https://example.com/script.js',
          duration: 100,
          size: 5000,
          cached: false
        },
        {
          name: 'https://example.com/style.css',
          duration: 50,
          size: 0,
          cached: true
        }
      ]);
    });
  });

  describe('getCacheHitRate', () => {
    it('returns 0 when no resources', () => {
      mockGetEntriesByType.mockReturnValue([]);
      
      const rate = performanceMonitor.getCacheHitRate();
      expect(rate).toBe(0);
    });

    it('calculates cache hit rate correctly', () => {
      const mockResources = [
        { name: 'file1.js', duration: 100, transferSize: 1000, decodedBodySize: 1000 },
        { name: 'file2.js', duration: 100, transferSize: 0, decodedBodySize: 2000 }, // Cached
        { name: 'file3.css', duration: 100, transferSize: 0, decodedBodySize: 1500 }, // Cached
        { name: 'file4.css', duration: 100, transferSize: 500, decodedBodySize: 500 }
      ];

      mockGetEntriesByType.mockReturnValue(mockResources);
      
      const rate = performanceMonitor.getCacheHitRate();
      expect(rate).toBe(50); // 2 out of 4 are cached
    });
  });

  describe('getAverageMetric', () => {
    it('returns null when no metrics match', () => {
      const average = performanceMonitor.getAverageMetric('non-existent');
      expect(average).toBeNull();
    });

    it('calculates average correctly', () => {
      performanceMonitor.recordMetric('api_call', 100);
      performanceMonitor.recordMetric('api_call', 200);
      performanceMonitor.recordMetric('api_call', 300);
      performanceMonitor.recordMetric('other_metric', 500);

      const average = performanceMonitor.getAverageMetric('api_call');
      expect(average).toBe(200);
    });
  });

  describe('getSummary', () => {
    it('returns comprehensive performance summary', () => {
      // Setup mocks for web vitals
      mockGetEntriesByType.mockImplementation((type) => {
        if (type === 'navigation') {
          return [{
            domInteractive: 600,
            loadEventEnd: 800,
            fetchStart: 0
          }];
        }
        if (type === 'paint') {
          return [{ name: 'first-contentful-paint', startTime: 150 }];
        }
        if (type === 'resource') {
          return [
            { name: 'file1.js', duration: 100, transferSize: 1000, decodedBodySize: 1000 },
            { name: 'file2.css', duration: 50, transferSize: 0, decodedBodySize: 2000 }
          ];
        }
        return [];
      });

      performanceMonitor.recordMetric('api_call', 100);
      performanceMonitor.recordMetric('api_call', 150);

      const summary = performanceMonitor.getSummary();
      
      expect(summary).toMatchObject({
        coreWebVitals: expect.objectContaining({
          FCP: 150,
          TTI: 800
        }),
        cacheHitRate: '50.0%',
        averageApiCall: 125,
        totalMetrics: 2
      });
      expect(summary.recentMetrics).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('clears all recorded metrics', () => {
      performanceMonitor.recordMetric('metric1', 100);
      performanceMonitor.recordMetric('metric2', 200);
      
      let summary = performanceMonitor.getSummary();
      expect(summary.totalMetrics).toBe(2);
      
      performanceMonitor.clear();
      
      summary = performanceMonitor.getSummary();
      expect(summary.totalMetrics).toBe(0);
      expect(summary.recentMetrics).toHaveLength(0);
    });
  });
});