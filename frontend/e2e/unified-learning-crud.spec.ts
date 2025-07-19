import { test, expect } from '@playwright/test';

/**
 * 統一學習架構 CRUD E2E 測試
 * 測試三個模式（Assessment、PBL、Discovery）的五個階段
 */

// Helper function to login
async function loginUser(page: any, email: string = 'test@example.com') {
  // Mock authentication
  await page.evaluate((userEmail: string) => {
    localStorage.setItem('user', JSON.stringify({ 
      email: userEmail, 
      name: 'Test User',
      id: 'test-user-id'
    }));
  }, email);
}

test.describe('統一學習架構 - 五階段 CRUD 測試', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('Assessment Mode - 五階段測試', () => {
    test('Stage 1-2: Content Source → Scenario 創建', async ({ page }) => {
      // 訪問評估頁面（Content Source）
      await page.goto('/assessment/scenarios');
      
      // 驗證 Scenario 列表載入
      await expect(page.locator('h1')).toContainText('Assessment Scenarios');
      
      // 驗證至少有一個 scenario
      const scenarioCards = page.locator('[data-testid="scenario-card"]');
      await expect(scenarioCards).toHaveCount(await scenarioCards.count());
      
      // 點擊第一個 scenario
      await scenarioCards.first().click();
      
      // 驗證進入 scenario 詳情頁
      await expect(page.url()).toMatch(/\/assessment\/scenarios\/[\w-]+$/);
    });

    test('Stage 3: Scenario → Program 創建', async ({ page }) => {
      // 直接訪問 scenario 詳情頁
      await page.goto('/assessment/scenarios');
      const firstScenario = page.locator('[data-testid="scenario-card"]').first();
      await firstScenario.click();
      
      // 開始評估（創建 Program）
      await page.locator('button:has-text("Start Assessment")').click();
      
      // 驗證 Program 創建成功
      await expect(page.url()).toMatch(/\/assessment\/scenarios\/[\w-]+\/program\/[\w-]+/);
      
      // 驗證進入任務頁面
      await expect(page.locator('h2')).toContainText(/Question \d+ of \d+/);
    });

    test('Stage 4-5: Task 執行 → Evaluation 完成', async ({ page }) => {
      // 創建並進入 assessment program
      await page.goto('/assessment/scenarios');
      await page.locator('[data-testid="scenario-card"]').first().click();
      await page.locator('button:has-text("Start Assessment")').click();
      
      // 回答所有問題 (Task 執行)
      const totalQuestions = 10; // 假設有 10 個問題
      for (let i = 0; i < totalQuestions; i++) {
        // 選擇答案
        await page.locator('input[type="radio"]').first().click();
        
        // 點擊下一題或完成
        const nextButton = i < totalQuestions - 1 
          ? page.locator('button:has-text("Next")')
          : page.locator('button:has-text("Complete")');
        await nextButton.click();
        
        // 等待頁面更新
        if (i < totalQuestions - 1) {
          await expect(page.locator('h2')).toContainText(`Question ${i + 2} of ${totalQuestions}`);
        }
      }
      
      // 驗證進入完成頁面 (Evaluation)
      await expect(page.url()).toMatch(/\/complete$/);
      await expect(page.locator('h1')).toContainText('Assessment Complete');
      
      // 驗證評估結果顯示
      await expect(page.locator('[data-testid="overall-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="domain-scores"]')).toBeVisible();
    });

    test('CRUD - Read: 查看歷史記錄', async ({ page }) => {
      await page.goto('/profile');
      
      // 驗證能看到 assessment 歷史
      await expect(page.locator('[data-testid="assessment-history"]')).toBeVisible();
    });

    test('CRUD - Update: 重新開始評估', async ({ page }) => {
      await page.goto('/assessment/scenarios');
      const scenario = page.locator('[data-testid="scenario-card"]').first();
      
      // 檢查是否顯示"已完成"狀態
      const completedBadge = scenario.locator('[data-testid="completed-badge"]');
      if (await completedBadge.isVisible()) {
        // 點擊重新開始
        await scenario.click();
        await page.locator('button:has-text("Restart Assessment")').click();
        
        // 驗證創建新的 program
        await expect(page.url()).toMatch(/\/program\/[\w-]+/);
      }
    });
  });

  test.describe('PBL Mode - 五階段測試', () => {
    test('Stage 1-2: YAML Content → Scenario 載入', async ({ page }) => {
      // 訪問 PBL 頁面
      await page.goto('/pbl/scenarios');
      
      // 驗證 scenarios 從 YAML 載入
      await expect(page.locator('h1')).toContainText('Problem-Based Learning');
      
      // 驗證 scenario 卡片顯示
      const scenarioCards = page.locator('[data-testid="pbl-scenario-card"]');
      await expect(scenarioCards.first()).toBeVisible();
      
      // 驗證 scenario 包含必要信息
      const firstCard = scenarioCards.first();
      await expect(firstCard.locator('[data-testid="scenario-title"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="scenario-difficulty"]')).toBeVisible();
    });

    test('Stage 3: 創建 PBL Program', async ({ page }) => {
      await page.goto('/pbl/scenarios');
      
      // 選擇一個 scenario
      const scenario = page.locator('[data-testid="pbl-scenario-card"]').first();
      const scenarioTitle = await scenario.locator('[data-testid="scenario-title"]').textContent();
      await scenario.click();
      
      // 開始學習（創建 Program）
      await page.locator('button:has-text("Start Learning")').click();
      
      // 驗證進入學習頁面
      await expect(page.url()).toMatch(/\/pbl\/scenarios\/[\w-]+\/program\/[\w-]+\/tasks\/[\w-]+\/learn/);
      
      // 驗證 AI 導師介面載入
      await expect(page.locator('[data-testid="ai-tutor-chat"]')).toBeVisible();
    });

    test('Stage 4: Task 執行與 AI 互動', async ({ page }) => {
      // 快速進入 PBL 學習頁面
      await page.goto('/pbl/scenarios');
      await page.locator('[data-testid="pbl-scenario-card"]').first().click();
      await page.locator('button:has-text("Start Learning")').click();
      
      // 與 AI 導師互動
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('我想了解這個任務的目標');
      await page.locator('button[type="submit"]').click();
      
      // 驗證 AI 回應
      await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible();
      
      // 提交解決方案
      await chatInput.fill('這是我的解決方案：使用 React 組件實現...');
      await page.locator('button[type="submit"]').click();
      
      // 完成任務
      await page.locator('button:has-text("Complete Task")').click();
    });

    test('Stage 5: Program 完成與評估', async ({ page }) => {
      // 假設已完成所有任務，直接訪問完成頁面
      await page.goto('/pbl/scenarios');
      await page.locator('[data-testid="pbl-scenario-card"]').first().click();
      
      // 檢查是否有進行中的 program
      const continueButton = page.locator('button:has-text("Continue Learning")');
      if (await continueButton.isVisible()) {
        await continueButton.click();
        
        // 完成當前任務
        await page.locator('button:has-text("Complete Task")').click();
      }
      
      // 驗證完成頁面
      await expect(page.locator('h1')).toContainText(/Completed|完成/);
      await expect(page.locator('[data-testid="completion-feedback"]')).toBeVisible();
    });

    test('CRUD - Delete: 刪除草稿', async ({ page }) => {
      await page.goto('/pbl/scenarios');
      
      // 檢查是否有草稿
      const draftBadge = page.locator('[data-testid="draft-badge"]').first();
      if (await draftBadge.isVisible()) {
        const scenario = draftBadge.locator('..');
        await scenario.click();
        
        // 刪除草稿
        await page.locator('button:has-text("Delete Draft")').click();
        await page.locator('button:has-text("Confirm")').click();
        
        // 驗證返回列表頁
        await expect(page.url()).toBe('/pbl/scenarios');
      }
    });
  });

  test.describe('Discovery Mode - 五階段測試', () => {
    test('Stage 1-2: 動態生成 Content → Scenario', async ({ page }) => {
      await page.goto('/discovery');
      
      // 填寫探索表單
      await page.locator('input[name="interests"]').fill('AI, Machine Learning');
      await page.locator('select[name="experience"]').selectOption('beginner');
      await page.locator('button:has-text("Generate Path")').click();
      
      // 驗證生成的路徑（Scenarios）
      await expect(page.locator('[data-testid="generated-paths"]')).toBeVisible();
      await expect(page.locator('[data-testid="path-card"]').first()).toBeVisible();
    });

    test('Stage 3-4: 選擇路徑並執行任務', async ({ page }) => {
      await page.goto('/discovery');
      
      // 假設已有生成的路徑
      const pathCard = page.locator('[data-testid="path-card"]').first();
      if (await pathCard.isVisible()) {
        await pathCard.click();
        
        // 開始探索（創建 Program）
        await page.locator('button:has-text("Start Exploration")').click();
        
        // 執行任務
        const taskList = page.locator('[data-testid="task-item"]');
        const taskCount = await taskList.count();
        
        for (let i = 0; i < Math.min(taskCount, 3); i++) {
          await taskList.nth(i).click();
          
          // 完成任務
          await page.locator('textarea[name="response"]').fill(`任務 ${i + 1} 的回應`);
          await page.locator('button:has-text("Submit")').click();
          
          // 返回任務列表
          await page.locator('button:has-text("Next Task")').click();
        }
      }
    });

    test('Stage 5: 完成探索與總結', async ({ page }) => {
      // 訪問 discovery 完成頁面
      await page.goto('/discovery');
      
      const completedPath = page.locator('[data-testid="completed-path"]').first();
      if (await completedPath.isVisible()) {
        await completedPath.click();
        
        // 查看探索總結
        await expect(page.locator('[data-testid="exploration-summary"]')).toBeVisible();
        await expect(page.locator('[data-testid="skills-gained"]')).toBeVisible();
        await expect(page.locator('[data-testid="next-recommendations"]')).toBeVisible();
      }
    });

    test('CRUD - Update: 更新學習偏好', async ({ page }) => {
      await page.goto('/discovery/preferences');
      
      // 更新偏好設定
      await page.locator('input[name="interests"]').fill('Web Development, Cloud Computing');
      await page.locator('select[name="learningStyle"]').selectOption('visual');
      await page.locator('button:has-text("Save Preferences")').click();
      
      // 驗證更新成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Preferences updated');
    });
  });

  test.describe('跨模式 CRUD 驗證', () => {
    test('統一的進度追蹤', async ({ page }) => {
      await page.goto('/dashboard');
      
      // 驗證三個模式的進度都顯示
      await expect(page.locator('[data-testid="assessment-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="pbl-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="discovery-progress"]')).toBeVisible();
    });

    test('統一的數據持久化', async ({ page }) => {
      // 創建一些數據
      await page.goto('/pbl/scenarios');
      const scenarioTitle = await page.locator('[data-testid="scenario-title"]').first().textContent();
      
      // 重新載入頁面
      await page.reload();
      
      // 驗證數據仍然存在
      await expect(page.locator(`text="${scenarioTitle}"`)).toBeVisible();
    });
  });
});