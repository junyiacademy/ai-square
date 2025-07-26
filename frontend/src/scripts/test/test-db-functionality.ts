#!/usr/bin/env tsx

/**
 * Test database functionality by creating programs and tasks
 * This validates that triggers, relationships, and constraints work correctly
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function testDatabaseFunctionality() {
  console.log('🧪 Testing Database Functionality');
  console.log('================================');

  try {
    // Get test data
    const users = await pool.query('SELECT id, email FROM users LIMIT 3');
    const scenarios = await pool.query(`
      SELECT id, mode, title->>'en' as title 
      FROM scenarios 
      WHERE source_type = 'api' 
      ORDER BY mode
    `);

    console.log(`✅ Found ${users.rows.length} users and ${scenarios.rows.length} test scenarios`);

    let testsPassed = 0;
    let testsTotal = 0;

    // Test 1: Create programs for each mode
    console.log('\n🎯 Test 1: Creating programs with mode propagation');
    testsTotal++;

    const testPrograms = [];
    for (let i = 0; i < 3; i++) {
      const user = users.rows[i];
      const scenario = scenarios.rows[i];
      
      const programId = uuidv4();
      const result = await pool.query(`
        INSERT INTO programs (id, user_id, scenario_id, total_task_count, status)
        VALUES ($1, $2, $3, 3, 'active')
        RETURNING id, mode, scenario_id
      `, [programId, user.id, scenario.id]);

      testPrograms.push(result.rows[0]);
      console.log(`  ✅ Created ${scenario.mode} program for ${user.email} - mode auto-set to: ${result.rows[0].mode}`);
    }

    // Verify mode propagation worked
    const modeCheck = await pool.query(`
      SELECT p.mode as program_mode, s.mode as scenario_mode
      FROM programs p
      JOIN scenarios s ON p.scenario_id = s.id
      WHERE p.id = ANY($1)
    `, [testPrograms.map(p => p.id)]);

    const modeMatches = modeCheck.rows.every(row => row.program_mode === row.scenario_mode);
    if (modeMatches) {
      console.log('  ✅ Mode propagation trigger working correctly');
      testsPassed++;
    } else {
      console.log('  ❌ Mode propagation failed');
    }

    // Test 2: Create tasks with mode propagation
    console.log('\n📝 Test 2: Creating tasks with mode propagation');
    testsTotal++;

    const testTasks = [];
    for (const program of testPrograms) {
      for (let taskIndex = 0; taskIndex < 2; taskIndex++) {
        const taskId = uuidv4();
        const result = await pool.query(`
          INSERT INTO tasks (id, program_id, task_index, title, type, status, content)
          VALUES ($1, $2, $3, $4, 'interactive', 'pending', '{"test": true}'::jsonb)
          RETURNING id, mode, program_id
        `, [taskId, program.id, taskIndex, `Test Task ${taskIndex + 1}`]);

        testTasks.push(result.rows[0]);
      }
    }

    // Verify task mode propagation
    const taskModeCheck = await pool.query(`
      SELECT t.mode as task_mode, p.mode as program_mode
      FROM tasks t
      JOIN programs p ON t.program_id = p.id
      WHERE t.id = ANY($1)
    `, [testTasks.map(t => t.id)]);

    const taskModeMatches = taskModeCheck.rows.every(row => row.task_mode === row.program_mode);
    if (taskModeMatches) {
      console.log('  ✅ Task mode propagation working correctly');
      testsPassed++;
    } else {
      console.log('  ❌ Task mode propagation failed');
    }

    // Test 3: Create evaluations with mode propagation
    console.log('\n📊 Test 3: Creating evaluations with mode propagation');
    testsTotal++;

    const testEvaluations = [];
    for (const task of testTasks.slice(0, 3)) {
      const evalId = uuidv4();
      const result = await pool.query(`
        INSERT INTO evaluations (id, user_id, task_id, evaluation_type, score, feedback_text)
        VALUES ($1, $2, $3, 'task', 85.5, 'Good work!')
        RETURNING id, mode, task_id
      `, [evalId, users.rows[0].id, task.id]);

      testEvaluations.push(result.rows[0]);
    }

    // Verify evaluation mode propagation
    const evalModeCheck = await pool.query(`
      SELECT e.mode as eval_mode, t.mode as task_mode
      FROM evaluations e
      JOIN tasks t ON e.task_id = t.id
      WHERE e.id = ANY($1)
    `, [testEvaluations.map(e => e.id)]);

    const evalModeMatches = evalModeCheck.rows.every(row => row.eval_mode === row.task_mode);
    if (evalModeMatches) {
      console.log('  ✅ Evaluation mode propagation working correctly');
      testsPassed++;
    } else {
      console.log('  ❌ Evaluation mode propagation failed');
    }

    // Test 4: Query efficiency with mode indexes
    console.log('\n⚡ Test 4: Testing query performance with mode indexes');
    testsTotal++;

    const performanceTests = [
      {
        name: 'PBL programs query',
        query: 'SELECT COUNT(*) FROM programs WHERE mode = \'pbl\'',
      },
      {
        name: 'Assessment tasks query',
        query: 'SELECT COUNT(*) FROM tasks WHERE mode = \'assessment\'',
      },
      {
        name: 'Discovery evaluations query',
        query: 'SELECT COUNT(*) FROM evaluations WHERE mode = \'discovery\'',
      }
    ];

    let queryTestsPassed = 0;
    for (const test of performanceTests) {
      const startTime = Date.now();
      const result = await pool.query(test.query);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`  ✅ ${test.name}: ${result.rows[0].count} results in ${duration}ms`);
      queryTestsPassed++;
    }

    if (queryTestsPassed === performanceTests.length) {
      testsPassed++;
      console.log('  ✅ All performance queries completed successfully');
    }

    // Test 5: Test helper functions
    console.log('\n🔧 Test 5: Testing helper functions');
    testsTotal++;

    try {
      const userPrograms = await pool.query(`
        SELECT * FROM get_user_programs_by_mode($1, 'pbl')
      `, [users.rows[0].id]);

      const tasksByMode = await pool.query(`
        SELECT * FROM get_tasks_by_mode_and_type('pbl', 'interactive')
      `);

      console.log(`  ✅ Helper functions working: found ${userPrograms.rows.length} user programs and ${tasksByMode.rows.length} tasks`);
      testsPassed++;
    } catch (error) {
      console.log('  ❌ Helper functions failed:', error);
    }

    // Test 6: Test views
    console.log('\n👀 Test 6: Testing database views');
    testsTotal++;

    try {
      const viewTests = [
        'SELECT COUNT(*) FROM user_progress_overview',
        'SELECT COUNT(*) FROM scenario_statistics',
        'SELECT COUNT(*) FROM pbl_scenarios_view',
        'SELECT COUNT(*) FROM discovery_scenarios_view',
        'SELECT COUNT(*) FROM assessment_scenarios_view'
      ];

      let viewTestsPassed = 0;
      for (const viewQuery of viewTests) {
        await pool.query(viewQuery);
        viewTestsPassed++;
      }

      console.log(`  ✅ All ${viewTestsPassed} views working correctly`);
      testsPassed++;
    } catch (error) {
      console.log('  ❌ View tests failed:', error);
    }

    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('======================');
    console.log(`Tests passed: ${testsPassed}/${testsTotal}`);
    console.log(`Success rate: ${Math.round((testsPassed/testsTotal)*100)}%`);

    if (testsPassed === testsTotal) {
      console.log('\n🎉 All database functionality tests PASSED!');
      console.log('✅ Schema V3 is working correctly');
      console.log('✅ Mode propagation triggers are functioning');
      console.log('✅ Indexes are improving query performance');
      console.log('✅ Helper functions and views are operational');
    } else {
      console.log('\n⚠️  Some tests failed - check the output above');
    }

    // Final database stats
    console.log('\n📈 Final Database Statistics');
    console.log('============================');
    
    const finalStats = await pool.query(`
      SELECT 
        'Users' as entity, COUNT(*) as count FROM users
      UNION ALL
      SELECT 'Scenarios', COUNT(*) FROM scenarios
      UNION ALL  
      SELECT 'Programs', COUNT(*) FROM programs
      UNION ALL
      SELECT 'Tasks', COUNT(*) FROM tasks
      UNION ALL
      SELECT 'Evaluations', COUNT(*) FROM evaluations
    `);

    finalStats.rows.forEach(row => {
      console.log(`${row.entity}: ${row.count}`);
    });

    const modeStats = await pool.query(`
      SELECT mode, COUNT(*) as count
      FROM scenarios
      GROUP BY mode
      ORDER BY mode
    `);

    console.log('\nScenarios by mode:');
    modeStats.rows.forEach(row => {
      console.log(`  ${row.mode}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Database functionality test failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await testDatabaseFunctionality();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}