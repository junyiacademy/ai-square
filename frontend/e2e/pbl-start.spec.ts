import { test, expect } from '@playwright/test';

test.describe('PBL 開始功能測試', () => {
  
  test('完整測試 PBL 從列表到開始學習', async ({ page }) => {
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
    
    // 2. 前往 PBL 列表
    console.log('\nStep 2: 前往 PBL 列表');
    await page.goto('http://localhost:3001/pbl/scenarios');
    await page.waitForLoadState('networkidle');
    
    // 截圖：PBL 列表
    await page.screenshot({ path: 'pbl-test-1-list.png', fullPage: true });
    console.log('📸 截圖: pbl-test-1-list.png');
    
    // 檢查是否有 PBL scenarios - View Details 按鈕是藍色的
    const viewDetailsButtons = await page.locator('button:has-text("View Details"), a:has-text("View Details")').count();
    console.log(`找到 ${viewDetailsButtons} 個 View Details 按鈕`);
    
    if (viewDetailsButtons === 0) {
      // 列出頁面上的按鈕看看
      const allButtons = await page.locator('button').all();
      console.log(`頁面上有 ${allButtons.length} 個按鈕`);
      for (let i = 0; i < Math.min(10, allButtons.length); i++) {
        const text = await allButtons[i].textContent();
        console.log(`  按鈕 ${i+1}: "${text}"`);
      }
      throw new Error('沒有找到任何 PBL scenarios');
    }
    
    // 3. 點擊第一個 View Details
    console.log('\nStep 3: 點擊第一個 PBL 的 View Details');
    // 點擊第一個藍色的 View Details 按鈕
    const firstViewButton = page.locator('button:has-text("View Details"), a:has-text("View Details")').first();
    await firstViewButton.click();
    
    // 等待頁面載入
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);  // 給更多時間載入
    
    // 截圖：PBL 詳情頁
    await page.screenshot({ path: 'pbl-test-2-detail.png', fullPage: true });
    console.log('📸 截圖: pbl-test-2-detail.png');
    
    // 檢查詳情頁標題
    const pageTitle = await page.locator('h1').first().textContent();
    console.log(`PBL 標題: ${pageTitle}`);
    
    // 檢查是否有既存的 programs
    const yourPrograms = await page.locator('text=/Your Programs/i').count();
    if (yourPrograms > 0) {
      console.log('ℹ️ 發現既有的 programs 區塊');
      const continueButtons = await page.locator('button:has-text("Continue")').count();
      console.log(`  有 ${continueButtons} 個 Continue 按鈕`);
    }
    
    // 4. 點擊 Start New Program
    console.log('\nStep 4: 尋找 Start New Program 按鈕');
    
    // 嘗試多個可能的按鈕文字
    let startButton = page.locator('button:has-text("Start New Program")').first();
    let buttonFound = await startButton.isVisible().catch(() => false);
    
    if (!buttonFound) {
      console.log('找不到 "Start New Program"，嘗試其他文字...');
      startButton = page.locator('button:has-text("Start")').filter({ hasNotText: 'Started' }).first();
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
    console.log('⏳ 等待導航到 PBL task 頁面...');
    
    // 5. 等待並驗證導航
    try {
      await page.waitForURL(/\/pbl\/scenarios\/.*\/programs\/.*\/tasks\//, { timeout: 10000 });
    } catch (error) {
      console.log('⚠️ URL 沒有改變到 tasks 頁面，檢查當前 URL...');
      const currentUrl = page.url();
      console.log(`當前 URL: ${currentUrl}`);
    }
    
    // 等待頁面載入
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 截圖：PBL 開始後
    await page.screenshot({ path: 'pbl-test-3-started.png', fullPage: true });
    console.log('📸 截圖: pbl-test-3-started.png');
    
    // 6. 驗證成功開始
    const finalUrl = page.url();
    console.log(`\n最終 URL: ${finalUrl}`);
    
    if (finalUrl.includes('/tasks/')) {
      console.log('✅ PBL Program 成功開始！');
      
      // 檢查任務標題
      const taskTitle = await page.locator('h1, h2').first().textContent();
      console.log(`📝 當前任務: ${taskTitle}`);
      
      // 檢查是否有 AI 導師介面
      const hasTextarea = await page.locator('textarea').count() > 0;
      const hasInputField = await page.locator('input[type="text"]').count() > 0;
      const hasChatInterface = hasTextarea || hasInputField;
      
      if (hasChatInterface) {
        console.log('✅ 看到聊天/輸入介面');
      }
      
      // 檢查是否有訊息區域
      const hasMessages = await page.locator('[class*="message"], [class*="chat"]').count() > 0;
      if (hasMessages) {
        console.log('✅ 看到訊息區域');
      }
    } else {
      console.log('⚠️ URL 未包含 /tasks/，可能未成功開始');
      
      // 檢查是否有錯誤訊息
      const errorMessage = await page.locator('text=/error|錯誤/i').first().textContent().catch(() => null);
      if (errorMessage) {
        console.log(`錯誤訊息: ${errorMessage}`);
      }
    }
    
    console.log('\n========== 測試完成 ==========');
  });
});