// Test script for draft program flow
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'test@example.com';
const SCENARIO_ID = 'ai-education-design'; // Using underscore format from folder names

// Simulate user cookie
const headers = {
  'Cookie': `user=${encodeURIComponent(JSON.stringify({ email: USER_EMAIL }))}`,
  'Content-Type': 'application/json'
};

async function testDraftProgramFlow() {
  console.log('=== Testing Draft Program Flow ===\n');

  try {
    // Step 1: Create a draft program
    console.log('1. Creating draft program...');
    const createResponse = await fetch(`${BASE_URL}/api/pbl/scenarios/${SCENARIO_ID}/create-draft`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language: 'en' })
    });
    
    const createResult = await createResponse.json();
    console.log('Create result:', JSON.stringify(createResult, null, 2));
    
    if (!createResult.success) {
      throw new Error(`Failed to create draft: ${createResult.error}`);
    }
    
    console.log(`\nDraft program created with ID: ${createResult.programId}\n`);
    
    // Step 2: Query for draft program
    console.log('2. Querying for draft program...');
    const queryResponse = await fetch(`${BASE_URL}/api/pbl/draft-program?scenarioId=${SCENARIO_ID}`, {
      headers
    });
    
    const queryResult = await queryResponse.json();
    console.log('Query result:', JSON.stringify(queryResult, null, 2));
    
    if (!queryResult.success) {
      console.error('Failed to find draft program:', queryResult.error);
    } else {
      console.log('\nSuccessfully found draft program!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testDraftProgramFlow();