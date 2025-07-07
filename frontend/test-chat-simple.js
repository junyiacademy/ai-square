// Simple test for chat endpoint with known IDs
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'debug@example.com';

// Use the last program created
const PROGRAM_ID = '0702b123-f8d8-4b83-93ee-70e1b89069c1';
const TASK_ID = '1b568ace-f4ca-4776-a165-384d6b5c764e';
const SCENARIO_ID = 'ai-job-search';

// Simulate user cookie
const headers = {
  'Cookie': `user=${encodeURIComponent(JSON.stringify({ email: USER_EMAIL }))}`,
  'Content-Type': 'application/json'
};

async function testChat() {
  console.log('=== Testing Chat with Known IDs ===\n');
  
  console.log('Program ID:', PROGRAM_ID);
  console.log('Task ID:', TASK_ID);
  console.log('User:', USER_EMAIL);

  try {
    // Test chat with old format
    console.log('\n1. Testing with sessionId format...');
    const response1 = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Hello, help me with tech industry analysis',
        sessionId: PROGRAM_ID,
        context: {
          scenarioId: SCENARIO_ID,
          taskId: TASK_ID
        }
      })
    });
    
    console.log('Response status:', response1.status);
    const result1 = await response1.json();
    console.log('Result:', JSON.stringify(result1, null, 2));
    
    // Test chat with new format
    console.log('\n2. Testing with new format...');
    const response2 = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'What are the top trends?',
        programId: PROGRAM_ID,
        taskId: TASK_ID,
        context: {
          scenarioId: SCENARIO_ID
        }
      })
    });
    
    console.log('Response status:', response2.status);
    const result2 = await response2.json();
    console.log('Result:', JSON.stringify(result2, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testChat();