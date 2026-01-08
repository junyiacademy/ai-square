import { test, expect } from "@playwright/test";

test("Debug Discovery categories locally", async ({ page }) => {
  // 1. Login
  await page.goto("http://localhost:3001/login");
  await page.fill("#email", "student123@aisquare.com");
  await page.fill("#password", "Demo123456");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // 2. Go to Discovery
  await page.goto("http://localhost:3001/discovery/scenarios");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // 3. Count all scenarios
  const allCards = await page.locator('[data-testid="scenario-card"]').count();
  console.log(`\n全部: ${allCards} scenarios`);

  // 4. Test each filter
  const filters = ["創意", "技術", "商業", "科學"];

  for (const filter of filters) {
    console.log(`\nTesting ${filter} filter...`);

    // Click filter button
    const button = page.locator(`button:has-text("${filter}")`).first();
    if (await button.isVisible()) {
      await button.click();
      await page.waitForTimeout(1500);

      // Count scenarios
      const count = await page.locator('[data-testid="scenario-card"]').count();
      console.log(`${filter}: ${count} scenarios`);

      // Log what the frontend shows
      const titles = await page
        .locator('[data-testid="scenario-card"] h3')
        .allTextContents();
      titles.forEach((title) => console.log(`  - ${title}`));
    } else {
      console.log(`⚠️ Filter button "${filter}" not found`);
    }
  }

  // 5. Check console for errors
  page.on("console", (msg) => {
    if (msg.type() === "log") {
      console.log("Browser log:", msg.text());
    }
  });
});
