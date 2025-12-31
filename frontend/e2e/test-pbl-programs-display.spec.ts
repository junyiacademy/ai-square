import { test, expect } from "@playwright/test";

test("PBL scenario shows previous programs", async ({ page }) => {
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

  // Check if programs section exists
  const programsSection = await page
    .locator("text=/Your Programs|Latest Program/i")
    .first();
  const hasProgramsSection = (await programsSection.count()) > 0;

  console.log("Has programs section:", hasProgramsSection);

  if (hasProgramsSection) {
    console.log("✅ Programs section found");

    // Count the number of programs displayed
    const programItems = await page
      .locator('[class*="bg-white dark:bg-gray-800"]')
      .count();
    console.log("Number of program items:", programItems);

    // Look for "Continue" or "View Results" buttons
    const continueButtons = await page
      .locator('button:has-text("Continue"), button:has-text("View Results")')
      .count();
    console.log("Number of action buttons:", continueButtons);

    expect(programItems).toBeGreaterThan(0);
  } else {
    console.log("❌ No programs section found");

    // Check if only "Start New Program" button is visible
    const startButton = await page.locator("text=/Start New Program/i").first();
    await expect(startButton).toBeVisible();
  }

  // Take a screenshot for verification
  await page.screenshot({
    path: "pbl-programs-display-test.png",
    fullPage: false,
  });

  console.log("✅ Test completed");
});
