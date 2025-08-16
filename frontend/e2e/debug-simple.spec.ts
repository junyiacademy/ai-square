import { test, expect } from '@playwright/test';

test('Simple Discovery test', async ({ page }) => {
  // Go directly to Discovery without login
  await page.goto('http://localhost:3001/discovery/scenarios');
  await page.waitForTimeout(5000);
  
  // Take screenshot
  await page.screenshot({ path: 'local-discovery.png', fullPage: true });
  
  // Check page content
  const title = await page.locator('h1').textContent();
  console.log('Page title:', title);
  
  // Check for any content
  const body = await page.locator('body').textContent();
  console.log('Has login form:', body?.includes('Email'));
  console.log('Has scenarios:', body?.includes('scenario'));
});