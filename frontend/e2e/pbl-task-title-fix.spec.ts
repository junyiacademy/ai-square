import { test, expect } from '@playwright/test';

test('PBL Task Title Displays Correctly After Fix', async ({ page }) => {
  // Step 1: Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'demo@example.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

  // Step 2: Navigate to PBL scenarios
  await page.goto('http://localhost:3000/pbl');
  await page.waitForLoadState('networkidle');

  // Step 3: Click on first scenario
  const firstScenario = await page.locator('.bg-white').first();
  await firstScenario.click();

  // Step 4: Start a new program (click Start button)
  await page.waitForSelector('button:has-text("Start")', { timeout: 10000 });
  await page.click('button:has-text("Start")');

  // Step 5: Wait for the task page to load
  await page.waitForURL(/\/tasks\//, { timeout: 10000 });

  // Step 6: Verify task title is displayed correctly
  const taskTitle = await page.locator('h2').filter({ hasText: /Task \d+:/ }).first();
  const titleText = await taskTitle.textContent();

  console.log('Task title found:', titleText);

  // Verify the title doesn't contain [object Object]
  expect(titleText).not.toContain('[object Object]');

  // Verify the title has the correct format: "Task N: Actual Title"
  expect(titleText).toMatch(/Task \d+: .+/);

  // Verify the title contains actual text after the task number
  const titleParts = titleText?.split(':');
  expect(titleParts).toHaveLength(2);
  expect(titleParts?.[1]?.trim().length).toBeGreaterThan(0);

  // Take a screenshot for verification
  await page.screenshot({
    path: 'pbl-task-title-fixed.png',
    fullPage: false
  });

  console.log('✅ Task title displays correctly!');
});
