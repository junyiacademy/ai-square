const baseUrl = 'https://ai-square-staging-731209836128.asia-east1.run.app';
const scenarioId = '078f8bbe-d004-4d3f-b74f-cb8fe8630898';

async function testAssessmentCompletion() {
  console.log('🚀 Testing Assessment Completion APIs');
  
  try {
    // Step 1: Login to get session
    console.log('📝 Step 1: Login');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log(`Login status: ${loginResponse.status}`);
    console.log('Login response:', loginData);
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    // Extract cookies/token if needed
    const cookies = loginResponse.headers.get('set-cookie');
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    };
    
    // Step 2: Create assessment program
    console.log('🚀 Step 2: Creating Assessment Program');
    const createResponse = await fetch(`${baseUrl}/api/assessment/scenarios/${scenarioId}/programs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'start' })
    });
    
    const createData = await createResponse.json();
    console.log(`Create program status: ${createResponse.status}`);
    console.log('Create program response:', createData);
    
    if (!createResponse.ok) {
      throw new Error('Create program failed');
    }
    
    const programId = createData.program?.id;
    if (!programId) {
      throw new Error('No program ID returned');
    }
    
    console.log(`✅ Program created with ID: ${programId}`);
    
    // Step 3: Test completion API
    console.log('🎯 Step 3: Testing Completion API');
    const completionResponse = await fetch(`${baseUrl}/api/assessment/programs/${programId}/complete`, {
      method: 'POST',
      headers
    });
    
    const completionData = await completionResponse.json();
    console.log(`Completion status: ${completionResponse.status}`);
    console.log('Completion response:', completionData);
    
    if (completionResponse.ok) {
      console.log('✅ Assessment completion API working correctly');
      console.log('Completion results:', {
        success: completionData.success,
        programId: completionData.programId,
        hasResults: !!completionData.results
      });
    } else {
      console.log('❌ Assessment completion API failed');
    }
    
    // Step 4: Test completion page
    console.log('📄 Step 4: Testing Completion Page Access');
    const pageResponse = await fetch(`${baseUrl}/assessment/scenarios/${scenarioId}/program/${programId}/complete`, {
      headers
    });
    
    console.log(`Completion page status: ${pageResponse.status}`);
    
    if (pageResponse.ok) {
      const pageContent = await pageResponse.text();
      const hasCompletionContent = pageContent.includes('complet') || pageContent.includes('result');
      console.log(`✅ Completion page accessible, has completion content: ${hasCompletionContent}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAssessmentCompletion();
