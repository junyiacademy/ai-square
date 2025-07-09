'use client';

import { useState } from 'react';
import { UnifiedStorageService } from '@/lib/v2/services/unified-storage.service';
import { AssessmentServiceV2Fixed } from '@/lib/v2/services/assessment-service-v2-fixed';

export default function TestGCSPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const runGCSTest = async () => {
    setIsRunning(true);
    setError(null);
    setLogs([]);
    
    try {
      addLog('🚀 Starting GCS Test with Unified Architecture...');
      
      const storage = new UnifiedStorageService();
      const assessmentService = new AssessmentServiceV2Fixed(storage);
      const testEmail = 'test@example.com';
      
      // 1. Load Assessment from YAML (not creating in GCS)
      addLog('1️⃣ Loading Assessment from YAML...');
      const assessmentId = 'ai_literacy'; // This should exist in public/assessment_data/
      const project = await assessmentService.loadAssessmentProject(assessmentId);
      if (!project) {
        throw new Error(`Assessment ${assessmentId} not found in YAML files`);
      }
      addLog(`✅ Assessment loaded from YAML: ${assessmentId}`);
      addLog(`   Title: ${project.title.en || project.title.zh || 'Untitled'}`);
      addLog(`   Type: ${project.assessmentType}`);
      addLog(`   Questions: ${project.totalQuestions}`);
      
      // 2. Start Assessment (Create Scenario & Program)
      addLog('\n2️⃣ Starting Assessment (Creating Scenario & Program)...');
      const { scenario, program } = await assessmentService.startAssessment(
        testEmail,
        assessmentId,
        { language: 'zh' }
      );
      addLog(`✅ Scenario created: ${scenario.id}`);
      addLog(`   Path: scenarios/${scenario.id}.json`);
      addLog(`   Status: ${scenario.status}`);
      addLog(`✅ Program created: ${program.id}`);
      addLog(`   Path: programs/${program.id}.json`);
      addLog(`   Title: ${program.title}`);
      
      // 3. Create Tasks from YAML Questions
      addLog('\n3️⃣ Creating Tasks from YAML Questions...');
      const tasks = await assessmentService.createTasksForProgram(
        program.id,
        assessmentId,
        {
          language: 'zh',
          questionCount: 5, // Only load 5 questions for testing
          randomize: false
        }
      );
      addLog(`✅ Created ${tasks.length} tasks`);
      tasks.forEach((task, i) => {
        addLog(`   Task ${i + 1}: ${task.id}`);
        addLog(`   Path: tasks/${task.id}.json`);
      });
      
      // 4. Simulate Answering
      addLog('\n4️⃣ Simulating User Answers...');
      if (tasks.length > 0) {
        const task1 = tasks[0];
        
        // View question
        await assessmentService.recordAnswer(task1.id, 'view');
        addLog('   - Viewed question 1');
        
        // Get the actual question to know correct answer
        const question = task1.config.question;
        addLog(`   - Question: ${question.question.zh || question.question.en}`);
        
        // Answer incorrectly first
        await new Promise(resolve => setTimeout(resolve, 500));
        await assessmentService.recordAnswer(task1.id, 'answer', 'b');
        addLog('   - First answer: b');
        
        // Change to correct answer
        await new Promise(resolve => setTimeout(resolve, 300));
        await assessmentService.recordAnswer(task1.id, 'change', question.correctAnswer);
        addLog(`   - Changed to: ${question.correctAnswer} (correct answer)`);
        
        // Submit
        await new Promise(resolve => setTimeout(resolve, 200));
        const finalTask = await assessmentService.recordAnswer(task1.id, 'submit', question.correctAnswer);
        addLog(`   - Submitted: ${question.correctAnswer}`);
        addLog(`✅ Answer history: ${finalTask.config.answerHistory.length} entries`);
        
        // Show answer history details
        addLog('\n   📝 Answer History:');
        finalTask.config.answerHistory.forEach((entry: any, i: number) => {
          addLog(`      ${i + 1}. ${entry.action} ${entry.answer ? `(${entry.answer})` : ''} - ${entry.timeSpent}s`);
        });
      }
      
      // 5. Evaluate
      addLog('\n5️⃣ Evaluating Answer...');
      if (tasks.length > 0) {
        const evaluation = await assessmentService.evaluateTask(tasks[0].id);
        addLog(`✅ Evaluation complete: ${evaluation.isCorrect ? '✓ Correct' : '✗ Incorrect'}`);
        addLog(`   Score: ${evaluation.score} points`);
      }
      
      // 6. Complete more tasks for better testing
      addLog('\n6️⃣ Completing More Tasks...');
      for (let i = 1; i < Math.min(3, tasks.length); i++) {
        const task = tasks[i];
        const q = task.config.question;
        
        await assessmentService.recordAnswer(task.id, 'view');
        await assessmentService.recordAnswer(task.id, 'submit', q.correctAnswer);
        const eval = await assessmentService.evaluateTask(task.id);
        
        addLog(`   Task ${i + 1}: ${eval.isCorrect ? '✓' : '✗'} (${eval.score} points)`);
      }
      
      // 7. Complete Program
      addLog('\n7️⃣ Completing Program...');
      const completion = await assessmentService.completeProgram(program.id);
      addLog('✅ Program completed:');
      addLog(`   Total Score: ${completion.results.totalScore}/${completion.results.maxScore}`);
      addLog(`   Percentage: ${completion.results.percentage}%`);
      addLog(`   Passed: ${completion.results.passed ? 'Yes ✓' : 'No ✗'}`);
      addLog(`   Time Spent: ${Math.round(completion.results.timeSpent / 60)} minutes`);
      
      // 8. Get User History
      addLog('\n8️⃣ Getting User Assessment History...');
      const history = await assessmentService.getUserAssessmentHistory(testEmail);
      addLog(`✅ User has ${history.scenarios.length} assessment scenario(s)`);
      
      history.scenarios.forEach((item, i) => {
        addLog(`\n   Scenario ${i + 1}: ${item.scenario.metadata.assessmentId}`);
        addLog(`   - Status: ${item.scenario.status}`);
        addLog(`   - Programs: ${item.programs.length}`);
        if (item.latestAttempt) {
          addLog(`   - Latest Score: ${item.latestAttempt.metadata.results?.percentage}%`);
        }
      });
      
      // 9. Test Direct GCS Access
      addLog('\n9️⃣ Testing Direct GCS Access...');
      const gcs = (storage as any).storage;
      const testData = { test: true, timestamp: new Date().toISOString() };
      const testPath = `test/browser-test-${Date.now()}.json`;
      await gcs.set(testPath, testData);
      addLog(`✅ Direct write successful: ${testPath}`);
      
      const readData = await gcs.get(testPath);
      addLog(`✅ Direct read successful: ${JSON.stringify(readData)}`);
      
      await gcs.delete(testPath);
      addLog(`✅ Direct delete successful`);
      
      addLog('✨ All tests completed successfully!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`❌ Error: ${errorMessage}`);
      setError(errorMessage);
      console.error('Test failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">GCS Integration Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          
          <button
            onClick={runGCSTest}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-medium ${
              isRunning
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRunning ? 'Running Test...' : 'Run GCS Test'}
          </button>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Error:</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Logs</h2>
          
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click "Run GCS Test" to start.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 text-sm text-gray-600">
          <p>This test will:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Create an assessment project in GCS</li>
            <li>Start an assessment scenario and program</li>
            <li>Create questions as tasks</li>
            <li>Record answer history with embedded logs</li>
            <li>Evaluate answers</li>
            <li>Retrieve user history</li>
            <li>Test direct GCS read/write/delete operations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}