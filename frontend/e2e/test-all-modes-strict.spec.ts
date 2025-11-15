import { test, expect } from '@playwright/test';

test.describe('AI Square Learning Modes - Strict Test', () => {
  // 監聽 console 錯誤
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    const failed401Requests: string[] = [];
    const failed500Requests: string[] = [];

    // 監聽 console 錯誤
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 監聽網路請求失敗
    page.on('response', response => {
      if (response.status() === 401) {
        failed401Requests.push(response.url());
      } else if (response.status() >= 500) {
        failed500Requests.push(response.url());
      }
    });

    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('#email', 'student@example.com');
    await page.fill('#password', 'student123');
    await page.click('button[type="submit"]');

    // 必須成功導航到 dashboard
    await page.waitForURL('http://localhost:3000/dashboard', { timeout: 15000 });

    // 存儲錯誤資訊供測試使用
    page.errors = errors;
    page.failed401Requests = failed401Requests;
    page.failed500Requests = failed500Requests;
  });

  test('PBL Mode: Complete full flow without errors', async ({ page }) => {
    // 1. Navigate to PBL scenarios - 必須成功載入
    await page.goto('http://localhost:3000/pbl/scenarios');
    await expect(page.locator('h1:has-text("PBL")')).toBeVisible({ timeout: 10000 });

    // 2. 必須有場景卡片
    const scenarioCards = page.locator('article, .scenario-card, [data-testid*="scenario"]');
    await expect(scenarioCards.first()).toBeVisible();

    // 3. 點擊第一個場景 - 必須成功
    await scenarioCards.first().click();

    // 4. 必須進入場景詳情頁
    await page.waitForTimeout(2000);
    const startButton = page.locator('button:has-text("Start"), button:has-text("開始")');
    await expect(startButton.first()).toBeVisible({ timeout: 10000 });

    // 5. 開始學習 - 必須成功創建 program
    await startButton.first().click();

    // 6. 等待頁面載入
    await page.waitForTimeout(5000);

    // 7. 檢查是否有任務內容
    const hasTextarea = await page.locator('textarea').isVisible();
    const hasTaskContent = await page.locator('.task-content, .task-description').isVisible();

    // 8. 如果有輸入區域，嘗試提交
    if (hasTextarea) {
      await page.locator('textarea').fill('This is my test solution.');
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("提交")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(3000);
      }
    }

    // 9. 檢查是否有 401 錯誤
    expect(page.failed401Requests.length).toBe(0);
    if (page.failed401Requests.length > 0) {
      console.error('Found 401 errors:', page.failed401Requests);
    }

    // 10. 檢查是否有 500 錯誤
    expect(page.failed500Requests.length).toBe(0);
    if (page.failed500Requests.length > 0) {
      console.error('Found 500 errors:', page.failed500Requests);
    }

    // 11. 檢查 console 錯誤
    const criticalErrors = page.errors.filter(e =>
      e.includes('401') ||
      e.includes('500') ||
      e.includes('Failed to load resource')
    );
    expect(criticalErrors.length).toBe(0);
    if (criticalErrors.length > 0) {
      console.error('Found console errors:', criticalErrors);
    }
  });

  test('Check authentication persistence', async ({ page }) => {
    // 檢查登入後 cookie 是否正確設置
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'sessionToken');
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie?.value).toBeTruthy();

    // 嘗試訪問需要認證的 API
    const response = await page.request.get('http://localhost:3000/api/auth/check');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.authenticated).toBe(true);
    expect(data.user).toBeTruthy();
  });

  test('API requests should not return 401', async ({ page }) => {
    // 測試幾個關鍵 API
    const apis = [
      '/api/pbl/scenarios',
      '/api/discovery/scenarios',
      '/api/assessment/scenarios'
    ];

    for (const api of apis) {
      const response = await page.request.get(`http://localhost:3000${api}`);
      expect(response.status()).not.toBe(401);
      if (response.status() === 401) {
        console.error(`API ${api} returned 401 when authenticated`);
      }
    }
  });
});
