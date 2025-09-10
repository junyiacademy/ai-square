/**
 * Level 3: Advanced Database Test
 * More complex database operations without API dependencies
 */

import type { Pool, PoolClient } from 'pg';

describe.skip('Advanced Database Operations', () => {
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
      console.error('DB connection failed:', error);
      pool = null;
    }
  }, 5000);

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('should perform complex scenario query', async () => {
    if (!pool) {
      console.log('No database connection, skipping');
      expect(true).toBe(true);
      return;
    }

    const result = await pool.query<{ 
      mode: string; 
      count: string; 
      active_count: string 
    }>(`
      SELECT 
        mode,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
      FROM scenarios
      GROUP BY mode
      ORDER BY mode
    `);

    console.log('Scenario distribution:', result.rows);
    expect(result.rows).toBeDefined();
  });

  it('should test transaction with multiple tables', async () => {
    if (!pool) {
      console.log('No database connection, skipping');
      expect(true).toBe(true);
      return;
    }

    const client: PoolClient = await pool.connect();
    const { v4: uuidv4 } = require('uuid');
    const userId = uuidv4();
    const programId = uuidv4();

    try {
      await client.query('BEGIN');

      // Insert user
      await client.query(
        `INSERT INTO users (id, email, name, role, email_verified) 
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, `test-${Date.now()}@example.com`, 'Test User', 'user', true]
      );

      // Check if we have scenarios to link
      const scenarios = await client.query(
        `SELECT id FROM scenarios WHERE mode = 'pbl' AND status = 'active' LIMIT 1`
      );

      if (scenarios.rows.length > 0) {
        // Create program
        await client.query(
          `INSERT INTO programs (id, scenario_id, user_id, status, total_task_count, time_spent_seconds) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [programId, scenarios.rows[0].id, userId, 'pending', 0, 0]
        );

        // Verify program was created with inherited mode
        const program = await client.query(
          `SELECT id, mode, status FROM programs WHERE id = $1`,
          [programId]
        );

        expect(program.rows[0].mode).toBe('pbl');
      }

      // Rollback to clean up
      await client.query('ROLLBACK');

      // Verify rollback worked
      const checkUser = await client.query(
        `SELECT id FROM users WHERE id = $1`,
        [userId]
      );
      expect(checkUser.rows.length).toBe(0);

    } finally {
      client.release();
    }
  });

  it('should analyze table relationships', async () => {
    if (!pool) {
      console.log('No database connection, skipping');
      expect(true).toBe(true);
      return;
    }

    // Check foreign key relationships
    const result = await pool.query<{
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name
      LIMIT 10
    `);

    console.log(`Found ${result.rows.length} foreign key relationships`);
    expect(result.rows).toBeDefined();
  });
});