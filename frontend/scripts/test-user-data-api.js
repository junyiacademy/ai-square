/**
 * 直接測試 user-data API
 */

const fetch = require('node-fetch');

async function testUserDataAPI() {
  console.log('Testing user-data API...\n');
  
  try {
    // 1. 先登入取得 token
    console.log('1. Logging in...');
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123',
        rememberMe: false
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginResponse.status);
    
    if (!loginResponse.ok) {
      console.log('Login failed:', loginData);
      return;
    }
    
    console.log('Login successful, user:', loginData.user?.email);
    const sessionToken = loginData.sessionToken;
    
    // 2. 測試 user-data API
    console.log('\n2. Testing /api/user-data...');
    const userDataResponse = await fetch('http://localhost:3002/api/user-data', {
      headers: {
        'x-session-token': sessionToken || '',
        'Cookie': loginResponse.headers.get('set-cookie') || ''
      }
    });
    
    console.log('User data response status:', userDataResponse.status);
    
    const userData = await userDataResponse.json();
    
    if (!userDataResponse.ok) {
      console.log('User data error:', userData);
      
      // 如果是 500 錯誤，顯示詳細信息
      if (userDataResponse.status === 500) {
        console.log('\n=== 500 ERROR DETAILS ===');
        console.log(JSON.stringify(userData, null, 2));
      }
    } else {
      console.log('User data loaded successfully');
      console.log('Assessment sessions:', userData.assessmentSessions?.length || 0);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// 執行測試
testUserDataAPI();