// Complete test script for chat endpoint
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'test@example.com';
const SCENARIO_ID = 'ai-job-search';

// Simulate user cookie
const headers = {
  'Cookie': `user=${encodeURIComponent(JSON.stringify({ email: USER_EMAIL }))}`,
  'Content-Type': 'application/json'
};

async function testChatComplete() {
  console.log('=== Testing Chat Endpoint with Fresh Program ===\n');

  try {
    // Step 1: Start a new program
    console.log('1. Starting new PBL scenario...');
    const startResponse = await fetch(`${BASE_URL}/api/pbl/scenarios/${SCENARIO_ID}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language: 'en' })
    });
    
    if (!startResponse.ok) {
      const error = await startResponse.text();
      throw new Error(`Failed to start scenario: ${error}`);
    }
    
    const startResult = await startResponse.json();
    console.log('Program started successfully');
    console.log(`- Program ID: ${startResult.programId}`);
    console.log(`- First Task ID: ${startResult.firstTaskId}`);
    
    const programId = startResult.programId;
    const taskId = startResult.firstTaskId;
    
    // Step 2: Test chat with old format (sessionId)
    console.log('\n2. Testing chat with old format (sessionId in body)...');
    const oldFormatResponse = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Hello, I want to analyze the tech industry',
        sessionId: programId, // Old format
        context: {
          scenarioId: SCENARIO_ID,
          taskId: taskId, // Task ID in context
          conversationHistory: []
        }
      })
    });
    
    console.log('Response status:', oldFormatResponse.status);
    if (oldFormatResponse.ok) {
      const result = await oldFormatResponse.json();
      console.log('✅ Chat working with old format!');
      console.log('AI says:', result.response.substring(0, 150) + '...');
    } else {
      const error = await oldFormatResponse.json();
      console.log('❌ Chat failed:', error);
    }
    
    // Step 3: Test chat with new format
    console.log('\n3. Testing chat with new format (programId, taskId at top level)...');
    const newFormatResponse = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'What are the top 5 trends in AI and machine learning?',
        programId: programId,
        taskId: taskId,
        context: {
          scenarioId: SCENARIO_ID,
          conversationHistory: []
        }
      })
    });
    
    console.log('Response status:', newFormatResponse.status);
    if (newFormatResponse.ok) {
      const result = await newFormatResponse.json();
      console.log('✅ Chat working with new format!');
      console.log('AI says:', result.response.substring(0, 150) + '...');
    } else {
      const error = await newFormatResponse.json();
      console.log('❌ Chat failed:', error);
    }
    
    // Step 4: Test with missing fields
    console.log('\n4. Testing with missing fields (should fail gracefully)...');
    const missingFieldsResponse = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Hello',
        // Missing programId/sessionId
        context: {
          scenarioId: SCENARIO_ID
        }
      })
    });
    
    console.log('Response status:', missingFieldsResponse.status);
    if (missingFieldsResponse.status === 400) {
      console.log('✅ Correctly rejected request with missing fields');
    } else {
      console.log('❌ Should have returned 400 for missing fields');
    }
    
    console.log('\n=== Chat endpoint test complete ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testChatComplete();