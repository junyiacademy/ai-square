#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

interface TestResult {
  mode: string;
  phase: string;
  success: boolean;
  error?: string;
  data?: any;
  duration?: number;
}

const results: TestResult[] = [];

// Helper function to execute query
async function query(sql: string, params: any[] = []) {
  const result = await pool.query(sql, params);
  return result;
}

// Test a single mode through all 5 phases
async function testMode(mode: 'pbl' | 'assessment' | 'discovery') {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing ${mode.toUpperCase()} Mode - Complete Flow`);
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  let scenarioId: string;
  let programId: string;
  const taskIds: string[] = [];
  const evaluationIds: string[] = [];
  let userId: string;

  try {
    // First, create a test user
    const userResult = await query(`
      INSERT INTO users (id, email, name, preferred_language, level, total_xp, 
                        learning_preferences, onboarding_completed, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [
      uuidv4(),
      `test-${mode}@example.com`,
      `Test User for ${mode}`,
      'en',
      1,
      0,
      { preferredDifficulty: 'medium', learningStyle: 'visual' },
      true
    ]);
    userId = userResult.rows[0].id;
    console.log(`✅ Created test user: ${userId}`);

    // Phase 1: Create Scenario
    console.log(`\n📋 Phase 1: Creating ${mode} scenario...`);
    scenarioId = uuidv4();
    
    // Build mode-specific data
    let modeData = {};
    if (mode === 'pbl') {
      modeData = {
        pbl_data: {
          ksaMapping: {
            knowledge: ['K1', 'K2'],
            skills: ['S1', 'S2'],
            attitudes: ['A1', 'A2']
          },
          aiModules: {
            tutor: { enabled: true, model: 'gemini-pro' },
            evaluator: { enabled: true, model: 'gemini-pro' }
          }
        }
      };
    } else if (mode === 'assessment') {
      modeData = {
        assessment_data: {
          timeLimit: 3600,
          passingScore: 70,
          questionBank: [],
          rubric: {
            dimensions: ['accuracy', 'completeness'],
            weights: { accuracy: 0.6, completeness: 0.4 }
          }
        }
      };
    } else if (mode === 'discovery') {
      modeData = {
        discovery_data: {
          careerPaths: ['Software Engineer', 'Data Scientist'],
          industryFocus: 'Technology',
          explorationGuidance: {
            en: 'Explore tech careers',
            zh: '探索科技職涯'
          }
        }
      };
    }

    await query(`
      INSERT INTO scenarios (
        id, mode, status, source_type, title, description, objectives, 
        task_templates, ${mode}_data, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    `, [
      scenarioId,
      mode,
      'active',
      'api',
      { en: `Test ${mode} Scenario`, zh: `測試 ${mode} 情境` },
      { en: `Test description for ${mode}`, zh: `${mode} 測試描述` },
      { en: [`Objective 1 for ${mode}`], zh: [`${mode} 目標 1`] },
      [
        {
          id: uuidv4(),
          type: mode === 'assessment' ? 'question' : 'chat',
          title: { en: 'Task 1', zh: '任務 1' },
          instructions: { en: 'Complete this task', zh: '完成此任務' },
          context: {
            difficulty: 'medium',
            estimatedTime: 300,
            ksaCodes: ['K1', 'S1', 'A1']
          }
        },
        {
          id: uuidv4(),
          type: mode === 'assessment' ? 'quiz' : 'creation',
          title: { en: 'Task 2', zh: '任務 2' },
          instructions: { en: 'Complete second task', zh: '完成第二個任務' },
          context: {
            difficulty: 'intermediate',
            estimatedTime: 600,
            ksaCodes: ['K2', 'S2', 'A2']
          }
        }
      ],
      modeData[`${mode}_data`]
    ]);
    
    results.push({ 
      mode, 
      phase: 'Create Scenario', 
      success: true, 
      data: { scenarioId },
      duration: Date.now() - startTime
    });
    console.log(`✅ Scenario created: ${scenarioId}`);

    // Phase 2: Create Program
    console.log(`\n📝 Phase 2: Creating program for user...`);
    programId = uuidv4();
    
    const programResult = await query(`
      INSERT INTO programs (
        id, scenario_id, user_id, status, total_score, time_spent_seconds,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, mode
    `, [
      programId,
      scenarioId,
      userId,
      'active',
      0,
      0
    ]);
    
    results.push({ 
      mode, 
      phase: 'Create Program', 
      success: true, 
      data: { programId, inheritedMode: programResult.rows[0].mode },
      duration: Date.now() - startTime
    });
    console.log(`✅ Program created: ${programId} (mode inherited: ${programResult.rows[0].mode})`);

    // Phase 3: Create Tasks
    console.log(`\n📌 Phase 3: Creating tasks...`);
    
    // Get task templates from scenario
    const scenarioResult = await query(
      'SELECT task_templates FROM scenarios WHERE id = $1',
      [scenarioId]
    );
    const taskTemplates = scenarioResult.rows[0].task_templates;
    
    for (const template of taskTemplates) {
      const taskId = uuidv4();
      const taskResult = await query(`
        INSERT INTO tasks (
          id, program_id, scenario_id, type, status, title, instructions,
          context, metadata, interactions, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id, mode
      `, [
        taskId,
        programId,
        scenarioId,
        template.type,
        'pending',
        template.title,
        template.instructions,
        template.context || {},
        {},
        []
      ]);
      
      taskIds.push(taskId);
      console.log(`✅ Task created: ${taskId} (mode inherited: ${taskResult.rows[0].mode})`);
    }
    
    results.push({ 
      mode, 
      phase: 'Create Tasks', 
      success: true, 
      data: { taskIds, count: taskIds.length },
      duration: Date.now() - startTime
    });

    // Phase 4: Execute Evaluations
    console.log(`\n🎯 Phase 4: Creating evaluations...`);
    
    for (const taskId of taskIds) {
      const evaluationId = uuidv4();
      const evalResult = await query(`
        INSERT INTO evaluations (
          id, task_id, user_id, evaluation_type, score, feedback,
          criteria, rubric, ai_config, ai_response, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id, mode
      `, [
        evaluationId,
        taskId,
        userId,
        mode === 'assessment' ? 'summative' : 'formative',
        Math.floor(Math.random() * 30) + 70, // 70-100 score
        {
          en: `Good job on ${mode} task!`,
          zh: `${mode} 任務完成得不錯！`
        },
        {
          accuracy: 0.8,
          creativity: 0.7,
          efficiency: 0.9
        },
        {
          dimensions: ['accuracy', 'creativity', 'efficiency'],
          scores: { accuracy: 80, creativity: 70, efficiency: 90 }
        },
        {
          model: 'gemini-pro',
          temperature: 0.7
        },
        {
          feedback: 'AI generated feedback',
          suggestions: ['Suggestion 1', 'Suggestion 2']
        }
      ]);
      
      evaluationIds.push(evaluationId);
      console.log(`✅ Evaluation created: ${evaluationId} (mode inherited: ${evalResult.rows[0].mode})`);
      
      // Update task status to completed
      await query(
        'UPDATE tasks SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', taskId]
      );
    }
    
    results.push({ 
      mode, 
      phase: 'Execute Evaluations', 
      success: true, 
      data: { evaluationIds, count: evaluationIds.length },
      duration: Date.now() - startTime
    });

    // Phase 5: Complete Program
    console.log(`\n🏆 Phase 5: Completing program...`);
    
    // Calculate total score
    const scoreResult = await query(`
      SELECT AVG(e.score) as avg_score, COUNT(*) as task_count
      FROM evaluations e
      JOIN tasks t ON e.task_id = t.id
      WHERE t.program_id = $1
    `, [programId]);
    
    const avgScore = scoreResult.rows[0].avg_score || 0;
    const completedTasks = scoreResult.rows[0].task_count || 0;
    
    await query(`
      UPDATE programs 
      SET status = $1, completed_at = NOW(), total_score = $2,
          time_spent_seconds = $3
      WHERE id = $4
    `, ['completed', avgScore, Math.floor((Date.now() - startTime) / 1000), programId]);
    
    // Verify completion
    const verifyResult = await query(
      'SELECT status, total_score FROM programs WHERE id = $1',
      [programId]
    );
    
    results.push({ 
      mode, 
      phase: 'Complete Program', 
      success: true, 
      data: { 
        status: verifyResult.rows[0].status,
        totalScore: verifyResult.rows[0].total_score,
        completedTasks
      },
      duration: Date.now() - startTime
    });
    console.log(`✅ Program completed with score: ${avgScore}`);

    // Test mode-specific queries
    console.log(`\n🔍 Testing mode-specific queries...`);
    
    // Test view queries
    const viewName = `${mode}_scenarios_view`;
    const viewResult = await query(`SELECT COUNT(*) FROM ${viewName}`);
    console.log(`✅ ${viewName}: ${viewResult.rows[0].count} scenarios`);
    
    // Test function queries
    const funcResult = await query(
      'SELECT * FROM get_user_programs_by_mode($1, $2)',
      [userId, mode]
    );
    console.log(`✅ User has ${funcResult.rows.length} ${mode} programs`);

    console.log(`\n✅ ${mode.toUpperCase()} mode test completed successfully!`);

  } catch (_error) {
    console.error(`\n❌ Error in ${mode} mode:`, error);
    results.push({ 
      mode, 
      phase: 'Error', 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime
    });
  }
}

