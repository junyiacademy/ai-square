import { test, expect } from '@playwright/test';

test('Check forgot password translation', async ({ page }) => {
  // 訪問忘記密碼頁面
  await page.goto('http://localhost:3000/forgot-password');
  
  // 等待頁面載入
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000); // 給翻譯時間載入
  
  // 檢查並截圖
  const h2Element = page.locator('h2').first();
  const h2Text = await h2Element.textContent();
  
  console.log('Current H2 text:', h2Text);
  
  // 檢查翻譯是否正確載入
  const hasTranslationKey = h2Text?.includes('forgotPassword');
  const hasProperTranslation = h2Text?.includes('Forgot') || h2Text?.includes('忘記');
  
  await page.screenshot({ 
    path: 'screenshots/forgot-password-final.png', 
    fullPage: true 
  });
  
  if (hasTranslationKey) {
    console.log('❌ Translation not loaded, showing key:', h2Text);
  } else if (hasProperTranslation) {
    console.log('✅ Translation loaded correctly:', h2Text);
  } else {
    console.log('⚠️ Unexpected text:', h2Text);
  }
});