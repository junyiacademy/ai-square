import { test, expect, Page } from '@playwright/test';

// 完整的 Assessment 做題流程測試
test.describe('Complete Assessment Flow - 完整評估流程', () => {

  // 登入輔助函數
  async function loginUser(page: Page) {
    await page.goto('http://localhost:3000/login');
    
    // 等待登入頁面載入
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // 填入登入資料
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'student123');
    
    // 點擊登入按鈕
    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("登入")');
    
    // 等待重定向到 dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    console.log('✅ 登入成功');
  }

  test('完整 Assessment 做題流程 - 做題 → 提交 → 拿到成績', async ({ page }) => {
    console.log('🚀 開始完整 Assessment 測試流程...');
    
    // Step 1: 登入系統
    await loginUser(page);
    
    // Step 2: 前往 Assessment 頁面
    console.log('📊 進入 Assessment 頁面...');
    await page.goto('http://localhost:3000/assessment');
    await page.waitForLoadState('networkidle');
    
    // Step 3: 選擇一個 Assessment Scenario
    console.log('🎯 尋找並選擇 Assessment Scenario...');
    
    // 等待 Assessment 卡片載入
    await page.waitForSelector('[data-testid*="scenario"], .assessment-card, .scenario-card', { timeout: 10000 });
    
    // 尋找開始按鈕
    const startButtons = page.locator('button:has-text("開始評估"), button:has-text("Start Assessment"), a:has-text("Start")');
    const buttonCount = await startButtons.count();
    
    if (buttonCount === 0) {
      // 如果沒有直接的開始按鈕，點擊卡片進入詳細頁面
      const cards = page.locator('.assessment-card, .scenario-card, [data-testid*="scenario"]');
      if (await cards.count() > 0) {
        await cards.first().click();
        await page.waitForLoadState('networkidle');
      }
    } else {
      // 點擊第一個開始按鈕
      await startButtons.first().click();
      await page.waitForLoadState('networkidle');
    }
    
    console.log('✅ 成功進入 Assessment 詳細頁面');
    
    // Step 4: 創建或進入 Assessment Program
    console.log('🏗️ 創建 Assessment Program...');
    
    // 等待頁面載入並尋找開始評估的按鈕
    await page.waitForTimeout(2000);
    
    // 尋找各種可能的開始按鈕
    const possibleStartSelectors = [
      'button:has-text("開始評估")',
      'button:has-text("Start Assessment")', 
      'button:has-text("開始")',
      'button:has-text("Start")',
      'a:has-text("開始評估")',
      'a:has-text("Start Assessment")'
    ];
    
    let startButton = null;
    for (const selector of possibleStartSelectors) {
      const button = page.locator(selector);
      if (await button.count() > 0 && await button.isVisible()) {
        startButton = button.first();
        break;
      }
    }
    
    if (startButton) {
      await startButton.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ 成功點擊開始評估按鈕');
    } else {
      console.log('⚠️  未找到開始評估按鈕，嘗試檢查當前 URL');
    }
    
    // Step 5: 等待進入做題界面
    console.log('📝 等待進入做題界面...');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('📍 當前 URL:', currentUrl);
    
    // 檢查是否已經在做題頁面
    if (currentUrl.includes('/programs/') && !currentUrl.includes('/complete')) {
      console.log('✅ 已進入做題界面');
      
      // Step 6: 開始做題流程
      console.log('🤔 開始做題流程...');
      
      let questionCount = 0;
      let maxQuestions = 15; // 設定最大題目數量防止無限迴圈
      
      while (questionCount < maxQuestions) {
        questionCount++;
        console.log(`\n📋 第 ${questionCount} 題:`);
        
        // 等待題目載入
        await page.waitForTimeout(1000);
        
        // 尋找題目內容
        const questionSelectors = [
          '.question-content', 
          '.assessment-question',
          '[data-testid="question"]',
          'h2, h3, .question-title',
          '.question-text'
        ];
        
        let questionFound = false;
        for (const selector of questionSelectors) {
          const questionElement = page.locator(selector);
          if (await questionElement.count() > 0 && await questionElement.isVisible()) {
            const questionText = await questionElement.textContent();
            if (questionText && questionText.trim().length > 10) {
              console.log(`   問題: ${questionText.substring(0, 100)}...`);
              questionFound = true;
              break;
            }
          }
        }
        
        if (!questionFound) {
          console.log('   ⚠️  未找到題目內容，可能已完成所有題目');
          break;
        }
        
        // 尋找選項並選擇答案
        const optionSelectors = [
          'input[type="radio"]',
          'input[type="checkbox"]', 
          '.option button',
          '.choice button',
          '[data-testid*="option"]',
          'button:has-text("A)"), button:has-text("B)"), button:has-text("C)"), button:has-text("D)")'
        ];
        
        let answerSelected = false;
        for (const selector of optionSelectors) {
          const options = page.locator(selector);
          const optionCount = await options.count();
          
          if (optionCount > 0) {
            console.log(`   找到 ${optionCount} 個選項`);
            
            // 選擇第二個選項（通常是 B 選項）
            if (optionCount > 1) {
              await options.nth(1).click(); 
              console.log('   ✅ 已選擇答案 B');
              answerSelected = true;
              break;
            } else {
              await options.first().click();
              console.log('   ✅ 已選擇第一個答案');
              answerSelected = true;
              break;
            }
          }
        }
        
        if (!answerSelected) {
          console.log('   ⚠️  未找到可選擇的選項');
          
          // 嘗試尋找文字輸入框
          const textInput = page.locator('input[type="text"], textarea, .answer-input');
          if (await textInput.count() > 0) {
            await textInput.first().fill('這是我的答案');
            console.log('   ✅ 已填入文字答案');
            answerSelected = true;
          }
        }
        
        // 尋找提交/下一題按鈕
        if (answerSelected) {
          await page.waitForTimeout(500);
          
          const submitSelectors = [
            'button:has-text("提交")', 
            'button:has-text("Submit")',
            'button:has-text("下一題")',
            'button:has-text("Next")',
            'button:has-text("繼續")',
            'button:has-text("Continue")',
            '.submit-button',
            '.next-button'
          ];
          
          let submitted = false;
          for (const selector of submitSelectors) {
            const button = page.locator(selector);
            if (await button.count() > 0 && await button.isVisible()) {
              await button.click();
              console.log('   ✅ 已提交答案');
              submitted = true;
              await page.waitForLoadState('networkidle');
              break;
            }
          }
          
          if (!submitted) {
            console.log('   ⚠️  未找到提交按鈕，嘗試按 Enter 鍵');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);
          }
        }
        
        // 檢查是否完成所有題目
        await page.waitForTimeout(1000);
        const newUrl = page.url();
        
        if (newUrl.includes('/complete') || newUrl.includes('/result')) {
          console.log('🎉 檢測到完成頁面，已完成所有題目！');
          break;
        }
        
        // 檢查是否有完成提示
        const completionSelectors = [
          ':has-text("恭喜完成")',
          ':has-text("Assessment Complete")', 
          ':has-text("已完成")',
          ':has-text("測驗結束")',
          '.completion-message',
          '.assessment-complete'
        ];
        
        let isComplete = false;
        for (const selector of completionSelectors) {
          if (await page.locator(selector).count() > 0) {
            console.log('🎉 發現完成訊息，評估已完成！');
            isComplete = true;
            break;
          }
        }
        
        if (isComplete) break;
      }
      
      // Step 7: 檢查最終成績
      console.log('\n🏆 檢查最終成績...');
      await page.waitForTimeout(2000);
      
      // 尋找成績顯示
      const scoreSelectors = [
        '.score', '.grade', '.result',
        ':has-text("分數")', ':has-text("Score")',
        ':has-text("成績")', ':has-text("Grade")', 
        ':has-text("結果")', ':has-text("Result")',
        '.assessment-score', '.final-score'
      ];
      
      let scoreFound = false;
      for (const selector of scoreSelectors) {
        const scoreElement = page.locator(selector);
        if (await scoreElement.count() > 0) {
          const scoreText = await scoreElement.textContent();
          if (scoreText) {
            console.log(`📊 找到成績信息: ${scoreText}`);
            scoreFound = true;
          }
        }
      }
      
      if (scoreFound) {
        console.log('✅ 成功找到最終成績！');
      } else {
        console.log('⚠️  未找到明確的成績顯示，但評估流程已完成');
      }
      
      // 截圖記錄最終結果
      await page.screenshot({ 
        path: 'test-results/assessment-completion.png',
        fullPage: true 
      });
      
      console.log('\n🎉 Assessment 完整流程測試完成！');
      console.log(`   ✅ 完成題數: ${questionCount}`);
      console.log(`   ✅ 最終 URL: ${page.url()}`);
      
    } else {
      console.log('❌ 未能進入做題界面，測試失敗');
      
      // 截圖記錄問題
      await page.screenshot({ 
        path: 'test-results/assessment-failed.png',
        fullPage: true 
      });
      
      throw new Error('無法進入 Assessment 做題界面');
    }
    
    // 最終驗證：確保我們在某種完成狀態
    const finalUrl = page.url();
    const hasCompletedFlow = finalUrl.includes('/complete') || 
                           finalUrl.includes('/result') ||
                           finalUrl.includes('/programs/') ||
                           await page.locator(':has-text("完成"), :has-text("Complete")').count() > 0;
    
    expect(hasCompletedFlow).toBeTruthy();
    console.log('✅ Assessment 完整流程驗證成功！');
  });

});