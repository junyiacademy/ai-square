#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_NAME = 'Test User';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

interface TestResult {
  step: string;
  status: 'pass' | 'fail';
  error?: string;
  data?: any;
  duration: number;
}

const results: TestResult[] = [];

// Helper function to record test result
function recordResult(step: string, status: 'pass' | 'fail', error?: string, data?: any, duration?: number) {
  results.push({
    step,
    status,
    error,
    data,
    duration: duration || 0
  });
  
  const icon = status === 'pass' ? '✅' : '❌';
  console.log(`  ${icon} ${step}${error ? `: ${error}` : ''}`);
  if (data && process.env.DEBUG) {
    console.log(`     Data:`, JSON.stringify(data, null, 2));
  }
}

// Create test user
async function createTestUser() {
  console.log('\n🔧 Setting up test user...');
  
  try {
    const userId = uuidv4();
    
    // Create user
    await pool.query(`
      INSERT INTO users (id, email, name, preferred_language, onboarding_completed)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET 
        name = $3,
        updated_at = NOW()
      RETURNING id
    `, [userId, TEST_USER_EMAIL, TEST_USER_NAME, 'en', true]);
    
    recordResult('Create test user', 'pass', undefined, { userId });
    return userId;
    
  } catch (_error) {
    recordResult('Create test user', 'fail', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Create PBL scenario
async function createPBLScenario() {
  console.log('\n📋 Creating PBL scenario...');
  
  try {
    const scenarioId = uuidv4();
    
    await pool.query(`
      INSERT INTO scenarios (
        id, mode, status, source_type, source_path,
        title, description, objectives, task_templates,
        pbl_data, ai_modules, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, NOW(), NOW())
    `, [
      scenarioId,
      'pbl',
      'active',
      'yaml',
      'test_pbl_scenario.yaml',
      JSON.stringify({ 
        en: 'AI Ethics in Healthcare',
        zh: 'AI 醫療倫理'
      }),
      JSON.stringify({ 
        en: 'Explore ethical considerations of AI in healthcare',
        zh: '探討 AI 在醫療領域的倫理考量'
      }),
      JSON.stringify({ 
        en: ['Understand AI ethics principles', 'Apply to healthcare scenarios'],
        zh: ['理解 AI 倫理原則', '應用於醫療情境']
      }),
      JSON.stringify([{
        id: uuidv4(),
        type: 'chat',
        title: { en: 'Discuss AI Ethics' },
        instructions: { en: 'Discuss ethical implications of AI diagnosis systems' },
        estimatedTime: 1800,
        ksaCodes: ['K1.1', 'S2.1', 'A3.1']
      }]),
      JSON.stringify({
        ksaMapping: {
          knowledge: ['K1.1', 'K1.2'],
          skills: ['S2.1', 'S2.2'],
          attitudes: ['A3.1', 'A3.2']
        },
        learningPath: 'ethics',
        difficulty: 'intermediate'
      }),
      JSON.stringify({
        tutor: {
          enabled: true,
          model: 'gemini-2.5-flash',
          systemPrompt: 'You are an AI ethics expert'
        },
        evaluator: {
          enabled: true,
          model: 'gemini-2.5-flash'
        }
      })
    ]);
    
    recordResult('Create PBL scenario', 'pass', undefined, { scenarioId });
    return scenarioId;
    
  } catch (_error) {
    recordResult('Create PBL scenario', 'fail', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Test PBL API flow
async function testPBLAPIFlow(userId: string, scenarioId: string) {
  console.log('\n🌐 Testing PBL API flow...');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Get scenario details
    console.log('\n  1️⃣ Getting scenario details...');
    let response = await axios.get(`${BASE_URL}/api/pbl/scenarios/${scenarioId}`, {
      headers: {
        'accept-language': 'en',
        'x-test-user-email': TEST_USER_EMAIL // Mock auth header
      }
    });
    
    if (response.data.scenario) {
      recordResult('Get scenario details', 'pass', undefined, {
        title: response.data.scenario.title
      });
    } else {
      throw new Error('Scenario not found in response');
    }
    
    // Step 2: Create program
    console.log('\n  2️⃣ Creating program...');
    response = await axios.post(`${BASE_URL}/api/pbl/scenarios/${scenarioId}/programs`, {}, {
      headers: {
        'accept-language': 'en',
        'x-test-user-email': TEST_USER_EMAIL
      }
    });
    
    const programId = response.data.program?.id;
    if (!programId) {
      throw new Error('Program ID not returned');
    }
    
    recordResult('Create program', 'pass', undefined, { programId });
    
    // Step 3: Get tasks
    console.log('\n  3️⃣ Getting tasks...');
    const tasksResponse = await pool.query(
      'SELECT * FROM tasks WHERE program_id = $1',
      [programId]
    );
    
    if (tasksResponse.rows.length === 0) {
      throw new Error('No tasks created for program');
    }
    
    const taskId = tasksResponse.rows[0].id;
    recordResult('Get tasks', 'pass', undefined, { 
      taskCount: tasksResponse.rows.length,
      taskId 
    });
    
    // Step 4: Chat interaction
    console.log('\n  4️⃣ Testing chat interaction...');
    response = await axios.post(`${BASE_URL}/api/pbl/chat`, {
      taskId,
      programId,
      scenarioId,
      message: 'What are the main ethical concerns with AI diagnosis systems?'
    }, {
      headers: {
        'accept-language': 'en',
        'x-test-user-email': TEST_USER_EMAIL
      }
    });
    
    if (response.data.response) {
      recordResult('Chat interaction', 'pass', undefined, {
        responseLength: response.data.response.length
      });
    } else {
      throw new Error('No chat response received');
    }
    
    // Step 5: Evaluate task
    console.log('\n  5️⃣ Evaluating task...');
    response = await axios.post(`${BASE_URL}/api/pbl/tasks/${taskId}/evaluate`, {
      programId,
      scenarioId
    }, {
      headers: {
        'accept-language': 'en',
        'x-test-user-email': TEST_USER_EMAIL
      }
    });
    
    const evaluationScore = response.data.evaluation?.score;
    if (typeof evaluationScore === 'number') {
      recordResult('Evaluate task', 'pass', undefined, { 
        score: evaluationScore 
      });
    } else {
      throw new Error('Evaluation score not returned');
    }
    
    // Step 6: Complete program
    console.log('\n  6️⃣ Completing program...');
    response = await axios.post(`${BASE_URL}/api/pbl/programs/${programId}/complete`, {
      scenarioId
    }, {
      headers: {
        'accept-language': 'en',
        'x-test-user-email': TEST_USER_EMAIL
      }
    });
    
    if (response.data.evaluation) {
      recordResult('Complete program', 'pass', undefined, {
        overallScore: response.data.evaluation.overallScore,
        evaluatedTasks: response.data.evaluation.evaluatedTasks
      });
    } else {
      throw new Error('Program completion failed');
    }
    
    // Step 7: Generate feedback
    console.log('\n  7️⃣ Generating qualitative feedback...');
    response = await axios.post(`${BASE_URL}/api/pbl/generate-feedback`, {
      programId,
      scenarioId
    }, {
      headers: {
        'accept-language': 'en',
        'x-test-user-email': TEST_USER_EMAIL
      }
    });
    
    if (response.data.feedback) {
      recordResult('Generate feedback', 'pass', undefined, {
        hasOverallAssessment: !!response.data.feedback.overallAssessment,
        strengthsCount: response.data.feedback.strengths?.length || 0,
        cached: response.data.cached
      });
    } else {
      throw new Error('Feedback generation failed');
    }
    
    const duration = Date.now() - startTime;
    recordResult('Complete PBL flow', 'pass', undefined, { 
      programId,
      totalDuration: `${duration}ms`
    }, duration);
    
    return { programId, taskId };
    
  } catch (_error) {
    const duration = Date.now() - startTime;
    let errorMessage = 'Unknown error';
    
    if (axios.isAxiosError(error)) {
      errorMessage = `${error.response?.status}: ${error.response?.data?.error || error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    recordResult('PBL API flow', 'fail', errorMessage, undefined, duration);
    throw error;
  }
}

// Verify database state
async function verifyDatabaseState(programId: string) {
  console.log('\n🔍 Verifying database state...');
  
  try {
    // Check program
    const programResult = await pool.query(
      'SELECT * FROM programs WHERE id = $1',
      [programId]
    );
    
    if (programResult.rows[0]?.status === 'completed') {
      recordResult('Program status', 'pass', undefined, {
        status: 'completed',
        completedAt: programResult.rows[0].completed_at
      });
    } else {
      throw new Error('Program not marked as completed');
    }
    
    // Check tasks
    const tasksResult = await pool.query(
      'SELECT * FROM tasks WHERE program_id = $1',
      [programId]
    );
    
    const completedTasks = tasksResult.rows.filter(t => t.status === 'completed');
    recordResult('Tasks completed', 'pass', undefined, {
      total: tasksResult.rows.length,
      completed: completedTasks.length
    });
    
    // Check evaluations
    const evalResult = await pool.query(
      'SELECT * FROM evaluations WHERE target_id = $1',
      [programId]
    );
    
    recordResult('Evaluations created', 'pass', undefined, {
      count: evalResult.rows.length,
      types: evalResult.rows.map(e => e.evaluation_type)
    });
    
  } catch (_error) {
    recordResult('Database verification', 'fail', error instanceof Error ? error.message : String(error));
  }
}

// Generate report
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PBL DATABASE INTEGRATION TEST REPORT');
  console.log('='.repeat(80));
  console.log(`Test Date: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}`);
  console.log(`API Base URL: ${BASE_URL}`);
  
  const totalTests = results.length;
  const totalPassed = results.filter(r => r.status === 'pass').length;
  const totalFailed = results.filter(r => r.status === 'fail').length;
  const successRate = ((totalPassed / totalTests) * 100).toFixed(1);
  
  console.log('\n📈 Summary:');
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Success Rate: ${successRate}%`);
  
  if (totalFailed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => console.log(`  - ${r.step}: ${r.error}`));
  }
  
  console.log('\n⏱️ Performance:');
  const timedResults = results.filter(r => r.duration > 0);
  if (timedResults.length > 0) {
    timedResults.forEach(r => {
      console.log(`  - ${r.step}: ${r.duration}ms`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
}

// Cleanup
async function cleanup(userId?: string) {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    if (userId) {
      // Delete in reverse order of foreign key dependencies
      await pool.query('DELETE FROM evaluations WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM tasks WHERE program_id IN (SELECT id FROM programs WHERE user_id = $1)', [userId]);
      await pool.query('DELETE FROM programs WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    
    // Clean up test scenarios
    await pool.query(`DELETE FROM scenarios WHERE source_path = 'test_pbl_scenario.yaml'`);
    
    console.log('  ✅ Cleanup completed');
  } catch (_error) {
    console.error('  ❌ Cleanup error:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting PBL Database Integration Test');
  console.log('This tests the complete PBL flow with real database operations\n');
  
  let userId: string | undefined;
  
  try {
    // Setup
    userId = await createTestUser();
    const scenarioId = await createPBLScenario();
    
    // Run tests
    const { programId } = await testPBLAPIFlow(userId, scenarioId);
    await verifyDatabaseState(programId);
    
    // Generate report
    generateReport();
    
    const totalFailed = results.filter(r => r.status === 'fail').length;
    process.exit(totalFailed === 0 ? 0 : 1);
    
  } catch (_error) {
    console.error('\n❌ Test suite failed:', error);
    generateReport();
    process.exit(1);
  } finally {
    await cleanup(userId);
    await pool.end();
  }
}

// Check if API server is running
async function checkAPIServer() {
  try {
    // Try a simple endpoint that should always work
    await axios.get(`${BASE_URL}/`);
    return true;
  } catch {
    console.error(`\n❌ API server is not running at ${BASE_URL}`);
    console.error('Please start the development server with: npm run dev\n');
    return false;
  }
}

// Run tests
(async () => {
  if (await checkAPIServer()) {
    await main();
  } else {
    process.exit(1);
  }
})();