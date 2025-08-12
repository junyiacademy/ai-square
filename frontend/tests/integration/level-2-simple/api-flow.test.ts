/**
 * Level 2: Basic API Flow Test
 * Simple API workflow tests
 */

describe('Basic API Flow', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  it('should list PBL scenarios', async () => {
    const response = await fetch(`${baseUrl}/api/pbl/scenarios?lang=en`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('scenarios');
    expect(Array.isArray(data.data.scenarios)).toBe(true);
  });

  it('should list assessment scenarios', async () => {
    const response = await fetch(`${baseUrl}/api/assessment/scenarios?lang=en`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('scenarios');
    expect(Array.isArray(data.scenarios)).toBe(true);
  });

  it('should list discovery scenarios', async () => {
    const response = await fetch(`${baseUrl}/api/discovery/scenarios?lang=en`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('scenarios');
    expect(Array.isArray(data.scenarios)).toBe(true);
  });

  it('should handle different languages', async () => {
    const languages = ['en', 'zh', 'es'];
    
    for (const lang of languages) {
      const response = await fetch(`${baseUrl}/api/ksa?lang=${lang}`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
    }
  });

  it('should handle invalid scenario ID', async () => {
    const response = await fetch(`${baseUrl}/api/pbl/scenarios/invalid-id`);
    
    // Should return error
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it('should require authentication for protected routes', async () => {
    // Try to start a program without auth
    const response = await fetch(`${baseUrl}/api/pbl/scenarios/test-id/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    // Should return 401 or 403
    expect([401, 403]).toContain(response.status);
  });
});