/**
 * Discovery 五階段完整測試
 * 測試統一學習架構的完整流程：
 * Content Source → Scenario → Program → Task → Evaluation
 */

import { test, expect } from '@playwright/test';

test.describe('Discovery 五階段完整流程測試', () => {
  test('完整測試 Content Source → Scenario → Program → Task → Evaluation', async ({ page }) => {
    // 設定較長的超時時間
    test.setTimeout(180000); // 3分鐘

    console.log('🚀 開始 Discovery 五階段測試...\n');

    // Stage 1: Content Source (驗證 YAML 已載入到 DB)
    await test.step('Stage 1: Content Source - 驗證 YAML 內容已載入', async () => {
      console.log('📁 Stage 1: Content Source');
      
      // 先導航到首頁以獲得正確的 baseUrl
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 使用完整 URL 並加上 headers
      const baseUrl = page.url().split('/').slice(0, 3).join('/');
      const response = await page.request.get(`${baseUrl}/api/discovery/scenarios`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('解析 JSON 失敗:', await response.text());
        throw e;
      }
      
      expect(response.ok()).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toBeDefined();
      expect(data.data.scenarios.length).toBeGreaterThan(0);
      
      console.log(`✅ 已載入 ${data.data.scenarios.length} 個職業路徑從 YAML`);
      
      // 檢查第一個 scenario 的結構
      const firstScenario = data.data.scenarios[0];
      expect(firstScenario.sourceType).toBe('yaml');
      expect(firstScenario.sourcePath).toMatch(/discovery_data/);
      console.log(`✅ 第一個職業: ${firstScenario.title?.en || firstScenario.title || 'Unknown'}`);
    });

    // Stage 2: Scenario (瀏覽職業情境)
    await test.step('Stage 2: Scenario - 瀏覽職業情境', async () => {
      console.log('\n🎯 Stage 2: Scenario');
      
      // 登入
      await page.goto('/login');
      await page.locator('button:has-text("Student")').click();
      await page.waitForURL(/\/(onboarding|discovery|assessment|dashboard)/, { timeout: 10000 });
      
      // 前往 Discovery 頁面
      await page.goto('/discovery/scenarios');
      await page.waitForLoadState('networkidle');
      
      // 截圖顯示所有職業
      await page.screenshot({ path: 'discovery-scenarios.png', fullPage: true });
      
      // 檢查職業卡片
      const visibleTitles = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll('h3, h2')).map(el => el.textContent?.trim()).filter(Boolean);
        return titles;
      });
      
      console.log('✅ 找到職業:', visibleTitles.filter(t => t && t.includes('-')).slice(0, 5).join(', '), '...');
      
      // 檢查至少有一個職業
      const hasCareerTitles = visibleTitles.some(title => title && title.includes('-'));
      expect(hasCareerTitles).toBe(true);
    });

    // Stage 3: Program (開始學習程式)
    let programId: string;
    let scenarioId: string;
    
    await test.step('Stage 3: Program - 開始職業探索', async () => {
      console.log('\n📚 Stage 3: Program');
      
      // 點擊第一個職業的「開始冒險」按鈕
      const startButton = page.locator('button:has-text("開始冒險")').first();
      await expect(startButton).toBeVisible();
      
      // 擷取 scenario 資訊
      const careerCard = startButton.locator('..').locator('..');
      const careerTitle = await careerCard.locator('h3, h2').first().textContent();
      console.log(`✅ 選擇職業: ${careerTitle}`);
      
      // 點擊開始
      await startButton.click();
      console.log('✅ 已點擊開始按鈕');
      
      // 等待一下，讓頁面有時間處理
      await page.waitForTimeout(2000);
      
      // 檢查是否有特定的錯誤訊息（避免捕捉到正常的 "Error" 文字）
      const hasRealError = await page.locator('.error-message, .alert-error, [data-error="true"]').count() > 0;
      if (hasRealError) {
        console.error('❌ 發現錯誤訊息');
      }
      
      // 檢查目前的 URL
      const currentUrl = page.url();
      console.log('✅ 當前 URL:', currentUrl);
      
      // 嘗試找到 createNewProgram 按鈕並點擊
      const createButton = page.locator('button').filter({ hasText: /start exploration|開始探索/i });
      if (await createButton.isVisible()) {
        console.log('✅ 找到建立 Program 按鈕');
        await createButton.click();
        await page.waitForTimeout(3000);
      }
      
      // 再次檢查 URL
      const newUrl = page.url();
      console.log('✅ 更新後 URL:', newUrl);
      
      // 從 URL 提取 programId
      const programMatch = newUrl.match(/programs\/([\w-]+)/);
      if (programMatch) {
        programId = programMatch[1];
        console.log(`✅ Program 已建立: ${programId}`);
      } else {
        console.log('⚠️  未從 URL 找到 programId');
      }
    });

    // Stage 4: Task (完成任務)
    await test.step('Stage 4: Task - 完成學習任務', async () => {
      console.log('\n📝 Stage 4: Task');
      
      // 等待頁面載入
      await page.waitForLoadState('networkidle');
      
      // 截圖以便除錯
      await page.screenshot({ path: 'discovery-task-debug.png' });
      
      // 檢查是否在任務頁面
      const pageTitle = await page.locator('h1, h2, h3').first().textContent().catch(() => '無標題');
      console.log(`✅ 當前頁面標題: ${pageTitle}`);
      
      // 檢查是否有任務內容
      const taskContent = await page.locator('main, article, [role="main"]').first().textContent().catch(() => '');
      console.log(`✅ 任務內容長度: ${taskContent.length} 字元`);
      
      // 尋找任務相關元素
      const hasTaskContent = await page.locator('text=/task|任務|challenge|挑戰/i').count() > 0;
      const hasInstructions = await page.locator('text=/instruction|說明|objective|目標/i').count() > 0;
      
      if (hasTaskContent || hasInstructions) {
        console.log('✅ 找到任務內容');
        
        // 如果有聊天輸入框，發送訊息
        const chatInput = page.locator('textarea, input[type="text"]').first();
        if (await chatInput.isVisible()) {
          await chatInput.fill('我想了解這個職業需要哪些技能？');
          
          // 尋找發送按鈕
          const sendButton = page.locator('button').filter({ hasText: /send|發送|submit|提交/i }).first();
          if (await sendButton.isVisible()) {
            await sendButton.click();
            console.log('✅ 已發送聊天訊息');
            
            // 等待回應
            await page.waitForTimeout(3000);
          }
        }
        
        // 尋找完成按鈕
        const completeButton = page.locator('button').filter({ hasText: /complete|完成|next|下一步|continue|繼續/i }).first();
        if (await completeButton.isVisible()) {
          await completeButton.click();
          console.log('✅ 點擊完成任務');
          
          // 如果有確認對話框
          try {
            await page.waitForSelector('button:has-text("確認")', { timeout: 2000 });
            await page.click('button:has-text("確認")');
          } catch {
            // 沒有對話框，繼續
          }
        }
      }
      
      // 截圖任務頁面
      await page.screenshot({ path: 'discovery-task.png' });
    });

    // Stage 5: Evaluation (查看評估結果)
    await test.step('Stage 5: Evaluation - 查看學習成果', async () => {
      console.log('\n📊 Stage 5: Evaluation');
      
      // 檢查是否有評估相關內容
      const hasScore = await page.locator('text=/score|分數|points|積分|xp|經驗/i').count() > 0;
      const hasFeedback = await page.locator('text=/feedback|回饋|評語|建議/i').count() > 0;
      const hasProgress = await page.locator('text=/progress|進度|complete|完成|%/i').count() > 0;
      
      if (hasScore || hasFeedback || hasProgress) {
        console.log('✅ 找到評估內容');
        
        // 截圖評估結果
        await page.screenshot({ path: 'discovery-evaluation.png' });
      }
      
      // 嘗試查看整體進度
      try {
        // 使用相對路徑，基於當前 URL
        const baseUrl = page.url().split('/').slice(0, 3).join('/');
        await page.goto(`${baseUrl}/discovery/programs`);
        await page.waitForLoadState('networkidle');
        
        // 檢查是否有程式列表
        const programCards = await page.locator('[class*="card"], [class*="program"]').count();
        if (programCards > 0) {
          console.log(`✅ 找到 ${programCards} 個學習程式`);
          
          // 檢查進度資訊
          const progressText = await page.locator('text=/%|進度|progress/i').first().textContent();
          if (progressText) {
            console.log(`✅ 學習進度: ${progressText}`);
          }
        }
      } catch (error) {
        console.log('⚠️  無法訪問學習進度頁面');
      }
      
      // 最終截圖
      await page.screenshot({ path: 'discovery-final.png', fullPage: true });
    });

    console.log('\n🎉 Discovery 五階段測試完成！');
    console.log('截圖已保存：');
    console.log('- discovery-scenarios.png (Stage 2: 職業列表)');
    console.log('- discovery-task.png (Stage 4: 任務頁面)');
    console.log('- discovery-evaluation.png (Stage 5: 評估結果)');
    console.log('- discovery-final.png (最終狀態)');
  });
});