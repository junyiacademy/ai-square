import { test, expect } from '@playwright/test';

test.describe('PBL Task-Based Sessions E2E Test', () => {
  // Test user credentials
  const testUser = {
    email: 'teacher@example.com',
    password: 'password123',
    id: '3'
  };

  // Helper function to login
  async function login(page) {
    // Set user in localStorage and cookie
    await page.addInitScript((user) => {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('user', JSON.stringify(user));
    }, testUser);
    
    // Set cookie
    await page.context().addCookies([{
      name: 'user',
      value: encodeURIComponent(JSON.stringify(testUser)),
      domain: 'localhost',
      path: '/'
    }]);
  }

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('Complete PBL task-based learning flow', async ({ page }) => {
    // 1. Navigate to PBL scenarios page
    await page.goto('http://localhost:3000/pbl');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra wait for content to load
    
    // 2. Click on AI Job Search scenario
    await page.click('text=AI 輔助求職訓練');
    await page.waitForURL('**/pbl/scenarios/ai-job-search');
    
    // 3. Start learning
    await page.click('text=開始學習');
    await page.waitForURL('**/pbl/scenarios/ai-job-search/learn');
    
    // 4. Verify we're on the first task
    await expect(page.locator('text=當前任務')).toBeVisible();
    
    // Log the current task info
    const currentTaskElement = await page.locator('[class*="font-medium"]').filter({ hasText: '當前任務' }).locator('..').locator('p').last();
    const currentTaskText = await currentTaskElement.textContent();
    console.log('Current Task:', currentTaskText);
    
    // 5. Send a message to start the session
    const messageInput = page.locator('textarea[placeholder*="請輸入您的訊息"]');
    await messageInput.fill('我想了解如何使用AI進行產業分析');
    await page.click('button:has-text("發送")');
    
    // Wait for AI response
    await page.waitForSelector('text=AI 助手', { timeout: 30000 });
    
    // 6. Send another message
    await messageInput.fill('請給我一個具體的例子');
    await page.click('button:has-text("發送")');
    
    // Wait for second AI response
    await page.waitForTimeout(3000);
    
    // 7. Analyze the task
    const analyzeButton = page.locator('button:has-text("分析任務")');
    await expect(analyzeButton).toBeVisible();
    await analyzeButton.click();
    
    // Wait for analysis to complete
    await page.waitForSelector('text=任務已分析', { timeout: 30000 });
    
    // 8. Log the analysis results
    const scoreElement = await page.locator('text=總體分數').locator('..').locator('[class*="text-3xl"]');
    const score = await scoreElement.textContent();
    console.log('Task 1 Score:', score);
    
    // 9. Move to next task
    await page.click('button:has-text("下一個任務")');
    await page.waitForTimeout(2000);
    
    // 10. Verify we're on a new task
    const newTaskText = await currentTaskElement.textContent();
    console.log('New Task:', newTaskText);
    expect(newTaskText).not.toBe(currentTaskText);
    
    // 11. Send a message for the second task
    await messageInput.fill('如何準備技術面試？');
    await page.click('button:has-text("發送")');
    
    // Wait for AI response
    await page.waitForSelector('text=AI 助手', { timeout: 30000 });
    
    // 12. Navigate to history page
    await page.goto('http://localhost:3000/history');
    await page.waitForLoadState('networkidle');
    
    // 13. Verify task-based cards are displayed
    await expect(page.locator('text=PBL 情境式學習').first()).toBeVisible();
    
    // Count PBL cards
    const pblCards = await page.locator('[class*="bg-purple-100"]').count();
    console.log('Number of PBL task cards:', pblCards);
    
    // Verify we have at least 2 cards (one for each task we started)
    expect(pblCards).toBeGreaterThanOrEqual(2);
    
    // 14. Check the content of the first PBL card
    const firstCard = page.locator('[class*="bg-purple-100"]').first().locator('..');
    const cardTitle = await firstCard.locator('h3').textContent();
    console.log('First card title:', cardTitle);
    
    // Verify it contains task-specific information
    expect(cardTitle).toContain('AI 輔助求職訓練');
    
    // 15. Click on View Details of a completed task
    const completedCard = await page.locator('text=已完成').first().locator('../..');
    if (await completedCard.isVisible()) {
      await completedCard.locator('text=查看詳情').click();
      await page.waitForURL('**/pbl/scenarios/*/complete*');
      
      // 16. Verify completion page shows correct data
      await expect(page.locator('text=恭喜您！')).toBeVisible();
      await expect(page.locator('text=總互動次數')).toBeVisible();
      
      // Log completion stats
      const interactions = await page.locator('text=總互動次數').locator('..').locator('[class*="text-2xl"]').textContent();
      console.log('Total interactions:', interactions);
    }
  });

  test('Verify task isolation - each task has separate session', async ({ page }) => {
    // Navigate directly to learn page
    await page.goto('http://localhost:3000/pbl/scenarios/ai-job-search/learn');
    await page.waitForLoadState('networkidle');
    
    // Task 1: Send messages
    const messageInput = page.locator('textarea[placeholder*="請輸入您的訊息"]');
    await messageInput.fill('Task 1 - Message 1');
    await page.click('button:has-text("發送")');
    await page.waitForTimeout(2000);
    
    await messageInput.fill('Task 1 - Message 2');
    await page.click('button:has-text("發送")');
    await page.waitForTimeout(2000);
    
    // Analyze task 1
    await page.click('button:has-text("分析任務")');
    await page.waitForSelector('text=任務已分析', { timeout: 30000 });
    
    // Move to next task
    await page.click('button:has-text("下一個任務")');
    await page.waitForTimeout(2000);
    
    // Verify conversation is cleared
    const messages = await page.locator('[class*="rounded-lg p-4"]').filter({ hasText: 'Task 1' }).count();
    expect(messages).toBe(0); // Should be 0 because conversation is cleared
    
    // Task 2: Send different messages
    await messageInput.fill('Task 2 - Different message');
    await page.click('button:has-text("發送")');
    await page.waitForTimeout(2000);
    
    // Go to history
    await page.goto('http://localhost:3000/history');
    await page.waitForLoadState('networkidle');
    
    // Verify we have separate cards for each task
    const taskCards = await page.locator('[class*="bg-purple-100"]').count();
    expect(taskCards).toBeGreaterThanOrEqual(2);
    
    // Log all card titles to verify they're different
    const cardTitles = await page.locator('[class*="bg-purple-100"]').locator('..').locator('h3').allTextContents();
    console.log('All task card titles:', cardTitles);
    
    // Verify task IDs are different
    const cardIds = await page.locator('text=ID:').locator('..').allTextContents();
    console.log('All task IDs:', cardIds);
    
    // IDs should be unique
    const uniqueIds = [...new Set(cardIds)];
    expect(uniqueIds.length).toBe(cardIds.length);
  });

  test('Verify task-specific data in history API', async ({ page }) => {
    // Make direct API call to verify data structure
    const response = await page.request.get('http://localhost:3000/api/pbl/history', {
      headers: {
        'Cookie': `user=${encodeURIComponent(JSON.stringify(testUser))}`
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    console.log('History API response:', JSON.stringify(data, null, 2));
    
    // Verify task-level information is present
    if (data.data && data.data.length > 0) {
      const firstSession = data.data[0];
      
      // Check for task-specific fields
      expect(firstSession).toHaveProperty('currentTaskId');
      expect(firstSession).toHaveProperty('currentTaskTitle');
      expect(firstSession).toHaveProperty('scenarioId');
      expect(firstSession).toHaveProperty('scenarioTitle');
      
      console.log('First session task info:', {
        taskId: firstSession.currentTaskId,
        taskTitle: firstSession.currentTaskTitle,
        stageDetails: firstSession.stageDetails
      });
    }
  });
});