import { test, expect } from '@playwright/test';

const environments = [
  { name: 'Staging', url: 'https://ai-square-staging-731209836128.asia-east1.run.app' },
  { name: 'Production', url: 'https://ai-square-production-731209836128.asia-east1.run.app' }
];

const users = [
  { email: 'student@example.com', password: 'student123', role: 'student' },
  { email: 'teacher@example.com', password: 'teacher123', role: 'teacher' },
  { email: 'admin@example.com', password: 'admin123', role: 'admin' }
];

environments.forEach(env => {
  test.describe(`${env.name} Environment Tests`, () => {
    test.describe.configure({ mode: 'parallel' });

    users.forEach(user => {
      test(`Login test for ${user.role}`, async ({ page }) => {
        // 1. 訪問首頁
        await page.goto(env.url);
        await expect(page).toHaveTitle(/AI Square/);
        
        // 2. 點擊登入按鈕
        await page.click('button:has-text("Sign in")');
        await expect(page).toHaveURL(/\/login/);
        
        // 3. 填寫登入表單
        await page.fill('input[type="email"]', user.email);
        await page.fill('input[type="password"]', user.password);
        
        // 4. 提交登入
        await page.click('button[type="submit"]:has-text("Sign in")');
        
        // 5. 等待登入完成（應該重定向到 dashboard）
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
        
        // 6. 驗證登入狀態
        await expect(page.locator('text=' + user.email)).toBeVisible();
        
        // 7. 測試訪問受保護頁面
        await page.goto(`${env.url}/pbl`);
        await expect(page).not.toHaveURL(/\/login/);
        await expect(page).toHaveURL(/\/pbl/);
        
        // 8. 檢查 PBL scenarios 是否載入
        await page.waitForLoadState('networkidle');
        const scenarioCount = await page.locator('.scenario-card').count();
        console.log(`${env.name} - ${user.role}: Found ${scenarioCount} PBL scenarios`);
        
        // 9. 測試 Discovery
        await page.goto(`${env.url}/discovery`);
        await expect(page).not.toHaveURL(/\/login/);
        
        // 10. 測試 Assessment
        await page.goto(`${env.url}/assessment/scenarios`);
        await expect(page).not.toHaveURL(/\/login/);
      });
    });

    test('Complete user journey test', async ({ page }) => {
      // 1. 登入
      await page.goto(env.url);
      await page.click('button:has-text("Sign in")');
      await page.fill('input[type="email"]', 'student@example.com');
      await page.fill('input[type="password"]', 'student123');
      await page.click('button[type="submit"]:has-text("Sign in")');
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      // 2. 訪問 PBL 並選擇一個 scenario（如果有的話）
      await page.goto(`${env.url}/pbl`);
      const scenarioCards = page.locator('.scenario-card');
      const count = await scenarioCards.count();
      
      if (count > 0) {
        // 點擊第一個 scenario
        await scenarioCards.first().click();
        await expect(page).toHaveURL(/\/pbl\/scenarios\//);
        
        // 檢查 scenario 詳情頁面載入
        await expect(page.locator('h1')).toBeVisible();
        
        // 如果有開始按鈕，測試開始學習
        const startButton = page.locator('button:has-text("Start"), button:has-text("開始")');
        if (await startButton.isVisible()) {
          await startButton.click();
          await expect(page).toHaveURL(/\/program\//);
        }
      }
      
      // 3. 測試多語言切換
      const langSelector = page.locator('select[aria-label*="language"], select[aria-label*="語言"]');
      if (await langSelector.isVisible()) {
        await langSelector.selectOption('zh');
        await page.waitForLoadState('networkidle');
        // 檢查頁面是否切換到中文
        await expect(page.locator('text=儀表板, text=Dashboard')).toBeVisible();
      }
      
      // 4. 登出測試
      const userMenu = page.locator('button:has-text("student@example.com"), [aria-label*="user menu"]');
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.click('button:has-text("Sign out"), button:has-text("登出")');
        await expect(page).toHaveURL(/\/(login|$)/);
      }
    });

    test('API health check', async ({ request }) => {
      const response = await request.get(`${env.url}/api/health`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      console.log(`${env.name} health status:`, data.status);
      
      // 檢查各個 API endpoints
      const endpoints = [
        '/api/pbl/scenarios?lang=en',
        '/api/discovery/scenarios?lang=en',
        '/api/assessment/scenarios?lang=en'
      ];
      
      for (const endpoint of endpoints) {
        const res = await request.get(`${env.url}${endpoint}`);
        expect(res.ok()).toBeTruthy();
        const json = await res.json();
        console.log(`${env.name} ${endpoint}: ${json.scenarios?.length || 0} scenarios`);
      }
    });
  });
});

test('Cross-environment consistency', async ({ request }) => {
  // 比較兩個環境的 API 回應
  const stagingHealth = await request.get(`${environments[0].url}/api/health`);
  const prodHealth = await request.get(`${environments[1].url}/api/health`);
  
  expect(stagingHealth.ok()).toBeTruthy();
  expect(prodHealth.ok()).toBeTruthy();
  
  // 比較 scenario 數量
  const stagingPBL = await request.get(`${environments[0].url}/api/pbl/scenarios?lang=en`);
  const prodPBL = await request.get(`${environments[1].url}/api/pbl/scenarios?lang=en`);
  
  const stagingData = await stagingPBL.json();
  const prodData = await prodPBL.json();
  
  console.log('Staging PBL scenarios:', stagingData.scenarios?.length || 0);
  console.log('Production PBL scenarios:', prodData.scenarios?.length || 0);
});