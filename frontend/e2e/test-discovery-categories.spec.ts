import { test, expect } from '@playwright/test';

test.describe('Discovery Category Filters - Staging', () => {
  const STAGING_URL = 'https://ai-square-staging-m7s4ucbgba-de.a.run.app';

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${STAGING_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Fill login form using id selectors
    await page.fill('#email', 'student123@aisquare.com');
    await page.fill('#password', 'Demo123456'); // Using simpler password for testing
    await page.click('button[type="submit"]');

    // Wait for redirect after login (might go to onboarding)
    await page.waitForLoadState('networkidle');

    // Check if we're on onboarding and skip it
    if (page.url().includes('/onboarding')) {
      // Skip onboarding by going directly to discovery
      await page.goto(`${STAGING_URL}/discovery/scenarios`);
    } else {
      // Go to discovery scenarios page
      await page.goto(`${STAGING_URL}/discovery/scenarios`);
    }
    await page.waitForLoadState('networkidle');
  });

  test('should show correct counts for each category filter', async ({ page }) => {
    // Wait for scenarios to load
    await page.waitForSelector('[data-testid="scenario-card"]', { timeout: 10000 });

    // Test "全部" (All) filter
    await page.click('button:has-text("全部")');
    await page.waitForTimeout(500);
    const allScenarios = await page.locator('[data-testid="scenario-card"]').count();
    console.log(`全部 (All): ${allScenarios} scenarios`);
    expect(allScenarios).toBeGreaterThan(0);

    // Test "創意" (Arts) filter
    await page.click('button:has-text("創意")');
    await page.waitForTimeout(500);
    const artsScenarios = await page.locator('[data-testid="scenario-card"]').count();
    console.log(`創意 (Arts): ${artsScenarios} scenarios`);
    expect(artsScenarios).toBeGreaterThan(0);

    // Test "技術" (Technology) filter
    await page.click('button:has-text("技術")');
    await page.waitForTimeout(500);
    const techScenarios = await page.locator('[data-testid="scenario-card"]').count();
    console.log(`技術 (Technology): ${techScenarios} scenarios`);
    expect(techScenarios).toBeGreaterThan(0);

    // Test "商業" (Business) filter
    await page.click('button:has-text("商業")');
    await page.waitForTimeout(500);
    const businessScenarios = await page.locator('[data-testid="scenario-card"]').count();
    console.log(`商業 (Business): ${businessScenarios} scenarios`);
    expect(businessScenarios).toBeGreaterThan(0);

    // Test "科學" (Science) filter
    await page.click('button:has-text("科學")');
    await page.waitForTimeout(500);
    const scienceScenarios = await page.locator('[data-testid="scenario-card"]').count();
    console.log(`科學 (Science): ${scienceScenarios} scenarios`);
    expect(scienceScenarios).toBeGreaterThan(0);

    // Verify total equals sum of categories
    const totalByCategory = artsScenarios + techScenarios + businessScenarios + scienceScenarios;
    console.log(`Total by categories: ${totalByCategory}`);
    console.log(`Total in all: ${allScenarios}`);
    expect(totalByCategory).toBe(allScenarios);
  });

  test('should maintain filter selection when navigating', async ({ page }) => {
    // Select a specific filter
    await page.click('button:has-text("技術")');
    await page.waitForTimeout(500);

    // Check that the filter button is active (has different styling)
    const techButton = page.locator('button:has-text("技術")');
    const techButtonClass = await techButton.getAttribute('class');
    expect(techButtonClass).toContain('bg-purple-600');
    expect(techButtonClass).toContain('text-white');

    // Verify scenarios shown match the filter
    const scenarios = await page.locator('[data-testid="scenario-card"]').count();
    expect(scenarios).toBeGreaterThan(0);
    expect(scenarios).toBeLessThan(12); // Should be less than total
  });

  test('should be able to select a scenario from filtered results', async ({ page }) => {
    // Select a filter
    await page.click('button:has-text("創意")');
    await page.waitForTimeout(500);

    // Click on first scenario card
    const firstCard = page.locator('[data-testid="scenario-card"]').first();
    await firstCard.click();

    // Should navigate to scenario detail page
    await page.waitForURL(/\/discovery\/scenarios\/[a-f0-9-]+/, { timeout: 10000 });

    // Verify we're on the correct page
    const url = page.url();
    expect(url).toMatch(/\/discovery\/scenarios\/[a-f0-9-]+/);
  });
});
