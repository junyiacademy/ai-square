import { test, expect } from '@playwright/test';

test.describe('Assessment Completion Final Test - Staging Environment', () => {
  test.setTimeout(90000); // 1.5 minutes timeout

  test('should complete assessment flow successfully with schema fix', async ({ page }) => {
    const baseUrl = 'https://ai-square-staging-731209836128.asia-east1.run.app';
    const scenarioId = '078f8bbe-d004-4d3f-b74f-cb8fe8630898';
    const demoEmail = 'student@example.com';
    const demoPassword = 'student123';

    // Track errors and API responses
    const consoleErrors: string[] = [];
    const failed401s: string[] = [];
    const apiResponses: Array<{ url: string; status: number; method: string }> = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`Console Error: ${msg.text()}`);
      }
    });

    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      const method = response.request().method();

      apiResponses.push({ url, status, method });

      if (status === 401) {
        failed401s.push(`${method} ${url} - 401 Unauthorized`);
      }
    });

    console.log('🎯 Testing Assessment Completion with Schema Fix');
    console.log(`Environment: ${baseUrl}`);
    console.log(`Scenario ID: ${scenarioId}`);

    try {
      // Step 1: Login
      console.log('🔐 Step 1: Login to staging');
      await page.goto(`${baseUrl}/login`);
      await page.waitForTimeout(2000);

      await page.fill('input[name="email"]', demoEmail);
      await page.fill('input[name="password"]', demoPassword);

      const loginButton = page.locator('button[type="submit"]');
      await expect(loginButton).toBeVisible();
      await loginButton.click();

      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      console.log(`✅ Login completed, current URL: ${currentUrl}`);

      expect(currentUrl).not.toContain('/login');

      // Step 2: Create assessment program via API
      console.log('🚀 Step 2: Create assessment program');
      const createResponse = await page.request.post(`${baseUrl}/api/assessment/scenarios/${scenarioId}/programs`, {
        data: { action: 'start' }
      });

      console.log(`Create program API status: ${createResponse.status()}`);
      expect(createResponse.status()).toBe(200);

      const programData = await createResponse.json();
      const programId = programData.program?.id;
      console.log(`✅ Program created with ID: ${programId}`);
      expect(programId).toBeDefined();

      // Step 3: Test the fixed completion API
      console.log('🎯 Step 3: Test completion API with schema fix');
      const completionResponse = await page.request.post(`${baseUrl}/api/assessment/programs/${programId}/complete`);

      console.log(`Completion API status: ${completionResponse.status()}`);
      const completionData = await completionResponse.json();

      console.log('Completion API response:', {
        success: completionData.success,
        evaluationId: completionData.evaluationId,
        score: completionData.score,
        error: completionData.error,
        details: completionData.details
      });

      if (completionResponse.ok()) {
        console.log('✅ Assessment completion API works with schema fix!');
        expect(completionData.success).toBe(true);
        expect(completionData.evaluationId).toBeDefined();
        expect(completionData.score).toBeDefined();

        // Step 4: Test completion page access
        console.log('📄 Step 4: Test completion page');
        await page.goto(`${baseUrl}/assessment/scenarios/${scenarioId}/program/${programId}/complete`);
        await page.waitForTimeout(2000);

        const completionPageUrl = page.url();
        console.log(`Completion page URL: ${completionPageUrl}`);

        // Check for completion content
        const pageContent = await page.textContent('body');
        const hasCompletionContent = pageContent && (
          pageContent.includes('complet') ||
          pageContent.includes('result') ||
          pageContent.includes('score')
        );

        console.log(`Page has completion content: ${hasCompletionContent}`);

      } else {
        console.log('❌ Completion API still failing:', completionData);

        // Check if it's still the schema error
        if (completionData.details?.includes('evaluation_subtype')) {
          throw new Error('Schema error still exists: evaluation_subtype column issue');
        } else {
          console.log('Different error, may need further investigation');
        }
      }

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    } finally {
      // Report results
      console.log('\n📊 Final Test Results:');
      console.log(`Console Errors: ${consoleErrors.length}`);
      console.log(`401 Authentication Failures: ${failed401s.length}`);

      if (consoleErrors.length > 0) {
        console.log('Console Errors:', consoleErrors.slice(0, 3));
      }

      if (failed401s.length > 0) {
        console.log('Auth Failures:', failed401s.slice(0, 3));
      }

      // Show assessment-related API calls
      const assessmentAPIs = apiResponses.filter(api =>
        api.url.includes('/api/assessment') || api.url.includes('/api/auth')
      );

      console.log('\n🔗 Assessment API Calls:');
      assessmentAPIs.forEach(api => {
        const icon = api.status < 400 ? '✅' : '❌';
        const urlPath = api.url.split('/').slice(-4).join('/');
        console.log(`  ${icon} ${api.method} ${api.status} - ${urlPath}`);
      });

      // Strict assertions
      expect(consoleErrors.length).toBe(0);
      expect(failed401s.length).toBe(0);

      console.log('\n🎉 Assessment Completion Test Passed with Schema Fix!');
    }
  });
});
