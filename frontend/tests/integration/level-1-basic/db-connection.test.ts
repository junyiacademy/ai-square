/**
 * Level 1: Basic Database Connection Test
 * Simple test to verify database connectivity
 */

describe.skip('Basic Database Connection', () => {
  it('should connect to PostgreSQL', async () => {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5434'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    try {
      const client = await pool.connect();
      const result = await client.query('SELECT 1 as connected');
      client.release();
      
      expect(result.rows[0].connected).toBe(1);
    } finally {
      await pool.end();
    }
  });

  it('should query database version', async () => {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5434'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    try {
      const result = await pool.query('SELECT version()');
      expect(result.rows[0].version).toContain('PostgreSQL');
    } finally {
      await pool.end();
    }
  });

  it('should list basic tables', async () => {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5434'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    try {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      const tables = result.rows.map((row: any) => row.table_name);
      
      // Check core tables exist
      expect(tables).toContain('users');
      expect(tables).toContain('scenarios');
      expect(tables).toContain('programs');
      expect(tables).toContain('tasks');
    } finally {
      await pool.end();
    }
  });
});