import { distributedCacheService } from '../distributed-cache-service';
import { jest } from '@jest/globals';

// Helper to fresh-load module with clean state
const loadSvc = () => {
  jest.resetModules();
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const mod = require('../distributed-cache-service');
  const svc = mod.distributedCacheService as unknown as { [k: string]: unknown };
  const redisMod = require('../redis-cache-service');
  const redis = redisMod.redisCacheService as unknown as { [k: string]: unknown };
  const cacheMod = require('../cache-service');
  const base = cacheMod.cacheService as unknown as { [k: string]: unknown };
  return { svc, redis, base, errorSpy };
};

describe('distributed-cache-service', () => {
  it('get/set falls back across layers and local cache', async () => {
    const { svc, redis, base } = loadSvc();
    // Make Redis disconnected to force fallback
    (redis as any).isConnected = false;
    await (base as any).clear();

    await (svc as any).set('k', { hello: 'world' }, { ttl: 500, useRedis: false });
    const v1 = await (svc as any).get('k');
    expect(v1).toEqual({ hello: 'world' });

    // Local cache path
    const v2 = await (svc as any).get('k');
    expect(v2).toEqual({ hello: 'world' });
  });

  it('getWithRevalidation returns fresh, serves stale then revalidates', async () => {
    jest.useFakeTimers();
    const { svc, redis } = loadSvc();
    (redis as any).isConnected = false;

    let fetchCalls = 0;
    const fetcher = async () => ({ n: ++fetchCalls });

    // First time: fetch and cache
    const v1 = await (svc as any).getWithRevalidation('rv', fetcher, { ttl: 100 });
    expect(v1).toEqual({ n: 1 });

    // Advance time to expire but within stale window
    await jest.advanceTimersByTimeAsync(150);
    const v2 = await (svc as any).getWithRevalidation('rv', fetcher, { ttl: 100, staleWhileRevalidate: 500 });
    expect(v2).toEqual({ n: 1 }); // stale served

    // Let background revalidation resolve
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(0);

    // Next get should see updated value
    const v3 = await (svc as any).getWithRevalidation('rv', fetcher, { ttl: 100 });
    expect(v3).toEqual({ n: 2 });

    jest.useRealTimers();
  });

  it('mset/mget integrates redis and local cache', async () => {
    const { svc, redis } = loadSvc();
    (redis as any).isConnected = false;

    await (svc as any).mset([
      ['a', 1],
      ['b', 2],
    ], { ttl: 1000, useRedis: false });

    const values = await (svc as any).mget(['a', 'b', 'c']);
    expect(values).toEqual([1, 2, null]);
  });

  it('delete/clear removes entries and cancels revalidations', async () => {
    const { svc, redis } = loadSvc();
    (redis as any).isConnected = false;

    const fetcher = async () => ({ t: Date.now() });
    await (svc as any).getWithRevalidation('x', fetcher, { ttl: 10 });
    await (svc as any).delete('x');
    const afterDelete = await (svc as any).get('x');
    expect(afterDelete).toBeNull();

    await (svc as any).set('y', 123);
    await (svc as any).clear();
    const stats = await (svc as any).getStats();
    expect(stats.localCacheSize).toBe(0);
  });

  it('returns stale data on getWithRevalidation error path if available', async () => {
    jest.useFakeTimers();
    const loaded = loadSvc();
    const svc = loaded.svc as any;
    const redis = loaded.redis as any;
    (redis as any).isConnected = false;

    // Seed local cache to stale
    await svc.set('e', { old: true }, { ttl: 50 });
    await jest.advanceTimersByTimeAsync(60); // expired

    // Force fetcher throw
    const fetcher = async () => { throw new Error('fetch failed'); };
    const val = await svc.getWithRevalidation('e', fetcher, { ttl: 50, staleWhileRevalidate: 500 });
    expect(val).toEqual({ old: true });
    // 不強制等待背景 revalidation 的 console.error，避免 flakiness
    jest.useRealTimers();
  });
});
