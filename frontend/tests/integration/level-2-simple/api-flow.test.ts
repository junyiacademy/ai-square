/**
 * Level 2: Basic API Flow Test
 * Simple API workflow tests
 */

describe('Basic API Flow', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3456';

  // Helper function to create timeout
  function createTimeout(ms: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    return { controller, timeout };
  }

  it('should list PBL scenarios', async () => {
    const { controller, timeout } = createTimeout(5000);
    
    try {
      const response = await fetch(`${baseUrl}/api/pbl/scenarios?lang=en`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('scenarios');
      expect(Array.isArray(data.data.scenarios)).toBe(true);
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 5 seconds');
      }
      throw error;
    }
  });

  it('should list assessment scenarios', async () => {
    const { controller, timeout } = createTimeout(5000);
    
    try {
      const response = await fetch(`${baseUrl}/api/assessment/scenarios?lang=en`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('scenarios');
      expect(Array.isArray(data.scenarios)).toBe(true);
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 5 seconds');
      }
      throw error;
    }
  });

  it('should list discovery scenarios', async () => {
    const { controller, timeout } = createTimeout(5000);
    
    try {
      const response = await fetch(`${baseUrl}/api/discovery/scenarios?lang=en`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('scenarios');
      expect(Array.isArray(data.scenarios)).toBe(true);
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 5 seconds');
      }
      throw error;
    }
  });

  it('should handle different languages', async () => {
    const languages = ['en', 'zh', 'es'];
    
    for (const lang of languages) {
      const { controller, timeout } = createTimeout(5000);
      
      try {
        const response = await fetch(`${baseUrl}/api/ksa?lang=${lang}`, {
          signal: controller.signal
        });
        clearTimeout(timeout);
        expect(response.ok).toBe(true);
        
        const data = await response.json();
        // Fix: KSA endpoint doesn't have 'success' property
        expect(data).toHaveProperty('knowledge_codes');
        expect(data).toHaveProperty('skill_codes');
        expect(data).toHaveProperty('attitude_codes');
      } catch (error: any) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out after 5 seconds');
        }
        throw error;
      }
    }
  });

  it('should handle invalid scenario ID', async () => {
    const { controller, timeout } = createTimeout(5000);
    
    try {
      const response = await fetch(`${baseUrl}/api/pbl/scenarios/invalid-id`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      // Should return error
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 5 seconds');
      }
      throw error;
    }
  });

  it('should require authentication for protected routes', async () => {
    const { controller, timeout } = createTimeout(5000);
    
    try {
      // Try to start a program without auth
      const response = await fetch(`${baseUrl}/api/pbl/scenarios/test-id/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      // Should return 401 or 403
      expect([401, 403]).toContain(response.status);
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 5 seconds');
      }
      throw error;
    }
  });
});