/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env npx tsx

/**
 * Test the evaluation flow to ensure domain scores are properly saved
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testEvaluationFlow() {
  console.log('🧪 Testing evaluation flow...\n');
  
  const baseUrl = 'http://localhost:3000';
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': 'user=%7B%22email%22%3A%22test%40example.com%22%2C%22name%22%3A%22Test%20User%22%7D'
  };
  
  // Test data
  const testConversations = [
    { type: 'user', content: 'Hi there!' }
  ];
  
  const testTask = {
    id: 'test-task-id',
    title: 'Test Task',
    description: 'Test Description',
    instructions: ['Test instruction'],
    expectedOutcome: 'Test outcome'
  };
  
  try {
    // Step 1: Call the AI evaluation endpoint
    console.log('1️⃣ Calling AI evaluation endpoint...');
    const evalResponse = await fetch(`${baseUrl}/api/pbl/evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        conversations: testConversations,
        task: testTask,
        targetDomains: ['engaging_with_ai'],
        focusKSA: ['K1.1'],
        language: 'en'
      })
    });
    
    if (!evalResponse.ok) {
      throw new Error(`Evaluation failed: ${evalResponse.status}`);
    }
    
    const evalResult = await evalResponse.json();
    console.log('✅ AI Evaluation Response:');
    console.log('   Overall Score:', evalResult.evaluation?.score);
    console.log('   Domain Scores:', JSON.stringify(evalResult.evaluation?.domainScores || {}, null, 2));
    console.log('   KSA Scores:', JSON.stringify(evalResult.evaluation?.ksaScores || {}, null, 2));
    
    // Check if domain scores exist
    const domainScores = evalResult.evaluation?.domainScores;
    if (!domainScores || Object.keys(domainScores).length === 0) {
      console.log('\n❌ ERROR: Domain scores are missing from AI response!');
    } else {
      console.log('\n✅ Domain scores received from AI');
    }
    
    // Step 2: Save evaluation to database
    console.log('\n2️⃣ Saving evaluation to database...');
    const saveResponse = await fetch(`${baseUrl}/api/pbl/tasks/test-task-123/evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        evaluation: evalResult.evaluation,
        programId: 'test-program-123'
      })
    });
    
    if (!saveResponse.ok) {
      const error = await saveResponse.text();
      console.log('❌ Save failed:', error);
      return;
    }
    
    const saveResult = await saveResponse.json();
    console.log('✅ Saved successfully');
    console.log('   Evaluation ID:', saveResult.data?.evaluationId);
    
    // Step 3: Retrieve and verify
    console.log('\n3️⃣ Retrieving evaluation from database...');
    const getResponse = await fetch(`${baseUrl}/api/pbl/tasks/test-task-123/evaluate`, {
      headers
    });
    
    if (!getResponse.ok) {
      console.log('❌ Retrieval failed');
      return;
    }
    
    const getResult = await getResponse.json();
    console.log('✅ Retrieved evaluation:');
    console.log('   Domain Scores:', JSON.stringify(getResult.data?.evaluation?.domainScores || {}, null, 2));
    
    // Verify domain scores
    const retrievedDomainScores = getResult.data?.evaluation?.domainScores;
    if (!retrievedDomainScores || Object.keys(retrievedDomainScores).length === 0) {
      console.log('\n❌ ERROR: Domain scores lost during save/retrieve!');
    } else {
      console.log('\n✅ Domain scores successfully saved and retrieved');
    }
    
  } catch (_error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testEvaluationFlow();