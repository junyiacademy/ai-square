#!/usr/bin/env node
 
import 'dotenv/config';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

async function createTestUser() {
  console.log('Creating test user...');
  
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create user
    const result = await pool.query(`
      INSERT INTO users (email, name, password, preferred_language, onboarding_completed, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET 
        password = $3,
        name = $2,
        updated_at = NOW()
      RETURNING id, email
    `, ['test@example.com', 'Test User', hashedPassword, 'en', true, 'student']);
    
    console.log('✅ Test user created/updated:', result.rows[0]);
    
  } catch (_error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();