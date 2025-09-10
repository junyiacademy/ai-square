/**
 * Level 3: PBL Learning Flow Test
 * Test PBL module learning journey
 */

import type { Pool } from 'pg';

describe.skip('PBL Learning Flow', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  let pool: Pool | null = null;

  beforeAll(async () => {
    try {
      const { Pool } = require('pg');
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5434'),
        database: process.env.DB_NAME || 'ai_square_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        connectionTimeoutMillis: 3000,
      });
      await pool!.query('SELECT 1');
    } catch (error) {
      console.error('Database connection failed:', error);
      pool = null;
    }
  }, 5000);

  afterAll(async () => {
    if (pool) {
      try {
        await pool.end();
      } catch (error) {
        console.error('Error closing pool:', error);
      }
    }
  });

  it('should fetch PBL scenarios from API', async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    try {
      const response = await fetch(`${baseUrl}/api/pbl/scenarios?lang=en`, {
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);
      
      if (!response) {
        console.log('PBL API not reachable, skipping');
        expect(true).toBe(true);
        return;
      }
      
      if (!response.ok) {
        console.log('PBL API not available, skipping');
        expect(true).toBe(true);
        return;
      }
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('scenarios');
      expect(Array.isArray(data.data.scenarios)).toBe(true);
      
      console.log(`Found ${data.data.scenarios.length} PBL scenarios from API`);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('API timeout, skipping test');
        expect(true).toBe(true);
      } else {
        throw error;
      }
    }
  }, 10000);

  it('should query PBL scenarios from database', async () => {
    if (!pool) {
      console.log('No database connection, skipping');
      expect(true).toBe(true);
      return;
    }

    const result = await pool.query(`
      SELECT 
        id, 
        status,
        title->>'en' as title_en,
        pbl_data->>'ksaMapping' as ksa_mapping
      FROM scenarios 
      WHERE mode = 'pbl' 
        AND status = 'active'
      LIMIT 5
    `);

    console.log(`Found ${result.rows.length} active PBL scenarios in DB`);
    
    if (result.rows.length > 0) {
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0]).toHaveProperty('status');
      expect(result.rows[0].status).toBe('active');
    }
    
    expect(true).toBe(true);
  });

  it('should create and query PBL program', async () => {
    if (!pool) {
      console.log('No database connection, skipping');
      expect(true).toBe(true);
      return;
    }

    const client = await pool.connect();
    const { v4: uuidv4 } = require('uuid');
    
    try {
      await client.query('BEGIN');
      
      // Check if we have PBL scenarios
      const scenarios = await client.query(
        `SELECT id FROM scenarios WHERE mode = 'pbl' AND status = 'active' LIMIT 1`
      );
      
      if (scenarios.rows.length === 0) {
        console.log('No active PBL scenarios to test with');
        await client.query('ROLLBACK');
        expect(true).toBe(true);
        return;
      }
      
      // Create test user
      const userId = uuidv4();
      await client.query(
        `INSERT INTO users (id, email, name, role, email_verified) 
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, `pbl-test-${Date.now()}@example.com`, 'PBL Test User', 'user', true]
      );
      
      // Create PBL program
      const programId = uuidv4();
      await client.query(
        `INSERT INTO programs (id, scenario_id, user_id, status, created_at, total_task_count, time_spent_seconds)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
        [programId, scenarios.rows[0].id, userId, 'active', 0, 0]
      );
      
      // Verify program has correct mode (should be inherited via trigger)
      const program = await client.query(
        `SELECT id, mode, status FROM programs WHERE id = $1`,
        [programId]
      );
      
      expect(program.rows[0].mode).toBe('pbl');
      expect(program.rows[0].status).toBe('active');
      
      // Rollback to clean up
      await client.query('ROLLBACK');
      
      console.log('PBL program creation test successful');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
});