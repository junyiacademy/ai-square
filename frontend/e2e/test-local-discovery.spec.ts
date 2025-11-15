import { test, expect } from '@playwright/test';

test.describe('Discovery Category Filters - Local Test', () => {
  test('Test Local Discovery Categories', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // Fill login form
    await page.fill('#email', 'student123@aisquare.com');
    await page.fill('#password', 'Demo123456');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForTimeout(3000);

    // Go directly to discovery scenarios
    await page.goto('http://localhost:3000/discovery/scenarios');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot for debugging
    await page.screenshot({ path: 'local-discovery-all.png', fullPage: true });

    // Check total scenarios
    const allScenarios = await page.locator('.grid > div').count();
    console.log(`全部: ${allScenarios} scenarios`);
    expect(allScenarios).toBe(12);

    // Test each category filter
    const categories = [
      { name: '創意', expected: 4 },
      { name: '技術', expected: 4 },
      { name: '商業', expected: 2 },
      { name: '科學', expected: 2 }
    ];

    for (const category of categories) {
      // Click category button
      await page.click(`button:has-text("${category.name}")`);
      await page.waitForTimeout(1000);

      // Count scenarios
      const count = await page.locator('.grid > div').count();
      console.log(`${category.name}: ${count} scenarios (expected: ${category.expected})`);

      // Take screenshot
      await page.screenshot({ path: `local-discovery-${category.name}.png`, fullPage: true });

      // Verify count
      expect(count).toBe(category.expected);
    }

    // Test "全部" button works
    await page.click('button:has-text("全部")');
    await page.waitForTimeout(1000);
    const totalCount = await page.locator('.grid > div').count();
    console.log(`全部 (after filtering): ${totalCount} scenarios`);
    expect(totalCount).toBe(12);
  });
});
