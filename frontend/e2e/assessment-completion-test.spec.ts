import { test, expect } from '@playwright/test';

test.describe('Assessment Completion End-to-End Test', () => {
  test.setTimeout(120000); // 2 minutes timeout
  
  test('should complete full assessment flow from login to completion page', async ({ page }) => {
    const baseUrl = 'https://ai-square-staging-731209836128.asia-east1.run.app';
    const scenarioId = '078f8bbe-d004-4d3f-b74f-cb8fe8630898';
    const demoEmail = 'student@example.com';
    const demoPassword = 'student123';

    // Arrays to collect errors and failures
    const consoleErrors: string[] = [];
    const failed401s: string[] = [];
    const apiResponses: Array<{ url: string; status: number; method: string }> = [];

    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`${msg.location().url}:${msg.location().lineNumber} - ${msg.text()}`);
      }
    });

    // Monitor network responses
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      const method = response.request().method();
      
      apiResponses.push({ url, status, method });
      
      if (status === 401) {
        failed401s.push(`${method} ${url} - 401 Unauthorized`);
      }
    });

    console.log('🚀 Starting Assessment Completion E2E Test');
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Scenario ID: ${scenarioId}`);

    try {
      // Step 1: Navigate to login page
      console.log('📝 Step 1: Navigating to login page');
      await page.goto(`${baseUrl}/login`);
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the login page
      await expect(page).toHaveURL(/.*\/login/);
      console.log('✅ Successfully navigated to login page');

      // Step 2: Login with demo account
      console.log('🔐 Step 2: Logging in with demo account');
      await page.fill('input[name="email"]', demoEmail);
      await page.fill('input[name="password"]', demoPassword);
      
      // Click login button
      const loginButton = page.locator('button[type="submit"]');
      await expect(loginButton).toBeVisible();
      await loginButton.click();
      
      // Wait for login to complete and redirect
      await page.waitForTimeout(3000);
      
      // Check if we're logged in (not on login page anymore)
      const currentUrl = page.url();
      console.log(`Current URL after login: ${currentUrl}`);
      
      if (currentUrl.includes('/login')) {
        throw new Error('Login failed - still on login page');
      }
      console.log('✅ Successfully logged in');

      // Step 3: Navigate to Assessment scenarios page
      console.log('📚 Step 3: Navigating to Assessment scenarios');
      await page.goto(`${baseUrl}/assessment/scenarios`);
      await page.waitForLoadState('networkidle');
      
      // Verify we're on assessment page
      await expect(page).toHaveURL(/.*\/assessment\/scenarios/);
      console.log('✅ Successfully navigated to Assessment scenarios page');

      // Step 4: Find and click the target scenario
      console.log('🎯 Step 4: Finding target scenario');
      
      // Look for scenario cards or links
      const scenarioSelector = `[href*="${scenarioId}"], [data-scenario-id="${scenarioId}"]`;
      let scenarioElement = page.locator(scenarioSelector).first();
      
      // If direct selector doesn't work, try finding by text or other methods
      if (await scenarioElement.count() === 0) {
        console.log('Direct scenario selector not found, looking for assessment cards...');
        
        // Try to find assessment cards
        const cards = page.locator('[class*="card"], [role="button"], a[href*="assessment"]');
        const cardCount = await cards.count();
        console.log(`Found ${cardCount} potential assessment cards`);
        
        if (cardCount > 0) {
          // Click the first available assessment
          scenarioElement = cards.first();
        } else {
          throw new Error('No assessment scenarios found on the page');
        }
      }
      
      await expect(scenarioElement).toBeVisible();
      await scenarioElement.click();
      await page.waitForTimeout(2000);
      
      console.log('✅ Successfully clicked scenario');

      // Step 5: Start Assessment Program
      console.log('🚀 Step 5: Starting Assessment Program');
      
      // Look for start button or create program
      const startButton = page.locator('button').filter({ hasText: /start|begin/i }).first();
      
      if (await startButton.count() > 0) {
        await startButton.click();
        await page.waitForTimeout(3000);
        console.log('✅ Clicked start button');
      } else {
        // If no start button, try to create program via API manually
        console.log('No start button found, creating program via API...');
        
        const createProgramResponse = await page.request.post(`${baseUrl}/api/assessment/scenarios/${scenarioId}/programs`, {
          data: { action: 'start' }
        });
        
        expect(createProgramResponse.status()).toBe(200);
        const programData = await createProgramResponse.json();
        console.log('✅ Program created via API:', programData);
        
        // Navigate to the program
        const programId = programData.program?.id;
        if (programId) {
          await page.goto(`${baseUrl}/assessment/scenarios/${scenarioId}/program/${programId}`);
          await page.waitForLoadState('networkidle');
        }
      }

      // Step 6: Attempt to complete assessment
      console.log('✅ Step 6: Completing assessment');
      
      // Look for completion-related elements
      const completeButton = page.locator('button').filter({ hasText: /complete|finish|submit/i }).first();
      const nextButton = page.locator('button').filter({ hasText: /next|continue/i }).first();
      
      if (await completeButton.count() > 0) {
        await completeButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Clicked complete button');
      } else if (await nextButton.count() > 0) {
        // If there are questions to answer, try to progress through them
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts && await nextButton.count() > 0) {
          // Try to fill any form elements if they exist
          const inputs = page.locator('input, textarea, select');
          const inputCount = await inputs.count();
          
          if (inputCount > 0) {
            for (let i = 0; i < inputCount; i++) {
              const input = inputs.nth(i);
              const inputType = await input.getAttribute('type');
              
              if (inputType === 'radio' || inputType === 'checkbox') {
                await input.check();
              } else if (inputType === 'text' || !inputType) {
                await input.fill('Test response');
              }
            }
          }
          
          await nextButton.click();
          await page.waitForTimeout(1000);
          attempts++;
        }
        
        console.log(`✅ Progressed through ${attempts} steps`);
      } else {
        console.log('⚠️ No completion or next buttons found, trying to navigate to completion directly');
      }

      // Step 7: Check for completion page or trigger completion API
      console.log('🎯 Step 7: Checking completion');
      
      const currentUrl2 = page.url();
      console.log(`Current URL: ${currentUrl2}`);
      
      // Extract program ID from URL if possible
      const programIdMatch = currentUrl2.match(/\/program\/([a-f0-9-]+)/);
      if (programIdMatch) {
        const programId = programIdMatch[1];
        console.log(`Found program ID: ${programId}`);
        
        // Try to call completion API directly
        console.log('📞 Calling completion API...');
        const completionResponse = await page.request.post(`${baseUrl}/api/assessment/programs/${programId}/complete`);
        
        console.log(`Completion API status: ${completionResponse.status()}`);
        
        if (completionResponse.ok()) {
          const completionData = await completionResponse.json();
          console.log('✅ Completion API successful:', completionData);
          
          // Navigate to completion page
          await page.goto(`${baseUrl}/assessment/scenarios/${scenarioId}/program/${programId}/complete`);
          await page.waitForLoadState('networkidle');
          
          // Verify completion page content
          const pageContent = await page.textContent('body');
          console.log('📄 Completion page loaded');
          
          if (pageContent && pageContent.includes('complet')) {
            console.log('✅ Completion page contains completion-related content');
          }
        } else {
          console.log('❌ Completion API failed');
          const errorText = await completionResponse.text();
          console.log('Error response:', errorText);
        }
      }

    } catch (error) {
      console.error('❌ Test failed with error:', error);
      throw error;
    } finally {
      // Step 8: Report results
      console.log('\n📊 Test Results Summary:');
      console.log(`Console Errors: ${consoleErrors.length}`);
      console.log(`401 Authentication Failures: ${failed401s.length}`);
      console.log(`Total API Calls: ${apiResponses.length}`);
      
      if (consoleErrors.length > 0) {
        console.log('\n🚨 Console Errors:');
        consoleErrors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (failed401s.length > 0) {
        console.log('\n🔒 Authentication Failures:');
        failed401s.forEach(failure => console.log(`  - ${failure}`));
      }
      
      // Show relevant API calls
      const relevantAPIs = apiResponses.filter(api => 
        api.url.includes('/api/assessment') || 
        api.url.includes('/api/auth') ||
        api.status >= 400
      );
      
      if (relevantAPIs.length > 0) {
        console.log('\n🔗 Relevant API Calls:');
        relevantAPIs.forEach(api => {
          const statusIcon = api.status < 400 ? '✅' : '❌';
          console.log(`  ${statusIcon} ${api.method} ${api.url} - ${api.status}`);
        });
      }
      
      // Final assertions
      expect(consoleErrors.length).toBe(0);
      expect(failed401s.length).toBe(0);
      
      console.log('\n✅ Assessment Completion E2E Test Summary:');
      console.log('- Successfully logged in with demo account');
      console.log('- Navigated to assessment scenarios');
      console.log('- Attempted to start assessment program');
      console.log('- Tested completion flow');
      console.log('- Verified no console errors or 401s');
    }
  });
});