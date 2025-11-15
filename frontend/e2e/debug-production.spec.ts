import { test, expect } from '@playwright/test';

test('Debug Production Discovery', async ({ page }) => {
  const URL = 'https://ai-square-frontend-m7s4ucbgba-de.a.run.app';

  // 1. Login
  await page.goto(`${URL}/login`);
  await page.fill('#email', 'student123@aisquare.com');
  await page.fill('#password', 'Demo123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // 2. Go to Discovery
  await page.goto(`${URL}/discovery/scenarios`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // 3. Debug: log the scenario data
  const scenarioData = await page.evaluate(() => {
    // Try to access React state or props
    const cards = document.querySelectorAll('[data-testid="scenario-card"]');
    const data = [];
    cards.forEach(card => {
      const title = card.querySelector('h3')?.textContent;
      // Try to get the data attributes or React props
      data.push({
        title,
        html: card.innerHTML.substring(0, 200)
      });
    });
    return data;
  });

  console.log('\nAll scenarios found:', scenarioData.length);
  scenarioData.forEach(s => console.log(`- ${s.title}`));

  // 4. Check filter buttons
  const filterButtons = await page.locator('button').allTextContents();
  const categoryButtons = filterButtons.filter(text =>
    ['創意', '技術', '商業', '科學', '全部'].includes(text.trim())
  );
  console.log('\nFilter buttons found:', categoryButtons);

  // 5. Test clicking a filter
  const techButton = page.locator('button:has-text("技術")').first();
  if (await techButton.isVisible()) {
    console.log('\nClicking 技術 filter...');
    await techButton.click();
    await page.waitForTimeout(2000);

    const afterClick = await page.locator('[data-testid="scenario-card"]').count();
    console.log(`After clicking 技術: ${afterClick} scenarios`);

    // Get the actual filter state
    const filterState = await page.evaluate(() => {
      // Check URL or any visible indicators
      const url = window.location.href;
      const selectedButton = document.querySelector('button[class*="bg-blue"]');
      return {
        url,
        selectedText: selectedButton?.textContent
      };
    });
    console.log('Filter state:', filterState);
  }

  // 6. Make API call directly from browser
  const apiData = await page.evaluate(async () => {
    const response = await fetch('/api/discovery/scenarios?lang=zh');
    const data = await response.json();
    return data.data?.scenarios?.map(s => ({
      title: s.title,
      category: s.discoveryData?.category || s.discovery_data?.category
    }));
  });

  console.log('\nAPI data categories:');
  const categoryCounts = {};
  apiData?.forEach(s => {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    console.log(`  ${s.title}: ${s.category}`);
  });
  console.log('\nCategory counts:', categoryCounts);
});
