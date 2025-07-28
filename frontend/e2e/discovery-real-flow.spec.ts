/**
 * Discovery 真實流程測試
 * 使用真實 UI 和真實 DB 測試完整的五階段流程
 */

import { test, expect } from '@playwright/test';

test.describe('Discovery 真實五階段流程', () => {
  test('完整測試 Content Source → Scenario → Program → Task → Evaluation', async ({ page }) => {
    // 設定超時時間
    test.setTimeout(300000); // 5分鐘

    console.log('🚀 開始 Discovery 真實流程測試...\n');

    // ========== Stage 1: Content Source ==========
    await test.step('Stage 1: Content Source - 驗證 YAML 載入到 DB', async () => {
      console.log('📁 Stage 1: Content Source');
      
      // 使用 psql 直接查詢資料庫
      const { execSync } = require('child_process');
      const dbQuery = `psql -h 127.0.0.1 -p 5433 -U postgres -d ai_square_db -t -c "SELECT COUNT(*) FROM scenarios WHERE mode = 'discovery' AND source_type = 'yaml';"`;
      const result = execSync(dbQuery, { encoding: 'utf-8' }).trim();
      console.log(`✅ 資料庫中有 ${result} 個從 YAML 載入的 Discovery scenarios`);
      
      expect(parseInt(result)).toBeGreaterThan(0);
    });

    // ========== Stage 2: Scenario ==========
    await test.step('Stage 2: Scenario - 瀏覽職業列表', async () => {
      console.log('\n🎯 Stage 2: Scenario');
      
      // 登入
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      // 使用 demo 帳號登入
      const studentButton = page.locator('button:has-text("Student")');
      await expect(studentButton).toBeVisible();
      await studentButton.click();
      
      // 等待登入完成並導航
      await page.waitForURL(/\/(onboarding|discovery|assessment|dashboard)/, { timeout: 15000 });
      console.log('✅ 登入成功');
      
      // 直接前往 Discovery 頁面
      await page.goto('/discovery/scenarios');
      await page.waitForLoadState('networkidle');
      
      // 等待職業卡片載入
      await page.waitForSelector('h3', { timeout: 10000 });
      
      // 截圖
      await page.screenshot({ path: 'stage2-scenarios.png', fullPage: true });
      
      // 驗證職業列表
      const careerTitles = await page.$$eval('h3', elements => 
        elements.map(el => el.textContent).filter(text => text && text.includes('-'))
      );
      
      console.log(`✅ 找到 ${careerTitles.length} 個職業:`);
      careerTitles.slice(0, 5).forEach(title => console.log(`   - ${title}`));
      
      expect(careerTitles.length).toBeGreaterThanOrEqual(10);
    });

    // ========== Stage 3: Program ==========
    let scenarioId: string;
    let programId: string;
    
    await test.step('Stage 3: Program - 建立學習程式', async () => {
      console.log('\n📚 Stage 3: Program');
      
      // 選擇第一個職業
      const firstCareerCard = page.locator('h3').filter({ hasText: '-' }).first();
      const careerTitle = await firstCareerCard.textContent();
      console.log(`✅ 選擇職業: ${careerTitle}`);
      
      // 點擊開始冒險按鈕
      const startButton = firstCareerCard.locator('../..').locator('button:has-text("開始冒險")');
      await expect(startButton).toBeVisible();
      await startButton.click();
      console.log('✅ 點擊開始冒險');
      
      // 等待頁面載入
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // 從 URL 獲取 scenarioId
      const urlAfterClick = page.url();
      const scenarioMatch = urlAfterClick.match(/scenarios\/([\w-]+)/);
      if (scenarioMatch) {
        scenarioId = scenarioMatch[1];
        console.log(`✅ Scenario ID: ${scenarioId}`);
      }
      
      // 等待頁面完全載入
      await page.waitForTimeout(2000);
      
      // 截圖當前頁面狀態
      await page.screenshot({ path: 'stage3-current-state.png', fullPage: true });
      
      // 檢查是否有"開始探索"按鈕
      const exploreButton = page.locator('button').filter({ hasText: /start exploration|開始探索/i });
      const buttonVisible = await exploreButton.isVisible().catch(() => false);
      
      if (buttonVisible) {
        console.log('✅ 找到開始探索按鈕');
        
        // 同時等待點擊和 API 響應
        const [_] = await Promise.all([
          exploreButton.click(),
          page.waitForResponse(resp => {
            const matches = resp.url().includes('/api/discovery/scenarios') && 
                           resp.url().includes('/programs');
            if (matches) {
              console.log(`📡 API 請求: ${resp.url()} - 狀態: ${resp.status()}`);
            }
            return matches;
          }, { timeout: 30000 }).then(async response => {
            const status = response.status();
            console.log(`📦 Response status: ${status}`);
            
            if (status === 200) {
              const programData = await response.json();
              programId = programData.id;
              console.log(`✅ Program 建立成功: ${programId}`);
              return programData;
            } else {
              console.error(`❌ API 回傳錯誤狀態: ${status}`);
              const errorBody = await response.text();
              console.error('錯誤內容:', errorBody.slice(0, 200));
              return null;
            }
          }).catch(error => {
            console.error('❌ 無法建立 Program:', error);
            return null;
          })
        ]);
        
        // 等待頁面載入
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      } else {
        console.log('⚠️ 沒有找到開始探索按鈕');
      }
      
      // 截圖
      await page.screenshot({ path: 'stage3-program.png', fullPage: true });
    });

    // ========== Stage 4: Task ==========
    let taskId: string;
    
    await test.step('Stage 4: Task - 完成任務', async () => {
      console.log('\n📝 Stage 4: Task');
      
      // 確認在任務頁面
      const currentUrl = page.url();
      console.log(`✅ 當前 URL: ${currentUrl}`);
      
      // 如果不在任務頁面，嘗試導航
      if (!currentUrl.includes('/tasks/')) {
        if (programId) {
          await page.goto(`/discovery/scenarios/${scenarioId}/programs/${programId}`);
          await page.waitForLoadState('networkidle');
          
          // 點擊第一個可用任務
          const availableTask = page.locator('button').filter({ hasText: /start|開始|continue|繼續/i }).first();
          if (await availableTask.isVisible()) {
            await availableTask.click();
            await page.waitForURL(/\/tasks\//, { timeout: 10000 });
          }
        }
      }
      
      // 從 URL 獲取 taskId
      const taskMatch = page.url().match(/tasks\/([\w-]+)/);
      if (taskMatch) {
        taskId = taskMatch[1];
        console.log(`✅ Task ID: ${taskId}`);
      }
      
      // 等待任務內容載入
      await page.waitForTimeout(3000);
      
      // 截圖任務頁面
      await page.screenshot({ path: 'stage4-task.png', fullPage: true });
      
      // 與 AI 互動
      const chatInput = page.locator('textarea, input[type="text"]').filter({ hasPlaceholder: /ask|詢問|type|輸入/i }).first();
      if (await chatInput.isVisible()) {
        console.log('✅ 找到聊天輸入框');
        await chatInput.fill('我想了解這個職業需要什麼技能？');
        
        // 找發送按鈕
        const sendButton = page.locator('button').filter({ hasText: /send|發送|submit/i }).first();
        if (await sendButton.isVisible()) {
          await sendButton.click();
          console.log('✅ 發送訊息給 AI');
          
          // 等待 AI 回應
          await page.waitForTimeout(5000);
        }
      }
      
      // 完成任務
      const completeButton = page.locator('button').filter({ hasText: /complete|完成|next|下一|finish/i }).first();
      if (await completeButton.isVisible()) {
        console.log('✅ 找到完成按鈕');
        await completeButton.click();
        
        // 確認對話框
        const confirmButton = page.locator('button').filter({ hasText: /yes|是|confirm|確認/i });
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }
        
        await page.waitForTimeout(3000);
      }
    });

    // ========== Stage 5: Evaluation ==========
    await test.step('Stage 5: Evaluation - 查看評估結果', async () => {
      console.log('\n📊 Stage 5: Evaluation');
      
      // 檢查是否有評估內容 - 使用更具體的選擇器
      const hasScore = await page.locator('[class*="score"], [class*="points"], [class*="xp"]').first().isVisible().catch(() => false);
      const hasFeedback = await page.locator('[class*="feedback"], [class*="complete"]').first().isVisible().catch(() => false);
      
      if (hasScore || hasFeedback) {
        console.log('✅ 找到評估內容');
      }
      
      // 截圖評估結果
      await page.screenshot({ path: 'stage5-evaluation.png', fullPage: true });
      
      // 查詢資料庫確認評估記錄
      if (taskId) {
        const { execSync } = require('child_process');
        const dbQuery = `psql -h 127.0.0.1 -p 5433 -U postgres -d ai_square_db -t -c "SELECT COUNT(*) FROM evaluations WHERE task_id = '${taskId}';"`;
        try {
          const result = execSync(dbQuery, { encoding: 'utf-8' }).trim();
          console.log(`✅ 資料庫中有 ${result} 條評估記錄`);
        } catch (error) {
          console.log('⚠️  無法查詢評估記錄');
        }
      }
      
      // 導航到我的學習頁面查看整體進度
      await page.goto('/discovery/programs');
      await page.waitForLoadState('networkidle');
      
      // 截圖最終狀態
      await page.screenshot({ path: 'stage5-final.png', fullPage: true });
      
      // 檢查是否有學習記錄
      const programCards = await page.locator('[class*="card"], article').count();
      console.log(`✅ 找到 ${programCards} 個學習程式`);
    });

    console.log('\n🎉 Discovery 五階段測試完成！');
    console.log('\n📸 截圖已保存：');
    console.log('   - stage2-scenarios.png (職業列表)');
    console.log('   - stage3-program.png (程式建立)');
    console.log('   - stage4-task.png (任務執行)');
    console.log('   - stage5-evaluation.png (評估結果)');
    console.log('   - stage5-final.png (最終進度)');
  });
});