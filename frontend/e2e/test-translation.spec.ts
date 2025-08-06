import { test, expect } from '@playwright/test';

test('Test translation on forgot password page', async ({ page }) => {
  // 1. 訪問忘記密碼頁面
  await page.goto('http://localhost:3000/forgot-password');
  await page.waitForLoadState('networkidle');
  
  // 等待一些時間讓翻譯載入
  await page.waitForTimeout(2000);
  
  // 2. 檢查標題
  const h2Text = await page.locator('h2').textContent();
  console.log('H2 text:', h2Text);
  
  // 3. 檢查按鈕
  const buttonText = await page.locator('button[type="submit"]').textContent();
  console.log('Button text:', buttonText);
  
  // 4. 截圖
  await page.screenshot({ 
    path: 'screenshots/forgot-password-current.png', 
    fullPage: true 
  });
  
  // 5. 切換語言測試
  const langSelector = page.locator('button:has-text("English")').first();
  if (await langSelector.isVisible()) {
    await langSelector.click();
    await page.locator('text=繁體中文').click();
    await page.waitForTimeout(1000);
    
    const h2TextZh = await page.locator('h2').textContent();
    console.log('H2 text (中文):', h2TextZh);
    
    await page.screenshot({ 
      path: 'screenshots/forgot-password-zh.png', 
      fullPage: true 
    });
  }
});