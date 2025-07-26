#!/usr/bin/env npx tsx

/**
 * Test AI evaluation to see why domain scores are empty
 */

async function testAIEvaluation() {
  console.log('🧪 Testing AI evaluation endpoint...\n');
  
  const baseUrl = 'http://localhost:3000';
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': 'user=%7B%22email%22%3A%22test%40example.com%22%2C%22name%22%3A%22Test%20User%22%7D'
  };
  
  // Test with a simple greeting
  const testData = {
    conversations: [
      { type: 'user', content: 'Hello, I want to learn about AI!' }
    ],
    task: {
      id: 'test-task',
      title: 'AI Exploration',
      description: 'Explore AI concepts',
      instructions: ['Ask questions about AI'],
      expectedOutcome: 'Understanding AI basics'
    },
    targetDomains: ['engaging_with_ai'],
    focusKSA: ['K1.1', 'S1.1'],
    language: 'en'
  };
  
  try {
    console.log('📤 Sending request to /api/pbl/evaluate...');
    const response = await fetch(`${baseUrl}/api/pbl/evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Request failed:', response.status, error);
      return;
    }
    
    const result = await response.json();
    console.log('\n✅ Response received:');
    console.log('Success:', result.success);
    
    if (result.evaluation) {
      console.log('\n📊 Evaluation Results:');
      console.log('  Overall Score:', result.evaluation.score);
      console.log('  KSA Scores:', JSON.stringify(result.evaluation.ksaScores, null, 2));
      console.log('  Domain Scores:', JSON.stringify(result.evaluation.domainScores, null, 2));
      console.log('  Rubrics Scores:', JSON.stringify(result.evaluation.rubricsScores, null, 2));
      
      // Check if domain scores exist
      if (!result.evaluation.domainScores || Object.keys(result.evaluation.domainScores).length === 0) {
        console.log('\n❌ Domain scores are missing or empty!');
      } else {
        console.log('\n✅ Domain scores are present');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testAIEvaluation();