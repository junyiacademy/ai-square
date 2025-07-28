// Test Discovery interaction saving
const baseUrl = 'http://localhost:3000';

async function testInteraction() {
  // 1. Login
  console.log('1. Logging in...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@example.com',
      password: 'student123'
    })
  });
  
  const loginData = await loginRes.json();
  console.log('Login:', loginData.success ? '✓' : '✗');
  
  // Extract session token from headers
  const setCookieHeader = loginRes.headers.raw()['set-cookie'];
  let sessionToken = '';
  if (setCookieHeader) {
    const sessionCookie = setCookieHeader.find(cookie => cookie.includes('sessionToken'));
    if (sessionCookie) {
      sessionToken = sessionCookie.split('sessionToken=')[1].split(';')[0];
    }
  }
  
  // 2. Submit answer to task
  const taskId = 'f1eae2cc-7c00-4450-a355-68d5d363cfdd';
  const programId = 'b1940bdd-5540-48fe-a684-b8a953985b9b';
  const scenarioId = '393f567e-9cc2-46bf-9384-74e91b0d0785';
  
  console.log('\n2. Submitting answer...');
  const submitRes = await fetch(
    `${baseUrl}/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': sessionToken
      },
      body: JSON.stringify({
        action: 'submit',
        content: {
          response: '我計劃創作一個關於科技改變生活的影片系列，每集探討一個新技術如何影響我們的日常生活。',
          timeSpent: 120
        }
      })
    }
  );
  
  const submitData = await submitRes.json();
  console.log('Submit response:', submitRes.status === 200 ? '✓' : '✗');
  console.log('AI feedback:', submitData.feedback?.substring(0, 100) + '...');
  
  // 3. Get task to check interactions
  console.log('\n3. Checking saved interactions...');
  const getRes = await fetch(
    `${baseUrl}/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}?lang=zh`,
    { headers: { 'x-session-token': token } }
  );
  
  const taskData = await getRes.json();
  console.log('Interactions count:', taskData.interactions?.length || 0);
  
  if (taskData.interactions) {
    taskData.interactions.forEach((interaction, i) => {
      console.log(`\nInteraction ${i + 1}:`);
      console.log('- Type:', interaction.type);
      console.log('- Timestamp:', interaction.timestamp);
      console.log('- Content:', typeof interaction.content === 'string' 
        ? interaction.content.substring(0, 50) + '...' 
        : JSON.stringify(interaction.content).substring(0, 50) + '...');
    });
  }
}

testInteraction().catch(console.error);