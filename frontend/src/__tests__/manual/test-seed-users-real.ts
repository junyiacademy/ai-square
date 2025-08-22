#!/usr/bin/env npx tsx
/**
 * Manual test for seed-users API with real database
 * Run: npx tsx src/__tests__/manual/test-seed-users-real.ts
 */

import { Pool } from 'pg';

async function testRealDatabase() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    database: 'ai_square_db',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    console.log('🔍 Testing real database connection...');
    const connectResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected:', connectResult.rows[0].now);

    // Test current INSERT (with all fields)
    console.log('\n🔍 Testing INSERT with all fields...');
    const testEmail = `test-all-fields-${Date.now()}@example.com`;
    
    try {
      await pool.query(
        `INSERT INTO users (
          id, email, password_hash, name, role, 
          email_verified, metadata, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, 
          $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`,
        [testEmail, 'hash123', 'Test User', 'student', true, '{}']
      );
      console.log('✅ INSERT with all fields succeeded');
      
      // Clean up
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    } catch (error: any) {
      console.error('❌ INSERT with all fields failed:', error.message);
    }

    // Test minimal INSERT (relying on defaults)
    console.log('\n🔍 Testing INSERT with minimal fields...');
    const testEmail2 = `test-minimal-${Date.now()}@example.com`;
    
    try {
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role, email_verified)
         VALUES ($1, $2, $3, $4, $5)`,
        [testEmail2, 'hash123', 'Test User', 'student', true]
      );
      console.log('✅ INSERT with minimal fields succeeded (defaults work!)');
      
      // Check what was inserted
      const result = await pool.query(
        'SELECT id, created_at, updated_at FROM users WHERE email = $1',
        [testEmail2]
      );
      console.log('  - id:', result.rows[0].id);
      console.log('  - created_at:', result.rows[0].created_at);
      console.log('  - updated_at:', result.rows[0].updated_at);
      
      // Clean up
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail2]);
    } catch (error: any) {
      console.error('❌ INSERT with minimal fields failed:', error.message);
      console.log('   This means database defaults are not set up correctly');
    }

    // Check if gen_random_uuid() is available
    console.log('\n🔍 Testing gen_random_uuid()...');
    try {
      const uuidResult = await pool.query('SELECT gen_random_uuid()');
      console.log('✅ gen_random_uuid() works:', uuidResult.rows[0].gen_random_uuid);
    } catch (error: any) {
      console.error('❌ gen_random_uuid() failed:', error.message);
      console.log('   Try running: CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    }

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testRealDatabase().catch(console.error);