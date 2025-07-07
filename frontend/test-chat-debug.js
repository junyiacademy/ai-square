// Debug test for chat endpoint
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'debug@example.com'; // Different email to avoid conflicts
const SCENARIO_ID = 'ai-job-search';

// Simulate user cookie
const headers = {
  'Cookie': `user=${encodeURIComponent(JSON.stringify({ email: USER_EMAIL }))}`,
  'Content-Type': 'application/json'
};

async function testChatDebug() {
  console.log('=== Debug Chat Test ===\n');

  try {
    // Step 1: Start a new program
    console.log('1. Starting new PBL scenario...');
    const startResponse = await fetch(`${BASE_URL}/api/pbl/scenarios/${SCENARIO_ID}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language: 'en' })
    });
    
    const startResult = await startResponse.json();
    if (!startResult.success) {
      throw new Error('Failed to start program');
    }
    
    console.log('Program created:');
    console.log(`- Program ID: ${startResult.programId}`);
    console.log(`- First Task ID: ${startResult.firstTaskId}`);
    console.log(`- Task Mapping:`, JSON.stringify(startResult.taskMapping, null, 2));
    
    // Wait a bit for storage consistency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Try to get task logs to verify task exists
    console.log('\n2. Verifying task exists via task-logs...');
    const taskLogsResponse = await fetch(
      `${BASE_URL}/api/pbl/task-logs?programId=${startResult.programId}&taskId=${startResult.firstTaskId}&scenarioId=${SCENARIO_ID}`,
      { headers }
    );
    
    const taskLogsResult = await taskLogsResponse.json();
    console.log('Task logs response:', taskLogsResponse.status);
    if (taskLogsResponse.ok) {
      console.log('✅ Task found via task-logs endpoint');
    } else {
      console.log('❌ Task not found via task-logs:', taskLogsResult);
    }
    
    // Step 3: Test chat
    console.log('\n3. Testing chat endpoint...');
    const chatResponse = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Hello, help me analyze the tech industry',
        sessionId: startResult.programId,
        context: {
          scenarioId: SCENARIO_ID,
          taskId: startResult.firstTaskId,
          conversationHistory: []
        }
      })
    });
    
    console.log('Chat response status:', chatResponse.status);
    const chatResult = await chatResponse.json();
    
    if (chatResponse.ok) {
      console.log('✅ Chat successful!');
      console.log('AI response preview:', chatResult.response.substring(0, 100) + '...');
    } else {
      console.log('❌ Chat failed:', chatResult);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testChatDebug();