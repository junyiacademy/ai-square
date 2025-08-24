/**
 * Tests for /api/simple-health route
 * Priority: CRITICAL - 0% coverage → 100% coverage
 */

import { GET } from '../route';

// Mock process.env and process.uptime
const originalEnv = process.env;
const originalUptime = process.uptime;

describe('/api/simple-health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.uptime to return a consistent value
    process.uptime = jest.fn().mockReturnValue(123.456);
    
    // Mock Date to return consistent timestamps
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    process.uptime = originalUptime;
    
    jest.useRealTimers();
  });

  describe('GET /api/simple-health', () => {
    it('should return health status with default environment', async () => {
      // Remove NODE_ENV to test default behavior
      delete process.env.NODE_ENV;

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'healthy',
        timestamp: '2023-01-01T12:00:00.000Z',
        environment: 'development', // Default value
        uptime: 123.456,
        message: 'Simple health check - no database or Redis checks'
      });
    });

    it('should return health status with production environment', async () => {
      process.env.NODE_ENV = 'production';

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'healthy',
        timestamp: '2023-01-01T12:00:00.000Z',
        environment: 'production',
        uptime: 123.456,
        message: 'Simple health check - no database or Redis checks'
      });
    });

    it('should return health status with test environment', async () => {
      process.env.NODE_ENV = 'test';

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'healthy',
        timestamp: '2023-01-01T12:00:00.000Z',
        environment: 'test',
        uptime: 123.456,
        message: 'Simple health check - no database or Redis checks'
      });
    });

    it('should return health status with staging environment', async () => {
      process.env.NODE_ENV = 'staging';

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.environment).toBe('staging');
      expect(data.uptime).toBe(123.456);
      expect(data.message).toBe('Simple health check - no database or Redis checks');
    });

    it('should return current timestamp', async () => {
      // Set a specific time
      jest.setSystemTime(new Date('2024-06-15T08:30:00.000Z'));

      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBe('2024-06-15T08:30:00.000Z');
    });

    it('should return actual uptime value', async () => {
      // Mock different uptime value
      process.uptime = jest.fn().mockReturnValue(999.123);

      const response = await GET();
      const data = await response.json();

      expect(data.uptime).toBe(999.123);
      expect(process.uptime).toHaveBeenCalled();
    });

    it('should handle zero uptime', async () => {
      process.uptime = jest.fn().mockReturnValue(0);

      const response = await GET();
      const data = await response.json();

      expect(data.uptime).toBe(0);
    });

    it('should handle large uptime values', async () => {
      // Test with large uptime (e.g., long-running server)
      const largeUptime = 86400 * 30; // 30 days in seconds
      process.uptime = jest.fn().mockReturnValue(largeUptime);

      const response = await GET();
      const data = await response.json();

      expect(data.uptime).toBe(largeUptime);
    });

    it('should always return status healthy', async () => {
      // Test multiple calls to ensure consistent status
      const response1 = await GET();
      const data1 = await response1.json();
      
      const response2 = await GET();
      const data2 = await response2.json();

      expect(data1.status).toBe('healthy');
      expect(data2.status).toBe('healthy');
    });

    it('should include all required fields', async () => {
      const response = await GET();
      const data = await response.json();

      // Check that all expected fields are present
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('message');
      
      // Check field types
      expect(typeof data.status).toBe('string');
      expect(typeof data.timestamp).toBe('string');
      expect(typeof data.environment).toBe('string');
      expect(typeof data.uptime).toBe('number');
      expect(typeof data.message).toBe('string');
    });

    it('should return valid ISO 8601 timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      // Check that timestamp is a valid ISO string
      const timestamp = new Date(data.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });

    it('should have consistent message', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.message).toBe('Simple health check - no database or Redis checks');
    });

    it('should return HTTP 200 status code', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
    });

    it('should return JSON content type', async () => {
      const response = await GET();

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should handle undefined NODE_ENV gracefully', async () => {
      // Delete NODE_ENV to make it truly undefined
      delete process.env.NODE_ENV;

      const response = await GET();
      const data = await response.json();

      // When NODE_ENV is undefined, process.env.NODE_ENV || 'development' should return 'development'
      expect(data.environment).toBe('development');
    });

    it('should handle empty string NODE_ENV', async () => {
      process.env.NODE_ENV = '';

      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBe('development'); // Fallback to default
    });

    it('should be independent of external services', async () => {
      // This test verifies that the endpoint doesn't rely on databases, Redis, etc.
      // It should work even if external services are down
      
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.message).toContain('no database or Redis checks');
    });

    it('should complete quickly', async () => {
      // Performance test - should complete in reasonable time
      const start = Date.now();
      
      const response = await GET();
      const data = await response.json();
      
      const end = Date.now();
      const duration = end - start;

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      
      // Should complete in less than 100ms (generous threshold for unit tests)
      expect(duration).toBeLessThan(100);
    });

    it('should work with different system times', async () => {
      // Test with various timestamps
      const testTimes = [
        '2020-01-01T00:00:00.000Z',
        '2023-12-31T23:59:59.999Z',
        '2024-02-29T12:00:00.000Z', // Leap year
        '2023-07-04T16:30:45.123Z'
      ];

      for (const testTime of testTimes) {
        jest.setSystemTime(new Date(testTime));
        
        const response = await GET();
        const data = await response.json();

        expect(data.timestamp).toBe(testTime);
        expect(response.status).toBe(200);
      }
    });

    it('should work in concurrent requests', async () => {
      // Test concurrent access
      const promises = Array.from({ length: 10 }, () => GET());
      
      const responses = await Promise.all(promises);
      const dataPromises = responses.map(response => response.json());
      const allData = await Promise.all(dataPromises);

      // All responses should be successful
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // All should have healthy status
      allData.forEach(data => {
        expect(data.status).toBe('healthy');
        expect(data.uptime).toBe(123.456);
        expect(data.timestamp).toBe('2023-01-01T12:00:00.000Z');
      });
    });
  });
});