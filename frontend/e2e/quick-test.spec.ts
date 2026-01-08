import { test, expect } from "@playwright/test";

test("Quick Discovery test", async ({ page }) => {
  // Go directly to discovery page (skip login)
  await page.goto(
    "https://ai-square-staging-731209836128.asia-east1.run.app/discovery/scenarios",
  );
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: "staging-discovery-page.png", fullPage: true });

  // Count scenarios
  const scenarios = await page.locator("h3").allTextContents();
  console.log(`Found ${scenarios.length} h3 elements:`);
  scenarios.forEach((title, i) => {
    console.log(`${i + 1}. ${title}`);
  });

  // Try clicking category buttons if they exist
  const categoryButtons = await page.locator("button").allTextContents();
  console.log(`\nFound ${categoryButtons.length} buttons:`);
  categoryButtons.forEach((text, i) => {
    if (
      text.includes("創意") ||
      text.includes("技術") ||
      text.includes("商業") ||
      text.includes("科學")
    ) {
      console.log(`- Category button: ${text}`);
    }
  });
});
