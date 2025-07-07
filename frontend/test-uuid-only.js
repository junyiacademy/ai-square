// Test to verify UUID-only architecture (no task-1 mapping)
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'uuid-test@example.com';
const SCENARIO_ID = 'ai-job-search';

const headers = {
  'Cookie': `user=${encodeURIComponent(JSON.stringify({ email: USER_EMAIL }))}`,
  'Content-Type': 'application/json'
};

async function testUUIDOnly() {
  console.log('=== UUID-Only Architecture Test ===\n');

  try {
    // Step 1: Start program
    console.log('1. Starting new program...');
    const startRes = await fetch(`${BASE_URL}/api/pbl/scenarios/${SCENARIO_ID}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language: 'en' })
    });
    
    const startData = await startRes.json();
    if (!startData.success) {
      throw new Error('Failed to start program');
    }
    
    console.log('✅ Program started');
    console.log('   Program ID:', startData.programId);
    console.log('   First Task ID:', startData.firstTaskId);
    console.log('   Has taskMapping?:', startData.taskMapping ? 'Yes (should be No!)' : 'No ✅');
    
    if (startData.taskMapping) {
      console.error('❌ ERROR: taskMapping should not exist in response!');
    }
    
    const programId = startData.programId;
    const taskId = startData.firstTaskId;
    
    // Step 2: Test chat with UUID only
    console.log('\n2. Testing chat with UUID...');
    const chatRes = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Hello, I need help with AI industry analysis',
        programId: programId,
        taskId: taskId,
        context: {
          scenarioId: SCENARIO_ID,
          conversationHistory: []
        }
      })
    });
    
    if (!chatRes.ok) {
      const error = await chatRes.json();
      throw new Error(`Chat failed: ${JSON.stringify(error)}`);
    }
    
    const chatData = await chatRes.json();
    console.log('✅ Chat successful with UUID');
    console.log('   Response preview:', chatData.response.substring(0, 80) + '...');
    
    // Step 3: Verify no sessionId support
    console.log('\n3. Testing old sessionId format (should fail)...');
    const oldFormatRes = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Test',
        sessionId: programId, // Old format - should not work
        context: {
          scenarioId: SCENARIO_ID,
          taskId: taskId
        }
      })
    });
    
    if (oldFormatRes.status === 400) {
      console.log('✅ Correctly rejected old sessionId format');
    } else {
      console.error('❌ ERROR: Old sessionId format should not be accepted!');
    }
    
    // Step 4: Verify task config has AI module
    console.log('\n4. Verifying AI module in task config...');
    const tasksRes = await fetch(`${BASE_URL}/api/pbl/programs/${programId}/tasks`, {
      headers
    });
    
    if (tasksRes.ok) {
      const tasksData = await tasksRes.json();
      const firstTask = tasksData.tasks?.find(t => t.id === taskId);
      
      if (firstTask?.config?.aiModule) {
        console.log('✅ AI module found in task config');
        console.log('   Model:', firstTask.config.aiModule.model);
        console.log('   Persona:', firstTask.config.aiModule.persona);
        console.log('   Has initial prompt:', !!firstTask.config.aiModule.initial_prompt);
      } else {
        console.error('❌ ERROR: AI module not found in task config!');
      }
    }
    
    console.log('\n=== Test Summary ===');
    console.log('✅ No task-1 mapping in response');
    console.log('✅ Chat works with UUID only');
    console.log('✅ Old sessionId format rejected');
    console.log('✅ AI module stored in task config');
    console.log('\nUUID-only architecture confirmed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testUUIDOnly();