#!/usr/bin/env tsx

/**
 * Create demo users in staging database
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.staging') });
config({ path: path.join(process.cwd(), '.env.staging.local'), override: true });

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_staging',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'staging2025',
});

const demoUsers = [
  {
    email: 'demo@example.com',
    name: 'Demo User',
    preferred_language: 'en',
    level: 1,
    total_xp: 0,
    onboarding_completed: true,
    metadata: {
      role: 'demo',
      description: 'Demo account for testing'
    }
  },
  {
    email: 'student@example.com',
    name: 'Student User',
    preferred_language: 'en',
    level: 1,
    total_xp: 0,
    onboarding_completed: false,
    metadata: {
      role: 'student',
      description: 'Student demo account'
    }
  },
  {
    email: 'teacher@example.com',
    name: 'Teacher User',
    preferred_language: 'en',
    level: 5,
    total_xp: 500,
    onboarding_completed: true,
    metadata: {
      role: 'teacher',
      description: 'Teacher demo account'
    }
  },
  {
    email: 'test@example.com',
    name: 'Test User',
    preferred_language: 'zh',
    level: 3,
    total_xp: 250,
    onboarding_completed: true,
    metadata: {
      role: 'test',
      description: 'Test account for development'
    }
  }
];

async function main() {
  console.log('🚀 Creating Demo Users');
  console.log('=====================');
  console.log('Database:', process.env.DB_NAME);
  console.log('');

  try {
    let created = 0;
    let updated = 0;
    
    for (const user of demoUsers) {
      // Check if user exists
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );
      
      if (existing.rows.length > 0) {
        // Update existing user
        await pool.query(`
          UPDATE users SET
            name = $2,
            preferred_language = $3,
            level = $4,
            total_xp = $5,
            onboarding_completed = $6,
            metadata = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE email = $1
        `, [
          user.email,
          user.name,
          user.preferred_language,
          user.level,
          user.total_xp,
          user.onboarding_completed,
          JSON.stringify(user.metadata)
        ]);
        
        console.log(`  ✅ Updated: ${user.email}`);
        updated++;
      } else {
        // Create new user
        await pool.query(`
          INSERT INTO users (
            id, email, name, preferred_language, level, total_xp,
            learning_preferences, onboarding_completed, metadata,
            created_at, updated_at, last_active_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `, [
          uuidv4(),
          user.email,
          user.name,
          user.preferred_language,
          user.level,
          user.total_xp,
          JSON.stringify({}),
          user.onboarding_completed,
          JSON.stringify(user.metadata)
        ]);
        
        console.log(`  ✅ Created: ${user.email}`);
        created++;
      }
    }
    
    // Show all users
    console.log('\n📊 All Users in Database:');
    console.log('========================');
    const allUsers = await pool.query(`
      SELECT email, name, preferred_language, level, total_xp, onboarding_completed,
             metadata->>'role' as role
      FROM users
      ORDER BY email
    `);
    
    console.table(allUsers.rows);
    
    console.log(`\n✅ Summary: ${created} created, ${updated} updated`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);