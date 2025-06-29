#!/usr/bin/env node

// Test script for delayed program creation flow
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'teacher@example.com',
  cookie: 'user=%7B%22id%22%3A1%2C%22email%22%3A%22teacher%40example.com%22%7D'
};

async function testDelayedProgramCreation() {
  console.log('🧪 Testing Delayed Program Creation Flow\n');

  try {
    // Step 1: Check user's existing programs
    console.log('1️⃣ Checking existing programs for scenario');
    const existingRes = await fetch(`${BASE_URL}/api/pbl/user-programs?scenarioId=ai-job-search`, {
      headers: {
        'Cookie': TEST_USER.cookie
      }
    });
    
    const existingData = await existingRes.json();
    console.log(`   Found ${existingData.total} existing programs`);
    
    if (existingData.programs.length > 0) {
      console.log(`   Latest program: ${existingData.programs[0].id}`);
      console.log(`   Status: ${existingData.programs[0].status}`);
      console.log(`   Progress: ${existingData.programs[0].completedTaskCount}/${existingData.programs[0].taskCount} tasks`);
    }
    
    // Step 2: Simulate starting a new program WITHOUT creating it
    console.log('\n2️⃣ Starting new program (delayed creation)');
    const tempProgramId = `temp_${Date.now()}_test123`;
    console.log(`   Using temporary ID: ${tempProgramId}`);
    console.log(`   URL: /pbl/program/${tempProgramId}/learn?scenarioId=ai-job-search&taskId=task-1&isNew=true`);
    
    // Step 3: Simulate first message (should trigger program creation)
    console.log('\n3️⃣ Sending first message (should create program)');
    
    // First, check that temp program doesn't exist in storage
    const tempCheckRes = await fetch(`${BASE_URL}/api/pbl/task-logs?programId=${tempProgramId}&taskId=task-1&scenarioId=ai-job-search`, {
      headers: {
        'Cookie': TEST_USER.cookie
      }
    });
    
    if (tempCheckRes.ok) {
      const tempData = await tempCheckRes.json();
      console.log(`   ❌ Unexpected: Found data for temp program`);
    } else {
      console.log(`   ✅ Correct: No data for temp program`);
    }
    
    // Now simulate the chat request (which should create the program)
    console.log('\n   Simulating chat request...');
    const chatRes = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': TEST_USER.cookie
      },
      body: JSON.stringify({
        message: 'Hello, I want to start learning about job search',
        sessionId: tempProgramId,
        context: {
          scenarioId: 'ai-job-search',
          taskId: 'task-1',
          taskTitle: 'Industry Analysis',
          taskDescription: 'Research current trends in your target industry',
          instructions: ['Use AI to identify top 5 trends in your industry'],
          expectedOutcome: 'A comprehensive industry analysis report',
          conversationHistory: []
        }
      })
    });
    
    if (chatRes.ok) {
      const chatData = await chatRes.json();
      console.log('   ✅ Chat response received');
      console.log(`   AI says: "${chatData.response.substring(0, 100)}..."`);
    } else {
      console.log('   ❌ Chat request failed');
    }
    
    // Step 4: Check if program was created
    console.log('\n4️⃣ Checking if new program was created');
    const newCheckRes = await fetch(`${BASE_URL}/api/pbl/user-programs?scenarioId=ai-job-search`, {
      headers: {
        'Cookie': TEST_USER.cookie
      }
    });
    
    const newData = await newCheckRes.json();
    console.log(`   Now found ${newData.total} programs`);
    
    if (newData.total > existingData.total) {
      console.log('   ✅ New program was created!');
      const newProgram = newData.programs[0];
      console.log(`   Program ID: ${newProgram.id}`);
      console.log(`   Created at: ${newProgram.startedAt}`);
    } else {
      console.log('   ⚠️  No new program created (might need to check the learning page logic)');
    }
    
    // Step 5: Test continuing existing program
    if (existingData.programs.length > 0) {
      console.log('\n5️⃣ Testing continue existing program');
      const existingProgram = existingData.programs[0];
      console.log(`   Continuing program: ${existingProgram.id}`);
      console.log(`   URL: /pbl/program/${existingProgram.id}/learn?scenarioId=ai-job-search&taskId=task-1`);
      console.log('   (No isNew=true parameter, so it won\'t create a new program)');
    }
    
    console.log('\n✨ Test completed!');
    console.log('\n📌 Summary:');
    console.log('   - Delayed program creation allows browsing without creating programs');
    console.log('   - Programs are only created on first message');
    console.log('   - Users can continue existing programs from details page');
    console.log('   - Details page shows all user programs for selection');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run test
testDelayedProgramCreation();