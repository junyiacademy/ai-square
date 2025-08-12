/**
 * Level 1: Basic API Health Test
 * Simple test to verify API endpoints are responding
 */

describe('Basic API Health', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  it('should respond to health check', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('healthy');
  });

  it('should respond to KSA endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/ksa?lang=en`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(true);
  });

  it('should respond to relations endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/relations?lang=en`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('domains');
    expect(Array.isArray(data.domains)).toBe(true);
  });

  it('should handle 404 properly', async () => {
    const response = await fetch(`${baseUrl}/api/non-existent-endpoint`);
    expect(response.status).toBe(404);
  });
});