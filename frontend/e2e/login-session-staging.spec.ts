import { test, expect } from '@playwright/test';

const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';

test.describe('Login and Session E2E Test - Staging', () => {
  test('should login successfully and maintain session across protected routes', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('Browser Console:', msg.text()));

    // Step 1: Visit homepage
    console.log('🔍 Step 1: Visiting homepage...');
    await page.goto(STAGING_URL);
    await expect(page).toHaveTitle(/AI Square/);

    // Step 2: Click login button
    console.log('🔍 Step 2: Clicking login button...');
    await page.click('text=Sign in');

    // Wait for login form
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Step 3: Fill login form
    console.log('🔍 Step 3: Filling login form...');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'student123');
    await page.click('button[type="submit"]');

    // Step 4: Check login success
    console.log('🔍 Step 4: Checking login success...');
    await page.waitForTimeout(3000); // Wait for redirect/login

    // Check if successfully redirected (either to dashboard or onboarding)
    const currentUrl = page.url();
    console.log('🔍 Current URL after login:', currentUrl);

    const isLoggedIn = currentUrl.includes('/onboarding') ||
                      currentUrl.includes('/dashboard') ||
                      currentUrl.includes('/discovery') ||
                      !currentUrl.includes('/login');

    console.log('✅ Login status:', isLoggedIn);
    expect(isLoggedIn).toBe(true);

    // Step 5: Check cookies
    console.log('🔍 Step 5: Checking cookies...');
    const cookies = await page.context().cookies();
    const accessTokenCookie = cookies.find(c => c.name === 'accessToken');
    console.log('🍪 AccessToken cookie:', accessTokenCookie ? 'Present' : 'Missing');
    console.log('🍪 All cookies:', cookies.map(c => c.name));

    // Step 6: Check localStorage
    console.log('🔍 Step 6: Checking localStorage...');
    const localStorage = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          items[key] = window.localStorage.getItem(key) || '';
        }
      }
      return items;
    });
    console.log('💾 LocalStorage items:', Object.keys(localStorage));

    // Step 7: Test /api/auth/check
    console.log('🔍 Step 7: Testing /api/auth/check...');
    const authCheckResponse = await page.request.get(`${STAGING_URL}/api/auth/check`);
    const authCheckData = await authCheckResponse.json();
    console.log('🔐 Auth check response:', authCheckData);
    expect(authCheckData.authenticated).toBe(true);

    // Step 8: Test protected routes - Discovery Overview
    console.log('🔍 Step 8: Testing /discovery/overview...');
    await page.goto(`${STAGING_URL}/discovery/overview`);
    await page.waitForTimeout(2000);

    // Should NOT be redirected to login page
    const discoveryUrl = page.url();
    console.log('📍 Current URL after /discovery/overview:', discoveryUrl);
    expect(discoveryUrl).toContain('/discovery/overview');
    expect(discoveryUrl).not.toContain('/login');

    // Step 9: Test protected routes - PBL Scenarios
    console.log('🔍 Step 9: Testing /pbl/scenarios...');
    await page.goto(`${STAGING_URL}/pbl/scenarios`);
    await page.waitForTimeout(2000);

    const pblScenariosUrl = page.url();
    console.log('📍 Current URL after /pbl/scenarios:', pblScenariosUrl);
    expect(pblScenariosUrl).toContain('/pbl/scenarios');
    expect(pblScenariosUrl).not.toContain('/login');

    // Step 10: Test protected routes - Assessment Scenarios
    console.log('🔍 Step 10: Testing /assessment/scenarios...');
    await page.goto(`${STAGING_URL}/assessment/scenarios`);
    await page.waitForTimeout(2000);

    const assessmentScenariosUrl = page.url();
    console.log('📍 Current URL after /assessment/scenarios:', assessmentScenariosUrl);
    expect(assessmentScenariosUrl).toContain('/assessment/scenarios');
    expect(assessmentScenariosUrl).not.toContain('/login');

    // Step 11: Test /api/user/me
    console.log('🔍 Step 11: Testing /api/user/me...');
    const userMeResponse = await page.request.get(`${STAGING_URL}/api/user/me`);
    const userMeData = await userMeResponse.json();
    console.log('👤 User data response:', userMeData);
    expect(userMeData.email).toBe('student@example.com');

    // Step 12: Test page refresh on protected route
    console.log('🔍 Step 12: Testing page refresh on protected route...');
    await page.goto(`${STAGING_URL}/discovery/overview`);
    await page.reload();
    await page.waitForTimeout(2000);

    const refreshedPageUrl = page.url();
    console.log('📍 URL after refresh:', refreshedPageUrl);
    expect(refreshedPageUrl).toContain('/discovery/overview');
    expect(refreshedPageUrl).not.toContain('/login');

    console.log('✅ All tests passed! Session persistence is working correctly.');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Test what happens when API is unreachable
    console.log('🔍 Testing network error handling...');

    await page.goto(STAGING_URL);

    // Block API requests to simulate network issues
    await page.route('**/api/**', route => route.abort());

    await page.click('text=Sign in');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'student123');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Login failed')).toBeVisible({ timeout: 5000 });
  });
});
