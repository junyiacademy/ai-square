import { jest } from "@jest/globals";

describe("redis-cache-service fallback cleanup and stats", () => {
  it("evicts expired items and limits fallback size; stats returns shape", async () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../redis-cache-service");
    const svc = mod.redisCacheService as unknown as {
      set: (k: string, v: unknown, o?: { ttl?: number }) => Promise<void>;
      get: <T>(k: string) => Promise<T | null>;
      getStats: () => Promise<{
        redisConnected: boolean;
        fallbackCacheSize: number;
        redisInfo?: string;
      }>;
      clear: () => Promise<void>;
    };

    await svc.clear();

    // add short ttl entries then wait
    await svc.set("e1", 1, { ttl: 10 });
    await svc.set("e2", 2, { ttl: 10 });

    // force some operations so cleanup runs in code paths
    // after ttl, get should return null and internal cleanup will prune
    await new Promise((r) => setTimeout(r, 25));
    const v1 = await svc.get("e1");
    const v2 = await svc.get("e2");
    expect(v1).toBeNull();
    expect(v2).toBeNull();

    // Fill more than MAX_FALLBACK_SIZE (1000) to trigger size cleanup
    const total = 1100; // keep above 1000 but not too large
    for (let i = 0; i < total; i++) {
      await svc.set(`k-${i}`, i, { ttl: 1_000 });
    }

    const stats = await svc.getStats();
    expect(stats.fallbackCacheSize).toBeLessThanOrEqual(1000);
    expect(typeof stats.redisConnected).toBe("boolean");
  }, 15000);
});
