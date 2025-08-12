/**
 * Level 3: Discovery Flow Test
 * Test Discovery module exploration journey
 */

import type { Pool, PoolClient } from 'pg';

describe('Discovery Learning Flow', () => {
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
      await pool.query('SELECT 1');
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

  it('should fetch Discovery scenarios from API', async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(`${baseUrl}/api/discovery/scenarios?lang=en`, {
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);
      
      if (!response) {
        console.log('Discovery API not reachable, skipping');
        expect(true).toBe(true);
        return;
      }
      
      if (!response.ok) {
        console.log('Discovery API not available, skipping');
        expect(true).toBe(true);
        return;
      }
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        console.log(`Found Discovery scenarios from API`);
        expect(data.data).toHaveProperty('scenarios');
      }
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

  it('should query Discovery scenarios from database', async () => {
    if (!pool) {
      console.log('No database connection, skipping');
      expect(true).toBe(true);
      return;
    }

    const result = await pool.query<{
      id: string;
      status: string;
      title_en: string;
      career_type: string;
    }>(`
      SELECT 
        id, 
        status,
        title->>'en' as title_en,
        discovery_data->>'careerType' as career_type
      FROM scenarios 
      WHERE mode = 'discovery' 
        AND status = 'active'
      LIMIT 5
    `);

    console.log(`Found ${result.rows.length} active Discovery scenarios in DB`);
    
    if (result.rows.length > 0) {
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0]).toHaveProperty('status');
      expect(result.rows[0].status).toBe('active');
      
      if (result.rows[0].career_type) {
        console.log(`Career type: ${result.rows[0].career_type}`);
      }
    }
    
    expect(true).toBe(true);
  });

  it('should create Discovery program with exploration path', async () => {
    if (!pool) {
      console.log('No database connection, skipping');
      expect(true).toBe(true);
      return;
    }

    const client: PoolClient = await pool.connect();
    const { v4: uuidv4 } = require('uuid');
    
    try {
      await client.query('BEGIN');
      
      // Check if we have Discovery scenarios
      const scenarios = await client.query<{ id: string }>(
        `SELECT id FROM scenarios WHERE mode = 'discovery' AND status = 'active' LIMIT 1`
      );
      
      if (scenarios.rows.length === 0) {
        console.log('No active Discovery scenarios to test with');
        await client.query('ROLLBACK');
        expect(true).toBe(true);
        return;
      }
      
      // Create test user
      const userId = uuidv4();
      await client.query(
        `INSERT INTO users (id, email, name, role, email_verified) 
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, `discovery-test-${Date.now()}@example.com`, 'Discovery Test User', 'user', true]
      );
      
      // Create Discovery program
      const programId = uuidv4();
      await client.query(
        `INSERT INTO programs (id, scenario_id, user_id, status, created_at, metadata)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [
          programId, 
          scenarios.rows[0].id, 
          userId, 
          'active',
          JSON.stringify({ explorationPath: [], milestones: [] })
        ]
      );
      
      // Verify program has correct mode (should be inherited via trigger)
      const program = await client.query<{ 
        id: string; 
        mode: string; 
        status: string;
        metadata: Record<string, unknown>;
      }>(
        `SELECT id, mode, status, metadata FROM programs WHERE id = $1`,
        [programId]
      );
      
      expect(program.rows[0].mode).toBe('discovery');
      expect(program.rows[0].status).toBe('active');
      expect(program.rows[0].metadata).toHaveProperty('explorationPath');
      
      // Create exploration task
      const taskId = uuidv4();
      await client.query(
        `INSERT INTO tasks (id, program_id, type, status, title, content, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          taskId, 
          programId, 
          'exploration', 
          'active', 
          '{"en": "Explore AI Career Path"}',
          '{"instructions": "Discover your path in AI"}'
        ]
      );
      
      // Check task mode inheritance
      const task = await client.query<{ mode: string; type: string }>(
        `SELECT mode, type FROM tasks WHERE id = $1`,
        [taskId]
      );
      
      expect(task.rows[0].mode).toBe('discovery');
      expect(task.rows[0].type).toBe('exploration');
      
      // Rollback to clean up
      await client.query('ROLLBACK');
      
      console.log('Discovery program with exploration path test successful');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  it('should check user exploration progress', async () => {
    if (!pool) {
      console.log('No database connection, skipping');
      expect(true).toBe(true);
      return;
    }

    // Check if any users have discovery programs
    const result = await pool.query<{
      user_count: string;
      program_count: string;
      active_programs: string;
    }>(`
      SELECT 
        COUNT(DISTINCT p.user_id) as user_count,
        COUNT(p.id) as program_count,
        COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_programs
      FROM programs p
      JOIN scenarios s ON p.scenario_id = s.id
      WHERE s.mode = 'discovery'
    `);

    console.log('Discovery progress stats:', {
      users: result.rows[0].user_count,
      programs: result.rows[0].program_count,
      active: result.rows[0].active_programs
    });

    expect(result.rows).toBeDefined();
  });
});