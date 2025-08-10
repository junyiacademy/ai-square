import { withPerformanceTracking, performanceMonitor, getPerformanceReport } from '../performance-monitor';

describe('performance-monitor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    performanceMonitor.clearMetrics();
  });

  afterEach(() => {
    jest.useRealTimers();
    performanceMonitor.clearMetrics();
  });

  it('records success metric via withPerformanceTracking', async () => {
    const result = await withPerformanceTracking(async () => ({ cacheHit: true }), '/api/test', 'GET', 'u1');
    expect(result).toEqual({ cacheHit: true });
    const recent = performanceMonitor.getRecentMetrics(10);
    expect(recent.length).toBeGreaterThan(0);
    const last = recent[recent.length - 1];
    expect(last.endpoint).toBe('/api/test');
    expect(last.cacheHit).toBe(true);
    expect(last.statusCode).toBe(200);
  });

  it('records error metric via withPerformanceTracking (and rethrows)', async () => {
    await expect(withPerformanceTracking(async () => { throw new Error('boom'); }, '/api/fail', 'GET', 'u2')).rejects.toThrow('boom');
    const recent = performanceMonitor.getRecentMetrics(10);
    const last = recent[recent.length - 1];
    expect(last.endpoint).toBe('/api/fail');
    expect(last.statusCode).toBe(500);
    expect(last.errorMessage).toBe('boom');
  });

  it('getPerformanceReport returns summary and alerts arrays', async () => {
    await withPerformanceTracking(async () => ({ cacheHit: false }), '/api/a', 'GET');
    const report = getPerformanceReport();
    expect(report.summary.totalEndpoints).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(report.endpoints)).toBe(true);
    expect(Array.isArray(report.alerts)).toBe(true);
  });
});