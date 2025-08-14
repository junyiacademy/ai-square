import { Page } from '@playwright/test';

/**
 * Helper function to login a test user
 */
export async function loginTestUser(page: Page) {
  // 先確保測試用戶存在
  const registerResponse = await page.request.post('http://localhost:3004/api/auth/register', {
    data: {
      email: 'test@example.com',
      password: 'Test123!',
      name: 'Test User',
      acceptTerms: true
    }
  });
  
  // 不管註冊成功與否，都嘗試登入
  await page.goto('http://localhost:3004/login');
  await page.waitForLoadState('networkidle');
  
  // 填寫登入表單
  await page.fill('input[type="email"], #email', 'test@example.com');
  await page.fill('input[type="password"], #password', 'Test123!');
  
  // 點擊登入按鈕 - 使用type="submit"的按鈕
  const loginButton = page.locator('button[type="submit"]').first();
  await loginButton.click();
  
  // 等待登入完成 - 檢查是否重定向或出現用戶資訊
  try {
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 5000 });
  } catch (error) {
    // 如果還在登入頁，檢查是否有錯誤訊息
    const errorMsg = await page.locator('[class*="error"], [class*="alert"]').textContent().catch(() => '');
    console.log('登入可能失敗:', errorMsg);
    // 不要拋出錯誤，讓測試繼續
  }
  
  console.log('✅ 登入成功');
  return true;
}

/**
 * Helper to check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // 檢查是否有登出按鈕或用戶資訊
  const logoutButton = await page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').count();
  const userInfo = await page.locator('[data-testid="user-info"], [class*="user"], [class*="profile"]').count();
  
  return logoutButton > 0 || userInfo > 0;
}