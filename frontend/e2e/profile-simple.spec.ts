import { test, expect } from '@playwright/test';

test('Profile page manual test', async ({ page }) => {
  // 1. 先截圖登入頁面
  await page.goto('http://localhost:3000/login');
  await page.screenshot({ path: 'screenshots/01-login-page.png', fullPage: true });
  
  // 2. 填寫登入表單
  await page.fill('input[type="email"]', 'student@example.com');
  await page.fill('input[type="password"]', 'UpdatedPassword123');
  await page.screenshot({ path: 'screenshots/02-login-filled.png', fullPage: true });
  
  // 3. 等待按鈕啟用並點擊
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  await submitButton.click();
  
  // 4. 等待跳轉
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/03-after-login.png', fullPage: true });
  
  // 5. 導航到個人資料頁面
  const currentUrl = page.url();
  console.log('Current URL after login:', currentUrl);
  
  await page.goto('http://localhost:3000/profile');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/04-profile-page.png', fullPage: true });
  
  // 6. 檢查頁面內容
  const pageTitle = await page.title();
  const h1Text = await page.locator('h1').textContent();
  console.log('Page title:', pageTitle);
  console.log('H1 text:', h1Text);
  
  // 7. 檢查表單欄位
  const emailValue = await page.locator('input[type="email"]').inputValue();
  console.log('Email field value:', emailValue);
  
  const nameField = page.locator('input#name');
  if (await nameField.isVisible()) {
    const nameValue = await nameField.inputValue();
    console.log('Name field value:', nameValue);
  }
  
  // 8. 測試完成
  console.log('Profile page test completed!');
});