import { test, expect } from '@playwright/test';

test.describe('Discovery My Adventures', () => {
  // Test user credentials
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!'
  };

  test.beforeEach(async ({ page }) => {
    // Login using demo account
    await page.goto('/login');
    
    // Click on Student demo account
    await page.click('button:has-text("Student")');
    
    // Wait for login to complete and redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Navigate to Discovery scenarios
    await page.goto('/discovery/scenarios');
    await page.waitForLoadState('networkidle');
  });

  test('should display stats correctly in My Adventures tab', async ({ page }) => {
    // Click on My Adventures tab
    await page.click('button:has-text("我的冒險")');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="scenario-card"], .text-gray-500:has-text("還沒有開始任何學習歷程")', { timeout: 10000 });
    
    // Check if there are any scenario cards
    const scenarioCards = page.locator('[data-testid="scenario-card"]');
    const cardCount = await scenarioCards.count();
    
    if (cardCount > 0) {
      // Find a card with stats
      const cardWithStats = scenarioCards.first();
      
      // Check if stats section exists
      const statsSection = cardWithStats.locator('.bg-gray-50');
      const hasStatsSection = await statsSection.isVisible().catch(() => false);
      
      if (hasStatsSection) {
        // Verify totalAttempts is displayed with a number
        const totalAttemptsText = await statsSection.locator('text=總嘗試次數').locator('..').textContent();
        expect(totalAttemptsText).toMatch(/總嘗試次數\s*\d+\s*次/);
        
        // If completed count exists, verify it's displayed
        const completedCountElement = statsSection.locator('text=完成次數');
        if (await completedCountElement.isVisible()) {
          const completedText = await completedCountElement.locator('..').textContent();
          expect(completedText).toMatch(/完成次數\s*\d+\s*次/);
        }
      }
    }
  });

  test('should display skills in Chinese when language is zhTW', async ({ page }) => {
    // Ensure we're in Traditional Chinese
    const htmlLang = await page.getAttribute('html', 'lang');
    if (htmlLang !== 'zhTW') {
      // Switch to Traditional Chinese if needed
      await page.click('button[aria-label="Language selector"]');
      await page.click('text=繁體中文');
      await page.waitForLoadState('networkidle');
    }
    
    // Go to All tab first
    await page.click('button:has-text("全部")');
    await page.waitForSelector('[data-testid="scenario-card"]', { timeout: 10000 });
    
    // Check skills in All tab
    const allTabSkills = await page.locator('[data-testid="scenario-card"]').first().locator('.bg-gray-100.text-gray-700').allTextContents();
    
    // Common English skills that should be translated
    const englishSkills = ['video_production', 'content_creation', 'audience_engagement', 'storytelling_arts', 'video_magic'];
    const chineseSkills = ['影片製作', '內容創作', '觀眾互動', '故事敘述藝術', '影片魔法'];
    
    // Check if any skills are translated
    let hasChineseSkills = false;
    for (const skill of allTabSkills) {
      if (chineseSkills.some(cn => skill.includes(cn))) {
        hasChineseSkills = true;
        break;
      }
    }
    
    // Now check My Adventures tab
    await page.click('button:has-text("我的冒險")');
    await page.waitForSelector('[data-testid="scenario-card"], .text-gray-500:has-text("還沒有開始任何學習歷程")', { timeout: 10000 });
    
    const myAdventureCards = page.locator('[data-testid="scenario-card"]');
    if (await myAdventureCards.count() > 0) {
      const myTabSkills = await myAdventureCards.first().locator('.bg-gray-100.text-gray-700').allTextContents();
      
      // Verify skills are in Chinese, not English
      for (const skill of myTabSkills) {
        // Should not contain English skill names
        for (const engSkill of englishSkills) {
          expect(skill).not.toBe(engSkill);
        }
      }
      
      // Should contain at least one Chinese skill
      let hasChineseInMyTab = false;
      for (const skill of myTabSkills) {
        if (chineseSkills.some(cn => skill.includes(cn))) {
          hasChineseInMyTab = true;
          break;
        }
      }
      
      if (myTabSkills.length > 0) {
        expect(hasChineseInMyTab).toBe(true);
      }
    }
  });

  test('should display consistent UI between All and My Adventures tabs', async ({ page }) => {
    // Get a scenario from All tab
    await page.click('button:has-text("全部")');
    await page.waitForSelector('[data-testid="scenario-card"]');
    
    // Take screenshot of first card in All tab
    const allTabCard = page.locator('[data-testid="scenario-card"]').first();
    const allTabTitle = await allTabCard.locator('h3').textContent();
    
    // Switch to My Adventures
    await page.click('button:has-text("我的冒險")');
    await page.waitForSelector('[data-testid="scenario-card"], .text-gray-500:has-text("還沒有開始任何學習歷程")', { timeout: 10000 });
    
    const myAdventureCards = page.locator('[data-testid="scenario-card"]');
    if (await myAdventureCards.count() > 0) {
      // Find the same scenario in My Adventures
      const matchingCard = myAdventureCards.filter({ hasText: allTabTitle || '' }).first();
      
      if (await matchingCard.isVisible()) {
        // Both should have the same gradient background class
        const allTabGradient = await allTabCard.locator('.bg-gradient-to-br').getAttribute('class');
        const myTabGradient = await matchingCard.locator('.bg-gradient-to-br').getAttribute('class');
        
        // Extract color classes (e.g., from-red-500 to-orange-500)
        const allTabColors = allTabGradient?.match(/from-\w+-\d+ to-\w+-\d+/)?.[0];
        const myTabColors = myTabGradient?.match(/from-\w+-\d+ to-\w+-\d+/)?.[0];
        
        expect(allTabColors).toBe(myTabColors);
      }
    }
  });
});