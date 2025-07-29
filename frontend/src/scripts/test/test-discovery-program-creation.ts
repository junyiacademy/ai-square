/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env npx tsx

/**
 * Test script for Discovery Program creation API
 */

async function testProgramCreation() {
  console.log('🧪 Testing Discovery Program Creation API...\n');

  // First, simulate login to get session
  console.log('🔐 Logging in as demo student...');
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: 'student@example.com', 
      password: 'student123' 
    })
  });

  if (!loginResponse.ok) {
    console.error('❌ Failed to login:', await loginResponse.text());
    return;
  }

  const loginData = await loginResponse.json();
  console.log('✅ Logged in as:', loginData.user.email);
  console.log('📝 Login response:', loginData);

  // Extract session token and cookies
  const cookieHeader = loginResponse.headers.get('set-cookie') || '';
  
  // Extract sessionToken from cookies
  const sessionTokenMatch = cookieHeader.match(/sessionToken=([^;]+)/);
  const sessionToken = sessionTokenMatch ? sessionTokenMatch[1] : '';
  
  console.log('🍪 Cookies found:', !!cookieHeader);
  console.log('🔑 Session token extracted:', sessionToken);

  // Test scenario ID (YouTuber)
  const scenarioId = 'e0733099-acc5-4023-ae1f-8e02f85b2279';
  const apiUrl = `http://localhost:3000/api/discovery/scenarios/${scenarioId}/programs`;

  try {
    console.log(`📍 Testing POST ${apiUrl}`);
    console.log('📋 Request body:', { language: 'en' });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': sessionToken,
        'Cookie': cookieHeader || 'isLoggedIn=true; user=' + encodeURIComponent(JSON.stringify(loginData.user))
      },
      body: JSON.stringify({ language: 'en' })
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📄 Response headers:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log(`📝 Response body:`, responseText);

    if (!response.ok) {
      console.error(`\n❌ API returned error status: ${response.status}`);
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error details:', errorData);
      } catch {
        console.error('Raw error:', responseText);
      }
    } else {
      console.log('\n✅ Program created successfully!');
      const programData = JSON.parse(responseText);
      console.log('Program ID:', programData.id);
      console.log('Tasks created:', programData.tasks?.length || 0);
    }

  } catch (_error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testProgramCreation().catch(console.error);