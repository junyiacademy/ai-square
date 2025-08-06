#!/usr/bin/env npx tsx

import fetch from 'node-fetch';

async function testLoginRedirect() {
  console.log('🧪 測試登入重定向問題...\n');
  
  // 1. 測試登入 API
  console.log('1️⃣ 測試登入 API...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@example.com',
      password: 'UpdatedPassword123',
      rememberMe: true
    })
  });
  
  const loginData = await loginRes.json() as any;
  console.log('登入回應:', JSON.stringify(loginData, null, 2));
  
  if (!loginData.success) {
    console.error('❌ 登入失敗');
    return;
  }
  
  console.log('\n檢查 user 物件結構:');
  console.log('- onboarding:', loginData.user?.onboarding);
  console.log('- assessmentCompleted:', loginData.user?.assessmentCompleted);
  console.log('- role:', loginData.user?.role);
  
  // 2. 測試直接訪問 profile 頁面
  console.log('\n2️⃣ 測試訪問 profile 頁面...');
  const profileRes = await fetch('http://localhost:3000/api/auth/profile', {
    headers: { 
      'Cookie': `session_token=${loginData.sessionToken}`,
      'x-session-token': loginData.sessionToken
    }
  });
  
  console.log('Profile 回應狀態:', profileRes.status);
  const profileData = await profileRes.json() as any;
  console.log('Profile 回應:', JSON.stringify(profileData, null, 2));
}

testLoginRedirect().catch(console.error);