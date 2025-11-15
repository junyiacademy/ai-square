import { test, expect } from '@playwright/test';

test('PBL Completion page with new program displays correctly', async ({ page }) => {
  // Step 1: Login first
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'demo@example.com');
  await page.fill('input[type="password"]', 'demo123');

  // Wait for button to be enabled
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 5000 });
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

  // Step 2: Navigate to the new completion page
  await page.goto('http://localhost:3000/pbl/scenarios/a5e6c365-832a-4c8e-babb-9f39ab462c1b/programs/003bcf30-f8c2-4e23-8108-3ad51e74672a/complete');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Check that the page doesn't have React rendering errors
  const errorMessages = await page.locator('text=/Objects are not valid as a React child/i').count();

  if (errorMessages > 0) {
    console.log('❌ Still has React rendering errors!');
    // Try to find where the error is
    const pageContent = await page.content();
    if (pageContent.includes('[object Object]')) {
      console.log('❌ Found [object Object] in page content');
    }
  } else {
    console.log('✅ No React rendering errors');
  }

  expect(errorMessages).toBe(0);

  // Check for [object Object] in task titles
  const taskTitles = await page.locator('h3').all();
  for (const title of taskTitles) {
    const text = await title.textContent();
    if (text?.includes('[object Object]')) {
      console.log('❌ Found [object Object] in task title:', text);
    }
    expect(text).not.toContain('[object Object]');
  }

  // Take a screenshot for verification
  await page.screenshot({
    path: 'pbl-completion-new-fixed.png',
    fullPage: false
  });

  console.log('✅ PBL Completion page displays correctly!');
});
