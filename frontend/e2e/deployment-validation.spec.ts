/**
 * 部署驗證測試 - 每次部署後必須通過
 * 這些測試是強制性的，不通過就代表部署失敗
 */

import { test, expect } from "@playwright/test";

const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || "http://localhost:3000";

test.describe("🚨 部署驗證測試 - 必須全部通過", () => {
  test("1. 首頁必須能載入", async ({ page }) => {
    await page.goto(DEPLOYMENT_URL);
    await expect(page).toHaveTitle(/AI Square/);

    // 檢查沒有 500 錯誤
    const responsePromise = page.waitForResponse(
      (response) => response.status() >= 500,
    );

    const hasServerError = await Promise.race([
      responsePromise.then(() => true),
      page.waitForTimeout(3000).then(() => false),
    ]);

    expect(hasServerError).toBe(false);
  });

  test("2. 登入功能必須正常", async ({ page }) => {
    await page.goto(`${DEPLOYMENT_URL}/login`);
    await page.fill("#email", "student123@aisquare.com");
    await page.fill("#password", "Demo123456");
    await page.click('button[type="submit"]');

    // 應該要跳轉（不能還在 login 頁面）
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");
  });

  test("3. Discovery 頁面必須顯示 scenarios", async ({ page }) => {
    // Login first
    await page.goto(`${DEPLOYMENT_URL}/login`);
    await page.fill("#email", "student123@aisquare.com");
    await page.fill("#password", "Demo123456");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Go to Discovery
    await page.goto(`${DEPLOYMENT_URL}/discovery/scenarios`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // 必須有 scenarios
    const scenarios = await page
      .locator('[data-testid="scenario-card"]')
      .count();
    console.log(`Found ${scenarios} scenarios`);
    expect(scenarios).toBeGreaterThan(0);
    expect(scenarios).toBe(12); // 應該要有 12 個
  });

  test("4. Discovery 分類篩選器必須正常", async ({ page }) => {
    // Login
    await page.goto(`${DEPLOYMENT_URL}/login`);
    await page.fill("#email", "student123@aisquare.com");
    await page.fill("#password", "Demo123456");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Go to Discovery
    await page.goto(`${DEPLOYMENT_URL}/discovery/scenarios`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // 測試每個分類
    const categories = [
      { name: "創意", minExpected: 1 },
      { name: "技術", minExpected: 1 },
      { name: "商業", minExpected: 1 },
      { name: "科學", minExpected: 1 },
    ];

    for (const category of categories) {
      const button = page
        .locator(`button:has-text("${category.name}")`)
        .first();

      // 按鈕必須存在
      await expect(button).toBeVisible();

      // 點擊分類
      await button.click();
      await page.waitForTimeout(1500);

      // 必須顯示至少 1 個 scenario
      const count = await page.locator('[data-testid="scenario-card"]').count();
      console.log(`${category.name}: ${count} scenarios`);
      expect(count).toBeGreaterThanOrEqual(category.minExpected);
    }
  });

  test("5. PBL 頁面必須能載入", async ({ page }) => {
    await page.goto(`${DEPLOYMENT_URL}/pbl/scenarios`);
    await page.waitForLoadState("networkidle");

    // 應該要有標題
    const title = await page.locator("h1").textContent();
    expect(title).toBeTruthy();
  });

  test("6. Assessment 頁面必須能載入", async ({ page }) => {
    await page.goto(`${DEPLOYMENT_URL}/assessment/scenarios`);
    await page.waitForLoadState("networkidle");

    // 應該要有標題
    const title = await page.locator("h1").textContent();
    expect(title).toBeTruthy();
  });

  test("7. API 健康檢查", async ({ page }) => {
    // 檢查關鍵 API
    const apis = [
      "/api/health",
      "/api/discovery/scenarios?lang=zh",
      "/api/pbl/scenarios?lang=zh",
      "/api/assessment/scenarios?lang=zh",
    ];

    for (const api of apis) {
      const response = await page.request.get(`${DEPLOYMENT_URL}${api}`);
      console.log(`${api}: ${response.status()}`);
      expect(response.status()).toBeLessThan(500);
    }
  });

  test("8. 沒有 Console 錯誤", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(`${DEPLOYMENT_URL}/discovery/scenarios`);
    await page.waitForTimeout(3000);

    // 不應該有錯誤（除了一些可接受的）
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("Failed to load resource") && // 可能的外部資源
        !e.includes("favicon"), // favicon 404 可接受
    );

    if (criticalErrors.length > 0) {
      console.log("Console errors found:", criticalErrors);
    }

    expect(criticalErrors.length).toBe(0);
  });
});

// 性能測試（可選但建議）
test.describe("性能檢查", () => {
  test("頁面載入時間合理", async ({ page }) => {
    const startTime = Date.now();
    await page.goto(DEPLOYMENT_URL);
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;

    console.log(`首頁載入時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000); // 10 秒內
  });
});
