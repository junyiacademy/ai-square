/**
 * Simplified Load Testing
 * Focus on basic concurrent request handling
 */

describe('Simple Load Testing', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3456';

  it('should handle 5 concurrent requests', async () => {
    const requests = Array(5).fill(null).map(() =>
      fetch(`${baseUrl}/api/monitoring/health`)
    );

    const results = await Promise.allSettled(requests);

    const successful = results.filter(r =>
      r.status === 'fulfilled' && r.value.ok
    );

    expect(successful.length).toBeGreaterThanOrEqual(4); // Allow 1 failure
  });

  it('should handle concurrent API calls', async () => {
    const endpoints = [
      '/api/ksa?lang=en',
      '/api/relations?lang=en',
      '/api/pbl/scenarios?lang=en',
      '/api/assessment/scenarios?lang=en',
      '/api/discovery/scenarios?lang=en'
    ];

    const requests = endpoints.map(endpoint =>
      fetch(`${baseUrl}${endpoint}`)
    );

    const results = await Promise.allSettled(requests);

    const successful = results.filter(r =>
      r.status === 'fulfilled' && r.value.ok
    );

    // At least 80% should succeed
    expect(successful.length).toBeGreaterThanOrEqual(4);
  });

  it('should maintain reasonable response times under load', async () => {
    const times: number[] = [];

    // Make 10 sequential requests
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      const response = await fetch(`${baseUrl}/api/monitoring/health`);
      const time = Date.now() - start;

      expect(response.ok).toBe(true);
      times.push(time);
    }

    // Calculate average
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);

    console.log(`Average: ${avg.toFixed(0)}ms, Max: ${max}ms`);

    // Average should be under 500ms
    expect(avg).toBeLessThan(500);
    // Max should be under 2 seconds
    expect(max).toBeLessThan(2000);
  });
});
