/**
 * Test Assessment V2 GCS Integration
 * This script tests actual GCS read/write operations
 */

import { AssessmentStorageV2Service } from '../lib/v2/services/assessment-storage-v2.service';
import { GCSStorageProvider } from '../lib/core/storage/providers/gcs-storage.provider';

async function testGCSOperations() {
  console.log('🚀 Starting Assessment V2 GCS Integration Test\n');
  
  const storage = new AssessmentStorageV2Service();
  const testUserEmail = 'gcs-test@example.com';
  
  try {
    // Test 1: Create Assessment Scenario
    console.log('1️⃣ Testing Scenario Creation (GCS Write)...');
    const scenario = await storage.saveScenario({
      sourceFile: 'gcs_test.yaml',
      sourceId: 'gcs_test_' + Date.now(),
      type: 'assessment',
      title: { 
        en: 'GCS Test Assessment',
        zh: 'GCS 測試評估'
      },
      description: { 
        en: 'Testing GCS read/write operations',
        zh: '測試 GCS 讀寫操作'
      },
      assessmentType: 'quick',
      difficulty: 'beginner',
      estimatedMinutes: 5,
      totalQuestions: 3,
      passingScore: 60,
      domains: ['engaging_with_ai'],
      competencies: ['AI.1.1'],
      questionPool: {
        total: 3,
        byDomain: { engaging_with_ai: 3 },
        byDifficulty: { basic: 3 }
      }
    });
    console.log(`✅ Scenario created and written to GCS: ${scenario.id}`);
    console.log(`   Path: v2/assessment-scenarios/${scenario.id}.json\n`);
    
    // Test 2: Read Scenario back
    console.log('2️⃣ Testing Scenario Read (GCS Read)...');
    const readScenario = await storage.getScenario(scenario.id);
    if (!readScenario) {
      throw new Error('Failed to read scenario from GCS');
    }
    console.log(`✅ Successfully read scenario from GCS`);
    console.log(`   Title: ${readScenario.title.en}`);
    console.log(`   Questions: ${readScenario.totalQuestions}\n`);
    
    // Test 3: Create Program
    console.log('3️⃣ Testing Program Creation...');
    const program = await storage.createProgram(testUserEmail, scenario.id, {
      language: 'zh',
      randomizeQuestions: false
    });
    console.log(`✅ Program created: ${program.id}`);
    console.log(`   User: ${program.userEmail}`);
    console.log(`   Path: v2/assessment-programs/${program.id}.json\n`);
    
    // Test 4: Create Tasks
    console.log('4️⃣ Testing Task Creation...');
    const testQuestions = [
      {
        id: 'gcs_q1',
        domain: 'engaging_with_ai',
        difficulty: 'basic',
        type: 'multiple_choice',
        question: { en: 'What is GCS?', zh: '什麼是 GCS？' },
        options: { 
          en: { 
            a: 'Google Cloud Storage', 
            b: 'General Computer System',
            c: 'Global Communication Service',
            d: 'Graphics Card Software'
          },
          zh: {
            a: 'Google 雲端儲存',
            b: '通用電腦系統',
            c: '全球通訊服務',
            d: '顯示卡軟體'
          }
        },
        correctAnswer: 'a',
        explanation: { 
          en: 'GCS stands for Google Cloud Storage',
          zh: 'GCS 是 Google Cloud Storage 的縮寫'
        },
        ksaMapping: {
          knowledge: ['K.1.1'],
          skills: [],
          attitudes: []
        }
      },
      {
        id: 'gcs_q2',
        domain: 'engaging_with_ai',
        difficulty: 'basic',
        type: 'multiple_choice',
        question: { en: 'Is this test working?', zh: '這個測試有效嗎？' },
        options: {
          en: { a: 'Yes', b: 'No' },
          zh: { a: '是', b: '否' }
        },
        correctAnswer: 'a',
        explanation: {
          en: 'If you see this, the test is working!',
          zh: '如果你看到這個，測試就成功了！'
        },
        ksaMapping: {
          knowledge: ['K.1.1'],
          skills: [],
          attitudes: []
        }
      }
    ];
    
    const tasks = await storage.createTasksForProgram(program.id, testQuestions);
    console.log(`✅ Created ${tasks.length} tasks`);
    tasks.forEach((task, i) => {
      console.log(`   Task ${i + 1}: ${task.id} -> v2/assessment-tasks/${task.id}.json`);
    });
    console.log('');
    
    // Test 5: Add Answer History (Testing embedded logs)
    console.log('5️⃣ Testing Answer History (Embedded Logs)...');
    const task1 = tasks[0];
    
    // Simulate user answering
    await storage.addAnswerToHistory(task1.id, 'view');
    console.log('   - Added: view action');
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate thinking time
    await storage.addAnswerToHistory(task1.id, 'answer', 'b');
    console.log('   - Added: answer action (b)');
    
    await new Promise(resolve => setTimeout(resolve, 300));
    await storage.addAnswerToHistory(task1.id, 'change', 'a');
    console.log('   - Added: change action (a)');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    const finalTask = await storage.addAnswerToHistory(task1.id, 'submit', 'a');
    console.log('   - Added: submit action (a)');
    console.log(`✅ Answer history saved with ${finalTask.answerHistory.length} entries\n`);
    
    // Test 6: Create Evaluation
    console.log('6️⃣ Testing Evaluation Creation...');
    const evaluation = await storage.createEvaluation(task1.id, true, 100);
    console.log(`✅ Evaluation created: ${evaluation.id}`);
    console.log(`   Path: v2/assessment-evaluations/${evaluation.id}.json\n`);
    
    // Test 7: Update Program Progress
    console.log('7️⃣ Testing Program Update...');
    const updatedProgram = await storage.updateProgram(program.id, {
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      progress: {
        currentQuestionIndex: 1,
        answeredQuestions: 1,
        totalQuestions: 2
      }
    });
    console.log(`✅ Program updated successfully`);
    console.log(`   Status: ${updatedProgram.status}`);
    console.log(`   Progress: ${updatedProgram.progress.answeredQuestions}/${updatedProgram.progress.totalQuestions}\n`);
    
    // Test 8: Test User Index
    console.log('8️⃣ Testing User Index...');
    const userPrograms = await storage.getUserPrograms(testUserEmail);
    console.log(`✅ User programs retrieved: ${userPrograms.length} programs`);
    console.log(`   Index path: v2/indexes/assessment-users/${testUserEmail}/programs.json\n`);
    
    // Test 9: Test Batch Loading
    console.log('9️⃣ Testing Batch Loading (getProgramWithDetails)...');
    const details = await storage.getProgramWithDetails(program.id);
    console.log('✅ Batch loaded program details:');
    console.log(`   Program: ${details.program?.id}`);
    console.log(`   Scenario: ${details.scenario?.title.en}`);
    console.log(`   Tasks: ${details.tasks.length}`);
    console.log(`   Evaluations: ${details.evaluations.length}\n`);
    
    // Test 10: Test Cache Performance
    console.log('🔟 Testing Cache Performance...');
    const start1 = Date.now();
    await storage.getScenario(scenario.id);
    const time1 = Date.now() - start1;
    console.log(`   First read: ${time1}ms (from GCS)`);
    
    const start2 = Date.now();
    await storage.getScenario(scenario.id);
    const time2 = Date.now() - start2;
    console.log(`   Second read: ${time2}ms (from cache)`);
    console.log(`   Cache speedup: ${Math.round(time1 / time2)}x faster\n`);
    
    // Test 11: Direct GCS Provider Test
    console.log('1️⃣1️⃣ Testing Direct GCS Provider...');
    const gcs = new GCSStorageProvider('ai-square-db', '');
    
    // Write test
    const testData = { 
      test: true, 
      timestamp: new Date().toISOString(),
      message: 'Direct GCS test'
    };
    const testPath = `v2/test/direct-gcs-test-${Date.now()}.json`;
    await gcs.set(testPath, testData);
    console.log(`✅ Direct write successful: ${testPath}`);
    
    // Read test
    const readData = await gcs.get(testPath);
    console.log(`✅ Direct read successful: ${readData.message}`);
    
    // Delete test
    await gcs.delete(testPath);
    console.log(`✅ Direct delete successful\n`);
    
    console.log('✨ All GCS operations completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Created 1 scenario`);
    console.log(`   - Created 1 program`);
    console.log(`   - Created ${tasks.length} tasks`);
    console.log(`   - Recorded ${finalTask.answerHistory.length} answer history entries`);
    console.log(`   - Created 1 evaluation`);
    console.log(`   - All data successfully written to and read from GCS`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
console.log('Running Assessment V2 GCS Integration Test...\n');
console.log('Environment:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT}`);
console.log(`  GCS_BUCKET: ai-square-db\n`);

testGCSOperations()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });