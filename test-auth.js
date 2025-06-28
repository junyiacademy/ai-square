// 測試認證流程
const baseUrl = 'http://localhost:3000'

async function testAuth() {
  console.log('🔍 開始測試認證流程...\n')
  
  // 1. 測試登入
  console.log('1️⃣  測試登入 API...')
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'student@example.com',
      password: 'student123'
    })
  })
  
  const loginData = await loginResponse.json()
  const cookies = loginResponse.headers.get('set-cookie')
  console.log('登入回應:', loginData)
  console.log('Cookies 設定:', cookies ? '✅ 有設定 cookies' : '❌ 沒有設定 cookies')
  
  // 2. 測試認證檢查
  console.log('\n2️⃣  測試認證檢查 API...')
  const checkResponse = await fetch(`${baseUrl}/api/auth/check`, {
    headers: {
      'Cookie': cookies || ''
    }
  })
  
  const checkData = await checkResponse.json()
  console.log('認證狀態:', checkData)
  
  // 3. 測試登出
  console.log('\n3️⃣  測試登出 API...')
  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Cookie': cookies || ''
    }
  })
  
  const logoutData = await logoutResponse.json()
  const newCookies = logoutResponse.headers.get('set-cookie')
  console.log('登出回應:', logoutData)
  console.log('Cookies 清除:', newCookies ? '✅ 有清除 cookies' : '❌ 沒有清除 cookies')
  
  // 4. 再次檢查認證狀態
  console.log('\n4️⃣  登出後檢查認證狀態...')
  const finalCheckResponse = await fetch(`${baseUrl}/api/auth/check`, {
    headers: {
      'Cookie': newCookies || ''
    }
  })
  
  const finalCheckData = await finalCheckResponse.json()
  console.log('最終認證狀態:', finalCheckData)
  
  console.log('\n✅ 測試完成！')
}

// 執行測試
testAuth().catch(console.error)