#!/usr/bin/env npx tsx

import fetch from 'node-fetch';

async function testProfile() {
  console.log('🧪 測試個人資料管理功能...\n');
  
  // 1. 先登入取得 session
  console.log('1️⃣ 登入測試用戶...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@example.com',
      password: 'NewPassword123'
    })
  });
  
  const loginData = await loginRes.json() as any;
  if (!loginData.success) {
    console.error('❌ 登入失敗:', loginData.error);
    return;
  }
  
  const sessionToken = loginData.sessionToken;
  console.log('✅ 登入成功\n');
  
  // 2. 測試取得個人資料
  console.log('2️⃣ 取得個人資料...');
  const profileRes = await fetch('http://localhost:3000/api/auth/profile', {
    headers: { 
      'x-session-token': sessionToken
    }
  });
  
  const profileData = await profileRes.json() as any;
  if (!profileData.success) {
    console.error('❌ 取得個人資料失敗:', profileData.error);
    return;
  }
  
  console.log('✅ 個人資料:');
  console.log('   Email:', profileData.user.email);
  console.log('   姓名:', profileData.user.name);
  console.log('   角色:', profileData.user.role);
  console.log('   偏好語言:', profileData.user.preferredLanguage);
  console.log('   Email 已驗證:', profileData.user.emailVerified);
  console.log('');
  
  // 3. 測試更新個人資料
  console.log('3️⃣ 更新個人資料...');
  const updateRes = await fetch('http://localhost:3000/api/auth/profile', {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'x-session-token': sessionToken
    },
    body: JSON.stringify({
      name: 'Updated Student Name',
      preferredLanguage: 'zhTW'
    })
  });
  
  const updateData = await updateRes.json() as any;
  if (!updateData.success) {
    console.error('❌ 更新個人資料失敗:', updateData.error);
    return;
  }
  
  console.log('✅ 個人資料已更新:');
  console.log('   新姓名:', updateData.user.name);
  console.log('   新語言:', updateData.user.preferredLanguage);
  console.log('');
  
  // 4. 測試變更密碼
  console.log('4️⃣ 測試變更密碼...');
  const changePasswordRes = await fetch('http://localhost:3000/api/auth/profile', {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'x-session-token': sessionToken
    },
    body: JSON.stringify({
      currentPassword: 'NewPassword123',
      newPassword: 'UpdatedPassword123'
    })
  });
  
  const changePasswordData = await changePasswordRes.json() as any;
  if (!changePasswordData.success) {
    console.error('❌ 變更密碼失敗:', changePasswordData.error);
    console.error('   完整回應:', JSON.stringify(changePasswordData, null, 2));
    return;
  }
  
  console.log('✅ 密碼已成功變更\n');
  
  console.log('🎉 所有個人資料功能測試通過！');
}

testProfile().catch(console.error);