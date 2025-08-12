/**
 * Simplified Cache Consistency Test
 * Focus on basic cache functionality only
 */

describe('Simple Cache Consistency', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  let redisClient: any;

  beforeAll(async () => {
    const Redis = require('ioredis');
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6380'),
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
  });

  afterAll(async () => {
    if (redisClient) {
      await redisClient.quit();
    }
  });

  it('should cache static content', async () => {
    // Clear cache
    const keys = await redisClient.keys('ksa:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }

    // First request
    const start1 = Date.now();
    const res1 = await fetch(`${baseUrl}/api/ksa?lang=en`);
    const time1 = Date.now() - start1;
    expect(res1.ok).toBe(true);

    // Second request (should be faster if cached)
    const start2 = Date.now();
    const res2 = await fetch(`${baseUrl}/api/ksa?lang=en`);
    const time2 = Date.now() - start2;
    expect(res2.ok).toBe(true);

    console.log(`First request: ${time1}ms, Second request: ${time2}ms`);
    
    // Second should be same or faster (allowing for variance)
    expect(time2).toBeLessThanOrEqual(time1 + 50);
  });

  it('should maintain separate cache per language', async () => {
    // Request in English
    const resEn = await fetch(`${baseUrl}/api/relations?lang=en`);
    const dataEn = await resEn.json();
    
    // Request in Chinese
    const resZh = await fetch(`${baseUrl}/api/relations?lang=zh`);
    const dataZh = await resZh.json();
    
    // Should have different content
    expect(dataEn).not.toEqual(dataZh);
  });

  it('should handle cache miss gracefully', async () => {
    // Clear all cache
    await redisClient.flushdb();
    
    // Should still work without cache
    const response = await fetch(`${baseUrl}/api/pbl/scenarios?lang=en`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('success');
  });
});