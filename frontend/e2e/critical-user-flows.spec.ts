/**
 * 關鍵用戶流程 E2E 測試
 * 這些測試模擬真實用戶操作，確保整個系統正常運作
 */

import { test, expect, Page } from '@playwright/test';

// 測試用戶資料
const TEST_USER = {
  email: 'student@example.com',
  password: 'password123',
  name: 'Test Student'
};

// Helper: 登入
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // 等待導航完成
  await page.waitForURL(/^((?!login).)*$/); // 等待離開 login 頁面
}

// Helper: 檢查是否已登入
async function checkAuthenticated(page: Page) {
  // 檢查 cookie
  const cookies = await page.context().cookies();
  const isLoggedIn = cookies.find(c => c.name === 'isLoggedIn');
  return isLoggedIn?.value === 'true';
}

test.describe('🚨 關鍵用戶流程 - Critical User Flows', () => {
  test.beforeEach(async ({ page, context }) => {
    // 清除所有 cookies
    await context.clearCookies();
    // localStorage 清除需要先導航到頁面
    await page.goto('/');
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch (e) {
        // Ignore localStorage errors in test environment
      }
    });
  });

  test('完整 Onboarding 到 Assessment 流程', async ({ page }) => {
    // Step 1: 登入
    await test.step('登入系統', async () => {
      await login(page, TEST_USER.email, TEST_USER.password);
      const authenticated = await checkAuthenticated(page);
      expect(authenticated).toBe(true);
    });

    // Step 2: 進入 Onboarding
    await test.step('進入 Onboarding Welcome 頁面', async () => {
      await page.goto('/onboarding/welcome');
      await expect(page).toHaveURL('/onboarding/welcome');
      
      // 檢查頁面元素
      await expect(page.locator('h1')).toContainText(/Welcome|歡迎/i);
      
      // 點擊 Continue
      await page.click('button:has-text("Continue"), button:has-text("繼續")');
    });

    // Step 3: Identity 頁面
    await test.step('選擇身份', async () => {
      await page.waitForURL('**/onboarding/identity');
      
      // 選擇 Student
      await page.click('button:has-text("Student"), div:has-text("學生")');
      
      // 點擊 Continue
      await page.click('button:has-text("Continue"), button:has-text("繼續")');
    });

    // Step 4: Goals 頁面
    await test.step('選擇學習目標', async () => {
      await page.waitForURL('**/onboarding/goals');
      
      // 檢查是否有目標選項
      const goalOptions = page.locator('[data-testid="goal-option"], button[role="option"]');
      await expect(goalOptions).toHaveCount(3, { timeout: 10000 });
      
      // 選擇第一個目標
      await goalOptions.first().click();
      
      // 點擊 Continue to Assessment
      const continueButton = page.locator('button:has-text("Continue to Assessment"), button:has-text("開始評估")');
      await expect(continueButton).toBeVisible();
      await continueButton.click();
    });

    // Step 5: 檢查是否成功進入 Assessment
    await test.step('驗證進入 Assessment 頁面', async () => {
      // 等待導航到 assessment 頁面
      await page.waitForURL(/assessment|test/, { timeout: 15000 });
      
      // 檢查是否有問題顯示
      const questionElements = page.locator('[data-testid="question"], .question-container, h2');
      await expect(questionElements.first()).toBeVisible({ timeout: 10000 });
      
      // 截圖作為證據
      await page.screenshot({ path: 'e2e-screenshots/assessment-success.png', fullPage: true });
    });
  });

  test('PBL 學習流程', async ({ page }) => {
    // 先登入
    await login(page, TEST_USER.email, TEST_USER.password);

    await test.step('進入 PBL 列表', async () => {
      await page.goto('/pbl');
      await expect(page).toHaveURL('/pbl');
      
      // 檢查是否有 scenario 卡片
      const scenarioCards = page.locator('[data-testid="scenario-card"], .scenario-card');
      await expect(scenarioCards.first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('選擇 Scenario', async () => {
      // 點擊第一個 scenario
      const firstScenario = page.locator('[data-testid="scenario-card"], .scenario-card').first();
      await firstScenario.click();
      
      // 等待進入 scenario 詳情頁
      await page.waitForURL(/\/pbl\/scenarios\/[^\/]+$/);
      
      // 檢查 Start Learning 按鈕
      const startButton = page.locator('button:has-text("Start Learning"), button:has-text("開始學習")');
      await expect(startButton).toBeVisible();
    });

    await test.step('開始學習', async () => {
      // 點擊 Start Learning
      await page.click('button:has-text("Start Learning"), button:has-text("開始學習")');
      
      // 等待進入學習頁面
      await page.waitForURL(/\/learn$/);
      
      // 檢查是否有任務內容
      const taskContent = page.locator('[data-testid="task-content"], .task-content, .chat-interface');
      await expect(taskContent).toBeVisible({ timeout: 10000 });
      
      // 截圖
      await page.screenshot({ path: 'e2e-screenshots/pbl-learning.png', fullPage: true });
    });
  });

  test('Discovery 職涯探索流程', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    await test.step('進入 Discovery', async () => {
      await page.goto('/discovery');
      await expect(page).toHaveURL('/discovery');
      
      // 檢查頁面標題
      await expect(page.locator('h1')).toContainText(/Career|職涯|Discovery/i);
    });

    await test.step('選擇職涯路徑', async () => {
      // 選擇第一個職涯選項
      const careerOption = page.locator('[data-testid="career-option"], .career-card').first();
      await expect(careerOption).toBeVisible({ timeout: 10000 });
      await careerOption.click();
      
      // 檢查是否有開始按鈕
      const startButton = page.locator('button:has-text("Start"), button:has-text("開始")');
      await expect(startButton).toBeVisible();
    });
  });

  test('認證狀態保持', async ({ page }) => {
    await test.step('登入並記住狀態', async () => {
      await login(page, TEST_USER.email, TEST_USER.password);
      
      // 重新載入頁面
      await page.reload();
      
      // 檢查是否仍然登入
      const authenticated = await checkAuthenticated(page);
      expect(authenticated).toBe(true);
    });

    await test.step('訪問受保護頁面', async () => {
      // 直接訪問需要認證的頁面
      await page.goto('/profile');
      
      // 不應該被重定向到登入頁
      await expect(page).not.toHaveURL(/login/);
      
      // 應該看到 profile 內容
      await expect(page.locator('h1')).toContainText(/Profile|個人資料/i);
    });
  });

  test('錯誤處理和回退機制', async ({ page }) => {
    await test.step('未登入訪問受保護頁面', async () => {
      // 未登入狀態訪問 PBL
      await page.goto('/pbl');
      
      // 應該被重定向到登入頁
      await expect(page).toHaveURL(/login/);
      
      // 應該有 redirect 參數
      const url = new URL(page.url());
      expect(url.searchParams.get('redirect')).toBe('/pbl');
    });

    await test.step('無效的路徑處理', async () => {
      await page.goto('/invalid-path-12345');
      
      // 應該顯示 404 或重定向到首頁
      const is404 = await page.locator('text=/404|not found/i').isVisible();
      const isHome = page.url().endsWith('/');
      
      expect(is404 || isHome).toBe(true);
    });
  });
});

