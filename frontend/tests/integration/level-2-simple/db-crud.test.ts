/**
 * Level 2: Basic Database CRUD Test
 * Simple database operations tests
 */

describe.skip('Basic Database CRUD', () => {
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

  it('should insert and query test data', async () => {
    const { v4: uuidv4 } = require('uuid');
    const testId = uuidv4();
    const testEmail = `test-${Date.now()}@example.com`;

    // Insert test user
    const insertResult = await pool.query(
      `INSERT INTO users (id, email, name, role, email_verified, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id, email`,
      [testId, testEmail, 'Test User', 'user', true]
    );

    expect(insertResult.rows[0].id).toBe(testId);
    expect(insertResult.rows[0].email).toBe(testEmail);

    // Query the user
    const queryResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [testId]
    );

    expect(queryResult.rows.length).toBe(1);
    expect(queryResult.rows[0].email).toBe(testEmail);

    // Clean up
    await pool.query('DELETE FROM users WHERE id = $1', [testId]);
  });

  it('should handle transactions', async () => {
    const { v4: uuidv4 } = require('uuid');
    const client = await pool.connect();
    const testId = uuidv4();

    try {
      await client.query('BEGIN');

      // Insert in transaction
      await client.query(
        `INSERT INTO users (id, email, name, role, email_verified) 
         VALUES ($1, $2, $3, $4, $5)`,
        [testId, `test-tx-${Date.now()}@example.com`, 'TX Test', 'user', true]
      );

      // Verify exists in transaction
      const result = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [testId]
      );
      expect(result.rows.length).toBe(1);

      // Rollback
      await client.query('ROLLBACK');

      // Verify doesn't exist after rollback
      const afterRollback = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [testId]
      );
      expect(afterRollback.rows.length).toBe(0);
    } finally {
      client.release();
    }
  });

  it('should query scenarios', async () => {
    const result = await pool.query(
      `SELECT id, mode, status 
       FROM scenarios 
       WHERE status = 'active' 
       LIMIT 5`
    );

    // Should have some scenarios (or none if empty DB)
    expect(Array.isArray(result.rows)).toBe(true);
    
    if (result.rows.length > 0) {
      // Check structure
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0]).toHaveProperty('mode');
      expect(result.rows[0]).toHaveProperty('status');
    }
  });

  it('should handle JSON fields', async () => {
    const { v4: uuidv4 } = require('uuid');
    const testId = uuidv4();
    const testData = {
      title: { en: 'Test Title', zh: '測試標題' },
      description: { en: 'Test Description', zh: '測試描述' },
      pbl_data: {
        ksaMapping: {
          knowledge: ['K1', 'K2'],
          skills: ['S1'],
          attitudes: ['A1']
        }
      }
    };

    // Insert with JSONB - include required fields for PBL mode
    await pool.query(
      `INSERT INTO scenarios (id, mode, status, source_type, title, description, pbl_data) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [testId, 'pbl', 'draft', 'yaml', testData.title, testData.description, testData.pbl_data]
    );

    // Query JSONB
    const result = await pool.query(
      'SELECT title, description FROM scenarios WHERE id = $1',
      [testId]
    );

    expect(result.rows[0].title).toEqual(testData.title);
    expect(result.rows[0].description).toEqual(testData.description);

    // Query specific JSON field
    const jsonQuery = await pool.query(
      `SELECT title->>'en' as title_en FROM scenarios WHERE id = $1`,
      [testId]
    );
    expect(jsonQuery.rows[0].title_en).toBe('Test Title');

    // Clean up
    await pool.query('DELETE FROM scenarios WHERE id = $1', [testId]);
  });
});