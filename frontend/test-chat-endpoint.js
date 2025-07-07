// Test script for chat endpoint
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'test@example.com';

// Simulate user cookie
const headers = {
  'Cookie': `user=${encodeURIComponent(JSON.stringify({ email: USER_EMAIL }))}`,
  'Content-Type': 'application/json'
};

async function testChatEndpoint() {
  console.log('=== Testing Chat Endpoint ===\n');

  try {
    // Use the test data from the previous test
    const programId = 'c73551b1-f662-46d0-bcec-0a02ab55489e';
    const taskId = '11acd5d3-72cc-4d5f-8ca3-ec6e6e512c53'; // First task UUID
    const scenarioId = 'ai-job-search';
    
    console.log('Testing chat with:');
    console.log(`- Program ID: ${programId}`);
    console.log(`- Task ID: ${taskId}`);
    console.log(`- Scenario ID: ${scenarioId}`);
    
    // Test chat request (old format with sessionId)
    console.log('\n1. Testing chat with old format (sessionId)...');
    const chatResponse = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Hello, I need help with industry analysis',
        sessionId: programId, // Old format
        context: {
          scenarioId: scenarioId,
          taskId: taskId, // Task ID in context
          taskTitle: 'Industry Analysis',
          taskDescription: 'Research current trends in your target industry',
          instructions: [
            'Use AI to identify top 5 trends in your industry',
            'Analyze skill requirements for your target role',
            'Create a summary of opportunities and challenges'
          ],
          expectedOutcome: 'A comprehensive industry analysis report',
          conversationHistory: []
        }
      })
    });
    
    console.log('Response status:', chatResponse.status);
    const chatResult = await chatResponse.json();
    console.log('Response:', JSON.stringify(chatResult, null, 2));
    
    if (chatResponse.ok && chatResult.success) {
      console.log('\n✅ Chat endpoint working with old format!');
      console.log('AI Response preview:', chatResult.response.substring(0, 200) + '...');
    } else {
      console.log('\n❌ Chat endpoint failed with old format');
    }
    
    // Test chat request (new format)
    console.log('\n2. Testing chat with new format (programId, taskId)...');
    const newChatResponse = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'What are the top trends in the tech industry?',
        programId: programId, // New format
        taskId: taskId,
        context: {
          scenarioId: scenarioId,
          conversationHistory: [{
            role: 'user',
            content: 'Hello, I need help with industry analysis'
          }, {
            role: 'assistant',
            content: chatResult.response || 'Previous response'
          }]
        }
      })
    });
    
    console.log('Response status:', newChatResponse.status);
    const newChatResult = await newChatResponse.json();
    
    if (newChatResponse.ok && newChatResult.success) {
      console.log('\n✅ Chat endpoint working with new format!');
      console.log('AI Response preview:', newChatResult.response.substring(0, 200) + '...');
    } else {
      console.log('\n❌ Chat endpoint failed with new format');
      console.log('Error:', newChatResult);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testChatEndpoint();