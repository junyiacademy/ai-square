#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface TestResult {
  category: string;
  test: string;
  status: 'pass' | 'fail';
  error?: string;
  duration: number;
  details?: any;
}

const results: TestResult[] = [];

// Helper function to record test result
function recordResult(category: string, test: string, status: 'pass' | 'fail', error?: string, details?: any, duration?: number) {
  results.push({
    category,
    test,
    status,
    error,
    details,
    duration: duration || 0
  });
  
  const icon = status === 'pass' ? '✅' : '❌';
  console.log(`  ${icon} ${test}${error ? `: ${error}` : ''}`);
}

// Test database connection
async function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...');
  const start = Date.now();
  
  try {
    const result = await pool.query('SELECT NOW()');
    recordResult('Database', 'Connection test', 'pass', undefined, { timestamp: result.rows[0].now }, Date.now() - start);
    
    // Test schema exists
    const schemaResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const expectedTables = ['scenarios', 'programs', 'tasks', 'evaluations', 'users'];
    const actualTables = schemaResult.rows.map(r => r.table_name);
    const allTablesExist = expectedTables.every(t => actualTables.includes(t));
    
    recordResult('Database', 'Schema validation', allTablesExist ? 'pass' : 'fail', 
      allTablesExist ? undefined : `Missing tables: ${expectedTables.filter(t => !actualTables.includes(t)).join(', ')}`,
      { tables: actualTables.length }, Date.now() - start);
    
  } catch (_error) {
    recordResult('Database', 'Connection test', 'fail', error instanceof Error ? error.message : String(error));
  }
}

