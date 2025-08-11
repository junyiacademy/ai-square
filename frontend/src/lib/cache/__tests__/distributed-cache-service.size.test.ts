import { jest } from '@jest/globals';

const loadSvc = () => {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../distributed-cache-service');
  return mod.distributedCacheService as unknown as {
    set: (k: string, v: unknown, o?: { ttl?: number }) => Promise<void>;
    get: <T>(k: string) => Promise<T | null>;
    getStats: () => Promise<{ localCacheSize: number; hitRate?: number; counters?: { hits: number; misses: number } }>;
    clear: () => Promise<void>;
  };
};

describe('distributed-cache-service local cache management', () => {
  it('cleans up local cache when exceeding MAX_LOCAL_SIZE and computes hitRate', async () => {
    const svc = loadSvc();
    await svc.clear();

    // Fill more than MAX_LOCAL_SIZE (500)
    const total = 520;
    for (let i = 0; i < total; i++) {
      // small ttl so we do not rely on expiry; cleanup triggers on size
      // but we still set a positive ttl
      await svc.set(`k-${i}`, i, { ttl: 60_000 });
    }

    const stats = await svc.getStats();
    expect(stats.localCacheSize).toBeLessThanOrEqual(500);

    // Exercise hits/misses
    await svc.set('hit-key', { a: 1 }, { ttl: 60_000 });
    const hit1 = await svc.get<{ a: number }>('hit-key');
    const miss1 = await svc.get('not-exist');
    expect(hit1).toEqual({ a: 1 });
    expect(miss1).toBeNull();

    const stats2 = await svc.getStats();
    // Hit rate should be between 0 and 100 and counters present
    expect(typeof stats2.hitRate).toBe('number');
    expect(stats2.counters).toBeDefined();
  });
}); 