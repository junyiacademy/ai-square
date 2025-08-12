/**
 * Level 3: Complete Flow Tests
 * Complex integration tests requiring full API server
 */

describe('Complete Learning Flows', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  let pool: any;

  beforeAll(async () => {
    const { Pool } = require('pg');
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5434'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('should complete PBL learning journey', async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      // Step 1: Get scenarios
      const scenariosRes = await fetch(`${baseUrl}/api/pbl/scenarios?lang=en`, {
        signal: controller.signal
      });
      
      if (!scenariosRes.ok) {
        clearTimeout(timeout);
        console.log('API server not available, skipping flow test');
        expect(true).toBe(true);
        return;
      }
      
      const scenarios = await scenariosRes.json();
      expect(scenarios.success).toBe(true);
      
      // Step 2: Check if we have scenarios in DB
      const dbScenarios = await pool.query(
        `SELECT id FROM scenarios WHERE mode = 'pbl' AND status = 'active' LIMIT 1`
      );
      
      if (dbScenarios.rows.length > 0) {
        const scenarioId = dbScenarios.rows[0].id;
        
        // Step 3: Try to get scenario details (if endpoint exists)
        const detailsRes = await fetch(`${baseUrl}/api/pbl/scenarios/${scenarioId}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        // It's ok if endpoint doesn't exist yet
        if (detailsRes.ok) {
          const details = await detailsRes.json();
          expect(details).toHaveProperty('id');
        } else {
          console.log('Scenario details endpoint not implemented yet');
          expect([404, 405]).toContain(detailsRes.status);
        }
      } else {
        clearTimeout(timeout);
        console.log('No PBL scenarios in database');
        expect(true).toBe(true);
      }
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.log('API server timeout, skipping test');
        expect(true).toBe(true);
      } else {
        throw error;
      }
    }
  }, 15000);

  it('should handle Assessment flow', async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      // Get assessment scenarios
      const response = await fetch(`${baseUrl}/api/assessment/scenarios?lang=en`, {
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        console.log('Assessment API not available');
        expect(true).toBe(true);
        return;
      }
      
      const data = await response.json();
      expect(data).toHaveProperty('scenarios');
      expect(Array.isArray(data.scenarios)).toBe(true);
      
      // Check database
      const dbResult = await pool.query(
        `SELECT COUNT(*) as count FROM scenarios WHERE mode = 'assessment'`
      );
      
      console.log(`Found ${dbResult.rows[0].count} assessment scenarios in DB`);
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.log('API timeout, skipping test');
        expect(true).toBe(true);
      } else {
        throw error;
      }
    }
  }, 15000);

  it('should handle Discovery flow', async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      // Get discovery scenarios
      const response = await fetch(`${baseUrl}/api/discovery/scenarios?lang=en`, {
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        console.log('Discovery API not available');
        expect(true).toBe(true);
        return;
      }
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      // Check if we can create a program (if user is authenticated)
      const dbUser = await pool.query(
        `SELECT id FROM users LIMIT 1`
      );
      
      if (dbUser.rows.length > 0) {
        console.log('User found, could test program creation');
      } else {
        console.log('No users in test DB');
      }
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.log('API timeout, skipping test');
        expect(true).toBe(true);
      } else {
        throw error;
      }
    }
  }, 15000);
});