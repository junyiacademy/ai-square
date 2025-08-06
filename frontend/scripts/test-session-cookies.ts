#!/usr/bin/env npx tsx

import fetch from 'node-fetch';

async function testSessionCookies() {
  console.log('🧪 測試 Session 和 Cookie 管理...\n');
  
  // 1. 登入
  console.log('1️⃣ 登入並檢查 cookies...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@example.com',
      password: 'student123',
      rememberMe: true
    })
  });
  
  const loginData = await loginRes.json() as any;
  console.log('登入成功:', loginData.success);
  console.log('Session token:', loginData.sessionToken?.substring(0, 20) + '...');
  
  // 檢查 response headers
  const setCookieHeaders = loginRes.headers.raw()['set-cookie'];
  console.log('\nSet-Cookie headers:');
  setCookieHeaders?.forEach((cookie: string) => {
    const [name] = cookie.split('=');
    console.log(`- ${name}: ${cookie.includes('Max-Age=2592000') ? '30 days' : 'other'}`);
  });
  
  // 2. 使用不同方式測試 profile API
  console.log('\n2️⃣ 測試 profile API 存取...');
  
  // 方式 1: 使用 x-session-token header
  console.log('\n使用 x-session-token header:');
  const profile1 = await fetch('http://localhost:3000/api/auth/profile', {
    headers: { 
      'x-session-token': loginData.sessionToken
    }
  });
  console.log('- 狀態:', profile1.status);
  
  // 方式 2: 使用 Cookie header
  console.log('\n使用 Cookie header:');
  const profile2 = await fetch('http://localhost:3000/api/auth/profile', {
    headers: { 
      'Cookie': `session_token=${loginData.sessionToken}`
    }
  });
  console.log('- 狀態:', profile2.status);
  const data2 = await profile2.json() as any;
  console.log('- 成功:', data2.success);
  if (data2.success) {
    console.log('- Email:', data2.user.email);
  }
  
  // 3. 測試 auth check API
  console.log('\n3️⃣ 測試 auth check (如果存在)...');
  const authCheck = await fetch('http://localhost:3000/api/auth/check', {
    headers: { 
      'Cookie': `session_token=${loginData.sessionToken}`
    }
  });
  console.log('- /api/auth/check 狀態:', authCheck.status);
}

testSessionCookies().catch(console.error);