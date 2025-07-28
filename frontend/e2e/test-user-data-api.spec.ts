/**
 * 測試 user-data API 問題
 */

import { test, expect } from '@playwright/test';

test.describe('User Data API Test', () => {
  test('test user data loading issue', async ({ page }) => {
    // 1. 前往首頁
    await page.goto('/');
    console.log('Navigated to homepage');
    
    // 2. 前往登入頁
    await page.goto('/login');
    console.log('Navigated to login page');
    
    // 等待頁面載入
    await page.waitForLoadState('networkidle');
    
    // 3. 查看是否有 email 輸入框
    const emailInput = await page.locator('#email').count();
    console.log('Email input count:', emailInput);
    
    if (emailInput === 0) {
      // 如果沒有，截圖看看頁面狀態
      await page.screenshot({ path: 'login-page-issue.png' });
      console.log('Screenshot saved as login-page-issue.png');
    }
    
    // 4. 使用測試帳號登入
    if (emailInput > 0) {
      await page.locator('#email').fill('student@example.com');
      await page.locator('#password').fill('student123');
      await page.locator('button[type="submit"]').click();
      
      console.log('Login submitted');
      
      // 等待導航
      await page.waitForURL(/\/(onboarding|discovery|assessment|dashboard|relations)/, { 
        timeout: 10000 
      }).catch(e => {
        console.log('Navigation timeout:', e.message);
      });
      
      console.log('Current URL:', page.url());
      
      // 5. 檢查 API 錯誤
      page.on('response', async response => {
        if (response.url().includes('/api/user-data')) {
          console.log('user-data API response:', response.status());
          if (response.status() === 500) {
            const text = await response.text();
            console.log('Error response:', text);
          }
        }
      });
      
      // 6. 前往會觸發 user-data API 的頁面
      await page.goto('/discovery/overview');
      console.log('Navigated to discovery overview');
      
      // 等待一下讓 API 請求完成
      await page.waitForTimeout(3000);
      
      // 7. 檢查頁面上是否有錯誤訊息
      const errorMessages = await page.locator('text=/error|failed/i').count();
      console.log('Error messages on page:', errorMessages);
      
      if (errorMessages > 0) {
        await page.screenshot({ path: 'discovery-error.png' });
        console.log('Screenshot saved as discovery-error.png');
      }
    }
  });
});