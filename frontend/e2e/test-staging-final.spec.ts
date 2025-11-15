import { test, expect } from '@playwright/test';

test.describe('Staging Discovery Final Test', () => {
  test('Verify category filters work correctly', async ({ page }) => {
    const STAGING_URL = 'https://ai-square-staging-m7s4ucbgba-de.a.run.app';

    // Login
    await page.goto(`${STAGING_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('#email', 'student123@aisquare.com');
    await page.fill('#password', 'Demo123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navigate to Discovery
    await page.goto(`${STAGING_URL}/discovery/scenarios`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test "全部" shows all scenarios
    await page.click('button:has-text("全部")');
    await page.waitForTimeout(1000);
    const allCount = await page.locator('[data-testid="scenario-card"]').count();
    console.log(`全部: ${allCount} scenarios`);
    expect(allCount).toBe(12);

    // Test each category
    const tests = [
      { category: '創意', expected: 4 },
      { category: '技術', expected: 4 },
      { category: '商業', expected: 2 },
      { category: '科學', expected: 2 }
    ];

    for (const test of tests) {
      await page.click(`button:has-text("${test.category}")`);
      await page.waitForTimeout(1000);
      const count = await page.locator('[data-testid="scenario-card"]').count();
      console.log(`${test.category}: ${count} scenarios (expected: ${test.expected})`);
      expect(count).toBe(test.expected);
    }

    console.log('✅ All category filters working correctly!');
  });
});
