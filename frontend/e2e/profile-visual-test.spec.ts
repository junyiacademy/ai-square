import { test, expect } from '@playwright/test';

test('Visual test of profile page', async ({ page }) => {
  // 1. 登入
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'student@example.com');
  await page.fill('input[type="password"]', 'student123');
  
  // 點擊登入按鈕
  await page.click('button[type="submit"]');
  
  // 等待跳轉（可能會去 onboarding 或 dashboard）
  await page.waitForLoadState('networkidle');
  const afterLoginUrl = page.url();
  console.log('登入後 URL:', afterLoginUrl);
  
  // 2. 直接導航到 profile 頁面
  await page.goto('http://localhost:3000/profile');
  await page.waitForLoadState('networkidle');
  
  // 3. 檢查是否在 profile 頁面
  const currentUrl = page.url();
  console.log('當前 URL:', currentUrl);
  
  if (currentUrl.includes('/profile')) {
    console.log('✅ 成功進入 profile 頁面');
    
    // 截圖
    await page.screenshot({ 
      path: 'screenshots/profile-page-success.png', 
      fullPage: true 
    });
    
    // 測試更新功能
    const nameInput = page.locator('input#name');
    await nameInput.clear();
    await nameInput.fill('測試更新姓名');
    
    // 點擊儲存
    await page.click('button:has-text(/Save|儲存/)');
    
    // 等待成功訊息
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'screenshots/profile-after-update.png', 
      fullPage: true 
    });
    
  } else {
    console.log('❌ 無法進入 profile 頁面，被重定向到:', currentUrl);
    await page.screenshot({ 
      path: 'screenshots/profile-redirect-failed.png', 
      fullPage: true 
    });
  }
  
  // 4. 測試忘記密碼頁面
  await page.goto('http://localhost:3000/forgot-password');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ 
    path: 'screenshots/forgot-password-page.png', 
    fullPage: true 
  });
  
  // 5. 測試重設密碼頁面
  await page.goto('http://localhost:3000/reset-password?token=test');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ 
    path: 'screenshots/reset-password-page.png', 
    fullPage: true 
  });
});