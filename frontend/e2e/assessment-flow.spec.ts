import { test, expect } from '@playwright/test';

// Helper function to login
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'demo@example.com');
  await page.fill('input[name="password"]', 'demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Assessment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should complete full assessment flow from scenarios to results', async ({ page }) => {
    // 1. Go to assessment scenarios page
    await page.goto('/assessment/scenarios');
    
    // 2. Wait for scenarios to load
    await page.waitForSelector('text=AI 素養評估');
    
    // 3. Click on a scenario to view details
    await page.click('text=AI 基礎知識評估');
    
    // 4. Wait for scenario detail page
    await page.waitForURL(/\/assessment\/scenarios\/.+/);
    await expect(page.locator('h1')).toContainText('AI 基礎知識評估');
    
    // 5. Start assessment
    await page.click('text=開始評估');
    
    // 6. Wait for redirect to task page
    await page.waitForURL(/\/tasks\/.+\/assess/);
    
    // 7. Answer questions
    const questions = await page.locator('[data-testid="question"]').count();
    for (let i = 0; i < questions; i++) {
      // Select first option for each question
      await page.locator(`[data-testid="option-A-${i}"]`).click();
    }
    
    // 8. Submit assessment
    await page.click('text=提交評估');
    
    // 9. Wait for completion page
    await page.waitForURL(/\/complete$/);
    
    // 10. Verify completion page elements
    await expect(page.locator('text=評估完成')).toBeVisible();
    await expect(page.locator('text=總分')).toBeVisible();
    
    // 11. Navigate to results history
    await page.click('text=查看歷史記錄');
    await page.waitForURL('/assessment/results');
    
    // 12. Verify results appear in history
    await expect(page.locator('text=AI 基礎知識評估')).toBeVisible();
  });

  test.skip('should handle authentication for assessment', async ({ page }) => {
    // Skip login for this test to test auth redirect
    await page.goto('/assessment/scenarios/test-id/programs');
    
    // Should redirect to login or show auth message
    await expect(page).toHaveURL(/\/(login|auth)/);
  });

  test('should show progress during assessment', async ({ page }) => {
    await page.goto('/assessment/scenarios');
    await page.click('text=AI 基礎知識評估');
    await page.click('text=開始評估');
    
    // Check progress indicators
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    await expect(page.locator('text=問題 1 / ')).toBeVisible();
  });

  test('should save answers and allow navigation', async ({ page }) => {
    await page.goto('/assessment/scenarios/test-id/programs/test-program/tasks/test-task/assess');
    
    // Answer a question
    await page.locator('[data-testid="option-A-0"]').click();
    
    // Navigate away and back
    await page.goto('/');
    await page.goBack();
    
    // Answer should still be selected
    await expect(page.locator('[data-testid="option-A-0"]')).toBeChecked();
  });

  test('should calculate and display scores correctly', async ({ page }) => {
    // Complete assessment with known answers
    await page.goto('/assessment/scenarios/test-id/programs/test-program/tasks/test-task/assess');
    
    // Answer questions (assuming we know correct answers)
    await page.locator('[data-testid="option-A-0"]').click(); // Correct
    await page.locator('[data-testid="option-B-1"]').click(); // Correct
    await page.locator('[data-testid="option-C-2"]').click(); // Incorrect
    
    await page.click('text=提交評估');
    
    // Check score calculation
    await expect(page.locator('text=66.7%')).toBeVisible(); // 2 out of 3
  });
});