const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for visibility
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🔍 Opening Production Site...\n');
  
  const productionUrl = 'https://ai-square-frontend-m7s4ucbgba-de.a.run.app';
  
  // Go to homepage
  await page.goto(productionUrl);
  await page.waitForLoadState('networkidle');
  console.log('✓ Homepage loaded');
  
  // Check console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console error:', msg.text());
    }
  });
  
  // Navigate to login
  await page.goto(`${productionUrl}/login`);
  await page.waitForLoadState('networkidle');
  console.log('✓ Login page loaded');
  
  // Try to fill and submit form
  console.log('\nTrying to login with student@example.com...');
  
  // Check if form elements exist
  const emailInput = await page.$('input[type="email"], input[name="email"]');
  const passwordInput = await page.$('input[type="password"], input[name="password"]');
  const submitButton = await page.$('button[type="submit"]');
  
  if (emailInput && passwordInput && submitButton) {
    console.log('✓ Form elements found');
    
    // Fill form
    await page.fill('input[type="email"], input[name="email"]', 'student@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'student123');
    
    // Open network tab monitoring
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/login') || 
      response.url().includes('/api/auth/signin')
    );
    
    // Click submit
    console.log('Clicking submit button...');
    await submitButton.click();
    
    try {
      // Wait for API response
      const response = await responsePromise;
      const responseData = await response.json();
      console.log('\nAPI Response:', JSON.stringify(responseData, null, 2));
      console.log('Response status:', response.status());
    } catch (e) {
      console.log('No API response captured');
    }
    
    // Wait a bit for any redirect
    await page.waitForTimeout(3000);
    
    // Check final URL
    const finalUrl = page.url();
    console.log('\nFinal URL:', finalUrl);
    
    // Check for any error messages on page
    const errorText = await page.locator('text=/error|fail|錯誤|失敗|invalid|無效/i').first().textContent().catch(() => null);
    if (errorText) {
      console.log('Error message on page:', errorText);
    }
    
  } else {
    console.log('❌ Form elements not found!');
    console.log('Page content:', await page.content().then(c => c.substring(0, 500)));
  }
  
  console.log('\nPress Enter to close browser...');
  await new Promise(resolve => process.stdin.once('data', resolve));
  
  await browser.close();
})();