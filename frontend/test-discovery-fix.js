// Quick test for Discovery program page
const baseUrl = 'http://localhost:3000';

async function testDiscovery() {
  // 1. Login
  console.log('1. Logging in...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo.student@example.com',
      password: 'demo123'
    })
  });
  
  const loginData = await loginRes.json();
  const token = loginData.session?.sessionToken;
  console.log('Login result:', loginData.success ? '✓' : '✗');
  
  // 2. Get program data
  console.log('\n2. Getting program data...');
  const programRes = await fetch(
    `${baseUrl}/api/discovery/scenarios/393f567e-9cc2-46bf-9384-74e91b0d0785/programs/bbf27135-9f63-49a2-a955-df3b7e40636c?lang=zh`,
    { headers: { 'x-session-token': token } }
  );
  
  const programData = await programRes.json();
  console.log('Program response status:', programRes.status);
  
  // 3. Check tasks
  console.log('\n3. Tasks data:');
  if (programData.tasks) {
    programData.tasks.forEach((task, i) => {
      console.log(`\nTask ${i}:`);
      console.log('- title type:', typeof task.title);
      console.log('- title value:', JSON.stringify(task.title).substring(0, 100) + '...');
      console.log('- description type:', typeof task.description);
      console.log('- description value:', JSON.stringify(task.description).substring(0, 100) + '...');
    });
  } else {
    console.log('No tasks found!');
    console.log('Full response:', JSON.stringify(programData, null, 2));
  }
}

testDiscovery().catch(console.error);