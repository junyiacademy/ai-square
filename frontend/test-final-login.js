const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 Final Production Login Test\n');
  
  // Monitor network
  page.on('response', response => {
    if (response.url().includes('/api/auth')) {
      console.log(`API: ${response.url()}`);
      console.log(`Status: ${response.status()}`);
    }
  });
  
  // Go to production
  await page.goto('https://ai-square-frontend-m7s4ucbgba-de.a.run.app/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  await page.fill('input[type="email"]', 'student@example.com');
  await page.fill('input[type="password"]', 'student123');
  
  // Take screenshot
  await page.screenshot({ path: 'production-login-attempt.png', fullPage: true });
  
  // Click login
  await page.click('button[type="submit"]');
  
  // Wait for response
  await page.waitForTimeout(5000);
  
  // Check URL
  const url = page.url();
  console.log('\nResult:');
  console.log('Current URL:', url);
  
  if (url.includes('dashboard') || url.includes('home') || !url.includes('login')) {
    console.log('✅ Login successful!');
  } else {
    console.log('❌ Login failed - still on login page');
    
    // Get error message
    const error = await page.locator('text=/error|錯誤/i').first().textContent().catch(() => null);
    if (error) {
      console.log('Error message:', error);
    }
  }
  
  // Try API directly from browser context
  console.log('\nTesting API from browser:');
  const apiResult = await page.evaluate(async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123'
      })
    });
    const data = await response.json();
    return { status: response.status, data };
  });
  
  console.log('API Response:', apiResult);
  
  await browser.close();
})();