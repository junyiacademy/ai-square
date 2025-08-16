import { test, expect } from '@playwright/test';

const LOCAL_URL = 'http://localhost:3000';

test.describe('Local Environment Testing', () => {
  test('1. Check health endpoint', async ({ page }) => {
    const response = await page.request.get(`${LOCAL_URL}/api/health`);
    console.log('Health status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('✅ Local Health:', data.status);
      console.log('  - Database:', data.checks.database.status ? '✅' : '❌', data.checks.database.error || '');
      console.log('  - Environment:', data.environment);
    }
  });

  test('2. Check PBL API', async ({ page }) => {
    const response = await page.request.get(`${LOCAL_URL}/api/pbl/scenarios?lang=zh`);
    const data = await response.json();
    console.log('✅ Local PBL API:', data.data?.scenarios?.length || 0, 'scenarios');
    
    // Check first scenario structure
    if (data.data?.scenarios?.[0]) {
      const scenario = data.data.scenarios[0];
      console.log('  First scenario:', {
        hasId: !!scenario.id,
        hasTitle: !!scenario.title,
        hasMode: scenario.mode,
        titleType: typeof scenario.title
      });
    }
  });

  test('3. Check Discovery API', async ({ page }) => {
    const response = await page.request.get(`${LOCAL_URL}/api/discovery/scenarios?lang=zh`);
    const data = await response.json();
    console.log('✅ Local Discovery API:', data.data?.scenarios?.length || 0, 'scenarios');
    
    if (data.data?.scenarios?.length > 0) {
      const categories = {};
      data.data.scenarios.forEach(s => {
        const cat = s.discoveryData?.category || s.discovery_data?.category || 'unknown';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      console.log('  Categories:', categories);
    }
  });

  test('4. Check Assessment API', async ({ page }) => {
    const response = await page.request.get(`${LOCAL_URL}/api/assessment/scenarios?lang=zh`);
    const data = await response.json();
    console.log('✅ Local Assessment API:', data.data?.scenarios?.length || 0, 'scenarios');
  });

  test('5. Browse PBL page', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/pbl/scenarios`);
    
    // Wait for any content
    await page.waitForTimeout(2000);
    
    // Check what's on the page
    const title = await page.title();
    console.log('Page title:', title);
    
    // Try different selectors
    const selectors = [
      '.grid > div',
      '[data-testid="scenario-card"]',
      '.rounded-lg',
      'main div',
      'button'
    ];
    
    for (const selector of selectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
      }
    }
    
    // Get page content
    const content = await page.textContent('body');
    if (content?.includes('No scenarios')) {
      console.log('⚠️ Page shows "No scenarios"');
    }
    if (content?.includes('Loading')) {
      console.log('⚠️ Page shows "Loading"');
    }
  });

  test('6. Browse Discovery page', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/discovery/scenarios`);
    
    await page.waitForTimeout(2000);
    
    // Check for filter buttons
    const filterButtons = await page.$$('button:has-text("創意"), button:has-text("技術")');
    console.log('Filter buttons found:', filterButtons.length);
    
    // Check for grid
    const grid = await page.$('.grid');
    if (grid) {
      const cards = await page.$$('.grid > div');
      console.log('Discovery cards found:', cards.length);
    } else {
      console.log('No grid found on Discovery page');
    }
  });

  test('7. Check database connection', async ({ page }) => {
    // Check if local database is configured
    const envCheck = await page.request.get(`${LOCAL_URL}/api/health`);
    const health = await envCheck.json();
    
    if (!health.checks.database.status) {
      console.log('❌ Local database not configured');
      console.log('To fix: Set DATABASE_URL in .env.local');
    } else {
      console.log('✅ Local database connected');
    }
  });

  test('8. Check for login page', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/login`);
    
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('button[type="submit"]');
    
    console.log('Login form elements:');
    console.log('  Email input:', emailInput ? '✅' : '❌');
    console.log('  Password input:', passwordInput ? '✅' : '❌');
    console.log('  Submit button:', submitButton ? '✅' : '❌');
  });

  test('9. Check static assets', async ({ page }) => {
    const imageUrl = `${LOCAL_URL}/images/career-paths/app_developer.jpg`;
    const response = await page.request.get(imageUrl);
    console.log('Static image status:', response.status(), response.status() === 200 ? '✅' : '❌');
  });

  test('10. API vs UI data mismatch', async ({ page }) => {
    // Get API data
    const apiResponse = await page.request.get(`${LOCAL_URL}/api/pbl/scenarios?lang=zh`);
    const apiData = await apiResponse.json();
    const apiCount = apiData.data?.scenarios?.length || 0;
    
    // Get UI data
    await page.goto(`${LOCAL_URL}/pbl/scenarios`);
    await page.waitForTimeout(3000);
    
    const uiCards = await page.$$('.grid > div');
    const uiCount = uiCards.length;
    
    console.log('Data comparison:');
    console.log('  API returns:', apiCount, 'scenarios');
    console.log('  UI displays:', uiCount, 'cards');
    
    if (apiCount !== uiCount) {
      console.log('⚠️ MISMATCH: API and UI show different counts!');
      
      // Check console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('Browser console error:', msg.text());
        }
      });
    }
  });
});