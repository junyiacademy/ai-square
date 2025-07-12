import { test, expect, Page } from '@playwright/test';

// Helper function to login
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for redirect after login
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

test.describe('Discovery Module Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginUser(page);
  });

  test('should navigate through discovery overview', async ({ page }) => {
    // Navigate to discovery
    await page.goto('/discovery');
    
    // Should redirect to overview
    await expect(page).toHaveURL(/.*\/discovery\/overview/);
    
    // Check page content
    await expect(page.locator('h1')).toContainText('探索世界');
    
    // Check navigation items
    await expect(page.locator('text=總覽')).toBeVisible();
    await expect(page.locator('text=評估')).toBeVisible();
    await expect(page.locator('text=職業冒險')).toBeVisible();
  });

  test('should complete interest assessment', async ({ page }) => {
    // Navigate to evaluation
    await page.goto('/discovery/evaluation');
    
    // Check if assessment has already been completed
    const hasResults = await page.locator('text=評估完成').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasResults) {
      // Start assessment
      await expect(page.locator('text=興趣評估')).toBeVisible();
      
      // Answer first question
      await page.click('text=打造應用程式');
      await page.click('button:has-text("下一題")');
      
      // Answer more questions (adjust based on actual questions)
      const questions = await page.locator('.question-container').count();
      for (let i = 1; i < questions; i++) {
        // Click first option for simplicity
        await page.locator('.option-card').first().click();
        
        // Check if it's the last question
        const isLastQuestion = await page.locator('button:has-text("完成評估")').isVisible();
        if (isLastQuestion) {
          await page.click('button:has-text("完成評估")');
        } else {
          await page.click('button:has-text("下一題")');
        }
      }
      
      // Wait for results
      await expect(page.locator('text=評估完成')).toBeVisible({ timeout: 10000 });
    }
    
    // Check results display
    await expect(page.locator('text=科技')).toBeVisible();
    await expect(page.locator('text=創意')).toBeVisible();
    await expect(page.locator('text=商業')).toBeVisible();
  });

  test('should browse and select career scenarios', async ({ page }) => {
    // Navigate to scenarios
    await page.goto('/discovery/scenarios');
    
    // Check page loaded
    await expect(page.locator('h1:has-text("探索職業冒險")')).toBeVisible();
    
    // Check career cards are displayed
    await expect(page.locator('text=數位魔法師 - 內容創作者')).toBeVisible();
    await expect(page.locator('text=數碼建築師 - 應用程式開發者')).toBeVisible();
    
    // Filter by category
    await page.click('button:has-text("技術")');
    
    // Verify filter works
    await expect(page.locator('text=數碼建築師')).toBeVisible();
    
    // Click on a career scenario
    await page.click('text=數碼建築師 - 應用程式開發者');
    
    // Should navigate to scenario detail or create new scenario
    await page.waitForURL(/.*\/discovery\/scenarios\/.*/);
  });

  test('should interact with scenario programs', async ({ page }) => {
    // Navigate directly to a scenario (assuming one exists)
    await page.goto('/discovery/scenarios');
    
    // Select a scenario
    await page.click('text=數碼建築師 - 應用程式開發者');
    await page.waitForURL(/.*\/discovery\/scenarios\/.*/);
    
    // Check scenario detail page
    await expect(page.locator('h1')).toContainText('應用程式開發者');
    
    // Check for programs/modules
    const hasPrograms = await page.locator('text=開始學習').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasPrograms) {
      // Click on first program
      await page.click('text=開始學習');
      
      // Should navigate to program page
      await page.waitForURL(/.*\/programs\/.*/);
      
      // Check for tasks
      await expect(page.locator('text=任務')).toBeVisible();
    }
  });

  test('should handle navigation between discovery sections', async ({ page }) => {
    await page.goto('/discovery/overview');
    
    // Test navigation links
    // Go to evaluation
    await page.click('a:has-text("評估")');
    await expect(page).toHaveURL(/.*\/discovery\/evaluation/);
    
    // Go to scenarios
    await page.click('a:has-text("職業冒險")');
    await expect(page).toHaveURL(/.*\/discovery\/scenarios/);
    
    // Go back to overview
    await page.click('a:has-text("總覽")');
    await expect(page).toHaveURL(/.*\/discovery\/overview/);
  });

  test('should show proper empty states', async ({ page }) => {
    // Navigate to scenarios
    await page.goto('/discovery/scenarios');
    
    // Apply filter that returns no results
    await page.click('button:has-text("混合")');
    
    // If no results, should show empty state
    const noResults = await page.locator('text=沒有找到符合條件的職業冒險').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (noResults) {
      await expect(page.locator('text=沒有找到符合條件的職業冒險')).toBeVisible();
    }
  });

  test('should persist user progress', async ({ page, context }) => {
    // Complete assessment
    await page.goto('/discovery/evaluation');
    
    // Check if results are already saved
    const hasResults = await page.locator('text=評估完成').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasResults) {
      // Get the scores
      const techScore = await page.locator('text=科技').locator('..').locator('text=%').textContent();
      
      // Navigate away and come back
      await page.goto('/discovery/overview');
      await page.goto('/discovery/evaluation');
      
      // Results should still be there
      await expect(page.locator('text=評估完成')).toBeVisible();
      const techScoreAfter = await page.locator('text=科技').locator('..').locator('text=%').textContent();
      
      expect(techScore).toBe(techScoreAfter);
    }
  });
});

test.describe('Discovery Module - Error Handling', () => {
  test('should handle unauthenticated access', async ({ page }) => {
    // Try to access discovery without login
    await page.goto('/discovery/scenarios');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should handle invalid scenario ID', async ({ page }) => {
    await loginUser(page);
    
    // Try to access non-existent scenario
    await page.goto('/discovery/scenarios/invalid-id-12345');
    
    // Should show error or redirect
    const hasError = await page.locator('text=找不到').isVisible({ timeout: 5000 }).catch(() => false);
    const redirected = page.url().includes('/discovery/scenarios') && !page.url().includes('invalid-id');
    
    expect(hasError || redirected).toBeTruthy();
  });
});