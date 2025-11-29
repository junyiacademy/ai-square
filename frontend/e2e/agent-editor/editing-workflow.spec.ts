/**
 * E2E Tests for Agent Editor - Complete Editing Workflow
 * Tests real browser interactions with the full agent-editor page
 */

import { test, expect } from '@playwright/test';

test.describe('Agent Editor - Complete Editing Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agent editor page
    await page.goto('/admin/scenarios/agent-editor');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display welcome screen on initial load', async ({ page }) => {
    // Verify welcome message is displayed
    await expect(page.getByText('歡迎使用場景編輯器')).toBeVisible();
    await expect(page.getByText('請從左側選擇學習模式開始')).toBeVisible();

    // Verify mode indicators are shown
    await expect(page.getByText('PBL 專案')).toBeVisible();
    await expect(page.getByText('Discovery 探索')).toBeVisible();
    await expect(page.getByText('Assessment 評測')).toBeVisible();
  });

  test('should select mode and display scenario list', async ({ page }) => {
    // Click PBL mode button
    await page.getByRole('button', { name: /PBL/i }).first().click();

    // Wait for scenarios to load
    await page.waitForTimeout(1000);

    // Verify scenario list header is shown
    await expect(page.getByText('🎯 PBL 專案式學習')).toBeVisible();

    // Verify "新增場景" button is visible
    await expect(page.getByText('新增場景')).toBeVisible();
  });

  test('should create new scenario from scratch', async ({ page }) => {
    // Select PBL mode
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);

    // Click "新增場景" button
    await page.getByText('新增場景').click();

    // Wait for editor to load
    await page.waitForTimeout(500);

    // Verify editor sections appear
    await expect(page.getByText('Level 1: Scenario Level - 場景層級')).toBeVisible();
    await expect(page.getByText('📝 基本資訊')).toBeVisible();
    await expect(page.getByText('🎯 學習目標')).toBeVisible();

    // Verify default values
    await expect(page.getByText('新場景')).toBeVisible();
    await expect(page.getByText('點擊編輯描述')).toBeVisible();
  });

  test('should edit scenario title inline', async ({ page }) => {
    // Setup: Select mode and create new scenario
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Find and click on title to edit
    const titleElement = page.getByText('新場景').first();
    await titleElement.click();

    // Wait for input to appear
    await page.waitForTimeout(200);

    // Type new title
    const input = page.locator('input[type="text"]').first();
    await input.fill('AI 機器學習基礎');

    // Press Enter to save
    await input.press('Enter');

    // Verify title updated
    await expect(page.getByText('AI 機器學習基礎')).toBeVisible();
  });

  test('should change difficulty level', async ({ page }) => {
    // Setup: Create new scenario
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Click on difficulty badge
    const difficultyBadge = page.getByText('中等').first();
    await difficultyBadge.click();

    // Wait for dropdown to appear
    await page.waitForTimeout(200);

    // Select new difficulty
    const select = page.locator('select').first();
    await select.selectOption('easy');

    // Verify difficulty changed
    await expect(page.getByText('簡單')).toBeVisible();
  });

  test('should add new task', async ({ page }) => {
    // Setup: Create new scenario
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Scroll to task section
    await page.getByText('Level 2: Task List').scrollIntoViewIfNeeded();

    // Click "新增任務" button
    await page.getByText('新增任務').click();

    // Verify task was added
    await expect(page.getByText('新任務')).toBeVisible();
    await expect(page.getByText(/1 個任務/)).toBeVisible();
  });

  test('should expand and edit task details', async ({ page }) => {
    // Setup: Create scenario with task
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Add a task
    await page.getByText('新增任務').click();
    await page.waitForTimeout(300);

    // Expand task
    await page.getByText('展開編輯').click();
    await page.waitForTimeout(300);

    // Verify task detail section appears
    await expect(page.getByText('Level 3: Task Detail - 任務詳細設定')).toBeVisible();
    await expect(page.getByText('任務標題')).toBeVisible();
  });

  test('should use AI chat to modify scenario', async ({ page }) => {
    // Setup: Create new scenario
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Find chat input in right panel
    const chatInput = page.getByPlaceholder('輸入指令...');
    await chatInput.fill('把標題改成「Python 程式設計入門」');

    // Click send button
    await page.getByRole('button').filter({ has: page.locator('svg') }).last().click();

    // Wait for processing
    await page.waitForTimeout(1500);

    // Verify AI response appears
    await expect(page.getByText(/已將標題更新為/)).toBeVisible();
  });

  test('should use suggestion buttons in chat', async ({ page }) => {
    // Setup: Create new scenario
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Click suggestion button
    await page.getByText('修改標題').click();

    // Verify input is populated
    const chatInput = page.getByPlaceholder('輸入指令...');
    await expect(chatInput).toHaveValue('修改標題');
  });

  test('should toggle language and update content', async ({ page }) => {
    // Setup: Create new scenario
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Toggle language to English
    await page.getByText('EN').click();

    // Verify language toggle button changed
    await expect(page.getByText('中文')).toBeVisible();

    // Verify content updates to English
    await expect(page.getByText('New Scenario')).toBeVisible();
  });

  test('should collapse and expand left panel', async ({ page }) => {
    // Find left panel collapse button
    const collapseButton = page.locator('button').first();
    await collapseButton.click();

    // Wait for transition
    await page.waitForTimeout(500);

    // Verify panel is collapsed (mode text should not be visible)
    await expect(page.getByText('學習模式')).not.toBeVisible();

    // Expand again
    await collapseButton.click();
    await page.waitForTimeout(500);

    // Verify panel is expanded
    await expect(page.getByText('學習模式')).toBeVisible();
  });

  test('should collapse and expand right panel', async ({ page }) => {
    // Find right panel collapse button (in AI header)
    const rightPanelButton = page.locator('div').filter({ hasText: 'AI 編輯助手' }).locator('button').first();
    await rightPanelButton.click();

    // Wait for transition
    await page.waitForTimeout(500);

    // Verify chat input is not visible
    await expect(page.getByPlaceholder('輸入指令...')).not.toBeVisible();

    // Expand again
    await rightPanelButton.click();
    await page.waitForTimeout(500);

    // Verify chat input is visible
    await expect(page.getByPlaceholder('輸入指令...')).toBeVisible();
  });

  test('should show change indicator when modifications made', async ({ page }) => {
    // Setup: Create new scenario
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Make a change (edit title)
    const titleElement = page.getByText('新場景').first();
    await titleElement.click();
    await page.waitForTimeout(200);

    const input = page.locator('input[type="text"]').first();
    await input.fill('Modified Title');
    await input.press('Enter');

    // Verify change indicator appears in left panel footer
    await expect(page.getByText(/個變更/)).toBeVisible();

    // Verify publish button is enabled in right panel
    const publishButton = page.getByText('發布');
    await expect(publishButton).toBeEnabled();
  });

  test('should navigate back to scenario list', async ({ page }) => {
    // Setup: Create and edit scenario
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Verify we're in edit mode
    await expect(page.getByText('返回場景列表')).toBeVisible();

    // Click back button
    await page.getByText('返回場景列表').click();

    // Verify we're back at scenario list
    await expect(page.getByText('🎯 PBL 專案式學習')).toBeVisible();
    await expect(page.getByText('新增場景')).toBeVisible();
  });

  test('should toggle section collapsibility', async ({ page }) => {
    // Setup: Create new scenario
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Find "基本資訊" section header
    const sectionHeader = page.getByText('📝 基本資訊');
    await sectionHeader.click();

    // Wait for collapse animation
    await page.waitForTimeout(300);

    // Verify section is collapsed (content should not be visible)
    // The title input should not be visible when section is collapsed
    const titleInput = page.locator('input[type="text"]').first();
    await expect(titleInput).not.toBeVisible();

    // Expand again
    await sectionHeader.click();
    await page.waitForTimeout(300);

    // Verify section is expanded
    await expect(page.getByText('標題')).toBeVisible();
  });

  test('should handle keyboard shortcuts in inline editing', async ({ page }) => {
    // Setup: Create new scenario
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Start editing title
    const titleElement = page.getByText('新場景').first();
    await titleElement.click();
    await page.waitForTimeout(200);

    const input = page.locator('input[type="text"]').first();
    await input.fill('Test Title');

    // Press Escape to cancel
    await input.press('Escape');

    // Verify original value is restored
    await expect(page.getByText('新場景')).toBeVisible();
  });
});

