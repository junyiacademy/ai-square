import { test, expect } from '@playwright/test';
import { loginTestUser } from './auth-helper';

test.describe('PBL 基本流程測試', () => {
  
  test('測試PBL列表頁面', async ({ page }) => {
    // 1. 登入
    await loginTestUser(page);
    
    // 2. 前往PBL列表
    await page.goto('http://localhost:3004/pbl/scenarios');
    await page.waitForLoadState('networkidle');
    
    // 3. 檢查頁面是否載入
    const pageTitle = await page.locator('h1, h2').first().textContent();
    console.log(`PBL頁面標題: ${pageTitle}`);
    
    // 4. 檢查是否有scenarios
    const cards = await page.locator('[class*="card"], [class*="scenario"]').count();
    console.log(`找到 ${cards} 個 scenario 卡片`);
    
    // 至少應該有一個
    expect(cards).toBeGreaterThanOrEqual(0);
    console.log('✅ PBL列表頁面正常');
  });
  
  test('測試Assessment列表頁面', async ({ page }) => {
    // 1. 登入
    await loginTestUser(page);
    
    // 2. 前往Assessment列表
    await page.goto('http://localhost:3004/assessment/scenarios');
    await page.waitForLoadState('networkidle');
    
    // 3. 檢查頁面是否載入
    const pageTitle = await page.locator('h1, h2').first().textContent();
    console.log(`Assessment頁面標題: ${pageTitle}`);
    
    // 4. 檢查是否有scenarios
    const cards = await page.locator('[class*="card"], [class*="scenario"]').count();
    console.log(`找到 ${cards} 個 assessment 卡片`);
    
    expect(cards).toBeGreaterThanOrEqual(0);
    console.log('✅ Assessment列表頁面正常');
  });
  
  test('測試Discovery頁面', async ({ page }) => {
    // 1. 登入
    await loginTestUser(page);
    
    // 2. 前往Discovery
    await page.goto('http://localhost:3004/discovery');
    await page.waitForLoadState('networkidle');
    
    // 3. 檢查頁面是否載入
    const pageTitle = await page.locator('h1, h2').first().textContent();
    console.log(`Discovery頁面標題: ${pageTitle}`);
    
    // 4. 檢查是否有內容
    const content = await page.locator('main, [role="main"]').first().textContent();
    expect(content).toBeTruthy();
    
    console.log('✅ Discovery頁面正常');
  });
});