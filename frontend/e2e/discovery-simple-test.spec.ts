/**
 * Discovery 簡單測試 - 檢查實際頁面內容
 */

import { test, expect } from '@playwright/test';

test.describe('Discovery Simple Test', () => {
  test('Check Discovery My Adventures stats and skills', async ({ page }) => {
    // 1. 登入
    await page.goto('/login');
    await page.locator('button:has-text("Student")').click();
    await page.waitForURL(/\/(onboarding|discovery|assessment|dashboard)/, { timeout: 10000 });
    
    // 2. 前往 Discovery 頁面
    await page.goto('/discovery/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Set language to Traditional Chinese
    await page.evaluate(() => {
      localStorage.setItem('ai-square-language', 'zhTW');
    });
    
    // Reload page to apply language change
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check current language
    const currentLang = await page.evaluate(() => {
      return localStorage.getItem('ai-square-language');
    });
    console.log('Current language from localStorage:', currentLang);
    
    // 3. 檢查 All tab
    console.log('=== Checking All Tab ===');
    const allTab = page.locator('button:has-text("全部")').first();
    await expect(allTab).toBeVisible();
    
    // Check skills in All tab
    const allTabCards = page.locator('[data-testid="scenario-card"]');
    const allTabCardCount = await allTabCards.count();
    console.log('Cards in All tab:', allTabCardCount);
    
    if (allTabCardCount > 0) {
      const firstCard = allTabCards.first();
      const skills = await firstCard.locator('.bg-gray-100.text-gray-700').allTextContents();
      console.log('Skills in first card (All tab):', skills);
      
      // Check if skills are translated
      const hasChineseSkills = skills.some(skill => /[\u4e00-\u9fa5]/.test(skill));
      console.log('Has Chinese skills in All tab:', hasChineseSkills);
    }
    
    // 4. 檢查 My Adventures tab
    console.log('\n=== Checking My Adventures Tab ===');
    const myAdventuresTab = page.locator('button:has-text("我的冒險")');
    if (await myAdventuresTab.isVisible()) {
      await myAdventuresTab.click();
      await page.waitForLoadState('networkidle');
      
      // Wait a bit for data to load
      await page.waitForTimeout(2000);
      
      // Check for cards
      const myAdventureCards = page.locator('[data-testid="scenario-card"]');
      const myAdventureCardCount = await myAdventureCards.count();
      console.log('Cards in My Adventures tab:', myAdventureCardCount);
      
      if (myAdventureCardCount > 0) {
        const firstCard = myAdventureCards.first();
        
        // Check skills translation
        const skills = await firstCard.locator('.bg-gray-100.text-gray-700').allTextContents();
        console.log('Skills in first card (My Adventures):', skills);
        
        // Check stats section
        const statsSection = firstCard.locator('.bg-gray-50');
        const hasStats = await statsSection.isVisible();
        console.log('Has stats section:', hasStats);
        
        if (hasStats) {
          const statsText = await statsSection.textContent();
          console.log('Stats section content:', statsText);
          
          // Check specific stat values
          const totalAttemptsElement = statsSection.locator('text=總嘗試次數').locator('..');
          if (await totalAttemptsElement.isVisible()) {
            const totalAttemptsText = await totalAttemptsElement.textContent();
            console.log('Total attempts text:', totalAttemptsText);
            
            // Verify it contains a number
            const hasNumber = /\d+/.test(totalAttemptsText || '');
            expect(hasNumber).toBe(true);
          }
        }
        
        // Take screenshot of the card
        await firstCard.screenshot({ path: 'my-adventure-card.png' });
      } else {
        console.log('No cards found in My Adventures - checking empty state');
        const emptyStateText = await page.locator('text=還沒有開始任何學習歷程').isVisible();
        console.log('Shows empty state:', emptyStateText);
      }
    } else {
      console.log('My Adventures tab not visible - user might not be logged in properly');
    }
    
    // 5. Final screenshots
    await page.screenshot({ path: 'discovery-final.png', fullPage: true });
  });
});