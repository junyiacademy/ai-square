// Test script to check program data
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'test@example.com';
const PROGRAM_ID = '4ca9ca3d-d3f1-42a6-8089-28df1f3e1b9f';

// Simulate user cookie
const headers = {
  'Cookie': `user=${encodeURIComponent(JSON.stringify({ email: USER_EMAIL }))}`,
  'Content-Type': 'application/json'
};

async function testProgramData() {
  console.log('=== Testing Program Data ===\n');

  try {
    // Check if this is an old program or new architecture program
    console.log('1. Checking user programs...');
    const programsResponse = await fetch(`${BASE_URL}/api/pbl/user-programs`, {
      headers
    });
    
    const programsResult = await programsResponse.json();
    console.log('User programs response:', JSON.stringify(programsResult, null, 2));
    
    // Look for the specific program
    if (programsResult.success && programsResult.programs) {
      const targetProgram = programsResult.programs.find(p => p.id === PROGRAM_ID);
      if (targetProgram) {
        console.log('\nFound program:', JSON.stringify(targetProgram, null, 2));
      } else {
        console.log('\nProgram not found in new architecture. This might be an old program.');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testProgramData();