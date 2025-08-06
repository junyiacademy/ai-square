#!/usr/bin/env npx tsx

import fetch from 'node-fetch';

async function testPasswordChange() {
  console.log('🧪 測試密碼變更功能...\n');
  
  // 1. 先登入
  console.log('1️⃣ 登入...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@example.com',
      password: 'student123'
    })
  });
  
  const loginData = await loginRes.json() as any;
  if (!loginData.success) {
    console.error('❌ 登入失敗:', loginData.error);
    return;
  }
  
  const sessionToken = loginData.sessionToken;
  console.log('✅ 登入成功\n');
  
  // 2. 測試密碼變更
  console.log('2️⃣ 變更密碼...');
  const changePasswordRes = await fetch('http://localhost:3000/api/auth/profile', {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'x-session-token': sessionToken
    },
    body: JSON.stringify({
      currentPassword: 'student123',
      newPassword: 'NewStudent123'
    })
  });
  
  const changePasswordData = await changePasswordRes.json() as any;
  console.log('狀態碼:', changePasswordRes.status);
  console.log('回應:', JSON.stringify(changePasswordData, null, 2));
  
  if (!changePasswordData.success) {
    console.error('❌ 變更密碼失敗');
    return;
  }
  
  console.log('✅ 密碼變更成功\n');
  
  // 3. 用新密碼登入測試
  console.log('3️⃣ 用新密碼登入...');
  const newLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@example.com',
      password: 'NewStudent123'
    })
  });
  
  const newLoginData = await newLoginRes.json() as any;
  if (newLoginData.success) {
    console.log('✅ 新密碼登入成功！');
  } else {
    console.log('❌ 新密碼登入失敗:', newLoginData.error);
  }
}

testPasswordChange().catch(console.error);