test.describe('🔄 資料一致性測試', () => {
  test('Program 創建和狀態同步', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    await test.step('創建 Assessment Program', async () => {
      // 通過 API 檢查現有 programs
      const response = await page.request.get('/api/assessment/programs');
      const beforePrograms = await response.json();
      const beforeCount = beforePrograms.data?.length || 0;
      
      // 執行創建 program 的操作
      await page.goto('/onboarding/goals');
      
      // 選擇目標並創建
      const goalOption = page.locator('[data-testid="goal-option"]').first();
      await goalOption.click();
      await page.click('button:has-text("Continue to Assessment")');
      
      // 再次檢查 programs
      const afterResponse = await page.request.get('/api/assessment/programs');
      const afterPrograms = await afterResponse.json();
      const afterCount = afterPrograms.data?.length || 0;
      
      // 應該增加了一個 program
      expect(afterCount).toBeGreaterThan(beforeCount);
    });
  });
});

test.describe('🌐 多語言支援測試', () => {
  test('語言切換功能', async ({ page }) => {
    await page.goto('/');
    
    await test.step('切換到中文', async () => {
      // 找到語言選擇器
      const langSelector = page.locator('[data-testid="language-selector"], select[aria-label*="language"]');
      await langSelector.selectOption('zhTW');
      
      // 等待頁面更新
      await page.waitForTimeout(500);
      
      // 檢查是否有中文內容
      const hasChineseText = await page.locator('text=/學習|評估|探索/').isVisible();
      expect(hasChineseText).toBe(true);
    });
    
    await test.step('切換回英文', async () => {
      const langSelector = page.locator('[data-testid="language-selector"], select[aria-label*="language"]');
      await langSelector.selectOption('en');
      
      await page.waitForTimeout(500);
      
      // 檢查是否有英文內容
      const hasEnglishText = await page.locator('text=/Learn|Assessment|Explore/').isVisible();
      expect(hasEnglishText).toBe(true);
    });
  });
});