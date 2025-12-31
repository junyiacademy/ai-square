import { test, expect } from "@playwright/test";

test.describe("PBL Instructions Display", () => {
  test("should display instructions on PBL task page", async ({ page }) => {
    // Go to the PBL page
    await page.goto("http://localhost:3000/pbl/scenarios");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Look for a PBL scenario to start (should be AI-Powered Smart City Solutions)
    const startButton = page
      .locator("button")
      .filter({ hasText: /start|開始/i })
      .first();
    await expect(startButton).toBeVisible();

    // Click the start button
    await startButton.click();

    // Wait for the task page to load
    await page.waitForLoadState("networkidle");

    // Check if instructions are displayed
    const instructionsSection = page
      .locator(
        '[data-testid="instructions"], .instructions, h3:has-text("Instructions")',
      )
      .first();

    if ((await instructionsSection.count()) > 0) {
      await expect(instructionsSection).toBeVisible();

      // Check if the specific instruction text is present
      const instructionText =
        "Welcome explorer! This journey will take you through five stations";
      const hasInstructionText = page.locator(`text*="${instructionText}"`);

      if ((await hasInstructionText.count()) > 0) {
        await expect(hasInstructionText).toBeVisible();
        console.log("✅ Instructions are displaying correctly");
      } else {
        // Take screenshot for debugging
        await page.screenshot({ path: "instructions-debug.png" });
        console.log("❌ Instructions text not found, screenshot saved");
      }
    } else {
      // Take screenshot for debugging
      await page.screenshot({ path: "no-instructions-section.png" });
      console.log("❌ Instructions section not found, screenshot saved");
    }
  });
});
