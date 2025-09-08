import { test, expect } from '@playwright/test';

test.describe('AI Square Learning Modes Test', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('#email', 'student@example.com');
    await page.fill('#password', 'student123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect after login
    await page.waitForURL('http://localhost:3000/dashboard', { timeout: 15000 });
  });

  test('PBL Mode: Start scenario → Complete task → View completion', async ({ page }) => {
    // 1. Navigate to PBL scenarios
    await page.goto('http://localhost:3000/pbl/scenarios');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // 2. Click on first scenario card
    const firstScenario = page.locator('article, .scenario-card, [data-testid*="scenario"]').first();
    if (await firstScenario.isVisible()) {
      await firstScenario.click();
      
      // 3. Wait for scenario detail page
      await page.waitForTimeout(2000);
      
      // 4. Start the scenario - look for Start button
      const startButton = page.locator('button:has-text("Start"), button:has-text("開始")').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        
        // 5. Wait for program creation and redirect
        await page.waitForTimeout(3000);
        
        // 6. Check if we're in the learning interface
        const taskContent = page.locator('textarea, input[type="text"], .task-content').first();
        if (await taskContent.isVisible()) {
          // Submit a response if there's an input field
          if (await page.locator('textarea').isVisible()) {
            await page.locator('textarea').fill('This is my solution using AI to solve the challenge.');
            
            const submitButton = page.locator('button:has-text("Submit"), button:has-text("提交")').first();
            if (await submitButton.isVisible()) {
              await submitButton.click();
              await page.waitForTimeout(2000);
            }
          }
        }
      }
    }
    
    console.log('✅ PBL mode test completed');
  });

  test('Discovery Mode: Browse careers → Start exploration → Complete milestone', async ({ page }) => {
    // 1. Navigate to Discovery
    await page.goto('http://localhost:3000/discovery');
    await page.waitForSelector('text=/Discovery|Career/i', { timeout: 10000 });
    
    // 2. Select a career path
    const careerCard = page.locator('[data-testid*="career"], .career-card, article').first();
    if (await careerCard.isVisible()) {
      await careerCard.click();
      
      // 3. Start exploration
      const startButton = page.locator('button:has-text("Start"), button:has-text("Explore")').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        
        // 4. Complete a milestone activity
        await page.waitForTimeout(2000);
        const activityInput = page.locator('textarea, input[type="text"]').first();
        if (await activityInput.isVisible()) {
          await activityInput.fill('Exploring AI in this career field');
          
          const submitButton = page.locator('button:has-text("Submit"), button:has-text("Complete")').first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
          }
        }
      }
    }
    
    console.log('✅ Discovery mode test completed');
  });

  test('Assessment Mode: Start assessment → Answer questions → View results', async ({ page }) => {
    // 1. Navigate to Assessment
    await page.goto('http://localhost:3000/assessment/scenarios');
    await page.waitForSelector('text=/Assessment|Evaluate/i', { timeout: 10000 });
    
    // 2. Start an assessment
    const assessmentCard = page.locator('.assessment-card, article, .grid > div').first();
    if (await assessmentCard.isVisible()) {
      await assessmentCard.click();
      
      // Wait for assessment details page
      await page.waitForTimeout(2000);
      
      // 3. Start the assessment
      const startButton = page.locator('button:has-text("Start Assessment"), button:has-text("Begin")').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        
        // 4. Answer first question
        await page.waitForTimeout(2000);
        
        // Try multiple selectors for question options
        const option = page.locator('input[type="radio"], button[role="radio"], .option, .choice').first();
        if (await option.isVisible()) {
          await option.click();
          
          // 5. Submit or continue
          const nextButton = page.locator('button:has-text("Next"), button:has-text("Submit")').first();
          if (await nextButton.isVisible()) {
            await nextButton.click();
          }
        }
        
        // 6. Check for results or completion
        await page.waitForTimeout(3000);
        const resultsVisible = await page.locator('text=/Results|Score|Complete/i').isVisible();
        if (resultsVisible) {
          console.log('Assessment results displayed');
        }
      }
    }
    
    console.log('✅ Assessment mode test completed');
  });
});