// Test complete data flow for each mode
async function testModeDataFlow(mode: 'pbl' | 'assessment' | 'discovery') {
  console.log(`\n🔍 Testing ${mode.toUpperCase()} Mode Data Flow...`);
  const start = Date.now();
  
  try {
    // 1. Create test user
    const userId = uuidv4();
    await pool.query(`
      INSERT INTO users (id, email, name, preferred_language, onboarding_completed)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
    `, [userId, `test-${mode}-${Date.now()}@example.com`, `Test ${mode} User`, 'en', true]);
    
    recordResult(`${mode} Data Flow`, 'Create user', 'pass', undefined, { userId });
    
    // 2. Create scenario with proper JSONB formatting
    const scenarioId = uuidv4();
    const modeData: any = {};
    
    if (mode === 'pbl') {
      modeData.pbl_data = {
        ksaMapping: {
          knowledge: ['K1', 'K2'],
          skills: ['S1', 'S2'],
          attitudes: ['A1']
        },
        aiModules: {
          tutor: { enabled: true, model: 'gemini-pro' }
        }
      };
    } else if (mode === 'assessment') {
      modeData.assessment_data = {
        timeLimit: 3600,
        passingScore: 70,
        questionBank: []
      };
    } else {
      modeData.discovery_data = {
        careerPaths: ['Software Engineer'],
        industryFocus: 'Technology'
      };
    }
    
    await pool.query(`
      INSERT INTO scenarios (id, mode, status, source_type, title, description, objectives, task_templates, ${mode}_data)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
    `, [
      scenarioId,
      mode,
      'active',
      'api',
      JSON.stringify({ en: `Test ${mode} Scenario` }),
      JSON.stringify({ en: `Description for ${mode}` }),
      JSON.stringify({ en: ['Objective 1'] }),
      JSON.stringify([{
        id: uuidv4(),
        type: mode === 'assessment' ? 'question' : 'chat',
        title: { en: 'Task 1' },
        instructions: { en: 'Complete this task' }
      }]),
      JSON.stringify(modeData[`${mode}_data`])
    ]);
    
    recordResult(`${mode} Data Flow`, 'Create scenario', 'pass', undefined, { scenarioId });
    
    // 3. Create program (without specifying mode - let trigger handle it)
    const programId = uuidv4();
    await pool.query(`
      INSERT INTO programs (id, scenario_id, user_id, status, total_score, time_spent_seconds, total_task_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [programId, scenarioId, userId, 'active', 0, 0, 1]);
    
    recordResult(`${mode} Data Flow`, 'Create program', 'pass', undefined, { programId });
    
    // 4. Create task
    const taskId = uuidv4();
    await pool.query(`
      INSERT INTO tasks (id, program_id, task_index, type, status, title, content)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `, [
      taskId,
      programId,
      0, // task_index (first task)
      mode === 'assessment' ? 'question' : 'chat',
      'active',
      'Task 1', // title is VARCHAR, not JSONB
      JSON.stringify({ 
        instructions: { en: 'Complete this task' },
        question: mode === 'assessment' ? { en: 'What is AI?' } : undefined
      })
    ]);
    
    recordResult(`${mode} Data Flow`, 'Create task', 'pass', undefined, { taskId });
    
    // 5. Create evaluation
    const evaluationId = uuidv4();
    await pool.query(`
      INSERT INTO evaluations (id, task_id, user_id, mode, evaluation_type, score, feedback_text, feedback_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    `, [
      evaluationId,
      taskId,
      userId,
      mode, // mode is required
      mode === 'assessment' ? 'task' : 'task', // evaluation_type
      85,
      'Good job!', // feedback_text is TEXT, not JSONB
      JSON.stringify({ en: 'Good job!', details: 'Excellent understanding demonstrated.' })
    ]);
    
    recordResult(`${mode} Data Flow`, 'Create evaluation', 'pass', undefined, { evaluationId });
    
    // 6. Complete program
    await pool.query(`
      UPDATE programs SET status = 'completed', completed_at = NOW() WHERE id = $1
    `, [programId]);
    
    recordResult(`${mode} Data Flow`, 'Complete program', 'pass', undefined, undefined, Date.now() - start);
    
  } catch (_error) {
    recordResult(`${mode} Data Flow`, 'Error', 'fail', error instanceof Error ? error.message : String(error));
  }
}

// Test API endpoints
async function testAPIEndpoints() {
  console.log('\n🔍 Testing API Endpoints...');
  
  // Test scenarios API for each mode
  const modes = ['pbl', 'assessment', 'discovery'];
  
  for (const mode of modes) {
    try {
      const response = await fetch(`${API_BASE}/api/${mode}/scenarios?lang=en`);
      const data = await response.json();
      
      recordResult('API Endpoints', `GET /api/${mode}/scenarios`, 
        response.ok ? 'pass' : 'fail',
        response.ok ? undefined : `Status: ${response.status}`,
        { count: Array.isArray(data) ? data.length : 0 }
      );
    } catch (_error) {
      recordResult('API Endpoints', `GET /api/${mode}/scenarios`, 'fail', 
        error instanceof Error ? error.message : String(error));
    }
  }
  
  // Test auth endpoints
  try {
    const response = await fetch(`${API_BASE}/api/auth/check`);
    recordResult('API Endpoints', 'GET /api/auth/check', 
      response.ok ? 'pass' : 'fail',
      response.ok ? undefined : `Status: ${response.status}`
    );
  } catch (_error) {
    recordResult('API Endpoints', 'GET /api/auth/check', 'fail', 
      error instanceof Error ? error.message : String(error));
  }
}

// Test frontend pages
async function testFrontendPages() {
  console.log('\n🔍 Testing Frontend Pages...');
  
  const pages = [
    '/',
    '/pbl',
    '/assessment',
    '/discovery',
    '/relations',
    '/login',
    '/register'
  ];
  
  for (const page of pages) {
    try {
      const response = await fetch(`${API_BASE}${page}`);
      recordResult('Frontend Pages', `GET ${page}`, 
        response.ok ? 'pass' : 'fail',
        response.ok ? undefined : `Status: ${response.status}`
      );
    } catch (_error) {
      recordResult('Frontend Pages', `GET ${page}`, 'fail', 
        error instanceof Error ? error.message : String(error));
    }
  }
}

// Generate comprehensive report
async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 FULL SYSTEM TEST REPORT');
  console.log('='.repeat(80));
  console.log(`Test Date: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_NAME || 'ai_square_db'}`);
  console.log(`API URL: ${API_BASE}`);
  
  // Summary by category
  const categories = [...new Set(results.map(r => r.category))];
  
  console.log('\n📈 Test Results by Category:');
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.status === 'pass').length;
    const total = categoryResults.length;
    const rate = ((passed / total) * 100).toFixed(1);
    
    console.log(`\n${category}:`);
    console.log(`  Total: ${total}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${total - passed}`);
    console.log(`  Success Rate: ${rate}%`);
    
    // Show failed tests
    const failed = categoryResults.filter(r => r.status === 'fail');
    if (failed.length > 0) {
      console.log('  Failed Tests:');
      failed.forEach(f => {
        console.log(`    - ${f.test}: ${f.error}`);
      });
    }
  }
  
  // Overall summary
  const totalTests = results.length;
  const totalPassed = results.filter(r => r.status === 'pass').length;
  const overallRate = ((totalPassed / totalTests) * 100).toFixed(1);
  
  console.log('\n' + '-'.repeat(80));
  console.log('📊 OVERALL SUMMARY:');
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalTests - totalPassed}`);
  console.log(`  Overall Success Rate: ${overallRate}%`);
  console.log('-'.repeat(80));
  
  // Check if system is ready
  const criticalTests = [
    'Connection test',
    'Schema validation',
    'Create scenario',
    'Create program',
    'Create task',
    'Create evaluation'
  ];
  
  const criticalPassed = results.filter(r => 
    criticalTests.some(ct => r.test.includes(ct)) && r.status === 'pass'
  ).length;
  
  const systemReady = criticalPassed >= criticalTests.length * 0.8; // 80% threshold
  
  console.log(`\n🚦 System Status: ${systemReady ? '✅ READY' : '❌ NOT READY'}`);
  
  if (!systemReady) {
    console.log('\n⚠️  Critical issues found:');
    results
      .filter(r => criticalTests.some(ct => r.test.includes(ct)) && r.status === 'fail')
      .forEach(r => console.log(`  - ${r.test}: ${r.error}`));
  }
  
  // Save detailed report
  const reportPath = './test-results/full-system-test-report.json';
  const fs = await import('fs/promises');
  await fs.writeFile(reportPath, JSON.stringify({
    metadata: {
      testDate: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: process.env.DB_NAME || 'ai_square_db',
      apiUrl: API_BASE
    },
    results,
    summary: {
      totalTests,
      totalPassed,
      totalFailed: totalTests - totalPassed,
      successRate: overallRate,
      systemReady
    },
    categoryBreakdown: categories.map(cat => {
      const catResults = results.filter(r => r.category === cat);
      const passed = catResults.filter(r => r.status === 'pass').length;
      return {
        category: cat,
        total: catResults.length,
        passed,
        failed: catResults.length - passed,
        rate: ((passed / catResults.length) * 100).toFixed(1)
      };
    })
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Main execution
async function main() {
  console.log('🚀 Starting Full System Test');
  console.log('This test validates database, API, and frontend functionality\n');
  
  try {
    // 1. Test database
    await testDatabaseConnection();
    
    // 2. Test data flows for each mode
    await testModeDataFlow('pbl');
    await testModeDataFlow('assessment');
    await testModeDataFlow('discovery');
    
    // 3. Test API endpoints
    await testAPIEndpoints();
    
    // 4. Test frontend pages
    await testFrontendPages();
    
    // 5. Generate report
    await generateReport();
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await pool.query(`DELETE FROM users WHERE email LIKE 'test-%@example.com'`);
    
    console.log('\n✅ Full system test completed!');
    process.exit(0);
    
  } catch (_error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check if dev server is running
async function checkDevServer() {
  try {
    const response = await fetch(API_BASE);
    return response.ok;
  } catch {
    return false;
  }
}

// Pre-flight check
async function preflight() {
  console.log('🔍 Running pre-flight checks...\n');
  
  // Check if database is running
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database is running');
  } catch (_error) {
    console.error('❌ Database is not running. Please run: make db-up');
    process.exit(1);
  }
  
  // Check if dev server is running
  const serverRunning = await checkDevServer();
  if (!serverRunning) {
    console.error('❌ Dev server is not running. Please run: make dev');
    process.exit(1);
  }
  console.log('✅ Dev server is running\n');
}

// Run pre-flight checks then main tests
preflight().then(() => main()).catch(console.error);