// Generate comprehensive report
async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST REPORT: 3 Modes × 5 Phases');
  console.log('='.repeat(80));
  console.log(`Test Date: ${new Date().toISOString()}`);
  console.log(`Database: PostgreSQL (local)`);
  console.log(`Connection: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}`);
  console.log('\n');

  // Summary by mode
  const modes = ['pbl', 'assessment', 'discovery'];
  let totalDuration = 0;
  
  for (const mode of modes) {
    const modeResults = results.filter(r => r.mode === mode);
    const successCount = modeResults.filter(r => r.success).length;
    const totalCount = modeResults.length;
    const modeDuration = modeResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    totalDuration += modeDuration;
    
    console.log(`\n${mode.toUpperCase()} Mode:`);
    console.log(`  Total Phases: ${totalCount}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${totalCount - successCount}`);
    console.log(`  Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    console.log(`  Duration: ${(modeDuration / 1000).toFixed(2)}s`);
    
    // Phase breakdown
    const phases = ['Create Scenario', 'Create Program', 'Create Tasks', 'Execute Evaluations', 'Complete Program'];
    for (const phase of phases) {
      const phaseResult = modeResults.find(r => r.phase === phase);
      if (phaseResult) {
        const status = phaseResult.success ? '✅' : '❌';
        console.log(`    ${status} ${phase}`);
        if (phaseResult.data) {
          Object.entries(phaseResult.data).forEach(([key, value]) => {
            console.log(`       ${key}: ${JSON.stringify(value)}`);
          });
        }
        if (!phaseResult.success && phaseResult.error) {
          console.log(`       Error: ${phaseResult.error}`);
        }
      }
    }
  }

  // Overall summary
  const totalTests = results.length;
  const totalSuccess = results.filter(r => r.success).length;
  const overallRate = ((totalSuccess / totalTests) * 100).toFixed(1);

  console.log('\n' + '-'.repeat(80));
  console.log('OVERALL SUMMARY:');
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Successful: ${totalSuccess}`);
  console.log(`  Failed: ${totalTests - totalSuccess}`);
  console.log(`  Overall Success Rate: ${overallRate}%`);
  console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('-'.repeat(80));

  // Database statistics
  console.log('\nDATABASE STATISTICS:');
  const stats = await query(`
    SELECT 
      (SELECT COUNT(*) FROM scenarios) as scenarios,
      (SELECT COUNT(*) FROM programs) as programs,
      (SELECT COUNT(*) FROM tasks) as tasks,
      (SELECT COUNT(*) FROM evaluations) as evaluations,
      (SELECT COUNT(*) FROM users) as users
  `);
  const dbStats = stats.rows[0];
  console.log(`  Scenarios: ${dbStats.scenarios}`);
  console.log(`  Programs: ${dbStats.programs}`);
  console.log(`  Tasks: ${dbStats.tasks}`);
  console.log(`  Evaluations: ${dbStats.evaluations}`);
  console.log(`  Users: ${dbStats.users}`);

  // Save detailed report
  const reportPath = './test-results/unified-db-test-report.json';
  const fs = await import('fs/promises');
  await fs.mkdir('./test-results', { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify({
    testDate: new Date().toISOString(),
    database: 'PostgreSQL',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5433',
      database: process.env.DB_NAME || 'ai_square_db'
    },
    results,
    summary: {
      totalTests,
      totalSuccess,
      totalFailed: totalTests - totalSuccess,
      successRate: overallRate,
      totalDuration: totalDuration
    },
    databaseStats: dbStats
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Main execution
async function main() {
  console.log('🚀 Starting Unified Learning Architecture Database Test');
  console.log('Testing 3 modes (PBL, Assessment, Discovery) × 5 phases each');
  console.log('This test validates the complete data flow with PostgreSQL\n');

  try {
    // Test database connection
    await query('SELECT 1');
    console.log('✅ Database connection established');

    // Test each mode
    await testMode('pbl');
    await testMode('assessment');
    await testMode('discovery');

    // Generate comprehensive report
    await generateReport();

    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  } catch (_error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the tests
main().catch(console.error);