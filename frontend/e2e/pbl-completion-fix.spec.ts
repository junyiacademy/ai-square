import { test, expect } from '@playwright/test';

test('PBL Completion page displays correctly with multilingual fields', async ({ page }) => {
  // Step 1: Login first
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'demo@example.com');
  await page.fill('input[type="password"]', 'demo123');
  
  // Wait for button to be enabled
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 5000 });
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  
  // Step 2: Navigate to completion page
  await page.goto('http://localhost:3000/pbl/scenarios/a5e6c365-832a-4c8e-babb-9f39ab462c1b/programs/364b6133-5a32-443b-bfc1-28f5f745a75e/complete');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check that the page doesn't have React rendering errors
  const errorMessages = await page.locator('text=/Objects are not valid as a React child/i').count();
  expect(errorMessages).toBe(0);
  
  // Get the page content to see what's actually rendered
  const pageTitle = await page.title();
  console.log('Page title:', pageTitle);
  
  // Check if there's any [object Object] in the page
  const pageContent = await page.content();
  const hasObjectObject = pageContent.includes('[object Object]');
  
  if (hasObjectObject) {
    console.log('❌ Found [object Object] in page content!');
    // Find where it appears
    const elements = await page.locator('text=/\\[object Object\\]/').all();
    for (const el of elements) {
      const text = await el.textContent();
      console.log('Found [object Object] in:', text);
    }
  } else {
    console.log('✅ No [object Object] found in page content');
  }
  
  expect(hasObjectObject).toBe(false);
  
  // Take a screenshot for verification
  await page.screenshot({ 
    path: 'pbl-completion-fixed.png', 
    fullPage: false 
  });
  
  console.log('✅ PBL Completion page displays correctly!');
});