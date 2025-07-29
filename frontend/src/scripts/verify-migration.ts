#!/usr/bin/env tsx
/**
 * Verify GCS to PostgreSQL Migration
 * 驗證資料遷移結果
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../../.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verify() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying Migration Results\n');
    
    // Check users
    const userQuery = `
      SELECT id, email, name, level, total_xp, created_at 
      FROM users 
      WHERE email = 'teacher@example.com'
    `;
    const userResult = await client.query(userQuery);
    
    if (userResult.rows.length > 0) {
      console.log('✅ User Found:');
      console.log('   ID:', userResult.rows[0].id);
      console.log('   Email:', userResult.rows[0].email);
      console.log('   Name:', userResult.rows[0].name);
      console.log('   Level:', userResult.rows[0].level);
      console.log('   Total XP:', userResult.rows[0].total_xp);
      console.log('   Created:', userResult.rows[0].created_at);
      
      const userId = userResult.rows[0].id;
      
      // Check assessment evaluations (unified architecture)
      const sessionQuery = `
        SELECT e.id, e.score, e.feedback, e.created_at
        FROM evaluations e
        JOIN tasks t ON e.task_id = t.id
        WHERE e.user_id = $1 AND t.mode = 'assessment'
        ORDER BY e.created_at DESC
      `;
      const sessionResult = await client.query(sessionQuery, [userId]);
      
      console.log(`\n📊 Assessment Evaluations: ${sessionResult.rowCount}`);
      sessionResult.rows.forEach((session, index) => {
        const feedback = typeof session.feedback === 'string' ? JSON.parse(session.feedback) : session.feedback;
        console.log(`\n   Evaluation ${index + 1}:`);
        console.log(`   - ID: ${session.id}`);
        console.log(`   - Overall Score: ${session.score}`);
        if (feedback?.techScore !== undefined) {
          console.log(`   - Tech: ${feedback.techScore}`);
          console.log(`   - Creative: ${feedback.creativeScore}`);
          console.log(`   - Business: ${feedback.businessScore}`);
        }
        console.log(`   - Created: ${session.created_at}`);
      });
      
      // Check badges
      const badgeQuery = `
        SELECT badge_id, name, category, xp_reward, unlocked_at
        FROM user_badges 
        WHERE user_id = $1
        ORDER BY unlocked_at DESC
      `;
      const badgeResult = await client.query(badgeQuery, [userId]);
      
      console.log(`\n🏆 Badges: ${badgeResult.rowCount}`);
      badgeResult.rows.forEach((badge, index) => {
        console.log(`\n   Badge ${index + 1}:`);
        console.log(`   - ID: ${badge.badge_id}`);
        console.log(`   - Name: ${badge.name}`);
        console.log(`   - Category: ${badge.category}`);
        console.log(`   - XP: ${badge.xp_reward}`);
        console.log(`   - Unlocked: ${badge.unlocked_at}`);
      });
      
      // Check if user can be retrieved via repository
      const { repositoryFactory } = await import('../lib/repositories/base/repository-factory');
      const userRepo = repositoryFactory.getUserRepository();
      
      console.log('\n🔄 Testing Repository Access...');
      const userData = await userRepo.getUserData('teacher@example.com');
      
      if (userData) {
        console.log('✅ Repository access successful');
        console.log(`   Assessment Sessions: ${userData.assessmentSessions?.length || 0}`);
        console.log(`   Badges: ${userData.achievements?.badges?.length || 0}`);
      } else {
        console.log('❌ Repository access failed');
      }
      
    } else {
      console.log('❌ User not found in database');
    }
    
  } catch (_error) {
    console.error('❌ Verification error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run verification
verify().catch(console.error);