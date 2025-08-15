const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🔍 Testing Production Login...\n');
  
  // Test data
  const accounts = [
    { email: 'student@example.com', password: 'student123', name: 'Student' },
    { email: 'teacher@example.com', password: 'teacher123', name: 'Teacher' },
    { email: 'admin@example.com', password: 'admin123', name: 'Admin' }
  ];
  
  const productionUrl = 'https://ai-square-frontend-m7s4ucbgba-de.a.run.app';
  
  for (const account of accounts) {
    console.log(`Testing ${account.name} account...`);
    
    try {
      // Navigate to login page
      await page.goto(`${productionUrl}/login`);
      await page.waitForLoadState('networkidle');
      
      // Check if page loaded
      const title = await page.title();
      console.log(`  ✓ Page loaded: ${title}`);
      
      // Fill in login form
      await page.fill('input[name="email"], input[type="email"]', account.email);
      await page.fill('input[name="password"], input[type="password"]', account.password);
      
      // Take screenshot before login
      await page.screenshot({ 
        path: `login-${account.name.toLowerCase()}-before.png`,
        fullPage: true 
      });
      
      // Click login button
      await page.click('button[type="submit"], button:has-text("登入"), button:has-text("Login"), button:has-text("Sign in")');
      
      // Wait for navigation or error
      await page.waitForTimeout(3000);
      
      // Check current URL
      const currentUrl = page.url();
      console.log(`  Current URL: ${currentUrl}`);
      
      // Check for error messages
      const errorElement = await page.$('text=/error|fail|錯誤|失敗/i');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        console.log(`  ❌ Error found: ${errorText}`);
      }
      
      // Check for success indicators
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/home') || !currentUrl.includes('/login')) {
        console.log(`  ✅ Login successful! Redirected to: ${currentUrl}`);
      } else {
        console.log(`  ❌ Login failed - still on login page`);
      }
      
      // Take screenshot after login attempt
      await page.screenshot({ 
        path: `login-${account.name.toLowerCase()}-after.png`,
        fullPage: true 
      });
      
      // Check for user info in page
      const userInfo = await page.$('text=/@example.com/');
      if (userInfo) {
        console.log(`  ✓ User email found in page`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Test API directly
  console.log('Testing API directly...\n');
  
  for (const account of accounts) {
    const response = await page.evaluate(async ({ email, password, url }) => {
      const res = await fetch(`${url}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await res.json();
    }, { 
      email: account.email, 
      password: account.password,
      url: productionUrl 
    });
    
    console.log(`${account.name} API response:`, response);
  }
  
  await browser.close();
})();