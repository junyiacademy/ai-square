/**
 * Basic Database Integration Test
 * Tests direct database connectivity without mocks
 */

// MUST unmock pg first before importing
jest.unmock('pg');
jest.unmock('pg-pool');

import { Pool } from 'pg';

describe('Basic Database Integration', () => {
  let pool: Pool;
  
  beforeAll(() => {
    // Create direct database connection
    pool = new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5434'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 1,
    });
  });
  
  afterAll(async () => {
    await pool.end();
  });
  
  it('should connect to database', async () => {
    const client = await pool.connect();
    expect(client).toBeDefined();
    client.release();
  });
  
  it('should perform basic query', async () => {
    const result = await pool.query('SELECT 1 + 1 as sum');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].sum).toBe(2);
  });
  
  it('should query database version', async () => {
    const result = await pool.query('SELECT version()');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].version).toContain('PostgreSQL');
  });
  
  it('should list tables', async () => {
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
      LIMIT 5
    `);
    expect(result.rows.length).toBeGreaterThan(0);
    console.log('Tables found:', result.rows.map(r => r.tablename));
  });
  
  it('should check scenarios table exists', async () => {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'scenarios'
    `);
    expect(result.rows[0].count).toBe('1');
  });
  
  it('should insert and query test data', async () => {
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert test user
      const insertResult = await client.query(
        `INSERT INTO users (email, password_hash, name, email_verified) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, email`,
        ['test-integration@example.com', 'hash', 'Test User', true]
      );
      
      expect(insertResult.rows).toHaveLength(1);
      const userId = insertResult.rows[0].id;
      
      // Query the inserted user
      const selectResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      expect(selectResult.rows).toHaveLength(1);
      expect(selectResult.rows[0].email).toBe('test-integration@example.com');
      
      // Rollback to keep database clean
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});