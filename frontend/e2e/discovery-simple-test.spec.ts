/**
 * Discovery 簡單測試 - 檢查實際頁面內容
 */

import { test, expect } from '@playwright/test';

test.describe('Discovery Simple Test', () => {
  test('Check Discovery page content', async ({ page }) => {
    // 1. 登入
    await page.goto('/login');
    await page.locator('button:has-text("Student")').click();
    await page.waitForURL(/\/(onboarding|discovery|assessment|dashboard)/, { timeout: 10000 });
    
    // 2. 前往 Discovery 頁面
    await page.goto('/discovery/scenarios');
    await page.waitForLoadState('networkidle');
    
    // 3. 截圖看看頁面內容
    await page.screenshot({ path: 'discovery-page.png', fullPage: true });
    console.log('Screenshot saved as discovery-page.png');
    
    // 4. 檢查頁面上有什麼內容
    const pageContent = await page.content();
    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());
    
    // 5. 找出所有可見的文字
    const visibleText = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, p, button');
      return Array.from(elements).map(el => el.textContent?.trim()).filter(Boolean);
    });
    
    console.log('Visible text on page:', visibleText);
    
    // 6. 檢查是否有 scenarios
    const hasScenarios = pageContent.includes('scenario');
    console.log('Page contains "scenario":', hasScenarios);
    
    // 7. 檢查是否有任何卡片元素
    const cards = await page.locator('[class*="card"]').count();
    console.log('Cards found:', cards);
    
    // 8. 檢查是否有列表項目
    const listItems = await page.locator('li').count();
    console.log('List items found:', listItems);
    
    // 9. 檢查是否有任何錯誤訊息
    const hasError = pageContent.includes('error') || pageContent.includes('Error');
    console.log('Page has error:', hasError);
    
    // 基本斷言 - 確保頁面載入成功
    expect(page.url()).toContain('discovery');
  });
});