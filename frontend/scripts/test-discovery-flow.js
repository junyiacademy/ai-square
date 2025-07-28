/**
 * 測試 Discovery 流程
 */

const fetch = require('node-fetch');

async function testDiscoveryFlow() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Testing Discovery Flow...\n');
  
  try {
    // 1. 登入
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('Login failed:', loginResponse.status);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData.user?.email);
    
    // 獲取 cookies
    const cookies = loginResponse.headers.get('set-cookie') || '';
    const sessionToken = loginData.sessionToken;
    
    // 2. 測試 user-data API
    console.log('\n2. Testing /api/user-data...');
    const userDataResponse = await fetch(`${baseUrl}/api/user-data`, {
      headers: {
        'Cookie': cookies,
        'x-session-token': sessionToken || ''
      }
    });
    
    console.log('User data response:', userDataResponse.status);
    if (userDataResponse.ok) {
      const userData = await userDataResponse.json();
      console.log('Assessment sessions:', userData.assessmentSessions?.length || 0);
      console.log('User data loaded successfully!');
    } else {
      const error = await userDataResponse.json();
      console.error('User data error:', error);
    }
    
    // 3. 測試 Discovery scenarios API
    console.log('\n3. Testing Discovery scenarios...');
    const scenariosResponse = await fetch(`${baseUrl}/api/discovery/scenarios`, {
      headers: {
        'Cookie': cookies,
        'x-session-token': sessionToken || ''
      }
    });
    
    console.log('Discovery scenarios response:', scenariosResponse.status);
    if (scenariosResponse.ok) {
      const data = await scenariosResponse.json();
      console.log('Scenarios found:', data.data?.scenarios?.length || 0);
      
      if (data.data?.scenarios?.length > 0) {
        console.log('First scenario:', data.data.scenarios[0].title);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// 執行測試
testDiscoveryFlow();