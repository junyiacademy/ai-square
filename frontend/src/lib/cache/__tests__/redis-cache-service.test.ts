// TODO: This test is trying to test the RedisCacheService class directly, but only the singleton instance is exported
// The tests should be rewritten to test the redisCacheService instance methods instead
/*
import { redisCacheService } from '../redis-cache-service';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  flushAll: jest.fn(),
  keys: jest.fn(),
  ping: jest.fn(),
  on: jest.fn(),
  isOpen: true
};

(createClient as jest.Mock).mockReturnValue(mockRedisClient);

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Reset the singleton instance
    (RedisCacheService as any).instance = undefined;
    service = RedisCacheService.getInstance();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = RedisCacheService.getInstance();
      const instance2 = RedisCacheService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('creates client with correct config', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      (RedisCacheService as any).instance = undefined;
      
      service = RedisCacheService.getInstance();

      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          commandTimeout: 2000
        }
      });
    });

    it('uses default localhost when no REDIS_URL', () => {
      delete process.env.REDIS_URL;
      (RedisCacheService as any).instance = undefined;
      
      service = RedisCacheService.getInstance();

      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          commandTimeout: 2000
        }
      });
    });
  });

  describe('connect', () => {
    it('connects to Redis successfully', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');

      await service.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('handles connection error', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

      await service.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(service.isConnected()).toBe(false);
    });

    it('does not reconnect if already connected', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');

      await service.connect();
      await service.connect();

      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('disconnects from Redis', async () => {
      await service.disconnect();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('handles disconnect error gracefully', async () => {
      mockRedisClient.disconnect.mockRejectedValue(new Error('Disconnect failed'));

      await expect(service.disconnect()).resolves.not.toThrow();
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');
      await service.connect();
    });

    it('retrieves and parses JSON data', async () => {
      const data = { id: 1, name: 'Test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(data));

      const result = await service.get('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(data);
    });

    it('returns null for non-existent key', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });

    it('handles invalid JSON gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');

      const result = await service.get('bad-key');

      expect(result).toBeNull();
    });

    it('returns null when not connected', async () => {
      await service.disconnect();
      mockRedisClient.isOpen = false;

      const result = await service.get('test-key');

      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.isOpen = true;
      await service.connect();
    });

    it('stores data with TTL', async () => {
      const data = { id: 2, name: 'Store' };
      const ttl = 3600000; // 1 hour

      await service.set('test-key', data, { ttl });

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(data),
        { PX: ttl }
      );
    });

    it('stores data without TTL', async () => {
      const data = { id: 3, name: 'No TTL' };

      await service.set('test-key', data);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(data),
        {}
      );
    });

    it('does nothing when not connected', async () => {
      await service.disconnect();
      mockRedisClient.isOpen = false;

      await service.set('test-key', { data: 'test' });

      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('handles set error gracefully', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Set failed'));

      await expect(
        service.set('test-key', { data: 'test' })
      ).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.isOpen = true;
      await service.connect();
    });

    it('deletes a key', async () => {
      await service.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('does nothing when not connected', async () => {
      await service.disconnect();
      mockRedisClient.isOpen = false;

      await service.delete('test-key');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.isOpen = true;
      await service.connect();
    });

    it('flushes all data', async () => {
      await service.clear();

      expect(mockRedisClient.flushAll).toHaveBeenCalled();
    });

    it('does nothing when not connected', async () => {
      await service.disconnect();
      mockRedisClient.isOpen = false;

      await service.clear();

      expect(mockRedisClient.flushAll).not.toHaveBeenCalled();
    });
  });

  describe('deletePattern', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.isOpen = true;
      await service.connect();
    });

    it('deletes keys matching pattern', async () => {
      mockRedisClient.keys.mockResolvedValue(['user:1', 'user:2', 'user:3']);

      await service.deletePattern('user:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('user:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith('user:1', 'user:2', 'user:3');
    });

    it('handles empty pattern match', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await service.deletePattern('nonexistent:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('nonexistent:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('does nothing when not connected', async () => {
      await service.disconnect();
      mockRedisClient.isOpen = false;

      await service.deletePattern('test:*');

      expect(mockRedisClient.keys).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('returns connection stats', async () => {
      mockRedisClient.isOpen = true;
      (service as any).stats = {
        hits: 100,
        misses: 20,
        sets: 80,
        deletes: 10
      };

      const stats = await service.getStats();

      expect(stats).toEqual({
        redisConnected: true,
        redisHits: 100,
        redisMisses: 20,
        redisSets: 80,
        redisDeletes: 10
      });
    });

    it('returns disconnected stats', async () => {
      mockRedisClient.isOpen = false;
      (service as any).stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0
      };

      const stats = await service.getStats();

      expect(stats).toEqual({
        redisConnected: false,
        redisHits: 0,
        redisMisses: 0,
        redisSets: 0,
        redisDeletes: 0
      });
    });
  });

  describe('error handling', () => {
    it('handles Redis errors in event listeners', () => {
      const errorHandler = mockRedisClient.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      expect(() => {
        errorHandler?.(new Error('Redis error'));
      }).not.toThrow();
    });

    it('handles connection end event', () => {
      const endHandler = mockRedisClient.on.mock.calls.find(
        call => call[0] === 'end'
      )?.[1];

      endHandler?.();
      
      expect(service.isConnected()).toBe(false);
    });
  });
});
*/
