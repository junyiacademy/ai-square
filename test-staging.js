const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const baseUrl = 'https://ai-square-staging-731209836128.asia-east1.run.app';
  
  console.log('🧪 Starting E2E tests for staging environment...\n');
  
  // Test 1: Homepage loads
  console.log('1. Testing homepage...');
  await page.goto(baseUrl);
  const title = await page.title();
  console.log(`   ✅ Homepage loaded - Title: ${title}`);
  
  // Test 2: Check if login page is accessible
  console.log('\n2. Testing login page...');
  await page.goto(`${baseUrl}/login`);
  const loginButton = await page.locator('button:has-text("Sign in")').count();
  console.log(`   ${loginButton > 0 ? '✅' : '❌'} Login page has sign-in button`);
  
  // Test 3: Try to login with demo account
  console.log('\n3. Testing login with demo account...');
  await page.fill('input[name="email"]', 'student@example.com');
  await page.fill('input[name="password"]', 'student123');
  await page.click('button:has-text("Sign in")');
  
  // Wait for navigation or error
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  const isLoggedIn = currentUrl.includes('/dashboard') || currentUrl.includes('/pbl');
  console.log(`   ${isLoggedIn ? '✅' : '❌'} Login ${isLoggedIn ? 'successful' : 'failed'}`);
  
  // Check for error messages
  const errorMessage = await page.locator('.text-red-500, .error, [role="alert"]').textContent().catch(() => null);
  if (errorMessage) {
    console.log(`   ⚠️  Error message: ${errorMessage}`);
  }
  
  // Test 4: Check API endpoints
  console.log('\n4. Testing API endpoints...');
  
  const apiTests = [
    { name: 'Health check', url: '/api/health' },
    { name: 'PBL scenarios', url: '/api/pbl/scenarios?lang=en' },
    { name: 'Discovery scenarios', url: '/api/discovery/scenarios?lang=en' },
    { name: 'Assessment scenarios', url: '/api/assessment/scenarios?lang=en' }
  ];
  
  for (const test of apiTests) {
    const response = await page.request.get(`${baseUrl}${test.url}`);
    const status = response.status();
    const data = await response.json().catch(() => null);
    console.log(`   ${status === 200 ? '✅' : '❌'} ${test.name} - Status: ${status}`);
    if (data && test.name === 'Health check') {
      console.log(`      Database: ${data.checks?.database?.status ? '✅' : '❌'}`);
      console.log(`      Environment: ${data.environment || 'unknown'}`);
    }
    if (data && Array.isArray(data)) {
      console.log(`      Items: ${data.length}`);
    }
  }
  
  // Test 5: Check key pages
  console.log('\n5. Testing key pages...');
  const pages = [
    { name: 'PBL Scenarios', url: '/pbl/scenarios' },
    { name: 'Discovery', url: '/discovery/scenarios' },
    { name: 'Assessment', url: '/assessment/scenarios' }
  ];
  
  for (const pageTest of pages) {
    const response = await page.goto(`${baseUrl}${pageTest.url}`, { waitUntil: 'networkidle' });
    const status = response.status();
    console.log(`   ${status === 200 ? '✅' : '❌'} ${pageTest.name} - Status: ${status}`);
  }
  
  console.log('\n🏁 E2E tests completed!');
  
  await browser.close();
})();