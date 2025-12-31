import { test, expect } from "@playwright/test";

test("PBL task title displays correctly", async ({ page }) => {
  // Navigate to the task page directly
  await page.goto(
    "http://localhost:3000/pbl/scenarios/a5e6c365-832a-4c8e-babb-9f39ab462c1b/programs/4a077099-200f-4e88-8849-e04d3856a3e3/tasks/7352074f-6926-44e3-855d-3f6673413917",
  );

  // Wait for the page to load
  await page.waitForLoadState("networkidle");

  // Check that the task title is displayed correctly (not as [object Object])
  const taskTitle = await page.locator("h2").first().textContent();
  console.log("Task title found:", taskTitle);

  // Verify the title doesn't contain [object Object]
  expect(taskTitle).not.toContain("[object Object]");

  // Verify the title contains actual text
  expect(taskTitle).toMatch(/Task \d+:/);

  // Take a screenshot for verification
  await page.screenshot({
    path: "task-title-verification.png",
    fullPage: false,
  });
});
