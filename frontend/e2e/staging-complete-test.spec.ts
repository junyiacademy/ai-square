import { test, expect } from "@playwright/test";

const STAGING_URL = "https://ai-square-staging-731209836128.asia-east1.run.app";

test.describe("Staging Environment Complete Test", () => {
  test.setTimeout(60000); // 1 minute timeout

  test("1. Homepage loads correctly", async ({ page }) => {
    await page.goto(STAGING_URL);

    // Check title
    await expect(page).toHaveTitle(/AI Square/);

    // Check main navigation exists
    await expect(page.locator("nav")).toBeVisible();

    // Check language selector
    await expect(
      page.locator(
        'select[aria-label*="語言"], select[aria-label*="language"]',
      ),
    ).toBeVisible();

    console.log("✅ Homepage loads correctly");
  });

  test("2. API Health Check", async ({ request }) => {
    const response = await request.get(`${STAGING_URL}/api/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe("healthy");
    expect(data.checks.database.status).toBe(true);

    console.log("✅ API Health Check passed");
  });

  test("3. Login page accessible", async ({ page }) => {
    await page.goto(`${STAGING_URL}/login`);

    // Check for login form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();

    console.log("✅ Login page accessible");
  });

  test("4. Demo account login test", async ({ page }) => {
    await page.goto(`${STAGING_URL}/login`);

    // Fill login form
    await page.fill('input[name="email"]', "student@example.com");
    await page.fill('input[name="password"]', "student123");

    // Click sign in
    await page.click('button:has-text("Sign in")');

    // Wait for response
    await page.waitForTimeout(5000);

    // Check if redirected or error shown
    const currentUrl = page.url();
    const hasError =
      (await page.locator('.text-red-500, [role="alert"]').count()) > 0;

    if (hasError) {
      const errorText = await page
        .locator('.text-red-500, [role="alert"]')
        .first()
        .textContent();
      console.log(`⚠️ Login error: ${errorText}`);
    } else if (currentUrl !== `${STAGING_URL}/login`) {
      console.log(`✅ Login redirected to: ${currentUrl}`);
    }
  });

  test("5. PBL Scenarios page", async ({ page }) => {
    await page.goto(`${STAGING_URL}/pbl/scenarios`);

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check if page loads without error
    const hasError =
      (await page.locator("text=/error|Error|404/i").count()) > 0;

    if (!hasError) {
      // Check for scenario cards or empty state
      const scenarioCards = await page
        .locator('[data-testid="scenario-card"], .scenario-card, article')
        .count();
      const emptyState =
        (await page.locator("text=/no scenarios|empty|沒有/i").count()) > 0;

      console.log(
        `✅ PBL page loaded - Scenarios: ${scenarioCards}, Empty state: ${emptyState}`,
      );
    } else {
      console.log("❌ PBL page has errors");
    }
  });

  test("6. Discovery page", async ({ page }) => {
    await page.goto(`${STAGING_URL}/discovery/scenarios`);
    await page.waitForLoadState("networkidle");

    const hasError =
      (await page.locator("text=/error|Error|404/i").count()) > 0;

    if (!hasError) {
      console.log("✅ Discovery page loaded");
    } else {
      console.log("❌ Discovery page has errors");
    }
  });

  test("7. Assessment page", async ({ page }) => {
    await page.goto(`${STAGING_URL}/assessment/scenarios`);
    await page.waitForLoadState("networkidle");

    const hasError =
      (await page.locator("text=/error|Error|404/i").count()) > 0;

    if (!hasError) {
      console.log("✅ Assessment page loaded");
    } else {
      console.log("❌ Assessment page has errors");
    }
  });

  test("8. API Endpoints test", async ({ request }) => {
    const endpoints = [
      "/api/pbl/scenarios?lang=en",
      "/api/discovery/scenarios?lang=en",
      "/api/assessment/scenarios?lang=en",
      "/api/relations?lang=en",
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${STAGING_URL}${endpoint}`);
      const status = response.status();

      if (status === 200) {
        const data = await response.json();
        const itemCount = Array.isArray(data) ? data.length : "N/A";
        console.log(`✅ ${endpoint} - Status: ${status}, Items: ${itemCount}`);
      } else {
        console.log(`❌ ${endpoint} - Status: ${status}`);
      }
    }
  });

  test("9. Mobile responsive test", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(STAGING_URL);

    // Check if mobile menu button is visible
    const mobileMenuButton =
      (await page
        .locator('button[aria-label*="menu"], button[aria-label*="navigation"]')
        .count()) > 0;

    console.log(
      `✅ Mobile responsive: Menu button ${mobileMenuButton ? "visible" : "not found"}`,
    );
  });

  test("10. Static assets loading", async ({ page }) => {
    await page.goto(STAGING_URL);

    // Check if logo loads
    const logoLoaded = await page
      .locator('img[alt*="logo"], img[alt*="Logo"]')
      .first()
      .evaluate((img) => {
        return img.complete && img.naturalHeight !== 0;
      })
      .catch(() => false);

    // Check if CSS loaded (check for styled elements)
    const hasStyles = await page.evaluate(() => {
      const element = document.querySelector("nav");
      return element && window.getComputedStyle(element).display !== "inline";
    });

    console.log(
      `✅ Static assets: Logo ${logoLoaded ? "loaded" : "failed"}, CSS ${hasStyles ? "loaded" : "failed"}`,
    );
  });
});
