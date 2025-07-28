// Test Discovery Program Page
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testDiscoveryProgram() {
  const baseUrl = 'http://localhost:3001';
  
  // Step 1: Login
  console.log('Step 1: Login...');
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo.student@example.com',
      password: 'demo123'
    })
  });
  
  if (!loginResponse.ok) {
    console.error('Login failed:', await loginResponse.text());
    return;
  }
  
  const loginData = await loginResponse.json();
  const sessionToken = loginData.session?.sessionToken;
  console.log('✓ Logged in successfully');
  
  // Step 2: Get discovery scenarios
  console.log('\nStep 2: Get discovery scenarios...');
  const scenariosResponse = await fetch(`${baseUrl}/api/discovery/scenarios?lang=zh`, {
    headers: { 'x-session-token': sessionToken }
  });
  
  const scenariosData = await scenariosResponse.json();
  const scenarios = scenariosData.data?.scenarios || scenariosData;
  console.log(`✓ Found ${scenarios.length} scenarios`);
  
  if (scenarios.length === 0) {
    console.error('No scenarios found');
    return;
  }
  
  // Step 3: Create a program for the first scenario
  const scenario = scenarios[0];
  console.log(`\nStep 3: Create program for scenario: ${scenario.title}`);
  
  const createProgramResponse = await fetch(`${baseUrl}/api/discovery/scenarios/${scenario.id}/programs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken
    }
  });
  
  if (!createProgramResponse.ok) {
    console.error('Failed to create program:', await createProgramResponse.text());
    return;
  }
  
  const programData = await createProgramResponse.json();
  console.log(`✓ Created program: ${programData.id}`);
  
  // Step 4: Get program details
  console.log('\nStep 4: Get program details...');
  const programDetailsResponse = await fetch(
    `${baseUrl}/api/discovery/scenarios/${scenario.id}/programs/${programData.id}?lang=zh`,
    { headers: { 'x-session-token': sessionToken } }
  );
  
  if (!programDetailsResponse.ok) {
    console.error('Failed to get program details:', await programDetailsResponse.text());
    return;
  }
  
  const programDetails = await programDetailsResponse.json();
  console.log(`✓ Program details retrieved:`);
  console.log(`  - Status: ${programDetails.status}`);
  console.log(`  - Tasks: ${programDetails.totalTasks}`);
  console.log(`  - Career Type: ${programDetails.careerType}`);
  console.log(`  - Scenario Title: ${programDetails.scenarioTitle}`);
  
  // Display tasks
  console.log('\n  Tasks:');
  programDetails.tasks.forEach((task: any, index: number) => {
    console.log(`    ${index + 1}. ${task.title} (${task.status}) - ${task.xp} XP`);
  });
  
  console.log('\n✅ All tests passed!');
  console.log(`\nVisit: ${baseUrl}/discovery/scenarios/${scenario.id}/programs/${programData.id}`);
}

// Run the test
testDiscoveryProgram().catch(console.error);