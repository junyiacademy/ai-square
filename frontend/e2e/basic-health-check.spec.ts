import { test, expect } from '@playwright/test';

test.describe('Basic Health Check', () => {
  test('should load homepage', async ({ page }) => {
    // Simple test - just check if page loads
    const response = await page.goto('http://localhost:3004');

    // Check response status
    expect(response?.status()).toBe(200);

    // Check page title exists
    await expect(page).toHaveTitle(/AI Square/);

    // Check main heading is visible
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    console.log('✅ Homepage loads successfully');
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('http://localhost:3004');

    // Check navigation links exist
    const navLinks = [
      { text: 'Assessment', href: '/assessment' },
      { text: 'PBL', href: '/pbl' },
      { text: 'Discovery', href: '/discovery' },
    ];

    for (const link of navLinks) {
      const navLink = page.locator(`nav a:has-text("${link.text}")`).first();

      // Check link is visible
      if (await navLink.isVisible()) {
        const href = await navLink.getAttribute('href');
        expect(href).toContain(link.href);
        console.log(`✅ Nav link "${link.text}" found`);
      }
    }
  });

  test('should load API health endpoint', async ({ page }) => {
    const response = await page.request.get('http://localhost:3004/api/health');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);

    console.log(`✅ Health API status: ${data.status}`);
  });
});
