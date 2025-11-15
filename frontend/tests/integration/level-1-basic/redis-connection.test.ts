/**
 * Level 1: Basic Redis Connection Test
 * Simple test to verify Redis connectivity
 */

describe.skip('Basic Redis Connection', () => {
  let redisClient: any;

  afterAll(async () => {
    if (redisClient) {
      await redisClient.quit();
    }
  });

  it('should connect to Redis', async () => {
    const Redis = require('ioredis');
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6380'),
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    // Test ping
    const pong = await redisClient.ping();
    expect(pong).toBe('PONG');
  });

  it('should set and get value', async () => {
    if (!redisClient) {
      const Redis = require('ioredis');
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380'),
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
    }

    // Set a test value
    await redisClient.set('test:key', 'test-value');

    // Get the value back
    const value = await redisClient.get('test:key');
    expect(value).toBe('test-value');

    // Clean up
    await redisClient.del('test:key');
  });

  it('should handle expiration', async () => {
    if (!redisClient) {
      const Redis = require('ioredis');
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380'),
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
    }

    // Set with 1 second expiration
    await redisClient.set('test:expire', 'will-expire', 'EX', 1);

    // Should exist immediately
    const immediate = await redisClient.get('test:expire');
    expect(immediate).toBe('will-expire');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should be gone
    const after = await redisClient.get('test:expire');
    expect(after).toBeNull();
  });
});
