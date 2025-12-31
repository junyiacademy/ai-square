import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

// Helper to override env safely
const withEnv = (
  vars: Record<string, string>,
  fn: () => Promise<void> | void,
) => {
  const original = { ...process.env };
  Object.assign(process.env, vars);
  try {
    return fn();
  } finally {
    Object.assign(process.env, original);
  }
};

describe("production-monitor", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    (global as any).fetch = jest.fn(async () => ({ status: 200 }));
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as any).fetch = undefined;
  });

  it("is disabled in non-production (no intervals started)", async () => {
    await withEnv({ NODE_ENV: "test" }, async () => {
      await (async () => {
        await jest.isolateModulesAsync?.(async () => {
          // minimal mocks to satisfy imports
          jest.doMock("../performance-monitor", () => ({
            performanceMonitor: { getAllMetrics: jest.fn(() => []) },
          }));
          jest.doMock("@/lib/cache/distributed-cache-service", () => ({
            distributedCacheService: {
              getStats: jest.fn(async () => ({ hitRate: 0 })),
            },
          }));
          const mod =
            require("../production-monitor") as typeof import("../production-monitor");
          const status = mod.productionMonitor.getStatus();
          expect(status.enabled).toBe(false);
        });
      })();
    });
  });

  it("reports metrics every minute in production and logs summary", async () => {
    await withEnv({ NODE_ENV: "production" }, async () => {
      const logSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => undefined);
      await (async () => {
        await jest.isolateModulesAsync?.(async () => {
          jest.doMock("../performance-monitor", () => ({
            performanceMonitor: {
              getAllMetrics: jest.fn(() => [
                { averageResponseTime: 120, cacheHitRate: 80, errorRate: 2 },
                { averageResponseTime: 60, cacheHitRate: 60, errorRate: 4 },
              ]),
            },
          }));
          jest.doMock("@/lib/cache/distributed-cache-service", () => ({
            distributedCacheService: {
              getStats: jest.fn(async () => ({
                hitRate: 70,
                localCacheSize: 10,
              })),
            },
          }));
          require("../production-monitor");
          // advance 1 minute
          await jest.advanceTimersByTimeAsync(60 * 1000);
          await Promise.resolve();
          expect(logSpy).toHaveBeenCalled();
          const call = logSpy.mock.calls.find((c) =>
            String(c[0]).includes("Performance Metrics:"),
          );
          expect(call).toBeTruthy();
        });
      })();
      logSpy.mockRestore();
    });
  });

  it("triggers alerts on thresholds, applies cooldown, and sends webhook", async () => {
    await withEnv(
      {
        NODE_ENV: "production",
        ALERT_RESPONSE_TIME: "50",
        ALERT_ERROR_RATE: "1",
        ALERT_CACHE_HIT_RATE: "90",
        ALERT_WEBHOOK_URL: "https://example.com/webhook",
      },
      async () => {
        const errorSpy = jest
          .spyOn(console, "error")
          .mockImplementation(() => undefined);

        await (async () => {
          await jest.isolateModulesAsync?.(async () => {
            jest.doMock("../performance-monitor", () => ({
              performanceMonitor: {
                getAllMetrics: jest.fn(() => [
                  { averageResponseTime: 120, cacheHitRate: 80, errorRate: 3 },
                  { averageResponseTime: 60, cacheHitRate: 60, errorRate: 6 },
                ]),
              },
            }));
            jest.doMock("@/lib/cache/distributed-cache-service", () => ({
              distributedCacheService: {
                getStats: jest.fn(async () => ({
                  hitRate: 50,
                  redisStats: { redisConnected: false },
                  localCacheSize: 99,
                })),
              },
            }));

            require("../production-monitor");
            // first 30s tick → should send multiple alerts
            await jest.advanceTimersByTimeAsync(30 * 1000);
            await Promise.resolve();
            // At least one alert printed
            expect(errorSpy).toHaveBeenCalled();
            const alertCalls = errorSpy.mock.calls.filter((c) =>
              String(c[0]).includes("🚨 ALERT"),
            );
            expect(alertCalls.length).toBeGreaterThanOrEqual(3);
            // webhook called
            expect((global as any).fetch).toHaveBeenCalled();

            // next 30s within cooldown → no new alert types should be emitted (same count)
            const before = alertCalls.length;
            await jest.advanceTimersByTimeAsync(30 * 1000);
            await Promise.resolve();
            const after = errorSpy.mock.calls.filter((c) =>
              String(c[0]).includes("🚨 ALERT"),
            ).length;
            expect(after).toBe(before);

            // advance beyond cooldown (5m) and another 30s tick → alerts emitted again
            await jest.advanceTimersByTimeAsync(5 * 60 * 1000 + 30 * 1000);
            await Promise.resolve();
            const finalCount = errorSpy.mock.calls.filter((c) =>
              String(c[0]).includes("🚨 ALERT"),
            ).length;
            expect(finalCount).toBeGreaterThan(before);
          });
        })();

        errorSpy.mockRestore();
      },
    );
  });

  it("handles webhook send failures gracefully", async () => {
    await withEnv(
      {
        NODE_ENV: "production",
        ALERT_WEBHOOK_URL: "https://example.com/webhook",
      },
      async () => {
        (global as any).fetch = jest
          .fn()
          .mockImplementationOnce(() => Promise.reject("net-down"));
        const errorSpy = jest
          .spyOn(console, "error")
          .mockImplementation(() => undefined);

        await (async () => {
          await jest.isolateModulesAsync?.(async () => {
            jest.doMock("../performance-monitor", () => ({
              performanceMonitor: { getAllMetrics: jest.fn(() => []) },
            }));
            jest.doMock("@/lib/cache/distributed-cache-service", () => ({
              distributedCacheService: {
                getStats: jest.fn(async () => ({ hitRate: 100 })),
              },
            }));

            const mod =
              require("../production-monitor") as typeof import("../production-monitor");
            // call private sendAlert via type assertion to trigger webhook path
            (
              mod.productionMonitor as unknown as {
                sendAlert: (t: string, d: Record<string, unknown>) => void;
              }
            ).sendAlert("test", { a: 1 });
          });
        })();

        // should log webhook failure
        expect(errorSpy).toHaveBeenCalled();
        const logged = errorSpy.mock.calls.some((c) =>
          String(c[0]).includes("Failed to send webhook alert"),
        );
        expect(logged).toBe(true);
        errorSpy.mockRestore();
      },
    );
  });
});
