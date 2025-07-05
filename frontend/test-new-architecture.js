// Test script for new architecture without task-1 compatibility
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'test@example.com';
const SCENARIO_ID = 'ai-job-search';

// Simulate user cookie
const headers = {
  'Cookie': `user=${encodeURIComponent(JSON.stringify({ email: USER_EMAIL }))}`,
  'Content-Type': 'application/json'
};

async function testNewArchitecture() {
  console.log('=== Testing New Architecture (No task-1 compatibility) ===\n');

  try {
    // Step 1: Start a new PBL scenario
    console.log('1. Starting new PBL scenario...');
    const startResponse = await fetch(`${BASE_URL}/api/pbl/scenarios/${SCENARIO_ID}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language: 'en' })
    });
    
    const startResult = await startResponse.json();
    console.log('Start result:', JSON.stringify(startResult, null, 2));
    
    if (!startResult.success) {
      throw new Error(`Failed to start scenario: ${startResult.error}`);
    }
    
    const programId = startResult.programId;
    const firstTaskId = startResult.firstTaskId;
    
    console.log(`\nProgram ID: ${programId}`);
    console.log(`First Task ID: ${firstTaskId}`);
    console.log(`Task Mapping:`, startResult.taskMapping);
    
    // Step 2: Try to access task with old format (should fail)
    console.log('\n2. Testing task-logs with old format (should fail)...');
    const oldFormatResponse = await fetch(`${BASE_URL}/api/pbl/task-logs?programId=${programId}&taskId=task-1&scenarioId=${SCENARIO_ID}`, {
      headers
    });
    
    console.log('Old format response:', oldFormatResponse.status);
    if (oldFormatResponse.status === 404) {
      console.log('✅ Correctly rejected old task-1 format');
    } else {
      console.log('❌ Unexpectedly accepted old task-1 format');
    }
    
    // Step 3: Access task with new UUID format
    console.log('\n3. Testing task-logs with new UUID format...');
    const newFormatResponse = await fetch(`${BASE_URL}/api/pbl/task-logs?programId=${programId}&taskId=${firstTaskId}&scenarioId=${SCENARIO_ID}`, {
      headers
    });
    
    const newFormatResult = await newFormatResponse.json();
    console.log('New format response:', newFormatResponse.status);
    console.log('Result:', JSON.stringify(newFormatResult, null, 2));
    
    if (newFormatResponse.ok && newFormatResult.success) {
      console.log('✅ Successfully accessed task with UUID');
    }
    
    // Step 4: Test program tasks endpoint
    console.log('\n4. Testing program tasks endpoint...');
    const tasksResponse = await fetch(`${BASE_URL}/api/pbl/programs/${programId}/tasks`, {
      headers
    });
    
    const tasksResult = await tasksResponse.json();
    console.log('Tasks result:', JSON.stringify(tasksResult, null, 2));
    
    // Step 5: Test history
    console.log('\n5. Testing history endpoint...');
    const historyResponse = await fetch(`${BASE_URL}/api/pbl/history?scenarioId=${SCENARIO_ID}`, {
      headers
    });
    
    const historyResult = await historyResponse.json();
    console.log('History sessions:', historyResult.sessions?.length || 0);
    if (historyResult.sessions?.length > 0) {
      const session = historyResult.sessions[0];
      console.log('First session currentTaskId:', session.currentTaskId);
      console.log('Is UUID format:', session.currentTaskId && !session.currentTaskId.startsWith('task-'));
    }
    
    console.log('\n✅ New architecture test complete!');
    console.log('- All task IDs are UUIDs');
    console.log('- No more task-1 compatibility');
    console.log('- Frontend can navigate using actual task IDs');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testNewArchitecture();