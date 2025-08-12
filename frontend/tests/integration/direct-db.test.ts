import { Pool } from 'pg';

/**
 * Direct Database Test
 * Tests database connection without the test environment wrapper
 */

describe('Direct Database Connection', () => {
  let pool: Pool;
  
  beforeAll(async () => {
    // Create a direct connection to the test database
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5434'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 10,
    });
    
    // Test the connection
    try {
      const client = await pool.connect();
      console.log('Direct connection established');
      const result = await client.query('SELECT 1 + 1 as sum');
      console.log('Direct query result:', result.rows);
      client.release();
    } catch (error) {
      console.error('Direct connection error:', error);
    }
  });
  
  afterAll(async () => {
    await pool.end();
  });
  
  it('should perform basic math query', async () => {
    const result = await pool.query('SELECT 2 + 2 as sum');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].sum).toBe(4);
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
});