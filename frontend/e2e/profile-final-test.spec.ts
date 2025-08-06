import { test, expect } from '@playwright/test';

test('Profile page access after login fix', async ({ page }) => {
  // 1. 清除所有 cookies
  await page.context().clearCookies();
  
  // 2. 登入
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'student@example.com');
  await page.fill('input[type="password"]', 'student123');
  await page.click('button[type="submit"]');
  
  // 3. 等待登入成功
  await page.waitForLoadState('networkidle');
  console.log('登入後 URL:', page.url());
  
  // 4. 檢查 cookies
  const cookies = await page.context().cookies();
  console.log('Cookies 設置:');
  cookies.forEach(cookie => {
    if (['isLoggedIn', 'sessionToken', 'accessToken'].includes(cookie.name)) {
      console.log(`- ${cookie.name}: ${cookie.value ? '✓' : '✗'}`);
    }
  });
  
  // 5. 訪問 profile 頁面
  await page.goto('http://localhost:3000/profile');
  await page.waitForLoadState('networkidle');
  
  const currentUrl = page.url();
  console.log('Profile 頁面 URL:', currentUrl);
  
  // 6. 檢查是否成功進入 profile 頁面
  if (currentUrl.includes('/profile')) {
    console.log('✅ 成功進入 profile 頁面！');
    
    // 截圖
    await page.screenshot({ 
      path: 'screenshots/profile-success.png', 
      fullPage: true 
    });
    
    // 檢查頁面元素
    const emailInput = await page.locator('input[type="email"]').inputValue();
    console.log('Email 欄位:', emailInput);
    
    const h1Text = await page.locator('h1').textContent();
    console.log('頁面標題:', h1Text);
    
    // 測試姓名更新
    const nameInput = page.locator('input#name');
    if (await nameInput.isVisible()) {
      await nameInput.clear();
      await nameInput.fill('測試姓名更新');
      
      // 點擊儲存按鈕
      const saveButton = page.locator('button[type="submit"]');
      await saveButton.click();
      
      // 等待成功訊息
      await page.waitForTimeout(2000);
      
      // 最終截圖
      await page.screenshot({ 
        path: 'screenshots/profile-after-save.png', 
        fullPage: true 
      });
      
      console.log('✅ Profile 頁面功能測試完成！');
    }
  } else {
    console.log('❌ 仍然無法進入 profile 頁面');
    await page.screenshot({ 
      path: 'screenshots/profile-still-failed.png', 
      fullPage: true 
    });
  }
});