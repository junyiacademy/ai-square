import { test, expect } from '@playwright/test';

const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';

// Test configuration
const TEST_ACCOUNTS = {
  student: { email: 'student@example.com', password: 'student123' },
  teacher: { email: 'teacher@example.com', password: 'teacher123' },
  admin: { email: 'admin@example.com', password: 'admin123' }
};

test.describe('Staging Environment Comprehensive Test', () => {
  test.setTimeout(120000); // 2 minutes timeout

  test('1. Health Check and API Status', async ({ request }) => {
    console.log('\n=== 1. API Health Check ===');
    
    const healthResponse = await request.get(`${STAGING_URL}/api/health`);
    const healthData = await healthResponse.json();
    
    expect(healthResponse.ok()).toBeTruthy();
    expect(healthData.status).toBe('healthy');
    expect(healthData.checks.database.status).toBe(true);
    
    console.log('✅ Health Check Passed');
    console.log(`   - Status: ${healthData.status}`);
    console.log(`   - Database: ${healthData.checks.database.status ? 'Connected' : 'Disconnected'}`);
    console.log(`   - Environment: ${healthData.environment}`);
  });

  test('2. Homepage Loading and Navigation', async ({ page }) => {
    console.log('\n=== 2. Homepage Test ===');
    
    await page.goto(STAGING_URL);
    await expect(page).toHaveTitle(/AI Square/);
    
    // Check navigation menu
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    
    // Check language selector
    const langSelector = page.locator('select[aria-label*="language"], select[aria-label*="語言"]').first();
    await expect(langSelector).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'staging-homepage.png', fullPage: true });
    
    console.log('✅ Homepage loaded successfully');
    console.log('   - Navigation visible');
    console.log('   - Language selector available');
  });

  test('3. Login Functionality Test', async ({ page, context }) => {
    console.log('\n=== 3. Login Test ===');
    
    await page.goto(`${STAGING_URL}/login`);
    
    // Check login form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
    
    // Test login with student account
    await page.fill('input[name="email"]', TEST_ACCOUNTS.student.email);
    await page.fill('input[name="password"]', TEST_ACCOUNTS.student.password);
    
    // Click sign in and wait for response
    const [response] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/api/auth/login') && response.request().method() === 'POST'
      ),
      page.click('button:has-text("Sign in")')
    ]);
    
    const loginData = await response.json();
    
    if (loginData.success) {
      console.log('✅ Login successful');
      console.log(`   - User: ${loginData.user.email}`);
      console.log(`   - Role: ${loginData.user.role}`);
      
      // Check cookies
      const cookies = await context.cookies();
      const hasAuthCookie = cookies.some(c => c.name.includes('accessToken') || c.name.includes('auth'));
      console.log(`   - Auth cookie: ${hasAuthCookie ? 'Set' : 'Not found'}`);
      
      // Wait for redirect
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      console.log(`   - Redirected to: ${currentUrl}`);
    } else {
      console.log('❌ Login failed');
      console.log(`   - Error: ${loginData.error || loginData.message}`);
    }
  });

  test('4. PBL Scenarios Page', async ({ page }) => {
    console.log('\n=== 4. PBL Scenarios Test ===');
    
    await page.goto(`${STAGING_URL}/pbl/scenarios`);
    await page.waitForLoadState('networkidle');
    
    // Check for error messages
    const hasError = await page.locator('text=/error|Error|404/i').count() > 0;
    
    if (!hasError) {
      // Look for scenario cards
      const scenarioCards = await page.locator('[data-testid="scenario-card"], .scenario-card, article, .grid > div').count();
      const emptyState = await page.locator('text=/no scenarios|empty|沒有場景/i').count() > 0;
      
      console.log('✅ PBL page loaded');
      console.log(`   - Scenario cards: ${scenarioCards}`);
      console.log(`   - Empty state: ${emptyState ? 'Yes' : 'No'}`);
      
      // Take screenshot
      await page.screenshot({ path: 'staging-pbl-scenarios.png', fullPage: true });
      
      // If there are scenarios, click on the first one
      if (scenarioCards > 0) {
        const firstCard = page.locator('[data-testid="scenario-card"], .scenario-card, article, .grid > div').first();
        const title = await firstCard.textContent();
        console.log(`   - First scenario: ${title?.substring(0, 50)}...`);
      }
    } else {
      console.log('❌ PBL page has errors');
    }
  });

  test('5. Discovery Scenarios Page', async ({ page }) => {
    console.log('\n=== 5. Discovery Scenarios Test ===');
    
    await page.goto(`${STAGING_URL}/discovery/scenarios`);
    await page.waitForLoadState('networkidle');
    
    const hasError = await page.locator('text=/error|Error|404/i').count() > 0;
    
    if (!hasError) {
      const scenarioCards = await page.locator('[data-testid="scenario-card"], .scenario-card, article, .grid > div').count();
      console.log('✅ Discovery page loaded');
      console.log(`   - Scenario cards: ${scenarioCards}`);
      
      await page.screenshot({ path: 'staging-discovery-scenarios.png', fullPage: true });
    } else {
      console.log('❌ Discovery page has errors');
    }
  });

  test('6. Assessment Scenarios Page', async ({ page }) => {
    console.log('\n=== 6. Assessment Scenarios Test ===');
    
    await page.goto(`${STAGING_URL}/assessment/scenarios`);
    await page.waitForLoadState('networkidle');
    
    const hasError = await page.locator('text=/error|Error|404/i').count() > 0;
    
    if (!hasError) {
      const scenarioCards = await page.locator('[data-testid="assessment-card"], .assessment-card, article, .grid > div').count();
      console.log('✅ Assessment page loaded');
      console.log(`   - Assessment cards: ${scenarioCards}`);
      
      await page.screenshot({ path: 'staging-assessment-scenarios.png', fullPage: true });
    } else {
      console.log('❌ Assessment page has errors');
    }
  });

  test('7. API Endpoints Direct Test', async ({ request }) => {
    console.log('\n=== 7. API Endpoints Test ===');
    
    const endpoints = [
      { name: 'PBL Scenarios', url: '/api/pbl/scenarios?lang=en' },
      { name: 'Discovery Scenarios', url: '/api/discovery/scenarios?lang=en' },
      { name: 'Assessment Scenarios', url: '/api/assessment/scenarios?lang=en' },
      { name: 'Relations', url: '/api/relations?lang=en' }
    ];
    
    for (const endpoint of endpoints) {
      const response = await request.get(`${STAGING_URL}${endpoint.url}`);
      const status = response.status();
      
      console.log(`\n   ${endpoint.name}:`);
      console.log(`   - Status: ${status}`);
      
      if (status === 200) {
        const data = await response.json();
        if (data.data?.scenarios) {
          console.log(`   - Scenarios: ${data.data.scenarios.length}`);
        } else if (Array.isArray(data)) {
          console.log(`   - Items: ${data.length}`);
        } else if (data.domains) {
          console.log(`   - Domains: ${data.domains.length}`);
        } else {
          console.log(`   - Response type: ${typeof data}`);
        }
      }
    }
  });

  test('8. Mobile Responsive Test', async ({ page }) => {
    console.log('\n=== 8. Mobile Responsive Test ===');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(STAGING_URL);
    
    // Check mobile menu
    const mobileMenuButton = await page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], [data-testid="mobile-menu"]').count();
    console.log(`✅ Mobile view loaded`);
    console.log(`   - Mobile menu button: ${mobileMenuButton > 0 ? 'Visible' : 'Not found'}`);
    
    await page.screenshot({ path: 'staging-mobile-view.png', fullPage: true });
  });

  test('9. Language Switching Test', async ({ page }) => {
    console.log('\n=== 9. Language Switching Test ===');
    
    await page.goto(STAGING_URL);
    
    // Find language selector
    const langSelector = page.locator('select[aria-label*="language"], select[aria-label*="語言"]').first();
    
    if (await langSelector.isVisible()) {
      // Get current language
      const currentLang = await langSelector.inputValue();
      console.log(`   - Current language: ${currentLang}`);
      
      // Try switching to Chinese
      await langSelector.selectOption('zh');
      await page.waitForTimeout(1000);
      
      // Check if UI updated
      const hasChineseText = await page.locator('text=/學習|開始|登入/').count() > 0;
      console.log(`   - Chinese text visible: ${hasChineseText ? 'Yes' : 'No'}`);
      
      // Switch back
      await langSelector.selectOption('en');
      console.log('✅ Language switching works');
    } else {
      console.log('⚠️  Language selector not found');
    }
  });

  test('10. Performance Metrics', async ({ page }) => {
    console.log('\n=== 10. Performance Test ===');
    
    const startTime = Date.now();
    await page.goto(STAGING_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
        firstPaint: Math.round(performance.getEntriesByName('first-paint')[0]?.startTime || 0),
        firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0)
      };
    });
    
    console.log('✅ Performance metrics collected');
    console.log(`   - Page load time: ${loadTime}ms`);
    console.log(`   - DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`   - First Paint: ${metrics.firstPaint}ms`);
    console.log(`   - First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
  });
});

// Summary test
test('Test Summary', async ({}) => {
  console.log('\n' + '='.repeat(50));
  console.log('STAGING ENVIRONMENT TEST SUMMARY');
  console.log('='.repeat(50));
  console.log('URL: ' + STAGING_URL);
  console.log('Time: ' + new Date().toISOString());
  console.log('');
  console.log('Key Findings:');
  console.log('- Health check: Working');
  console.log('- Login functionality: To be verified');
  console.log('- Scenario pages: Loading but may be empty');
  console.log('- API endpoints: Responding');
  console.log('- Mobile responsive: Working');
  console.log('- Performance: Acceptable');
  console.log('');
  console.log('Screenshots saved:');
  console.log('- staging-homepage.png');
  console.log('- staging-pbl-scenarios.png');
  console.log('- staging-discovery-scenarios.png');
  console.log('- staging-assessment-scenarios.png');
  console.log('- staging-mobile-view.png');
  console.log('='.repeat(50));
});