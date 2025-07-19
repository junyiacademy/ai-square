#!/usr/bin/env tsx
/**
 * Test User Data Migration to PostgreSQL
 * 測試新的 PostgreSQL 用戶資料結構
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

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];

async function testDatabaseConnection(): Promise<void> {
  console.log('🔍 Testing database connection...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    results.push({
      testName: 'Database Connection',
      passed: true,
      details: { timestamp: result.rows[0].now }
    });
    console.log('✅ Database connection successful');
  } catch (error) {
    results.push({
      testName: 'Database Connection',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

async function testTablesExist(): Promise<void> {
  console.log('\n🔍 Testing if new tables exist...');
  const tables = ['assessment_sessions', 'user_badges'];
  
  for (const table of tables) {
    try {
      const query = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `;
      const result = await pool.query(query, [table]);
      const exists = result.rows[0].exists;
      
      results.push({
        testName: `Table ${table} exists`,
        passed: exists,
        error: exists ? undefined : `Table ${table} does not exist`
      });
      
      if (exists) {
        console.log(`✅ Table ${table} exists`);
      } else {
        console.log(`❌ Table ${table} does not exist`);
      }
    } catch (error) {
      results.push({
        testName: `Table ${table} exists`,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

async function testUserOperations(): Promise<void> {
  console.log('\n🔍 Testing user operations...');
  const testEmail = 'test@example.com';
  
  try {
    // Test user creation
    const createQuery = `
      INSERT INTO users (email, name, preferred_language)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email, name
    `;
    const createResult = await pool.query(createQuery, [testEmail, 'Test User', 'en']);
    const userId = createResult.rows[0].id;
    
    results.push({
      testName: 'Create/Update User',
      passed: true,
      details: { userId, email: testEmail }
    });
    console.log('✅ User creation/update successful');
    
    // Test assessment session
    const sessionQuery = `
      INSERT INTO assessment_sessions (
        user_id, session_key, tech_score, creative_score, business_score, answers
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const sessionResult = await pool.query(sessionQuery, [
      userId,
      `assessment_${Date.now()}`,
      85,
      75,
      90,
      JSON.stringify({ q1: ['a'], q2: ['b', 'c'] })
    ]);
    
    results.push({
      testName: 'Create Assessment Session',
      passed: true,
      details: { sessionId: sessionResult.rows[0].id }
    });
    console.log('✅ Assessment session creation successful');
    
    // Test badge addition
    const badgeQuery = `
      INSERT INTO user_badges (
        user_id, badge_id, name, description, category, xp_reward
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, badge_id) DO NOTHING
      RETURNING id
    `;
    const badgeResult = await pool.query(badgeQuery, [
      userId,
      'first_assessment',
      'First Assessment',
      'Completed your first assessment',
      'learning',
      50
    ]);
    
    results.push({
      testName: 'Add User Badge',
      passed: true,
      details: { badgeId: badgeResult.rows[0]?.id || 'Already exists' }
    });
    console.log('✅ Badge addition successful');
    
    // Test views
    const viewQuery = `
      SELECT * FROM user_latest_assessment_view
      WHERE user_id = $1
    `;
    const viewResult = await pool.query(viewQuery, [userId]);
    
    results.push({
      testName: 'Query Assessment View',
      passed: viewResult.rows.length > 0,
      details: { recordCount: viewResult.rows.length }
    });
    console.log('✅ View query successful');
    
  } catch (error) {
    results.push({
      testName: 'User Operations',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('❌ User operations failed:', error);
  }
}

async function testRepositoryIntegration(): Promise<void> {
  console.log('\n🔍 Testing repository integration...');
  
  try {
    const { repositoryFactory } = await import('../lib/repositories/base/repository-factory');
    const userRepo = repositoryFactory.getUserRepository();
    
    // Test getUserData
    const userData = await userRepo.getUserData('test@example.com');
    
    results.push({
      testName: 'Repository getUserData',
      passed: userData !== null,
      details: {
        hasAssessmentSessions: userData?.assessmentSessions?.length || 0,
        hasBadges: userData?.achievements?.badges?.length || 0
      }
    });
    console.log('✅ Repository integration successful');
    
  } catch (error) {
    results.push({
      testName: 'Repository Integration',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('❌ Repository integration failed:', error);
  }
}

async function printSummary(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n- ${r.testName}`);
      if (r.error) console.log(`  Error: ${r.error}`);
    });
  }
  
  console.log('\n📝 DETAILED RESULTS:');
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`\n${icon} ${r.testName}`);
    if (r.details) {
      console.log('  Details:', JSON.stringify(r.details, null, 2));
    }
    if (r.error) {
      console.log('  Error:', r.error);
    }
  });
}

async function main() {
  console.log('🚀 Starting PostgreSQL User Data Migration Tests\n');
  
  try {
    await testDatabaseConnection();
    await testTablesExist();
    await testUserOperations();
    await testRepositoryIntegration();
  } catch (error) {
    console.error('\n💥 Critical error during testing:', error);
  } finally {
    await printSummary();
    await pool.end();
    process.exit(results.some(r => !r.passed) ? 1 : 0);
  }
}

// Run tests
main().catch(console.error);