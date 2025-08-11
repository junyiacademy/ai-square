import { jest } from '@jest/globals';

describe('distributed-cache-service key prefix and onStatus', () => {
  const loadSvc = () => {
    jest.resetModules();
    process.env.CACHE_KEY_PREFIX = 'pref';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../distributed-cache-service');
    return mod.distributedCacheService as unknown as {
      set: (k: string, v: unknown, o?: { ttl?: number }) => Promise<void>;
      getWithRevalidation: <T>(k: string, f: () => Promise<T>, o?: { ttl?: number; onStatus?: (s: 'HIT'|'MISS'|'STALE') => void }) => Promise<T>;
      clear: () => Promise<void>;
    };
  };

  it('reports MISS then HIT with key prefix applied', async () => {
    const svc = loadSvc();
    await svc.clear();

    const statuses: string[] = [];
    const fetcher = async () => ({ x: 1 });

    const v1 = await svc.getWithRevalidation('k', fetcher, { ttl: 50, onStatus: (s) => statuses.push(s) });
    expect(v1).toEqual({ x: 1 });
    expect(statuses[0]).toBe('MISS');

    const v2 = await svc.getWithRevalidation('k', fetcher, { ttl: 50, onStatus: (s) => statuses.push(s) });
    expect(v2).toEqual({ x: 1 });
    expect(statuses[1]).toBe('HIT');
  });
}); 