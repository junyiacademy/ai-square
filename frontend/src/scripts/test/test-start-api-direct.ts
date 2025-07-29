/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
import 'dotenv/config';

async function testStartAPI() {
  const scenarioId = '8fb1f265-cd53-4199-9d5c-c2ab2297621d';
  const baseUrl = 'http://localhost:3000';
  
  console.log('Testing Start API directly...\n');
  
  try {
    // Create encoded cookie
    const userCookie = encodeURIComponent(JSON.stringify({ email: 'student@example.com' }));
    
    console.log('1. Making POST request to:', `${baseUrl}/api/pbl/scenarios/${scenarioId}/start`);
    console.log('2. Cookie:', `user=${userCookie}`);
    
    const response = await fetch(`${baseUrl}/api/pbl/scenarios/${scenarioId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `user=${userCookie}`
      },
      body: JSON.stringify({ language: 'en' })
    });
    
    console.log('3. Response status:', response.status);
    console.log('4. Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('5. Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ Success! Program ID:', data.id);
      console.log('   First task ID:', data.firstTaskId);
      console.log('   Task count:', data.tasks?.length || 0);
    } else {
      console.log('\n❌ Failed:', data.error);
      if (data.details) {
        console.log('   Details:', data.details);
      }
    }
    
  } catch (_error) {
    console.error('\n❌ Error making request:', error);
  }
}

testStartAPI();