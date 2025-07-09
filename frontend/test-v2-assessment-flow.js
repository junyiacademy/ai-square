// Test script for v2 assessment flow
// Run this with: node test-v2-assessment-flow.js

async function testAssessmentFlow() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('Testing V2 Assessment Flow...\n');
  
  try {
    // 1. Test assessment list
    console.log('1. Testing assessment list API...');
    const listResponse = await fetch(`${baseUrl}/api/v2/assessment/list?lang=en`);
    const listData = await listResponse.json();
    console.log(`   ✓ Found ${listData.data?.length || 0} assessments`);
    
    if (!listData.data || listData.data.length === 0) {
      console.log('   ✗ No assessments found');
      return;
    }
    
    const firstAssessment = listData.data[0];
    console.log(`   ✓ First assessment: ${firstAssessment.title} (${firstAssessment.id})`);
    
    // 2. Test start assessment
    console.log('\n2. Testing start assessment API...');
    console.log('   Note: This will fail if not authenticated');
    
    const startResponse = await fetch(`${baseUrl}/api/v2/assessment/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: firstAssessment.id,
        language: 'en'
      })
    });
    
    if (startResponse.ok) {
      const startData = await startResponse.json();
      console.log(`   ✓ Created scenario: ${startData.data.scenarioId}`);
      console.log(`   ✓ Created program: ${startData.data.programId}`);
      console.log(`   ✓ Created ${startData.data.taskIds.length} tasks`);
    } else {
      const error = await startResponse.json();
      console.log(`   ✗ Start failed: ${error.error}`);
    }
    
    console.log('\n3. Testing page navigation...');
    console.log(`   - List page: ${baseUrl}/v2/assessment`);
    console.log(`   - Detail page: ${baseUrl}/v2/assessment/${firstAssessment.id}`);
    console.log(`   - Start page: ${baseUrl}/v2/assessment/${firstAssessment.id}/start`);
    console.log(`   - Program page: ${baseUrl}/v2/assessment/${firstAssessment.id}/programs/[programId]`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testAssessmentFlow();