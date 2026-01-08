/**
 * E2E Visual Regression Tests for Agent Editor
 * Takes screenshots to detect UI changes over time
 */

import { test, expect } from "@playwright/test";

test.describe("Agent Editor - Visual Regression Tests", () => {
  test("should match welcome screen baseline", async ({ page }) => {
    await page.goto("/admin/scenarios/agent-editor");
    await page.waitForLoadState("networkidle");

    // Wait for animations to complete
    await page.waitForTimeout(500);

    // Take screenshot of welcome screen
    await expect(page).toHaveScreenshot("welcome-screen.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("should match PBL scenario list view baseline", async ({ page }) => {
    await page.goto("/admin/scenarios/agent-editor");
    await page.waitForLoadState("networkidle");

    // Select PBL mode
    await page.getByRole("button", { name: /PBL/i }).first().click();
    await page.waitForTimeout(1000);

    // Take screenshot
    await expect(page).toHaveScreenshot("pbl-scenario-list.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("should match PBL editor view baseline", async ({ page }) => {
    await page.goto("/admin/scenarios/agent-editor");
    await page.waitForLoadState("networkidle");

    // Navigate to editor
    await page.getByRole("button", { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText("新增場景").click();
    await page.waitForTimeout(500);

    // Take screenshot
    await expect(page).toHaveScreenshot("pbl-editor-view.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("should match Discovery mode baseline", async ({ page }) => {
    await page.goto("/admin/scenarios/agent-editor");
    await page.waitForLoadState("networkidle");

    // Navigate to Discovery editor
    await page
      .getByRole("button", { name: /DISCOVERY/i })
      .first()
      .click();
    await page.waitForTimeout(500);
    await page.getByText("新增場景").click();
    await page.waitForTimeout(500);

    // Take screenshot
    await expect(page).toHaveScreenshot("discovery-editor-view.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("should match Assessment mode baseline", async ({ page }) => {
    await page.goto("/admin/scenarios/agent-editor");
    await page.waitForLoadState("networkidle");

    // Navigate to Assessment editor
    await page
      .getByRole("button", { name: /ASSESSMENT/i })
      .first()
      .click();
    await page.waitForTimeout(500);
    await page.getByText("新增場景").click();
    await page.waitForTimeout(500);

    // Take screenshot
    await expect(page).toHaveScreenshot("assessment-editor-view.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("should match collapsed left panel", async ({ page }) => {
    await page.goto("/admin/scenarios/agent-editor");
    await page.waitForLoadState("networkidle");

    // Collapse left panel
    const collapseButton = page.locator("button").first();
    await collapseButton.click();
    await page.waitForTimeout(500);

    // Take screenshot
    await expect(page).toHaveScreenshot("left-panel-collapsed.png", {
      fullPage: false,
      maxDiffPixels: 50,
    });
  });

  test("should match collapsed right panel", async ({ page }) => {
    await page.goto("/admin/scenarios/agent-editor");
    await page.waitForLoadState("networkidle");

    // Collapse right panel
    const rightPanelButton = page
      .locator("div")
      .filter({ hasText: "AI 編輯助手" })
      .locator("button")
      .first();
    await rightPanelButton.click();
    await page.waitForTimeout(500);

    // Take screenshot
    await expect(page).toHaveScreenshot("right-panel-collapsed.png", {
      fullPage: false,
      maxDiffPixels: 50,
    });
  });

  test("should match task expanded view", async ({ page }) => {
    await page.goto("/admin/scenarios/agent-editor");
    await page.waitForLoadState("networkidle");

    // Setup: Create scenario with task
    await page.getByRole("button", { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText("新增場景").click();
    await page.waitForTimeout(500);

    // Add and expand task
    await page.getByText("新增任務").click();
    await page.waitForTimeout(300);
    await page.getByText("展開編輯").click();
    await page.waitForTimeout(500);

    // Take screenshot
    await expect(page).toHaveScreenshot("task-expanded-view.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("should match chat with messages", async ({ page }) => {
    await page.goto("/admin/scenarios/agent-editor");
    await page.waitForLoadState("networkidle");

    // Setup: Create scenario
    await page.getByRole("button", { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText("新增場景").click();
    await page.waitForTimeout(500);

    // Send chat message
    const chatInput = page.getByPlaceholder("輸入指令...");
    await chatInput.fill("設定難度為簡單");
    await page
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .last()
      .click();
    await page.waitForTimeout(1500);

    // Focus on right panel for screenshot
    const rightPanel = page.locator("div").filter({ hasText: "AI 編輯助手" });
    await expect(rightPanel).toHaveScreenshot("chat-with-messages.png", {
      maxDiffPixels: 100,
    });
  });
});
