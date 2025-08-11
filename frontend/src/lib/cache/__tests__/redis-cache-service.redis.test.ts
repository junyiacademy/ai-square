import { jest } from '@jest/globals';

describe('redis-cache-service (redis connected branch)', () => {
  const setupRedis = async (overrides: Partial<Record<string, any>> = {}) => {
    jest.resetModules();
    process.env.REDIS_URL = 'redis://localhost:6379';
    const methodMocks: Record<string, any> = {
      on: jest.fn() as any,
      ping: (jest.fn() as any).mockResolvedValue('PONG'),
      get: (jest.fn() as any).mockResolvedValue(JSON.stringify({ a: 1 })),
      setex: (jest.fn() as any).mockResolvedValue('OK'),
      mget: (jest.fn() as any).mockResolvedValue([
        JSON.stringify({ x: 1 }),
        null,
        JSON.stringify({ y: 2 }),
      ]),
      exists: (jest.fn() as any).mockResolvedValue(1),
      del: (jest.fn() as any).mockResolvedValue(1),
      flushdb: (jest.fn() as any).mockResolvedValue('OK'),
      info: (jest.fn() as any).mockResolvedValue('used_memory:123'),
      incrby: (jest.fn() as any).mockResolvedValue(5),
      quit: (jest.fn() as any).mockResolvedValue('OK'),
      ...overrides,
    };

    jest.doMock('ioredis', () => ({
      Redis: jest.fn().mockImplementation(() => methodMocks),
    }));

    const mod = require('../redis-cache-service');
    const svc = mod.redisCacheService as any;
    return { svc, mocks: methodMocks };
  };

  it('set/get via redis when connected', async () => {
    const { svc, mocks } = await setupRedis();
    await svc.set('rk', { a: 1 }, { ttl: 2000 });
    expect(mocks.setex).toHaveBeenCalledWith('rk', expect.any(Number), JSON.stringify({ a: 1 }));
    const v = await svc.get('rk');
    expect(mocks.get).toHaveBeenCalledWith('rk');
    expect(v).toEqual({ a: 1 });
  });

  it('mget parses array of values', async () => {
    const { svc, mocks } = await setupRedis();
    const vals = await svc.mget(['a', 'b', 'c']);
    expect(mocks.mget).toHaveBeenCalledWith('a', 'b', 'c');
    expect(vals).toEqual([{ x: 1 }, null, { y: 2 }]);
  });

  it('has/delete/clear/incr and getStats work in redis path', async () => {
    const { svc, mocks } = await setupRedis();
    const has = await svc.has('hk');
    expect(has).toBe(true);
    expect(mocks.exists).toHaveBeenCalledWith('hk');

    await svc.delete('dk');
    expect(mocks.del).toHaveBeenCalledWith('dk');

    await svc.clear();
    expect(mocks.flushdb).toHaveBeenCalled();

    const n = await svc.incr('num', 3);
    expect(mocks.incrby).toHaveBeenCalledWith('num', 3);
    expect(n).toBe(5);

    const stats = await svc.getStats();
    expect(stats.redisConnected).toBe(true);
    expect(stats.redisInfo).toContain('used_memory');
  });

  it('continues on set error and still stores in fallback', async () => {
    const { svc, mocks } = await setupRedis({ setex: jest.fn(async () => { throw new Error('set fail'); }) });
    await svc.clear();
    await svc.set('fk', { z: 9 }, { ttl: 1000 });
    // Force fallback read path (bypass redis.get)
    (svc as any).isConnected = false;
    const res = await svc.get('fk');
    expect(res).toEqual({ z: 9 });
    expect(mocks.setex).toHaveBeenCalled();
  });
}); 