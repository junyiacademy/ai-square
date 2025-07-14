import { test, expect } from '@playwright/test';

test.describe('PBL Basic Flow Test', () => {
  test('should navigate through PBL scenario and complete a task', async ({ page }) => {
    // Go to PBL page
    await page.goto('/pbl');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're on the right page
    const pageTitle = await page.textContent('h1');
    console.log('Page title:', pageTitle);
    
    // Find and click first scenario
    const scenarioLinks = await page.locator('a[href^="/pbl/scenarios/"]').all();
    console.log('Found scenario links:', scenarioLinks.length);
    
    if (scenarioLinks.length > 0) {
      await scenarioLinks[0].click();
      
      // Wait for scenario detail page
      await page.waitForURL(/\/pbl\/scenarios\/.+/);
      console.log('Current URL:', page.url());
      
      // Look for start button
      const startButtons = await page.locator('button').all();
      console.log('Found buttons:', startButtons.length);
      
      for (const button of startButtons) {
        const text = await button.textContent();
        console.log('Button text:', text);
        if (text?.includes('開始學習') || text?.includes('Start Learning')) {
          await button.click();
          break;
        }
      }
      
      // Wait for task page
      await page.waitForURL(/\/tasks\/.+/, { timeout: 10000 });
      console.log('Task page URL:', page.url());
      
      // Look for chat input
      const chatInputs = await page.locator('textarea').all();
      console.log('Found textareas:', chatInputs.length);
      
      if (chatInputs.length > 0) {
        // Type a message
        await chatInputs[0].fill('Hello, I want to learn about AI');
        await page.keyboard.press('Enter');
        
        // Wait for response
        await page.waitForTimeout(5000);
        
        // Check for AI response
        const messages = await page.locator('div[class*="message"], div[class*="chat"]').all();
        console.log('Found messages:', messages.length);
      }
      
      // Look for evaluate button
      const evaluateButtons = await page.locator('button').all();
      for (const button of evaluateButtons) {
        const text = await button.textContent();
        if (text?.includes('評估') || text?.includes('Evaluate')) {
          console.log('Found evaluate button');
          await button.click();
          break;
        }
      }
      
      // Wait for evaluation
      await page.waitForTimeout(10000);
      
      // Check if we have any score elements
      const scoreElements = await page.locator('[class*="score"], [class*="Score"]').all();
      console.log('Found score elements:', scoreElements.length);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'pbl-test-result.png', fullPage: true });
    }
  });
});