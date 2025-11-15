import { test, expect } from '@playwright/test';

const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';

test.describe('Staging Validation E2E Tests', () => {
  test('1. Homepage loads correctly', async ({ page }) => {
    await page.goto(STAGING_URL);
    await expect(page).toHaveTitle(/AI Square/);
    await expect(page.locator('text=開始學習')).toBeVisible();
  });

  test('2. Login with demo account', async ({ page }) => {
    await page.goto(`${STAGING_URL}/login`);

    // Fill login form
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'student123');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(`${STAGING_URL}/dashboard`);

    // Verify logged in
    await expect(page.locator('text=Student User')).toBeVisible();
  });

  test('3. Access PBL scenarios', async ({ page }) => {
    // Login first
    await page.goto(`${STAGING_URL}/login`);
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'student123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${STAGING_URL}/dashboard`);

    // Navigate to PBL
    await page.goto(`${STAGING_URL}/pbl`);

    // Check scenarios loaded
    await expect(page.locator('text=Problem-Based Learning')).toBeVisible();
    await expect(page.locator('[data-testid="scenario-card"]')).toHaveCount(9);
  });

  test('4. Multi-language support', async ({ page }) => {
    await page.goto(STAGING_URL);

    // Switch to Chinese
    await page.click('[data-testid="language-selector"]');
    await page.click('text=繁體中文');

    // Verify language changed
    await expect(page.locator('text=開始學習')).toBeVisible();

    // Switch to English
    await page.click('[data-testid="language-selector"]');
    await page.click('text=English');

    // Verify language changed back
    await expect(page.locator('text=Start Learning')).toBeVisible();
  });

  test('5. API health check', async ({ page }) => {
    const response = await page.request.get(`${STAGING_URL}/api/health`);
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database.status).toBe(true);
  });
});
