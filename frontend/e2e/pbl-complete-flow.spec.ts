import { test, expect } from '@playwright/test';

test.describe('PBL Complete Flow', () => {
  test('should complete entire PBL learning flow with evaluation and feedback', async ({ page }) => {
    // Step 1: Navigate to PBL scenarios page
    await page.goto('/pbl');
    await expect(page.locator('h1:has-text("PBL Scenario-Based Learning")')).toBeVisible();
    
    // Step 2: Select a scenario (using the first available scenario)
    // Click the View Details link of the first available scenario
    const firstScenarioLink = page.locator('a:has-text("View Details")').first();
    await expect(firstScenarioLink).toBeVisible();
    await firstScenarioLink.click();
    
    // Wait for scenario detail page
    await expect(page.locator('[data-testid="scenario-title"]')).toBeVisible();
    
    // Step 3: Start learning
    const startButton = page.locator('button:has-text("開始學習"), button:has-text("Start Learning")');
    await startButton.click();
    
    // Wait for task page to load
    await expect(page.locator('[data-testid="task-content"]')).toBeVisible();
    
    // Step 4: Complete first task
    // Send a message to AI tutor
    const chatInput = page.locator('textarea[placeholder*="訊息"], textarea[placeholder*="message"]');
    await chatInput.fill('I want to learn about AI tools for my work');
    await page.keyboard.press('Enter');
    
    // Wait for AI response
    await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 30000 });
    
    // Continue conversation
    await chatInput.fill('Can you help me understand how to evaluate AI tools?');
    await page.keyboard.press('Enter');
    
    // Wait for second AI response
    await expect(page.locator('[data-testid="ai-message"]').nth(1)).toBeVisible({ timeout: 30000 });
    
    // Step 5: Evaluate task
    const evaluateButton = page.locator('button:has-text("評估"), button:has-text("Evaluate")');
    await evaluateButton.click();
    
    // Wait for evaluation to complete
    await expect(page.locator('[data-testid="evaluation-score"]')).toBeVisible({ timeout: 30000 });
    
    // Step 6: Check if View Report button appears
    const viewReportButton = page.locator('button:has-text("View Report"), a:has-text("View Report")').first();
    await expect(viewReportButton).toBeVisible();
    
    // Step 7: Navigate to next task
    const nextTaskButton = page.locator('button:has-text("Next Task"), button:has-text("下一個任務")');
    if (await nextTaskButton.isVisible()) {
      await nextTaskButton.click();
      
      // Complete second task quickly
      await expect(page.locator('[data-testid="task-content"]')).toBeVisible();
      await chatInput.fill('I understand the concepts now');
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 30000 });
      
      // Evaluate second task
      await evaluateButton.click();
      await expect(page.locator('[data-testid="evaluation-score"]')).toBeVisible({ timeout: 30000 });
    }
    
    // Step 8: Go to completion page
    await viewReportButton.click();
    
    // Wait for completion page to load
    await expect(page.url()).toContain('/complete');
    await expect(page.locator('[data-testid="completion-header"]')).toBeVisible();
    
    // Step 9: Verify completion page content
    // Check overall score
    await expect(page.locator('[data-testid="overall-score"]')).toBeVisible();
    
    // Check domain scores
    await expect(page.locator('[data-testid="domain-scores"]')).toBeVisible();
    
    // Check KSA scores
    await expect(page.locator('[data-testid="ksa-scores"]')).toBeVisible();
    
    // Step 10: Wait for qualitative feedback generation
    await expect(page.locator('[data-testid="qualitative-feedback"]')).toBeVisible({ timeout: 60000 });
    
    // Verify feedback content
    const feedbackContent = page.locator('[data-testid="feedback-content"]');
    await expect(feedbackContent).toContainText(/strengths|優點/i);
    await expect(feedbackContent).toContainText(/improvement|改進/i);
    
    // Step 11: Test language switching (if available)
    const langSwitcher = page.locator('[data-testid="language-switcher"]');
    if (await langSwitcher.isVisible()) {
      // Switch to English
      await langSwitcher.click();
      await page.locator('[data-testid="lang-en"]').click();
      
      // Wait for feedback regeneration
      await expect(page.locator('[data-testid="generating-feedback"]')).toBeVisible();
      await expect(page.locator('[data-testid="generating-feedback"]')).not.toBeVisible({ timeout: 60000 });
      
      // Verify English feedback
      await expect(feedbackContent).toContainText(/strengths/i);
    }
    
    // Step 12: Verify API calls in Network (using page.on)
    const apiCalls = {
      evaluate: false,
      complete: false,
      feedback: false
    };
    
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/pbl/tasks/') && url.includes('/evaluate')) {
        apiCalls.evaluate = true;
      }
      if (url.includes('/api/pbl/programs/') && url.includes('/complete')) {
        apiCalls.complete = true;
      }
      if (url.includes('/api/pbl/generate-feedback')) {
        apiCalls.feedback = true;
      }
    });
    
    // Verify critical APIs were called
    expect(apiCalls.evaluate).toBe(true);
    expect(apiCalls.complete).toBe(true);
    expect(apiCalls.feedback).toBe(true);
  });

  test('should handle program evaluation verification correctly', async ({ page }) => {
    // This test verifies the three-layer verification system
    
    // Navigate directly to a completion page (assuming we have a program ID)
    // For this test, we'll need to create a program first or use a known ID
    
    // Step 1: Create a new program by starting a scenario
    await page.goto('/pbl');
    const firstScenarioLink = page.locator('a[href^="/pbl/scenarios/"]').first();
    await firstScenarioLink.click();
    await page.locator('button:has-text("開始學習"), button:has-text("Start Learning")').click();
    
    // Get program ID from URL
    await expect(page.url()).toMatch(/\/program\/([^\/]+)/);
    const programId = page.url().match(/\/program\/([^\/]+)/)?.[1];
    expect(programId).toBeTruthy();
    
    // Complete one task quickly
    const chatInput = page.locator('textarea[placeholder*="訊息"], textarea[placeholder*="message"]');
    await chatInput.fill('Test message');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 30000 });
    await page.locator('button:has-text("評估"), button:has-text("Evaluate")').click();
    await expect(page.locator('[data-testid="evaluation-score"]')).toBeVisible({ timeout: 30000 });
    
    // Navigate directly to completion page
    await page.goto(`/pbl/scenarios/${programId}/program/${programId}/complete`);
    
    // Check for debug information (in development mode)
    if (process.env.NODE_ENV === 'development') {
      const debugInfo = page.locator('[data-testid="debug-info"]');
      if (await debugInfo.isVisible()) {
        // Verify debug info contains verification details
        await expect(debugInfo).toContainText(/updateReason/);
        await expect(debugInfo).toContainText(/syncChecksum/);
      }
    }
    
    // Verify evaluation is calculated
    await expect(page.locator('[data-testid="overall-score"]')).toBeVisible();
    
    // Refresh page to test caching
    await page.reload();
    
    // Should still show scores without recalculation
    await expect(page.locator('[data-testid="overall-score"]')).toBeVisible();
    
    // Check that feedback is preserved
    if (await page.locator('[data-testid="qualitative-feedback"]').isVisible()) {
      await expect(page.locator('[data-testid="feedback-content"]')).toBeVisible();
    }
  });

  test('should generate feedback in multiple languages', async ({ page }) => {
    // Navigate to a completed program's completion page
    // This test assumes we have a completed program
    
    // For testing, we'll complete a minimal flow
    await page.goto('/pbl');
    const firstScenarioLink = page.locator('a[href^="/pbl/scenarios/"]').first();
    await firstScenarioLink.click();
    await page.locator('button:has-text("開始學習"), button:has-text("Start Learning")').click();
    
    // Quick complete
    const chatInput = page.locator('textarea[placeholder*="訊息"], textarea[placeholder*="message"]');
    await chatInput.fill('Test');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 30000 });
    await page.locator('button:has-text("評估"), button:has-text("Evaluate")').click();
    await expect(page.locator('[data-testid="evaluation-score"]')).toBeVisible({ timeout: 30000 });
    
    // Go to completion
    await page.locator('button:has-text("View Report"), a:has-text("View Report")').first().click();
    
    // Wait for initial feedback
    await expect(page.locator('[data-testid="qualitative-feedback"]')).toBeVisible({ timeout: 60000 });
    
    // Test language switching
    const languages = ['en', 'zhTW', 'ja'];
    
    for (const lang of languages) {
      // Switch language
      await page.evaluate((language) => {
        window.localStorage.setItem('i18nextLng', language);
      }, lang);
      
      await page.reload();
      
      // Wait for feedback in new language
      if (lang !== 'zhTW') { // Skip if already in Chinese
        await expect(page.locator('[data-testid="generating-feedback"]')).toBeVisible();
        await expect(page.locator('[data-testid="generating-feedback"]')).not.toBeVisible({ timeout: 60000 });
      }
      
      // Verify feedback exists
      await expect(page.locator('[data-testid="feedback-content"]')).toBeVisible();
      
      // Verify language-specific content
      const feedbackText = await page.locator('[data-testid="feedback-content"]').textContent();
      if (lang === 'en') {
        expect(feedbackText).toMatch(/strength|improvement|next steps/i);
      } else if (lang === 'ja') {
        expect(feedbackText).toMatch(/強み|改善|次のステップ/);
      }
    }
  });
});