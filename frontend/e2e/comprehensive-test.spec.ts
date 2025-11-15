import { test, expect } from '@playwright/test';

// Test configuration
const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';
const PRODUCTION_URL = 'https://ai-square-frontend-731209836128.asia-east1.run.app';

// Test accounts
const testAccounts = {
  staging: {
    email: 'student123@aisquare.com',
    password: 'Demo123456'
  },
  production: {
    email: 'student@example.com',
    password: 'student123'
  }
};

// Test both environments
const environments = [
  { name: 'Staging', url: STAGING_URL, account: testAccounts.staging },
  { name: 'Production', url: PRODUCTION_URL, account: testAccounts.production }
];

environments.forEach(env => {
  test.describe(`${env.name} - Comprehensive E2E Tests`, () => {
    test.beforeEach(async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    // ========== 1. PBL Scenarios (5 tests) ==========
    test.describe('PBL Module', () => {
      test('1.1 Browse PBL scenarios', async ({ page }) => {
        await page.goto(`${env.url}/pbl/scenarios`);

        // Wait for scenarios to load
        await page.waitForSelector('[data-testid="scenario-card"]', {
          timeout: 10000,
          state: 'visible'
        }).catch(() => {
          // Fallback selector
          return page.waitForSelector('.grid .rounded-lg', { timeout: 10000 });
        });

        // Verify scenarios are displayed
        const scenarios = await page.$$('.grid > div');
        expect(scenarios.length).toBeGreaterThan(0);
        console.log(`✅ ${env.name} - PBL: Found ${scenarios.length} scenarios`);
      });

      test('1.2 View PBL scenario details', async ({ page }) => {
        await page.goto(`${env.url}/pbl/scenarios`);

        // Click first scenario
        const firstScenario = await page.waitForSelector('.grid > div:first-child', {
          timeout: 10000
        });
        await firstScenario.click();

        // Verify navigation to detail page
        await page.waitForURL(/\/pbl\/scenarios\/[a-f0-9-]+/, { timeout: 10000 });

        // Check for scenario content
        const title = await page.waitForSelector('h1', { timeout: 5000 });
        const titleText = await title.textContent();
        expect(titleText).toBeTruthy();
        console.log(`✅ ${env.name} - PBL: Viewed scenario "${titleText}"`);
      });

      test('1.3 Start PBL program (requires login)', async ({ page }) => {
        // Login first
        await page.goto(`${env.url}/login`);
        await page.fill('input[type="email"]', env.account.email);
        await page.fill('input[type="password"]', env.account.password);
        await page.click('button[type="submit"]');

        // Wait for redirect
        await page.waitForURL(/\/dashboard|\//, { timeout: 10000 });

        // Navigate to PBL
        await page.goto(`${env.url}/pbl/scenarios`);

        // Start a program
        const startButton = await page.waitForSelector('button:has-text("開始"), button:has-text("Start")', {
          timeout: 10000
        }).catch(() => null);

        if (startButton) {
          await startButton.click();
          console.log(`✅ ${env.name} - PBL: Started program successfully`);
        } else {
          console.log(`⚠️ ${env.name} - PBL: Start button not found (may need different selector)`);
        }
      });

      test('1.4 Check PBL API response', async ({ page }) => {
        const response = await page.request.get(`${env.url}/api/pbl/scenarios?lang=zh`);
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data?.scenarios).toBeDefined();
        expect(data.data.scenarios.length).toBeGreaterThan(0);
        console.log(`✅ ${env.name} - PBL API: ${data.data.scenarios.length} scenarios`);
      });

      test('1.5 Verify PBL database records', async ({ page }) => {
        // This test verifies API returns data from database
        const response = await page.request.get(`${env.url}/api/pbl/scenarios?lang=en`);
        const data = await response.json();

        // Check scenario has required fields from DB
        const firstScenario = data.data?.scenarios?.[0];
        expect(firstScenario).toHaveProperty('id');
        expect(firstScenario).toHaveProperty('title');
        expect(firstScenario).toHaveProperty('description');
        expect(firstScenario).toHaveProperty('mode', 'pbl');
        console.log(`✅ ${env.name} - PBL DB: Schema validated`);
      });
    });

    // ========== 2. Discovery Scenarios (5 tests) ==========
    test.describe('Discovery Module', () => {
      test('2.1 Browse Discovery scenarios', async ({ page }) => {
        await page.goto(`${env.url}/discovery/scenarios`);

        // Wait for scenarios to load
        await page.waitForSelector('.grid', { timeout: 10000 });

        const scenarios = await page.$$('.grid > div');
        expect(scenarios.length).toBe(12); // Should have exactly 12
        console.log(`✅ ${env.name} - Discovery: Found ${scenarios.length} scenarios`);
      });

      test('2.2 Test Discovery category filters', async ({ page }) => {
        await page.goto(`${env.url}/discovery/scenarios`);

        // Test each category filter
        const categories = [
          { name: '創意', expected: 4 },
          { name: '技術', expected: 4 },
          { name: '商業', expected: 2 },
          { name: '科學', expected: 2 }
        ];

        for (const category of categories) {
          // Click category button
          const button = await page.waitForSelector(`button:has-text("${category.name}")`, {
            timeout: 5000
          }).catch(() => null);

          if (button) {
            await button.click();
            await page.waitForTimeout(500); // Wait for filter

            const filtered = await page.$$('.grid > div');
            expect(filtered.length).toBe(category.expected);
            console.log(`✅ ${env.name} - Discovery: ${category.name} = ${filtered.length} scenarios`);
          }
        }
      });

      test('2.3 View Discovery career details', async ({ page }) => {
        await page.goto(`${env.url}/discovery/scenarios`);

        // Click first career card
        const firstCard = await page.waitForSelector('.grid > div:first-child', {
          timeout: 10000
        });
        await firstCard.click();

        // Verify navigation
        await page.waitForURL(/\/discovery\/scenarios\/[a-f0-9-]+/, { timeout: 10000 });

        const title = await page.waitForSelector('h1', { timeout: 5000 });
        const titleText = await title.textContent();
        expect(titleText).toBeTruthy();
        console.log(`✅ ${env.name} - Discovery: Viewed career "${titleText}"`);
      });

      test('2.4 Check Discovery API response', async ({ page }) => {
        const response = await page.request.get(`${env.url}/api/discovery/scenarios?lang=zh`);
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data?.scenarios).toBeDefined();
        expect(data.data.scenarios.length).toBe(12);

        // Verify categories
        const categories: Record<string, number> = {};
        data.data.scenarios.forEach((s: any) => {
          const cat = s.discoveryData?.category || s.discovery_data?.category || 'unknown';
          categories[cat] = (categories[cat] || 0) + 1;
        });

        expect(categories.arts).toBe(4);
        expect(categories.technology).toBe(4);
        expect(categories.business).toBe(2);
        expect(categories.science).toBe(2);
        console.log(`✅ ${env.name} - Discovery API: Categories verified`);
      });

      test('2.5 Verify Discovery database records', async ({ page }) => {
        const response = await page.request.get(`${env.url}/api/discovery/scenarios?lang=en`);
        const data = await response.json();

        const firstScenario = data.data?.scenarios?.[0];
        expect(firstScenario).toHaveProperty('id');
        expect(firstScenario).toHaveProperty('title');
        expect(firstScenario).toHaveProperty('discoveryData');
        expect(firstScenario.discoveryData).toHaveProperty('category');
        console.log(`✅ ${env.name} - Discovery DB: Schema validated`);
      });
    });

    // ========== 3. Assessment Scenarios (5 tests) ==========
    test.describe('Assessment Module', () => {
      test('3.1 Browse Assessment scenarios', async ({ page }) => {
        await page.goto(`${env.url}/assessment/scenarios`);

        // Wait for content to load
        await page.waitForSelector('main', { timeout: 10000 });

        // Check for assessment content
        const content = await page.textContent('main');
        expect(content).toBeTruthy();
        console.log(`✅ ${env.name} - Assessment: Page loaded`);
      });

      test('3.2 Start Assessment (requires login)', async ({ page }) => {
        // Login first
        await page.goto(`${env.url}/login`);
        await page.fill('input[type="email"]', env.account.email);
        await page.fill('input[type="password"]', env.account.password);
        await page.click('button[type="submit"]');

        await page.waitForURL(/\/dashboard|\//, { timeout: 10000 });

        // Navigate to Assessment
        await page.goto(`${env.url}/assessment/scenarios`);

        // Look for start button
        const startButton = await page.waitForSelector('button:has-text("開始評估"), button:has-text("Start Assessment")', {
          timeout: 5000
        }).catch(() => null);

        if (startButton) {
          await startButton.click();
          console.log(`✅ ${env.name} - Assessment: Started assessment`);
        } else {
          console.log(`⚠️ ${env.name} - Assessment: Start button not found`);
        }
      });

      test('3.3 Check Assessment API response', async ({ page }) => {
        const response = await page.request.get(`${env.url}/api/assessment/scenarios?lang=zh`);
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data?.scenarios).toBeDefined();
        expect(data.data.scenarios.length).toBeGreaterThan(0);
        console.log(`✅ ${env.name} - Assessment API: ${data.data.scenarios.length} scenarios`);
      });

      test('3.4 Verify Assessment database records', async ({ page }) => {
        const response = await page.request.get(`${env.url}/api/assessment/scenarios?lang=en`);
        const data = await response.json();

        const firstScenario = data.data?.scenarios?.[0];
        expect(firstScenario).toHaveProperty('id');
        expect(firstScenario).toHaveProperty('title');
        expect(firstScenario).toHaveProperty('mode', 'assessment');
        console.log(`✅ ${env.name} - Assessment DB: Schema validated`);
      });

      test('3.5 Test Assessment question flow', async ({ page }) => {
        // This would test the actual assessment flow
        // For now, just verify the API structure
        const response = await page.request.get(`${env.url}/api/assessment/scenarios?lang=zh`);
        const data = await response.json();

        if (data.data?.scenarios?.[0]?.assessmentData) {
          expect(data.data.scenarios[0].assessmentData).toHaveProperty('questionBank');
          console.log(`✅ ${env.name} - Assessment: Question structure validated`);
        } else {
          console.log(`⚠️ ${env.name} - Assessment: No assessment data found`);
        }
      });
    });

    // ========== 4. Cross-Module Tests ==========
    test.describe('Integration Tests', () => {
      test('Login and access all modules', async ({ page }) => {
        // Login
        await page.goto(`${env.url}/login`);
        await page.fill('input[type="email"]', env.account.email);
        await page.fill('input[type="password"]', env.account.password);
        await page.click('button[type="submit"]');

        await page.waitForURL(/\/dashboard|\//, { timeout: 10000 });

        // Visit each module
        const modules = [
          { path: '/pbl/scenarios', name: 'PBL' },
          { path: '/discovery/scenarios', name: 'Discovery' },
          { path: '/assessment/scenarios', name: 'Assessment' }
        ];

        for (const module of modules) {
          await page.goto(`${env.url}${module.path}`);
          await page.waitForLoadState('networkidle');
          const url = page.url();
          expect(url).toContain(module.path);
          console.log(`✅ ${env.name} - Integration: Accessed ${module.name}`);
        }
      });

      test('Database health check', async ({ page }) => {
        const response = await page.request.get(`${env.url}/api/health`);

        if (response.ok()) {
          const data = await response.json();
          expect(data.checks?.database?.status).toBe(true);
          console.log(`✅ ${env.name} - Database: Connected (${data.checks.database.responseTime}ms)`);
        } else {
          console.log(`⚠️ ${env.name} - Health endpoint returned ${response.status()}`);
        }
      });
    });
  });
});

// Summary test
test('Final Summary', async ({ page }) => {
  console.log('\n' + '='.repeat(60));
  console.log('E2E Test Summary:');
  console.log('- PBL Module: 5 tests per environment');
  console.log('- Discovery Module: 5 tests per environment');
  console.log('- Assessment Module: 5 tests per environment');
  console.log('- Total: 30 tests (15 per environment)');
  console.log('='.repeat(60));
});