test.describe('Agent Editor - Different Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/scenarios/agent-editor');
    await page.waitForLoadState('networkidle');
  });

  test('should show Discovery mode specific fields', async ({ page }) => {
    // Select Discovery mode
    await page.getByRole('button', { name: /DISCOVERY/i }).first().click();
    await page.waitForTimeout(500);

    // Create new scenario
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Verify Discovery-specific section appears
    await expect(page.getByText('🔍 Discovery 專屬設定')).toBeVisible();
  });

  test('should show Assessment mode specific fields', async ({ page }) => {
    // Select Assessment mode
    await page.getByRole('button', { name: /ASSESSMENT/i }).first().click();
    await page.waitForTimeout(500);

    // Create new scenario
    await page.getByText('新增場景').click();
    await page.waitForTimeout(500);

    // Verify Assessment-specific section appears
    await expect(page.getByText('📊 Assessment 專屬設定')).toBeVisible();
  });
});

test.describe('Agent Editor - Error Handling', () => {
  test('should handle publish errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/scenarios/editor', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await page.goto('/admin/scenarios/agent-editor');
    await page.waitForLoadState('networkidle');

    // Try to select mode (which triggers API call)
    await page.getByRole('button', { name: /PBL/i }).first().click();
    await page.waitForTimeout(1000);

    // Verify error is handled (page should not crash)
    await expect(page.getByText('學習模式')).toBeVisible();
  });
});
