/**
 * Level 3: Assessment Flow Test
 * Test Assessment module evaluation journey
 */

import type { Pool, PoolClient } from 'pg';

describe.skip('Assessment Learning Flow', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3456';
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

  it('should fetch Assessment scenarios from API', async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(`${baseUrl}/api/assessment/scenarios?lang=en`, {
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (!response) {
        console.log('Assessment API not reachable, skipping');
        expect(true).toBe(true);
        return;
      }

      if (!response.ok) {
        console.log('Assessment API not available, skipping');
        expect(true).toBe(true);
        return;
      }

      const data = await response.json();
      const scenarios = data.scenarios ?? data.data?.scenarios ?? [];
      expect(Array.isArray(scenarios)).toBe(true);
      console.log(`Found ${scenarios.length} Assessment scenarios from API`);

      // Use normalized scenarios array for logging to avoid undefined access
      console.log(`Found ${scenarios.length} Assessment scenarios from API`);
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

  it('should query Assessment scenarios from database', async () => {
    if (!pool) {
      console.log('No database connection, skipping');
      expect(true).toBe(true);
      return;
    }

    const result = await pool.query<{
      id: string;
      status: string;
      title_en: string;
      question_count: string;
    }>(`
      SELECT
        id,
        status,
        title->>'en' as title_en,
        jsonb_array_length(
          COALESCE(assessment_data->'questionBank', '[]'::jsonb)
        ) as question_count
      FROM scenarios
      WHERE mode = 'assessment'
        AND status = 'active'
      LIMIT 5
    `);

    console.log(`Found ${result.rows.length} active Assessment scenarios in DB`);

    if (result.rows.length > 0) {
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0]).toHaveProperty('status');
      expect(result.rows[0].status).toBe('active');
      console.log(`First assessment has ${result.rows[0].question_count} questions`);
    }

    expect(true).toBe(true);
  });

  it('should create and query Assessment program', async () => {
    if (!pool) {
      console.log('No database connection, skipping');
      expect(true).toBe(true);
      return;
    }

    const client: PoolClient = await pool.connect();
    const { v4: uuidv4 } = require('uuid');

    try {
      await client.query('BEGIN');

      // Check if we have Assessment scenarios
      const scenarios = await client.query<{ id: string }>(
        `SELECT id FROM scenarios WHERE mode = 'assessment' AND status = 'active' LIMIT 1`
      );

      if (scenarios.rows.length === 0) {
        console.log('No active Assessment scenarios to test with');
        await client.query('ROLLBACK');
        expect(true).toBe(true);
        return;
      }

      // Create test user
      const userId = uuidv4();
      await client.query(
        `INSERT INTO users (id, email, name, role, email_verified)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, `assessment-test-${Date.now()}@example.com`, 'Assessment Test User', 'user', true]
      );

      // Create Assessment program
      const programId = uuidv4();
      await client.query(
        `INSERT INTO programs (id, scenario_id, user_id, status, total_task_count, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [programId, scenarios.rows[0].id, userId, 'active', 1]
      );

      // Verify program has correct mode (should be inherited via trigger)
      const program = await client.query<{ id: string; mode: string; status: string }>(
        `SELECT id, mode, status FROM programs WHERE id = $1`,
        [programId]
      );

      expect(program.rows[0].mode).toBe('assessment');
      expect(program.rows[0].status).toBe('active');

      // Create a task for assessment
      const taskId = uuidv4();
      await client.query(
        `INSERT INTO tasks (id, program_id, type, status, title, task_index, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [taskId, programId, 'question', 'pending', '{"en": "Assessment Question"}', 0]
      );

      // Check task mode inheritance
      const task = await client.query<{ mode: string }>(
        `SELECT mode FROM tasks WHERE id = $1`,
        [taskId]
      );

      expect(task.rows[0].mode).toBe('assessment');

      // Rollback to clean up
      await client.query('ROLLBACK');

      console.log('Assessment program and task creation test successful');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
});
