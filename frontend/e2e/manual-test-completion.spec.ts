import { test, expect } from '@playwright/test';

test('Manual test - check completion page after login', async ({ page }) => {
  // Step 1: Go to login page and wait for it to be interactive
  await page.goto('http://localhost:3000/login');

  console.log('Please manually login with demo@example.com / demo123');
  console.log('Then navigate to: http://localhost:3000/pbl/scenarios/a5e6c365-832a-4c8e-babb-9f39ab462c1b/programs/003bcf30-f8c2-4e23-8108-3ad51e74672a/complete');
  console.log('Press any key to continue after manual login...');

  // Wait for manual login and navigation (give time for manual interaction)
  await page.waitForTimeout(30000); // 30 seconds for manual login

  // Check current URL
  const currentUrl = await page.url();
  console.log('Current URL:', currentUrl);

  if (currentUrl.includes('complete')) {
    // Check that the page doesn't have React rendering errors
    const pageContent = await page.content();
    const hasObjectObject = pageContent.includes('[object Object]');

    if (hasObjectObject) {
      console.log('❌ Found [object Object] in page content!');
      // Find specific occurrences
      const elements = await page.locator('text=/\\[object Object\\]/').all();
      for (const el of elements) {
        const text = await el.textContent();
        console.log('Found [object Object] in:', text);
      }
    } else {
      console.log('✅ No [object Object] found in page content');
    }

    // Take screenshot
    await page.screenshot({
      path: 'completion-page-manual-test.png',
      fullPage: true
    });

    expect(hasObjectObject).toBe(false);
  } else {
    console.log('Not on completion page, current URL:', currentUrl);
  }
});
