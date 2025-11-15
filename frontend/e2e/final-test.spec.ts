import { test, expect } from '@playwright/test';

test('Final Discovery category test', async ({ page }) => {
  const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';

  // 1. Login
  console.log('Logging in...');
  await page.goto(`${STAGING_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('#email', 'student123@aisquare.com');
  await page.fill('#password', 'Demo123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // 2. Go to Discovery
  console.log('Navigating to Discovery...');
  await page.goto(`${STAGING_URL}/discovery/scenarios`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // 3. Take screenshot
  await page.screenshot({ path: 'final-discovery.png', fullPage: true });

  // 4. Count all scenarios
  const allCards = await page.locator('[data-testid="scenario-card"]').count();
  console.log(`\n全部: ${allCards} scenarios`);

  // 5. Test each filter
  const filters = [
    { name: '創意', expected: 4 },
    { name: '技術', expected: 4 },
    { name: '商業', expected: 2 },
    { name: '科學', expected: 2 }
  ];

  for (const filter of filters) {
    console.log(`\nTesting ${filter.name} filter...`);

    // Click filter button
    const button = page.locator(`button:has-text("${filter.name}")`).first();
    if (await button.isVisible()) {
      await button.click();
      await page.waitForTimeout(1500);

      // Count scenarios
      const count = await page.locator('[data-testid="scenario-card"]').count();
      console.log(`${filter.name}: ${count} scenarios (expected: ${filter.expected})`);

      // Take screenshot
      await page.screenshot({ path: `final-${filter.name}.png`, fullPage: true });

      if (count !== filter.expected) {
        console.log(`❌ FAILED: ${filter.name} shows ${count} but expected ${filter.expected}`);
      } else {
        console.log(`✅ PASSED: ${filter.name} shows correct count`);
      }
    } else {
      console.log(`⚠️ Filter button "${filter.name}" not found`);
    }
  }

  // Return to "全部"
  await page.click('button:has-text("全部")');
  await page.waitForTimeout(1000);
  const finalCount = await page.locator('[data-testid="scenario-card"]').count();
  console.log(`\n全部 (final): ${finalCount} scenarios`);
});
