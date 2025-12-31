import { test, expect } from "@playwright/test";

test("PBL Programs section can be collapsed and expanded", async ({ page }) => {
  // Step 1: Login first
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "demo@example.com");
  await page.fill('input[type="password"]', "demo123");

  // Wait for button to be enabled
  await page.waitForSelector('button[type="submit"]:not([disabled])', {
    timeout: 5000,
  });
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10000,
  });

  // Step 2: Navigate to the scenario page
  await page.goto(
    "http://localhost:3000/pbl/scenarios/a5e6c365-832a-4c8e-babb-9f39ab462c1b",
  );

  // Wait for the page to load
  await page.waitForLoadState("networkidle");

  // Step 3: Find the programs section
  const programsHeader = await page
    .locator("text=/Your Programs \\(/i")
    .first();
  await expect(programsHeader).toBeVisible();

  // Step 4: Check that programs are initially visible (expanded)
  const programItems = await page.locator(
    '[class*="bg-white dark:bg-gray-800 rounded-md border"]',
  );
  const initialProgramCount = await programItems.count();
  console.log("Initial program items visible:", initialProgramCount);
  expect(initialProgramCount).toBeGreaterThan(0);

  // Step 5: Click the collapse button (the entire header is clickable)
  const collapseButton = programsHeader.locator(".."); // Get parent button element
  await collapseButton.click();

  // Step 6: Check that programs are now collapsed (hidden)
  await page.waitForTimeout(500); // Wait for animation
  const collapsedProgramCount = await programItems.count();
  console.log("Program items after collapse:", collapsedProgramCount);
  expect(collapsedProgramCount).toBe(0);

  // Step 7: Check that the arrow icon is pointing down (collapsed state)
  const arrowIcon = await page.locator('svg[class*="rotate-0"]');
  await expect(arrowIcon).toBeVisible();

  // Step 8: Click to expand again
  await collapseButton.click();

  // Step 9: Check that programs are visible again
  await page.waitForTimeout(500); // Wait for animation
  const expandedProgramCount = await programItems.count();
  console.log("Program items after expand:", expandedProgramCount);
  expect(expandedProgramCount).toBe(initialProgramCount);

  // Step 10: Check that the arrow icon is pointing up (expanded state)
  const expandedArrowIcon = await page.locator('svg[class*="rotate-180"]');
  await expect(expandedArrowIcon).toBeVisible();

  // Take a screenshot for verification
  await page.screenshot({
    path: "programs-collapse-test.png",
    fullPage: false,
  });

  console.log("✅ Programs collapse/expand functionality works correctly!");
});
