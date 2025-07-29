#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from 'pg';
import { PostgreSQLProgramRepository } from '../lib/repositories/postgresql/program-repository';
import { PostgreSQLTaskRepository } from '../lib/repositories/postgresql/task-repository';
import { PostgreSQLEvaluationRepository } from '../lib/repositories/postgresql/evaluation-repository';
import { PostgreSQLScenarioRepository } from '../lib/repositories/postgresql/scenario-repository';
import { v4 as uuidv4 } from 'uuid';

// Test user ID (from demo users)
const TEST_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // student user

interface TestResult {
  mode: string;
  phase: string;
  success: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testMode(mode: 'pbl' | 'assessment' | 'discovery') {
  console.log(`\n🧪 Testing ${mode.toUpperCase()} mode...`);
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'ai_square_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
  });
  
  const scenarioRepo = new PostgreSQLScenarioRepository(pool);
  const programRepo = new PostgreSQLProgramRepository(pool);
  const taskRepo = new PostgreSQLTaskRepository(pool);
  const evaluationRepo = new PostgreSQLEvaluationRepository(pool);

  try {
    // Phase 1: Create Scenario
    console.log(`\n📋 Phase 1: Creating ${mode} scenario...`);
    const scenarioId = uuidv4();
    const baseScenario = {
      id: scenarioId,
      mode,
      status: 'active' as const,
      sourceType: 'api' as const,
      title: { en: `Test ${mode} Scenario`, zh: `測試 ${mode} 情境` },
      description: { en: `Test description for ${mode}`, zh: `${mode} 測試描述` },
      objectives: { en: [`Objective 1 for ${mode}`], zh: [`${mode} 目標 1`] },
      taskTemplates: [
        {
          id: uuidv4(),
          type: mode === 'assessment' ? 'question' : 'chat',
          title: { en: 'Task 1', zh: '任務 1' },
          instructions: { en: 'Complete this task', zh: '完成此任務' }
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add mode-specific data
    const scenario: any = baseScenario;
    
    if (mode === 'pbl') {
      scenario.pblData = {
        ksaMapping: {
          knowledge: ['K1', 'K2'],
          skills: ['S1', 'S2'],
          attitudes: ['A1', 'A2']
        },
        aiModules: {
          tutor: { enabled: true, model: 'gemini-pro' },
          evaluator: { enabled: true, model: 'gemini-pro' }
        }
      };
    } else if (mode === 'assessment') {
      scenario.assessmentData = {
        timeLimit: 3600,
        passingScore: 70,
        questionBank: [],
        rubric: {
          dimensions: ['accuracy', 'completeness'],
          weights: { accuracy: 0.6, completeness: 0.4 }
        }
      };
    } else if (mode === 'discovery') {
      scenario.discoveryData = {
        careerPaths: ['Software Engineer', 'Data Scientist'],
        industryFocus: 'Technology',
        explorationGuidance: {
          en: 'Explore tech careers',
          zh: '探索科技職涯'
        }
      };
    }

    await scenarioRepo.create(scenario);
    results.push({ mode, phase: 'Create Scenario', success: true, data: { scenarioId } });
    console.log(`✅ Scenario created: ${scenarioId}`);
    
    // Verify scenario was created
    const createdScenario = await scenarioRepo.findById(scenarioId);
    if (!createdScenario) {
      throw new Error(`Failed to verify scenario creation for ${scenarioId}`);
    }

    // Phase 2: Create Program
    console.log(`\n📝 Phase 2: Creating program for user...`);
    const programId = uuidv4();
    await programRepo.create({
      id: programId,
      scenarioId,
      userId: TEST_USER_ID,
      status: 'active',
      mode, // Will be inherited from scenario
      totalScore: 0,
      timeSpentSeconds: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    results.push({ mode, phase: 'Create Program', success: true, data: { programId } });
    console.log(`✅ Program created: ${programId}`);

    // Phase 3: Create Tasks
    console.log(`\n📌 Phase 3: Creating tasks...`);
    const taskIds: string[] = [];
    for (const template of scenario.taskTemplates) {
      const taskId = uuidv4();
      await taskRepo.create({
        id: taskId,
        programId,
        scenarioId,
        type: template.type as any,
        status: 'pending',
        mode, // Will be inherited from program
        title: template.title,
        instructions: template.instructions,
        context: {
          difficulty: 'medium',
          estimatedTime: 300,
          ksaCodes: ['K1', 'S1', 'A1']
        },
        metadata: {},
        interactions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      taskIds.push(taskId);
      console.log(`✅ Task created: ${taskId}`);
    }
    results.push({ mode, phase: 'Create Tasks', success: true, data: { taskIds } });

    // Phase 4: Execute Evaluations
    console.log(`\n🎯 Phase 4: Creating evaluations...`);
    const evaluationIds: string[] = [];
    for (const taskId of taskIds) {
      const evaluationId = uuidv4();
      await evaluationRepo.create({
        id: evaluationId,
        taskId,
        userId: TEST_USER_ID,
        mode, // Will be inherited from task
        evaluationType: mode === 'assessment' ? 'summative' : 'formative',
        score: Math.floor(Math.random() * 100),
        feedback: {
          en: `Good job on ${mode} task!`,
          zh: `${mode} 任務完成得不錯！`
        },
        criteria: {
          accuracy: 0.8,
          creativity: 0.7,
          efficiency: 0.9
        },
        rubric: {
          dimensions: ['accuracy', 'creativity', 'efficiency'],
          scores: { accuracy: 80, creativity: 70, efficiency: 90 }
        },
        aiConfig: {
          model: 'gemini-pro',
          temperature: 0.7
        },
        aiResponse: {
          feedback: 'AI generated feedback',
          suggestions: ['Suggestion 1', 'Suggestion 2']
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      evaluationIds.push(evaluationId);
      console.log(`✅ Evaluation created: ${evaluationId}`);

      // Update task status
      await taskRepo.updateStatus(taskId, 'completed');
    }
    results.push({ mode, phase: 'Execute Evaluations', success: true, data: { evaluationIds } });

    // Phase 5: Complete Program
    console.log(`\n🏆 Phase 5: Completing program...`);
    await programRepo.updateStatus(programId, 'completed');
    
    // Verify completion
    const completedProgram = await programRepo.findById(programId);
    if (completedProgram?.status === 'completed') {
      results.push({ mode, phase: 'Complete Program', success: true, data: { status: 'completed' } });
      console.log(`✅ Program completed successfully`);
    } else {
      throw new Error('Program completion failed');
    }

    // Test mode-specific queries
    console.log(`\n🔍 Testing mode-specific queries...`);
    const userPrograms = await programRepo.findByUserAndMode(TEST_USER_ID, mode);
    console.log(`Found ${userPrograms.length} ${mode} programs for user`);

  } catch (error) {
    console.error(`❌ Error in ${mode} mode:`, error);
    results.push({ 
      mode, 
      phase: 'Error', 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  } finally {
    await pool.end();
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST REPORT: 3 Modes × 5 Phases with Database');
  console.log('='.repeat(80));
  console.log(`Test Date: ${new Date().toISOString()}`);
  console.log(`Database: PostgreSQL (local)`);
  console.log(`Test User ID: ${TEST_USER_ID}`);
  console.log('\n');

  // Summary by mode
  const modes = ['pbl', 'assessment', 'discovery'];
  for (const mode of modes) {
    const modeResults = results.filter(r => r.mode === mode);
    const successCount = modeResults.filter(r => r.success).length;
    const totalCount = modeResults.length;
    
    console.log(`\n${mode.toUpperCase()} Mode:`);
    console.log(`  Total Tests: ${totalCount}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${totalCount - successCount}`);
    console.log(`  Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    // Detail results
    for (const result of modeResults) {
      const status = result.success ? '✅' : '❌';
      console.log(`    ${status} ${result.phase}`);
      if (!result.success && result.error) {
        console.log(`       Error: ${result.error}`);
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
  console.log('-'.repeat(80));

  // Save report to file
  const reportPath = './test-results/db-mode-test-report.json';
  const fs = await import('fs/promises');
  await fs.mkdir('./test-results', { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify({
    testDate: new Date().toISOString(),
    database: 'PostgreSQL',
    testUserId: TEST_USER_ID,
    results,
    summary: {
      totalTests,
      totalSuccess,
      totalFailed: totalTests - totalSuccess,
      successRate: overallRate
    }
  }, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

// Main execution
async function main() {
  console.log('🚀 Starting comprehensive database test...');
  console.log('Testing 3 modes (PBL, Assessment, Discovery) × 5 phases each\n');

  try {
    // Test each mode
    await testMode('pbl');
    await testMode('assessment');
    await testMode('discovery');

    // Generate report
    await generateReport();

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);