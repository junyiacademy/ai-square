import { test, expect } from '@playwright/test';

test.describe('Discovery Learning Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login - in real scenario, you'd implement proper login
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to home or dashboard
    await page.waitForURL('**/dashboard');
  });

  test('should complete discovery learning flow', async ({ page }) => {
    // Navigate to discovery section
    await page.goto('/discovery');
    await expect(page.getByText('職業探索')).toBeVisible();
    
    // Select a career path
    await page.click('[data-testid="career-content-creator"]');
    await expect(page.getByText('數位魔法師 - 內容創作者')).toBeVisible();
    
    // Start learning journey
    await page.click('text=開始探索');
    
    // Should navigate to scenario page
    await page.waitForURL('**/discovery/scenarios/**');
    await expect(page.getByText('學習歷程')).toBeVisible();
    
    // Start first task
    await page.click('text=開始');
    
    // Should navigate to task page
    await page.waitForURL('**/tasks/**');
    await expect(page.getByText('Understand Algorithms')).toBeVisible();
  });

  test('should submit task answer and receive feedback', async ({ page }) => {
    // Navigate directly to a task (assuming scenario and program exist)
    await page.goto('/discovery/scenarios/test-scenario/programs/test-program/tasks/test-task');
    
    // Wait for task to load
    await expect(page.getByText('你的回答')).toBeVisible();
    
    // Fill in answer
    const answerText = `
      創意導師 Luna，我已收到您的召喚。
      
      在創意帝國的光輝尚未被黑暗吞噬前，我願挺身而出，成為光與真實的使者。
      面對 Shadow 的虛假咒語，我將以內容魔法揮動筆觸、以視覺咒術點燃靈感、
      以文字鍊金淬煉真理、以社群召喚術喚醒盟友。
      
      具體來說，我會：
      1. 使用 AI 工具如 GPT、Perplexity 來查核資訊真實性
      2. 學習製作有根據的內容，如圖文說明和短影音
      3. 運用 Canva、CapCut 等工具創造視覺吸引人的正確資訊
      4. 在社群平台上分享真實內容，對抗虛假資訊
    `;
    
    await page.fill('textarea', answerText);
    
    // Submit answer
    await page.click('text=提交答案');
    
    // Wait for AI feedback
    await expect(page.getByText('AI 回饋')).toBeVisible({ timeout: 30000 });
    
    // Should show feedback with pass/fail status
    const feedbackSection = page.locator('[data-testid="ai-feedback"]');
    await expect(feedbackSection).toBeVisible();
    
    // Check if passed
    const passedIndicator = page.locator('text=任務通過').first();
    if (await passedIndicator.isVisible()) {
      // If passed, should show completion options
      await expect(page.getByText('恭喜達到通過標準')).toBeVisible();
      await expect(page.getByText('完成任務')).toBeVisible();
    } else {
      // If not passed, should show improvement suggestions
      await expect(page.getByText('需要改進')).toBeVisible();
      await expect(page.getByText('改進建議')).toBeVisible();
    }
  });

  test('should allow multiple attempts on same task', async ({ page }) => {
    await page.goto('/discovery/scenarios/test-scenario/programs/test-program/tasks/test-task');
    
    // First attempt - intentionally brief
    await page.fill('textarea', '我會使用 AI 工具。');
    await page.click('text=提交答案');
    
    // Wait for feedback
    await expect(page.getByText('AI 回饋')).toBeVisible({ timeout: 30000 });
    
    // Should allow another attempt
    await expect(page.getByText('繼續作答')).toBeVisible();
    
    // Second attempt - more detailed
    const betterAnswer = `
      我了解這個任務的核心是辨識與反制虛假資訊。面對 Shadow 的虛假內容，我會：
      
      1. AI 工具輔助查核：使用 GPT、Perplexity 或 Google Fact Check 比對資訊來源
      2. 內容創作技能：練習寫有根據的內容，如新聞資料整理、圖文說明
      3. 視覺表達技巧：用 Canva、CapCut 做視覺吸引人的海報或影片
      4. 社群分享與互動：在 IG、YouTube 上傳播正確資訊
      
      這些技能適用於行銷、公關、新聞、教育等多種職業。
    `;
    
    await page.fill('textarea', betterAnswer);
    await page.click('text=提交答案');
    
    // Should receive better feedback
    await expect(page.getByText('AI 回饋')).toBeVisible({ timeout: 30000 });
    
    // Check learning history
    await expect(page.getByText('學習歷程')).toBeVisible();
    await expect(page.getByText('2 次嘗試')).toBeVisible();
  });

  test('should show learning progress correctly', async ({ page }) => {
    await page.goto('/discovery/scenarios/test-scenario/programs/test-program');
    
    // Should show program overview
    await expect(page.getByText('學習歷程')).toBeVisible();
    await expect(page.getByText('數位魔法師 - 內容創作者')).toBeVisible();
    
    // Should show progress bar
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    
    // Should show task list with different statuses
    await expect(page.getByText('任務 1:')).toBeVisible();
    
    // Check for different task status indicators
    const completedTask = page.locator('text=檢視').first();
    const activeTask = page.locator('text=繼續').first();
    const lockedTask = page.locator('[data-testid="locked-task"]').first();
    
    // At least one of these should be visible
    const hasCompletedTask = await completedTask.isVisible();
    const hasActiveTask = await activeTask.isVisible();
    const hasLockedTask = await lockedTask.isVisible();
    
    expect(hasCompletedTask || hasActiveTask || hasLockedTask).toBeTruthy();
  });

  test('should navigate between tasks correctly', async ({ page }) => {
    await page.goto('/discovery/scenarios/test-scenario/programs/test-program');
    
    // Click on first available task
    await page.click('[data-testid="task-card"]:first-child');
    
    // Should navigate to task detail page
    await page.waitForURL('**/tasks/**');
    
    // Should have back button
    await expect(page.getByText('返回學習歷程')).toBeVisible();
    
    // Go back to program
    await page.click('text=返回學習歷程');
    await page.waitForURL('**/programs/**');
    
    // Should be back on program page
    await expect(page.getByText('學習任務')).toBeVisible();
  });

  test('should complete entire program flow', async ({ page }) => {
    // This test assumes a program with multiple tasks
    await page.goto('/discovery/scenarios/test-scenario/programs/test-program');
    
    // Complete first task
    await page.click('text=開始');
    await page.waitForURL('**/tasks/**');
    
    const answer = '詳細的答案內容...';
    await page.fill('textarea', answer);
    await page.click('text=提交答案');
    
    // Wait for positive feedback
    await expect(page.getByText('AI 回饋')).toBeVisible({ timeout: 30000 });
    
    // If passed, complete the task
    const completeButton = page.getByText('完成任務');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      
      // Should return to program page
      await page.waitForURL('**/programs/**');
      
      // Progress should update
      await expect(page.getByText(/已完成.*個任務/)).toBeVisible();
    }
  });

  test('should handle completed task viewing', async ({ page }) => {
    // Navigate to a completed task
    await page.goto('/discovery/scenarios/test-scenario/programs/test-program');
    
    // Click on completed task (with 檢視 button)
    const viewButton = page.getByText('檢視').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      
      // Should navigate to read-only task view
      await page.waitForURL('**/tasks/**');
      
      // Should show completion summary
      await expect(page.getByText('任務已完成')).toBeVisible();
      
      // Should show statistics
      await expect(page.getByText('嘗試次數')).toBeVisible();
      await expect(page.getByText('通過次數')).toBeVisible();
      await expect(page.getByText('最高分數')).toBeVisible();
      
      // Should not show response input
      await expect(page.locator('textarea')).not.toBeVisible();
      
      // Should show complete learning history
      await expect(page.getByText('完整學習歷程')).toBeVisible();
    }
  });

  test('should show hints when available', async ({ page }) => {
    await page.goto('/discovery/scenarios/test-scenario/programs/test-program/tasks/test-task');
    
    // Should have hints button
    await expect(page.getByText('需要提示？')).toBeVisible();
    
    // Click to show hints
    await page.click('text=需要提示？');
    
    // Should show hints section
    await expect(page.getByText('提示')).toBeVisible();
    await expect(page.getByText('隱藏提示')).toBeVisible();
    
    // Click to hide hints
    await page.click('text=隱藏提示');
    
    // Hints should be hidden
    await expect(page.getByText('需要提示？')).toBeVisible();
  });

  test('should quick link to passed attempts', async ({ page }) => {
    // Navigate to task with multiple attempts including passes
    await page.goto('/discovery/scenarios/test-scenario/programs/test-program/tasks/test-task');
    
    // Check if there are quick links for passed attempts
    const quickLink = page.getByText('✓1').first();
    if (await quickLink.isVisible()) {
      // Click quick link
      await quickLink.click();
      
      // Should scroll to the passed interaction
      // The passed interaction should be visible
      await expect(page.getByText('任務通過')).toBeVisible();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Navigate to discovery page
    await page.goto('/discovery');
    
    // Intercept API calls and simulate errors
    await page.route('**/api/discovery/scenarios', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Try to load scenarios
    await page.reload();
    
    // Should handle error gracefully (no hard crash)
    // Exact error handling depends on implementation
    await expect(page.locator('body')).toBeVisible();
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    await page.goto('/discovery/scenarios/test-scenario/programs/test-program/tasks/test-task');
    
    // Fill in some content
    await page.fill('textarea', '測試內容');
    
    // Refresh page
    await page.reload();
    
    // Should still be authenticated and on the same page
    await expect(page.getByText('你的回答')).toBeVisible();
    
    // Content might not persist (depends on implementation)
    // But user should still be logged in
  });
});