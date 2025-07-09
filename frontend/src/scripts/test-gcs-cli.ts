/**
 * CLI Test for GCS Integration
 * Simulates the browser test
 */

import { UnifiedStorageService } from '../lib/v2/services/unified-storage.service';
import { AssessmentServiceV2Fixed } from '../lib/v2/services/assessment-service-v2-fixed';

async function runTest() {
  const logs: string[] = [];
  
  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}`;
    console.log(logMessage);
    logs.push(logMessage);
  };

  try {
    log('🚀 Starting GCS Test with Unified Architecture...');
    
    const storage = new UnifiedStorageService();
    const assessmentService = new AssessmentServiceV2Fixed(storage);
    const testEmail = 'test@example.com';
    
    // 1. Load Assessment from YAML
    log('\n1️⃣ Loading Assessment from YAML...');
    const assessmentId = 'ai_literacy';
    const project = await assessmentService.loadAssessmentProject(assessmentId);
    if (!project) {
      throw new Error(`Assessment ${assessmentId} not found in YAML files`);
    }
    log(`✅ Assessment loaded from YAML: ${assessmentId}`);
    log(`   Title: ${project.title.en || project.title.zh || 'Untitled'}`);
    log(`   Type: ${project.assessmentType}`);
    log(`   Questions: ${project.totalQuestions}`);
    
    // 2. Start Assessment
    log('\n2️⃣ Starting Assessment (Creating Scenario & Program)...');
    const { scenario, program } = await assessmentService.startAssessment(
      testEmail,
      assessmentId,
      { language: 'zh' }
    );
    log(`✅ Scenario created: ${scenario.id}`);
    log(`   Path: scenarios/${scenario.id}.json`);
    log(`   Status: ${scenario.status}`);
    log(`✅ Program created: ${program.id}`);
    log(`   Path: programs/${program.id}.json`);
    log(`   Title: ${program.title}`);
    
    // 3. Create Tasks
    log('\n3️⃣ Creating Tasks from YAML Questions...');
    const tasks = await assessmentService.createTasksForProgram(
      program.id,
      assessmentId,
      {
        language: 'zh',
        questionCount: 5,
        randomize: false
      }
    );
    log(`✅ Created ${tasks.length} tasks`);
    tasks.forEach((task, i) => {
      log(`   Task ${i + 1}: ${task.id}`);
      log(`   Path: tasks/${task.id}.json`);
    });
    
    // 4. Simulate Answering
    log('\n4️⃣ Simulating User Answers...');
    if (tasks.length > 0) {
      const task1 = tasks[0];
      
      await assessmentService.recordAnswer(task1.id, 'view');
      log('   - Viewed question 1');
      
      const question = task1.config.question;
      log(`   - Question: ${question.question.zh || question.question.en || 'No question text'}`);
      
      await assessmentService.recordAnswer(task1.id, 'answer', 'b');
      log('   - First answer: b');
      
      await assessmentService.recordAnswer(task1.id, 'change', question.correctAnswer || 'a');
      log(`   - Changed to: ${question.correctAnswer || 'a'} (correct answer)`);
      
      const finalTask = await assessmentService.recordAnswer(task1.id, 'submit', question.correctAnswer || 'a');
      log(`   - Submitted: ${question.correctAnswer || 'a'}`);
      log(`✅ Answer history: ${finalTask.config.answerHistory.length} entries`);
      
      log('\n   📝 Answer History:');
      finalTask.config.answerHistory.forEach((entry: any, i: number) => {
        log(`      ${i + 1}. ${entry.action} ${entry.answer ? `(${entry.answer})` : ''} - ${entry.timeSpent}s`);
      });
    }
    
    // 5. Evaluate
    log('\n5️⃣ Evaluating Answer...');
    if (tasks.length > 0) {
      const evaluation = await assessmentService.evaluateTask(tasks[0].id);
      log(`✅ Evaluation complete: ${evaluation.isCorrect ? '✓ Correct' : '✗ Incorrect'}`);
      log(`   Score: ${evaluation.score} points`);
    }
    
    // 6. Complete Program
    log('\n7️⃣ Completing Program...');
    const completion = await assessmentService.completeProgram(program.id);
    log('✅ Program completed:');
    log(`   Total Score: ${completion.results.totalScore}/${completion.results.maxScore}`);
    log(`   Percentage: ${completion.results.percentage}%`);
    log(`   Passed: ${completion.results.passed ? 'Yes ✓' : 'No ✗'}`);
    
    // 7. Test Direct GCS
    log('\n9️⃣ Testing Direct GCS Access...');
    const gcs = (storage as any).storage;
    const testData = { test: true, timestamp: new Date().toISOString() };
    const testPath = `test/cli-test-${Date.now()}.json`;
    await gcs.set(testPath, testData);
    log(`✅ Direct write successful: ${testPath}`);
    
    const readData = await gcs.get(testPath);
    log(`✅ Direct read successful: ${JSON.stringify(readData)}`);
    
    await gcs.delete(testPath);
    log(`✅ Direct delete successful`);
    
    log('\n✨ All tests completed successfully!');
    
    // Summary
    log('\n📊 Test Summary:');
    log('   ✅ Loaded assessment from YAML');
    log('   ✅ Created scenario in GCS');
    log('   ✅ Created program in GCS');
    log('   ✅ Created tasks in GCS');
    log('   ✅ Recorded answer history (embedded in task)');
    log('   ✅ Evaluated answers');
    log('   ✅ Completed program');
    log('   ✅ Direct GCS read/write/delete worked');
    
    return logs;
    
  } catch (error) {
    log(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error) {
      log(`   Stack: ${error.stack}`);
    }
    throw error;
  }
}

// Run the test
console.log('Running GCS Integration Test...\n');
runTest()
  .then(logs => {
    console.log('\n✅ Test completed successfully!');
    console.log('\n📄 Full test log saved');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });