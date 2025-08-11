/**
 * @jest-environment node
 */
import { GET, HEAD } from '../route';
import { Pool } from 'pg';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

// Mock distributed cache service
jest.mock('@/lib/cache/distributed-cache-service', () => ({
  distributedCacheService: {
    getWithRevalidation: jest.fn(),
  },
}));

// Mock os module
jest.mock('os', () => ({
  totalmem: jest.fn(() => 8 * 1024 * 1024 * 1024), // 8GB
}));

describe('/api/monitoring/health', () => {
  let mockPoolInstance: {
    query: jest.Mock;
    end: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful mocks
    mockPoolInstance = {
      query: jest.fn().mockResolvedValue({ rows: [{ health_check: 1 }] }),
      end: jest.fn().mockResolvedValue(undefined),
    };
    
    (Pool as unknown as jest.Mock).mockImplementation(() => mockPoolInstance);
    
    (distributedCacheService.getWithRevalidation as jest.Mock).mockResolvedValue('test-value');
    
    // Reset process.memoryUsage
    const mockMemoryUsage = jest.fn(() => ({
      rss: 100 * 1024 * 1024,
      heapTotal: 80 * 1024 * 1024,
      heapUsed: 50 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024,
    }));
    (process.memoryUsage as unknown as jest.Mock) = mockMemoryUsage;
  });

  describe('GET /api/monitoring/health', () => {
    it('should return healthy status when all services are up', async () => {
      process.env.REDIS_ENABLED = 'true';
      
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.services.database.status).toBe('up');
      expect(data.services.redis.status).toBe('up');
      expect(data.services.memory.percentage).toBeLessThan(90);
      expect(data.timestamp).toBeDefined();
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy when database is down', async () => {
      mockPoolInstance.query.mockRejectedValue(new Error('Connection refused'));
      
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.services.database.status).toBe('down');
      expect(data.services.database.error).toBe('Connection refused');
    });

    it('should return degraded when Redis is down but database is up', async () => {
      process.env.REDIS_ENABLED = 'true';
      (distributedCacheService.getWithRevalidation as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed')
      );
      
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.services.database.status).toBe('up');
      expect(data.services.redis.status).toBe('down');
      expect(data.services.redis.error).toBe('Redis connection failed');
    });

    it('should show Redis as disabled when REDIS_ENABLED is not true', async () => {
      process.env.REDIS_ENABLED = 'false';
      
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.services.redis.status).toBe('disabled');
    });

    it('should return degraded when memory usage is high', async () => {
      process.env.REDIS_ENABLED = 'true';
      
      // Mock high memory usage (> 90%)
      const highMemoryUsage = jest.fn(() => ({
        rss: 7.5 * 1024 * 1024 * 1024,
        heapTotal: 7 * 1024 * 1024 * 1024,
        heapUsed: 6.5 * 1024 * 1024 * 1024,
        external: 1 * 1024 * 1024 * 1024,
        arrayBuffers: 500 * 1024 * 1024,
      }));
      (process.memoryUsage as unknown as jest.Mock) = highMemoryUsage;
      
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.services.memory.percentage).toBeGreaterThan(90);
    });

    it('should include response times for services', async () => {
      process.env.REDIS_ENABLED = 'true';
      
      const response = await GET();
      const data = await response.json();

      expect(data.services.database.responseTime).toBeDefined();
      expect(data.services.database.responseTime).toBeGreaterThanOrEqual(0);
      expect(data.services.redis.responseTime).toBeDefined();
      expect(data.services.redis.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should include environment and version information', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalVersion = process.env.npm_package_version;
      // Use Object.defineProperty to override readonly property
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      });
      process.env.npm_package_version = '2.0.1';
      
      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBe('production');
      expect(data.version).toBe('2.0.1');
      
      // Restore original values
      if (originalNodeEnv !== undefined) {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalNodeEnv,
          writable: true,
          configurable: true
        });
      }
      if (originalVersion !== undefined) {
        process.env.npm_package_version = originalVersion;
      } else {
        delete process.env.npm_package_version;
      }
    });

    it('should handle unexpected database response', async () => {
      mockPoolInstance.query.mockResolvedValue({ rows: [] });
      
      const response = await GET();
      const data = await response.json();

      expect(data.services.database.status).toBe('down');
      expect(data.services.database.error).toBe('Unexpected response from database');
    });

    it('should handle health check failure gracefully', async () => {
      // Mock a failure in the health check logic itself
      mockPoolInstance.query.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
    });

    it('should set no-cache headers', async () => {
      const response = await GET();
      
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });
  });

  describe('HEAD /api/monitoring/health', () => {
    it('should return 200 status for simple alive check', async () => {
      const response = await HEAD();
      
      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });
  });

  afterEach(() => {
    // Clean up environment variables
    if (process.env.REDIS_ENABLED !== undefined) {
      delete process.env.REDIS_ENABLED;
    }
  });
});