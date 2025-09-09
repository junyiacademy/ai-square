const baseUrl = 'https://ai-square-staging-731209836128.asia-east1.run.app';
const scenarioId = '078f8bbe-d004-4d3f-b74f-cb8fe8630898';

async function testSimpleCompletion() {
  console.log('🔧 Testing Simplified Assessment Completion');
  
  try {
    // Step 1: Login
    console.log('📝 Step 1: Login');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    };
    
    // Step 2: Create program
    console.log('🚀 Step 2: Create Program');
    const createResponse = await fetch(`${baseUrl}/api/assessment/scenarios/${scenarioId}/programs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'start' })
    });
    
    if (!createResponse.ok) {
      throw new Error('Create program failed');
    }
    
    const createData = await createResponse.json();
    const programId = createData.program?.id;
    console.log(`✅ Program created: ${programId}`);
    
    // Step 3: Test simplified completion API
    console.log('🎯 Step 3: Test Simplified Completion');
    const completionResponse = await fetch(`${baseUrl}/api/assessment/programs/${programId}/complete-simple`, {
      method: 'POST',
      headers
    });
    
    const completionData = await completionResponse.json();
    console.log(`Completion status: ${completionResponse.status}`);
    console.log('Completion response:', completionData);
    
    if (completionResponse.ok) {
      console.log('✅ Simplified completion API working!');
      console.log('Results:', {
        success: completionData.success,
        evaluationId: completionData.evaluationId,
        score: completionData.score
      });
      
      // Step 4: Test completion page
      console.log('📄 Step 4: Test Completion Page');
      const pageResponse = await fetch(`${baseUrl}/assessment/scenarios/${scenarioId}/program/${programId}/complete`, {
        headers: { 'Cookie': cookies || '' }
      });
      
      console.log(`Completion page status: ${pageResponse.status}`);
      
      if (pageResponse.ok) {
        console.log('✅ Completion page accessible');
      } else {
        console.log('⚠️ Completion page not accessible, but API works');
      }
      
    } else {
      console.log('❌ Simplified completion failed:', completionData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleCompletion();
