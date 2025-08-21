const { chromium } = require('playwright');

async function debugLoginFlow() {
  console.log('🔍 Starting detailed login flow debug...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();

  // Capture all network requests
  const requests = [];
  const responses = [];
  
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData()
    });
    console.log(`📡 REQUEST: ${request.method()} ${request.url()}`);
  });
  
  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      headers: response.headers()
    });
    console.log(`📡 RESPONSE: ${response.status()} ${response.url()}`);
  });

  // Capture console logs from the page
  page.on('console', msg => {
    console.log(`🖥️  BROWSER CONSOLE: ${msg.text()}`);
  });

  try {
    const baseUrl = 'https://ai-square-staging-731209836128.asia-east1.run.app';
    
    // 1. Go to login page
    console.log('\n1️⃣ Navigating to login page...');
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState('networkidle');
    
    // 2. Fill and submit login form
    console.log('\n2️⃣ Filling login form...');
    await page.fill('input[name="email"], input[type="email"]', 'student@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'student123');
    
    console.log('3️⃣ Submitting login form...');
    
    // Wait for the login API call
    const loginResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/login'),
      { timeout: 10000 }
    );
    
    // Click submit
    await page.click('button[type="submit"]');
    
    try {
      const loginResponse = await loginResponsePromise;
      console.log(`📡 Login API Response: ${loginResponse.status()}`);
      
      const loginData = await loginResponse.json();
      console.log('📄 Login response data:', JSON.stringify(loginData, null, 2));
      
      // Check response headers for Set-Cookie
      const headers = loginResponse.headers();
      console.log('🍪 Response headers:');
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase().includes('cookie') || key.toLowerCase() === 'set-cookie') {
          console.log(`  ${key}: ${value}`);
        }
      });
      
    } catch (error) {
      console.log('❌ No login API response captured:', error.message);
      
      // Check if there are any network errors
      console.log('\n🔍 Recent network activity:');
      requests.slice(-5).forEach(req => {
        console.log(`  REQUEST: ${req.method} ${req.url}`);
        if (req.postData && req.url.includes('login')) {
          console.log(`  POST DATA: ${req.postData}`);
        }
      });
      
      responses.slice(-5).forEach(res => {
        console.log(`  RESPONSE: ${res.status} ${res.url}`);
      });
    }
    
    await page.waitForTimeout(2000);
    
    // 4. Check cookies after form submission
    console.log('\n4️⃣ Checking cookies after login attempt...');
    const cookies = await context.cookies();
    
    console.log(`Found ${cookies.length} cookies:`);
    cookies.forEach(cookie => {
      console.log(`  🍪 ${cookie.name}: ${cookie.value.substring(0, 50)}... (domain: ${cookie.domain}, path: ${cookie.path}, httpOnly: ${cookie.httpOnly})`);
    });
    
    const sessionToken = cookies.find(c => c.name === 'sessionToken');
    if (sessionToken) {
      console.log('✅ sessionToken found!');
    } else {
      console.log('❌ sessionToken NOT found');
    }
    
    // 5. Check current page state
    console.log('\n5️⃣ Checking page state...');
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check if still on login page or redirected
    if (currentUrl.includes('/login')) {
      console.log('❌ Still on login page');
      
      // Look for error messages
      const errorElement = await page.locator('[role="alert"], .bg-red-100, .text-red-700').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log(`🚨 Error message: ${errorText}`);
      }
      
      // Check form state
      const submitButton = await page.locator('button[type="submit"]').first();
      const buttonText = await submitButton.textContent();
      const isDisabled = await submitButton.isDisabled();
      console.log(`Submit button: "${buttonText}" (disabled: ${isDisabled})`);
      
    } else {
      console.log('✅ Redirected away from login page');
    }
    
    // 6. Try API auth check manually
    console.log('\n6️⃣ Testing API auth check manually...');
    try {
      const authResponse = await page.request.get(`${baseUrl}/api/auth/check`);
      const authData = await authResponse.json();
      console.log(`📡 Auth check response: ${authResponse.status()}`);
      console.log('📄 Auth check data:', JSON.stringify(authData, null, 2));
    } catch (error) {
      console.log('❌ Auth check failed:', error.message);
    }
    
    // 7. Try accessing protected route
    console.log('\n7️⃣ Testing protected route access...');
    await page.goto(`${baseUrl}/assessment/scenarios`);
    await page.waitForLoadState('networkidle');
    
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('/assessment/scenarios') && !finalUrl.includes('/login')) {
      console.log('✅ Successfully accessed protected route');
    } else {
      console.log('❌ Redirected back to login');
    }
    
    console.log('\n🏁 Debug complete. Browser will stay open for manual inspection...');
    
    // Keep browser open for 30 seconds for manual inspection
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

debugLoginFlow().catch(console.error);