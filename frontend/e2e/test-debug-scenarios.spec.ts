import { test, expect } from '@playwright/test';

test('Debug scenario display', async ({ page }) => {
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

  // Get all scenario titles
  const scenarios = await page.locator('.grid > div h3').allTextContents();
  console.log(`Found ${scenarios.length} scenarios:`);
  scenarios.forEach((title, i) => {
    console.log(`${i + 1}. ${title}`);
  });

  // Check for duplicates
  const uniqueTitles = [...new Set(scenarios)];
  if (uniqueTitles.length !== scenarios.length) {
    console.log(`⚠️ Found duplicates! ${scenarios.length} total, ${uniqueTitles.length} unique`);
  }

  // Test filters
  const filters = ['創意', '技術', '商業', '科學'];
  for (const filter of filters) {
    await page.click(`button:has-text("${filter}")`);
    await page.waitForTimeout(1000);
    const count = await page.locator('.grid > div').count();
    const titles = await page.locator('.grid > div h3').allTextContents();
    console.log(`\n${filter}: ${count} scenarios`);
    titles.forEach(t => console.log(`  - ${t}`));
  }
});
