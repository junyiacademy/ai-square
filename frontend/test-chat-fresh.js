// Fresh test for chat endpoint with consistent user
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'fresh-test@example.com'; // Fresh email
const SCENARIO_ID = 'ai-job-search';

// Simulate user cookie
const headers = {
  'Cookie': `user=${encodeURIComponent(JSON.stringify({ email: USER_EMAIL }))}`,
  'Content-Type': 'application/json'
};

async function testChatFresh() {
  console.log('=== Fresh Chat Test ===\n');
  console.log('User:', USER_EMAIL);

  try {
    // Step 1: Start a new program
    console.log('\n1. Starting new PBL scenario...');
    const startResponse = await fetch(`${BASE_URL}/api/pbl/scenarios/${SCENARIO_ID}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language: 'en' })
    });
    
    if (!startResponse.ok) {
      console.error('Failed to start:', await startResponse.text());
      return;
    }
    
    const startResult = await startResponse.json();
    console.log('Program created successfully');
    console.log(`- Program ID: ${startResult.programId}`);
    console.log(`- First Task ID: ${startResult.firstTaskId}`);
    
    const programId = startResult.programId;
    const taskId = startResult.firstTaskId;
    
    // Step 2: Immediately test chat (no delay)
    console.log('\n2. Testing chat immediately...');
    const chatResponse = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Hello, I want to analyze the tech industry',
        programId: programId,
        taskId: taskId,
        context: {
          scenarioId: SCENARIO_ID,
          conversationHistory: []
        }
      })
    });
    
    console.log('Chat response status:', chatResponse.status);
    const chatResult = await chatResponse.json();
    
    if (chatResponse.ok && chatResult.success) {
      console.log('✅ Chat successful!');
      console.log('AI response preview:', chatResult.response.substring(0, 200) + '...');
    } else {
      console.log('❌ Chat failed:', chatResult);
      
      // Try task-logs to verify
      console.log('\n3. Verifying with task-logs...');
      const taskLogsResponse = await fetch(
        `${BASE_URL}/api/pbl/task-logs?programId=${programId}&taskId=${taskId}&scenarioId=${SCENARIO_ID}`,
        { headers }
      );
      console.log('Task logs status:', taskLogsResponse.status);
      if (taskLogsResponse.ok) {
        console.log('✅ Task IS found by task-logs endpoint!');
        console.log('This confirms the task exists but chat endpoint has issues.');
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testChatFresh();