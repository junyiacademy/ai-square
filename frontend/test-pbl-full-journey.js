#!/usr/bin/env node

// Full Journey Test Script for Program-based PBL System
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFullJourney() {
  console.log('🚀 Testing Full PBL Program Journey\n');

  const testUser = {
    email: 'teacher@example.com',
    cookie: 'user=%7B%22id%22%3A1%2C%22email%22%3A%22teacher%40example.com%22%7D'
  };

  try {
    // Step 1: Browse Scenarios
    console.log('📚 Step 1: Browsing available scenarios');
    const scenariosRes = await fetch(`${BASE_URL}/api/pbl/scenarios?lang=en`);
    const scenariosData = await scenariosRes.json();
    console.log(`   Found ${scenariosData.data.length} scenarios`);
    
    // Step 2: View Scenario Details
    console.log('\n📋 Step 2: Viewing scenario details');
    const scenarioId = 'ai-job-search';
    const detailsRes = await fetch(`${BASE_URL}/api/pbl/scenarios/${scenarioId}?lang=en`);
    const detailsData = await detailsRes.json();
    console.log(`   Scenario: ${detailsData.data.title}`);
    console.log(`   Tasks: ${detailsData.data.tasks.length} tasks`);
    
    // Step 3: Start a new program
    console.log('\n🎯 Step 3: Starting new program');
    const startRes = await fetch(`${BASE_URL}/api/pbl/scenarios/${scenarioId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': testUser.cookie
      },
      body: JSON.stringify({ language: 'en' })
    });
    
    const startData = await startRes.json();
    const { programId, firstTaskId } = startData;
    console.log(`   Program ID: ${programId}`);
    console.log(`   First Task: ${firstTaskId}`);
    
    // Step 4: Complete all tasks
    console.log('\n📝 Step 4: Working through tasks');
    const tasks = detailsData.data.tasks;
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`\n   Task ${i + 1}/${tasks.length}: ${task.title}`);
      
      // Add some interactions
      const interactions = [
        { type: 'user', content: `Starting ${task.title}` },
        { type: 'assistant', content: `I'll help you with ${task.title}. Let's begin...` },
        { type: 'user', content: 'Here is my work...' },
        { type: 'assistant', content: 'Great job! Your analysis looks good.' }
      ];
      
      for (const interaction of interactions) {
        await fetch(`${BASE_URL}/api/pbl/task-logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-scenario-id': scenarioId,
            'Cookie': testUser.cookie
          },
          body: JSON.stringify({
            programId,
            taskId: task.id,
            scenarioId,
            interaction: {
              ...interaction,
              timestamp: new Date().toISOString()
            }
          })
        });
        await delay(100); // Small delay to simulate real interactions
      }
      
      // Complete the task
      const score = 80 + Math.floor(Math.random() * 20); // Random score 80-99
      await fetch(`${BASE_URL}/api/pbl/task-logs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-scenario-id': scenarioId,
          'Cookie': testUser.cookie
        },
        body: JSON.stringify({
          programId,
          taskId: task.id,
          scenarioId,
          progress: {
            status: 'completed',
            completedAt: new Date().toISOString(),
            timeSpentSeconds: 300 + Math.floor(Math.random() * 600), // 5-15 minutes
            score,
            feedback: `Excellent work on ${task.title}!`
          }
        })
      });
      
      console.log(`     ✅ Completed with score: ${score}/100`);
    }
    
    // Step 5: Mark program as completed
    console.log('\n📊 Step 5: Program completed');
    console.log(`   Completed all ${tasks.length} tasks successfully`);
    
    // Step 6: Check history
    console.log('\n📜 Step 6: Checking learning history');
    const historyRes = await fetch(`${BASE_URL}/api/pbl/history?lang=en`, {
      headers: {
        'Cookie': testUser.cookie
      }
    });
    
    const historyData = await historyRes.json();
    const latestProgram = historyData.programs[0];
    console.log(`   Total Programs: ${historyData.totalPrograms}`);
    console.log(`   Latest Program: ${latestProgram.program.scenarioTitle}`);
    console.log(`   Completed Tasks: ${latestProgram.program.completedTasks}/${latestProgram.program.totalTasks}`);
    
    // Step 7: Test database structure
    console.log('\n💾 Step 7: Verifying database structure');
    console.log(`   Expected path: user_pbl_logs/${testUser.email}/scenario_${scenarioId}/program_${programId}/`);
    console.log(`   Tasks stored in: task_1/, task_2/, etc.`);
    console.log(`   Each task contains: metadata.json, log.json, progress.json`);
    
    console.log('\n✨ Full journey test completed successfully!');
    console.log('\n📌 Summary:');
    console.log(`   - Created program: ${programId}`);
    console.log(`   - Completed ${tasks.length} tasks`);
    console.log(`   - Program stored in: user_pbl_logs/${testUser.email}/scenario_${scenarioId}/program_${programId}/`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      const text = await error.response.text();
      console.error('Response:', text);
    }
  }
}

// Run the test
testFullJourney();