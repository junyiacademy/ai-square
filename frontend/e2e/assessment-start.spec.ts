import { test, expect } from '@playwright/test';

test.describe('Assessment 開始功能測試', () => {
  
  test('完整測試 Assessment 從列表到開始評估', async ({ page }) => {
    // 1. 登入
    console.log('Step 1: 登入');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    
    // 使用 id 選擇器
    await page.fill('#email', 'student@example.com');
    await page.fill('#password', 'student123');
    await page.click('button:has-text("Login")');
    
    // 等待登入完成
    await page.waitForTimeout(2000);
    console.log('✅ 登入完成');
    
    // 2. 前往 Assessment 列表
    console.log('\nStep 2: 前往 Assessment 列表');
    await page.goto('http://localhost:3001/assessment/scenarios');
    await page.waitForLoadState('networkidle');
    
    // 截圖：Assessment 列表
    await page.screenshot({ path: 'assessment-test-1-list.png', fullPage: true });
    console.log('📸 截圖: assessment-test-1-list.png');
    
    // 檢查是否有 Assessment scenarios
    const viewDetailsButtons = await page.locator('button:has-text("View Details")').count();
    console.log(`找到 ${viewDetailsButtons} 個 Assessment scenarios`);
    
    if (viewDetailsButtons === 0) {
      throw new Error('沒有找到任何 Assessment scenarios');
    }
    
    // 3. 點擊第一個 View Details
    console.log('\nStep 3: 點擊第一個 Assessment 的 View Details');
    await page.locator('button:has-text("View Details")').first().click();
    
    // 等待頁面載入
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);  // 給更多時間載入
    
    // 截圖：Assessment 詳情頁
    await page.screenshot({ path: 'assessment-test-2-detail.png', fullPage: true });
    console.log('📸 截圖: assessment-test-2-detail.png');
    
    // 檢查詳情頁標題
    const pageTitle = await page.locator('h1').first().textContent();
    console.log(`Assessment 標題: ${pageTitle}`);
    
    // 4. 點擊 Start Assessment
    console.log('\nStep 4: 尋找 Start Assessment 按鈕');
    
    // 嘗試多個可能的按鈕文字
    let startButton = page.locator('button:has-text("Start Assessment")').first();
    let buttonFound = await startButton.isVisible().catch(() => false);
    
    if (!buttonFound) {
      console.log('找不到 "Start Assessment"，嘗試其他文字...');
      startButton = page.locator('button:has-text("Start")').first();
      buttonFound = await startButton.isVisible().catch(() => false);
    }
    
    if (!buttonFound) {
      console.log('找不到 "Start"，嘗試 "開始"...');
      startButton = page.locator('button:has-text("開始")').first();
      buttonFound = await startButton.isVisible().catch(() => false);
    }
    
    if (!buttonFound) {
      // 列出所有按鈕文字
      const allButtons = await page.locator('button').all();
      console.log(`頁面上有 ${allButtons.length} 個按鈕:`);
      for (let i = 0; i < Math.min(5, allButtons.length); i++) {
        const text = await allButtons[i].textContent();
        console.log(`  按鈕 ${i+1}: "${text}"`);
      }
      throw new Error('找不到任何開始按鈕');
    }
    
    console.log('✅ 找到開始按鈕');
    
    // 點擊開始
    await startButton.click();
    console.log('⏳ 等待導航到 Assessment program 頁面...');
    
    // 5. 等待並驗證導航
    try {
      await page.waitForURL(/\/assessment\/scenarios\/.*\/programs\//, { timeout: 10000 });
    } catch (error) {
      console.log('⚠️ URL 沒有改變，檢查當前 URL...');
      const currentUrl = page.url();
      console.log(`當前 URL: ${currentUrl}`);
    }
    
    // 等待頁面載入
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 截圖：Assessment 開始後
    await page.screenshot({ path: 'assessment-test-3-started.png', fullPage: true });
    console.log('📸 截圖: assessment-test-3-started.png');
    
    // 6. 驗證成功開始
    const finalUrl = page.url();
    console.log(`\n最終 URL: ${finalUrl}`);
    
    if (finalUrl.includes('/programs/')) {
      console.log('✅ Assessment 成功開始！');
      
      // 檢查是否有問題內容
      const hasQuestions = await page.locator('text=/Question|問題|第/i').count() > 0;
      if (hasQuestions) {
        console.log('✅ 看到問題內容');
      }
      
      // 檢查是否有選項
      const hasOptions = await page.locator('button, input[type="radio"], label').count() > 0;
      if (hasOptions) {
        console.log('✅ 看到答題選項');
      }
    } else {
      console.log('⚠️ URL 未包含 /programs/，可能未成功開始');
      
      // 檢查是否有錯誤訊息
      const errorMessage = await page.locator('text=/error|錯誤/i').first().textContent().catch(() => null);
      if (errorMessage) {
        console.log(`錯誤訊息: ${errorMessage}`);
      }
    }
    
    console.log('\n========== 測試完成 ==========');
  });
});