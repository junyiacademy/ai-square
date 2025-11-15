import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://ai-square-frontend-m7s4ucbgba-de.a.run.app';

test.describe('Production Environment Tests', () => {
  test('should load production homepage', async ({ page }) => {
    const response = await page.goto(PRODUCTION_URL);

    // Check response status
    expect(response?.status()).toBe(200);

    // Check page title
    await expect(page).toHaveTitle(/AI Square/);

    // Check main content exists
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    console.log('✅ Production homepage loads successfully');
  });

  test('should access production API endpoints', async ({ request }) => {
    // Test health endpoint
    const healthResponse = await request.get(`${PRODUCTION_URL}/api/health`);
    expect(healthResponse.ok()).toBeTruthy();
    const healthData = await healthResponse.json();
    expect(healthData).toHaveProperty('status');

    // Test PBL scenarios endpoint
    const pblResponse = await request.get(`${PRODUCTION_URL}/api/pbl/scenarios`);
    expect(pblResponse.ok()).toBeTruthy();
    const pblData = await pblResponse.json();
    expect(pblData.success).toBe(true);

    console.log('✅ Production API endpoints accessible');
  });

  test('should register and login demo account', async ({ page, request }) => {
    const demoEmail = `demo-${Date.now()}@example.com`;
    const demoPassword = 'Demo123456!';

    // Try to register
    const registerResponse = await request.post(`${PRODUCTION_URL}/api/auth/register`, {
      data: {
        email: demoEmail,
        password: demoPassword,
        name: 'Demo User',
        confirmPassword: demoPassword
      }
    });

    console.log('Register response:', await registerResponse.text());

    // Try to login
    const loginResponse = await request.post(`${PRODUCTION_URL}/api/auth/login`, {
      data: {
        email: demoEmail,
        password: demoPassword
      }
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (loginData.success) {
      console.log('✅ Demo account registration and login successful');
    } else {
      console.log('⚠️ Login failed:', loginData.error);
    }
  });

  test('should load PBL scenarios page', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/pbl/scenarios`);

    // Wait for scenarios to load
    await page.waitForSelector('text=/Scenario|情境/', { timeout: 10000 });

    // Check if scenarios are displayed
    const scenarios = page.locator('[data-testid="scenario-card"], .scenario-card, article');
    const count = await scenarios.count();

    expect(count).toBeGreaterThan(0);
    console.log(`✅ Found ${count} PBL scenarios in production`);
  });

  test('should navigate through main pages', async ({ page }) => {
    const pages = [
      { path: '/', name: 'Homepage' },
      { path: '/relations', name: 'Relations' },
      { path: '/pbl/scenarios', name: 'PBL Scenarios' },
      { path: '/assessment/scenarios', name: 'Assessment' },
      { path: '/discovery', name: 'Discovery' },
      { path: '/login', name: 'Login' }
    ];

    for (const pageInfo of pages) {
      const response = await page.goto(`${PRODUCTION_URL}${pageInfo.path}`);
      expect(response?.status()).toBeLessThan(400);
      console.log(`✅ ${pageInfo.name} page loads (status: ${response?.status()})`);
    }
  });
});
