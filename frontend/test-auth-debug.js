const { chromium } = require('playwright');

async function testAuthFlow() {
  console.log('🔍 Starting browser authentication flow test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  
  const page = await context.newPage();

  try {
    const baseUrl = 'https://ai-square-staging-731209836128.asia-east1.run.app';
    
    // 1. Test accessing protected route without authentication
    console.log('\n1️⃣ Testing access to /assessment/scenarios without auth...');
    await page.goto(`${baseUrl}/assessment/scenarios`);
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('   📍 Current URL:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('   ✅ Correctly redirected to login page');
    } else {
      console.log('   ❌ Should have been redirected to login but was not!');
      console.log('   🔍 Page title:', await page.title());
    }
    
    // 2. Check if login form is present
    console.log('\n2️⃣ Checking login form...');
    const emailInput = await page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = await page.locator('input[name="password"], input[type="password"]').first();
    const submitButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
    
    const emailExists = await emailInput.isVisible();
    const passwordExists = await passwordInput.isVisible();
    const submitExists = await submitButton.isVisible();
    
    console.log('   📧 Email input present:', emailExists);
    console.log('   🔐 Password input present:', passwordExists);
    console.log('   🔘 Submit button present:', submitExists);
    
    if (!emailExists || !passwordExists || !submitExists) {
      console.log('   ❌ Login form not properly loaded');
      console.log('   🔍 Page content preview:');
      const content = await page.content();
      console.log(content.substring(0, 1000) + '...');
      return;
    }
    
    // 3. Login
    console.log('\n3️⃣ Attempting login...');
    await emailInput.fill('student@example.com');
    await passwordInput.fill('student123');
    
    // Listen for navigation/response
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/login') && response.request().method() === 'POST'
    );
    
    await submitButton.click();
    
    try {
      const response = await responsePromise;
      const status = response.status();
      console.log('   📡 Login API response status:', status);
      
      if (status === 200) {
        const responseBody = await response.json();
        console.log('   ✅ Login successful, user:', responseBody.user?.email);
        console.log('   🎫 SessionToken present:', !!responseBody.sessionToken);
      } else {
        console.log('   ❌ Login failed with status:', status);
        const errorText = await response.text();
        console.log('   📝 Error response:', errorText.substring(0, 200));
      }
    } catch (error) {
      console.log('   ⚠️  No login API response intercepted:', error.message);
    }
    
    // Wait for potential redirect
    await page.waitForLoadState('networkidle');
    
    // 4. Check cookies after login
    console.log('\n4️⃣ Checking cookies after login...');
    const cookies = await context.cookies();
    const sessionToken = cookies.find(c => c.name === 'sessionToken');
    
    if (sessionToken) {
      console.log('   ✅ sessionToken cookie found');
      console.log('   🔐 Value (first 50 chars):', sessionToken.value.substring(0, 50) + '...');
      console.log('   🏠 Domain:', sessionToken.domain);
      console.log('   📍 Path:', sessionToken.path);
      console.log('   🔒 HttpOnly:', sessionToken.httpOnly);
      console.log('   🔐 Secure:', sessionToken.secure);
    } else {
      console.log('   ❌ sessionToken cookie NOT found!');
      console.log('   🍪 Available cookies:');
      cookies.forEach(cookie => {
        console.log(`     - ${cookie.name}: ${cookie.value.substring(0, 30)}... (domain: ${cookie.domain})`);
      });
    }
    
    // 5. Test protected route access after login
    console.log('\n5️⃣ Testing protected route access after login...');
    
    const afterLoginUrl = page.url();
    console.log('   📍 Current URL after login:', afterLoginUrl);
    
    // Navigate to the protected route again
    await page.goto(`${baseUrl}/assessment/scenarios`);
    await page.waitForLoadState('networkidle');
    
    const finalUrl = page.url();
    console.log('   📍 Final URL:', finalUrl);
    
    if (finalUrl.includes('/assessment/scenarios') && !finalUrl.includes('/login')) {
      console.log('   ✅ Successfully accessed protected route!');
      
      // Check if we see the Sign In button (which would indicate not authenticated)
      const signInButton = await page.locator('text=Sign in, button:has-text("Sign in")').first();
      const signInVisible = await signInButton.isVisible();
      console.log('   🔘 "Sign in" button still visible:', signInVisible);
      
      if (signInVisible) {
        console.log('   ⚠️  Frontend shows "Sign in" - possible client-side auth issue');
      }
      
    } else {
      console.log('   ❌ Still redirected to login after authentication!');
    }
    
    // 6. Test API auth check
    console.log('\n6️⃣ Testing API auth check...');
    try {
      const authResponse = await page.request.get(`${baseUrl}/api/auth/check`);
      const authStatus = await authResponse.json();
      console.log('   📡 Auth check status:', authResponse.status());
      console.log('   👤 Auth result:', authStatus);
      
      if (authStatus.authenticated) {
        console.log('   ✅ API confirms user is authenticated');
      } else {
        console.log('   ❌ API says user is NOT authenticated!');
      }
    } catch (error) {
      console.log('   ❌ Failed to check auth status:', error.message);
    }
    
    // 7. Check middleware behavior by examining network requests
    console.log('\n7️⃣ Final diagnosis...');
    
    if (sessionToken && finalUrl.includes('/login')) {
      console.log('   🚨 ISSUE IDENTIFIED: Cookie is set but middleware still redirects');
      console.log('   🔍 Possible causes:');
      console.log('     - Middleware token validation failing');
      console.log('     - Cookie domain/path mismatch');
      console.log('     - Base64 decoding issues in AuthManager.isValidSessionToken');
      console.log('     - Clock skew or timing issues');
    } else if (!sessionToken) {
      console.log('   🚨 ISSUE IDENTIFIED: sessionToken cookie not being set');
      console.log('   🔍 Possible causes:');
      console.log('     - Cookie setting in API response failing');
      console.log('     - Domain mismatch between cookie and request');
      console.log('     - Secure cookie settings in production');
    } else if (finalUrl.includes('/assessment/scenarios')) {
      console.log('   ✅ Authentication flow working correctly!');
    }
    
    console.log('\n🏁 Test completed. Keeping browser open for manual inspection...');
    
    // Keep browser open for manual inspection
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Error during testing:', error);
  } finally {
    await browser.close();
  }
}

testAuthFlow().catch(console.error);