import { productionMonitor } from '../production-monitor';
import { performanceMonitor } from '../performance-monitor';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';

// Mock dependencies
jest.mock('../performance-monitor');
jest.mock('@/lib/cache/distributed-cache-service');

const mockPerformanceMonitor = performanceMonitor as jest.Mocked<typeof performanceMonitor>;
const mockDistributedCacheService = distributedCacheService as jest.Mocked<typeof distributedCacheService>;

// Mock fetch globally
global.fetch = jest.fn();

describe('production-monitor', () => {
  // Mock console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalNodeEnv = process.env.NODE_ENV;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    console.log = jest.fn();
    console.error = jest.fn();
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    (process.env as any).NODE_ENV = originalNodeEnv;
    delete process.env.ALERT_WEBHOOK_URL;
    delete process.env.ALERT_RESPONSE_TIME;
    delete process.env.ALERT_ERROR_RATE;
    delete process.env.ALERT_CACHE_HIT_RATE;
  });

  describe('getStatus method', () => {
    it('returns monitoring status in production', () => {
      (process.env as any).NODE_ENV = 'production';
      // Re-import to apply NODE_ENV change
      jest.resetModules();
      const { productionMonitor: prodMonitor } = require('../production-monitor');
      
      const status = prodMonitor.getStatus();
      
      expect(status).toEqual({
        enabled: true,
        alertThresholds: {
          responseTime: 5000,
          errorRate: 5,
          cacheHitRate: 50
        },
        lastReported: expect.any(Date)
      });
    });

    it('returns disabled status in non-production', () => {
      (process.env as any).NODE_ENV = 'development';
      jest.resetModules();
      const { productionMonitor: devMonitor } = require('../production-monitor');
      
      const status = devMonitor.getStatus();
      
      expect(status.enabled).toBe(false);
    });

    it('uses custom alert thresholds from env vars', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.ALERT_RESPONSE_TIME = '3000';
      process.env.ALERT_ERROR_RATE = '10';
      process.env.ALERT_CACHE_HIT_RATE = '60';
      
      jest.resetModules();
      const { productionMonitor: customMonitor } = require('../production-monitor');
      
      const status = customMonitor.getStatus();
      
      expect(status.alertThresholds).toEqual({
        responseTime: 3000,
        errorRate: 10,
        cacheHitRate: 60
      });
    });
  });
});
