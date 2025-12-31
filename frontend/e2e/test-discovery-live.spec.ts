import { test, expect } from "@playwright/test";

test.describe("Discovery Category Filters - Live Test", () => {
  test("Test Staging Discovery Categories", async ({ page }) => {
    const STAGING_URL = "https://ai-square-staging-m7s4ucbgba-de.a.run.app";

    // Login first
    await page.goto(`${STAGING_URL}/login`);
    await page.waitForLoadState("networkidle");

    // Fill login form
    await page.fill("#email", "student123@aisquare.com");
    await page.fill("#password", "Demo123456");
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForTimeout(3000);

    // Go directly to discovery scenarios
    await page.goto(`${STAGING_URL}/discovery/scenarios`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take screenshot for debugging
    await page.screenshot({ path: "staging-discovery.png", fullPage: true });

    // Check if scenarios are loaded
    const allScenarios = await page.locator(".grid > div").count();
    console.log(`Total scenarios visible: ${allScenarios}`);

    // Test category filters
    const categories = ["創意", "技術", "商業", "科學"];

    for (const category of categories) {
      // Click category button
      const button = page.locator(`button:has-text("${category}")`);
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(1000);

        const count = await page.locator(".grid > div").count();
        console.log(`${category}: ${count} scenarios`);
      }
    }

    // Click "全部" to see all
    await page.click('button:has-text("全部")');
    await page.waitForTimeout(1000);
    const totalCount = await page.locator(".grid > div").count();
    console.log(`全部: ${totalCount} scenarios`);
  });

  test("Test Production Discovery Categories", async ({ page }) => {
    const PROD_URL = "https://ai-square-frontend-m7s4ucbgba-de.a.run.app";

    // Login first
    await page.goto(`${PROD_URL}/login`);
    await page.waitForLoadState("networkidle");

    // Fill login form
    await page.fill("#email", "student123@aisquare.com");
    await page.fill("#password", "Demo123456");
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForTimeout(3000);

    // Go directly to discovery scenarios
    await page.goto(`${PROD_URL}/discovery/scenarios`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take screenshot for debugging
    await page.screenshot({ path: "production-discovery.png", fullPage: true });

    // Check if scenarios are loaded
    const allScenarios = await page.locator(".grid > div").count();
    console.log(`Total scenarios visible: ${allScenarios}`);

    // Test category filters
    const categories = ["創意", "技術", "商業", "科學"];

    for (const category of categories) {
      // Click category button
      const button = page.locator(`button:has-text("${category}")`);
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(1000);

        const count = await page.locator(".grid > div").count();
        console.log(`${category}: ${count} scenarios`);
      }
    }

    // Click "全部" to see all
    await page.click('button:has-text("全部")');
    await page.waitForTimeout(1000);
    const totalCount = await page.locator(".grid > div").count();
    console.log(`全部: ${totalCount} scenarios`);
  });
});
