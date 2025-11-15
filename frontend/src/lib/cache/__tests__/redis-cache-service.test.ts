import { redisCacheService } from '../redis-cache-service';
import { jest } from '@jest/globals';

// We don't set REDIS_URL to force fallback (in-memory) path during tests

describe('redisCacheService (fallback mode)', () => {
  beforeEach(async () => {
    await redisCacheService.clear();
  });

  it('set/get should store and retrieve values', async () => {
    await redisCacheService.set('rk1', { a: 1 }, { ttl: 60_000 });
    const v = await redisCacheService.get<{ a: number }>('rk1');
    expect(v).toEqual({ a: 1 });
  });

  it('has should reflect presence', async () => {
    await redisCacheService.set('exists', 'yes', { ttl: 60_000 });
    expect(await redisCacheService.has('exists')).toBe(true);
    expect(await redisCacheService.has('missing')).toBe(false);
  });

  it('delete should remove key', async () => {
    await redisCacheService.set('delk', 123, { ttl: 60_000 });
    await redisCacheService.delete('delk');
    expect(await redisCacheService.get('delk')).toBeNull();
  });

  it('clear should remove all keys', async () => {
    await redisCacheService.set('a', 1, { ttl: 60_000 });
    await redisCacheService.set('b', 2, { ttl: 60_000 });
    await redisCacheService.clear();
    expect(await redisCacheService.get('a')).toBeNull();
    expect(await redisCacheService.get('b')).toBeNull();
  });

  it('incr should increment numeric value in fallback cache', async () => {
    const n1 = await redisCacheService.incr('counter');
    const n2 = await redisCacheService.incr('counter', 5);
    expect(n1).toBe(1);
    expect(n2).toBe(6);
  });

  it('mset/mget should batch process values', async () => {
    await redisCacheService.mset([
      ['ba', { x: 1 }],
      ['bb', { y: 2 }]
    ], { ttl: 60_000 });
    const arr = await redisCacheService.mget<{ x?: number; y?: number }>(['ba', 'bb', 'bc']);
    expect(arr).toEqual([{ x: 1 }, { y: 2 }, null]);
  });

  it('getStats should not throw and include fallback size', async () => {
    await redisCacheService.set('sx', 'v', { ttl: 60_000 });
    const stats = await redisCacheService.getStats();
    expect(typeof stats.redisConnected).toBe('boolean');
    expect(stats.fallbackCacheSize).toBeGreaterThanOrEqual(1);
  });

  it('handles errors gracefully', async () => {
    const mapGetSpy = jest.spyOn(Map.prototype, 'get').mockImplementationOnce(() => {
      throw new Error('forced');
    });
    await expect(redisCacheService.get('err')).resolves.toBeNull();
    mapGetSpy.mockRestore();
  });
});

describe('redis-cache-service (fallback mode + basic ops)', () => {
  const loadService = async () => {
    jest.resetModules();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_CONNECTION_STRING;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mod = require('../redis-cache-service');
    return { service: mod.redisCacheService as unknown as { [k: string]: unknown }, warnSpy, errorSpy };
  };

  it('uses in-memory fallback when REDIS_URL not configured and supports set/get', async () => {
    const { service, warnSpy } = await loadService();

    await (service as any).clear();
    await (service as any).set('k1', { a: 1 });
    const v = await (service as any).get('k1');
    expect(v).toEqual({ a: 1 });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('supports mset/mget and delete/has/clear/incr operations', async () => {
    const { service } = await loadService();
    await (service as any).clear();

    await (service as any).mset([
      ['u:1', { name: 'A' }],
      ['u:2', { name: 'B' }],
    ], { ttl: 1000 });

    const values = await (service as any).mget(['u:1', 'u:2', 'u:3']);
    expect(values).toEqual([{ name: 'A' }, { name: 'B' }, null]);

    expect(await (service as any).has('u:1')).toBe(true);
    await (service as any).delete('u:1');
    expect(await (service as any).has('u:1')).toBe(false);

    const v1 = await (service as any).incr('counter');
    const v2 = await (service as any).incr('counter', 5);
    expect(v1).toBe(1);
    expect(v2).toBe(6);

    await (service as any).clear();
    expect(await (service as any).has('u:2')).toBe(false);
  });

  it('getStats returns fallback size and connected=false', async () => {
    const { service } = await loadService();
    await (service as any).clear();
    await (service as any).set('s1', 'x');
    const stats = await (service as any).getStats();
    expect(stats.redisConnected).toBe(false);
    expect(stats.fallbackCacheSize).toBeGreaterThanOrEqual(1);
  });

  it('handles Redis errors gracefully in get path', async () => {
    const { service, errorSpy } = await loadService();
    // Force into Redis path with a throwing client
    (service as any).isConnected = true;
    (service as any).redis = { get: jest.fn(async () => { throw new Error('boom'); }) };

    const v = await (service as any).get('X');
    expect(v).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});
