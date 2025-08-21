const { chromium } = require('@playwright/test');

async function testStagingAuth() {
  console.log('🚀 Starting staging authentication investigation...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';
  
  try {
    // Step 1: Direct access to protected route
    console.log('📋 Step 1: Direct access to /assessment/scenarios...');
    const response1 = await page.goto(`${STAGING_URL}/assessment/scenarios`, { waitUntil: 'networkidle' });
    console.log(`Status: ${response1.status()}`);
    console.log(`URL after access: ${page.url()}`);
    
    const isRedirectedToLogin = page.url().includes('/login');
    console.log(`Redirected to login: ${isRedirectedToLogin}`);
    
    if (isRedirectedToLogin) {
      console.log('✅ Expected: Redirected to login for unauthenticated access');
      
      // Step 2: Fill and submit login form
      console.log('📋 Step 2: Attempting login...');
      
      await page.fill('input[type="email"]', 'student@example.com');
      await page.fill('input[type="password"]', 'student123');
      await page.click('button[type="submit"]');
      
      // Wait for response
      await page.waitForTimeout(3000);
      console.log(`URL after login attempt: ${page.url()}`);
      
      // Check cookies
      const cookies = await context.cookies();
      console.log(`Cookies after login: ${cookies.length} cookies`);
      cookies.forEach(cookie => {
        if (cookie.name.includes('token') || cookie.name.includes('session') || cookie.name.includes('auth')) {
          console.log(`  🍪 ${cookie.name}: ${cookie.value.substring(0, 30)}...`);
        }
      });
      
      // Step 3: Try to access protected route again
      console.log('📋 Step 3: Access protected route after login...');
      const response3 = await page.goto(`${STAGING_URL}/assessment/scenarios`, { waitUntil: 'networkidle' });
      console.log(`Status: ${response3.status()}`);
      console.log(`URL after login: ${page.url()}`);
      
      const stillRedirected = page.url().includes('/login');
      if (stillRedirected) {
        console.log('🚨 PROBLEM: Still redirected to login after successful login!');
        
        // Check browser storage
        const localStorage = await page.evaluate(() => {
          const storage = {};
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            storage[key] = window.localStorage.getItem(key);
          }
          return storage;
        });
        console.log('💾 localStorage:', Object.keys(localStorage));
        
        // Try direct auth check
        console.log('📋 Step 4: Checking auth API directly...');
        try {
          const authResponse = await page.goto(`${STAGING_URL}/api/auth/check`);
          const authText = await authResponse.text();
          console.log(`Auth API Status: ${authResponse.status()}`);
          console.log(`Auth API Response: ${authText.substring(0, 200)}...`);
        } catch (error) {
          console.log(`Auth API Error: ${error.message}`);
        }
        
      } else {
        console.log('✅ SUCCESS: Successfully accessed protected route!');
        const title = await page.title();
        console.log(`Page title: ${title}`);
      }
    } else {
      console.log('⚠️ Unexpected: No redirect to login (already authenticated?)');
    }
    
  } catch (error) {
    console.log(`❌ Error during test: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testStagingAuth().catch(console.error);