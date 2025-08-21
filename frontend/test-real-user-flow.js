const { chromium } = require('@playwright/test');

async function testRealUserFlow() {
  console.log('🔬 Simulating EXACT user experience flow...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down to see what's happening
  });
  
  try {
    // Simulate a completely fresh user
    console.log('\n👤 Fresh user session (no cache, no cookies)...');
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable detailed logging
    page.on('response', response => {
      if (response.url().includes('/api/auth/') || response.url().includes('/login') || response.url().includes('/assessment')) {
        console.log(`📡 ${response.status()} ${response.url()}`);
      }
    });
    
    page.on('console', msg => {
      if (msg.text().includes('error') || msg.text().includes('Error') || msg.text().includes('auth')) {
        console.log(`🐛 Console: ${msg.text()}`);
      }
    });
    
    // Step 1: User clicks on a direct link to assessment (common scenario)
    console.log('📋 Step 1: User clicks direct link to /assessment/scenarios');
    await page.goto('https://ai-square-staging-731209836128.asia-east1.run.app/assessment/scenarios');
    await page.waitForTimeout(2000);
    
    console.log(`  URL after direct link: ${page.url()}`);
    console.log(`  Is on login page: ${page.url().includes('/login')}`);
    
    // Step 2: User fills in credentials (might make typos, take time)
    console.log('📋 Step 2: User types credentials (with realistic delays)');
    
    if (page.url().includes('/login')) {
      // Type email slowly like a real user
      await page.click('input[type="email"]');
      await page.type('input[type="email"]', 'student@example.com', { delay: 100 });
      await page.waitForTimeout(500);
      
      // Type password
      await page.click('input[type="password"]');
      await page.type('input[type="password"]', 'student123', { delay: 100 });
      await page.waitForTimeout(500);
      
      // Check what happens when user submits
      console.log('🔄 User clicks submit...');
      await page.click('button[type="submit"]');
      
      // Wait and watch what happens
      console.log('⏳ Waiting for login response...');
      await page.waitForTimeout(3000);
      
      console.log(`  URL after login: ${page.url()}`);
      
      // Check if there are any visible error messages
      try {
        const errorMessage = await page.textContent('.error, .alert-error, [role="alert"]', { timeout: 1000 });
        if (errorMessage) {
          console.log(`  ⚠️ Error message visible: ${errorMessage}`);
        }
      } catch (e) {
        console.log('  ✅ No error messages found');
      }
      
      // Step 3: What happens if user navigates to assessment again?
      console.log('📋 Step 3: User navigates to assessment scenarios again');
      
      // Simulate user clicking on a navigation link or bookmarks
      await page.goto('https://ai-square-staging-731209836128.asia-east1.run.app/assessment/scenarios');
      await page.waitForTimeout(2000);
      
      console.log(`  Final URL: ${page.url()}`);
      console.log(`  Success: ${!page.url().includes('/login') ? '✅' : '❌'}`);
      
      if (page.url().includes('/login')) {
        console.log('🚨 USER WOULD EXPERIENCE: Redirect loop - logged in but still redirected!');
        
        // Debugging: Check what's actually happening
        const cookies = await context.cookies();
        console.log(`  🍪 Cookies present: ${cookies.length}`);
        
        // Check auth status
        try {
          const authResp = await page.goto('https://ai-square-staging-731209836128.asia-east1.run.app/api/auth/check');
          const authText = await authResp.text();
          console.log(`  🔐 Auth API: ${authResp.status()} - ${authText}`);
        } catch (e) {
          console.log(`  🔐 Auth API Error: ${e.message}`);
        }
      } else {
        console.log('✅ USER WOULD EXPERIENCE: Successful login and access');
        
        // Check what content is shown
        try {
          const title = await page.textContent('h1', { timeout: 2000 });
          console.log(`  📄 Page shows: ${title}`);
        } catch (e) {
          console.log('  📄 Page title not found quickly');
        }
      }
    } else {
      console.log('⚠️ Unexpected: Direct access succeeded without login');
    }
    
    // Step 4: Test browser back/forward behavior
    console.log('📋 Step 4: Testing browser navigation (back/forward)');
    await page.goBack();
    await page.waitForTimeout(1000);
    console.log(`  After back: ${page.url()}`);
    
    await page.goForward();
    await page.waitForTimeout(1000);
    console.log(`  After forward: ${page.url()}`);
    
    // Step 5: Test opening in new tab (common user behavior)
    console.log('📋 Step 5: Testing new tab behavior');
    const newPage = await context.newPage();
    await newPage.goto('https://ai-square-staging-731209836128.asia-east1.run.app/assessment/scenarios');
    await newPage.waitForTimeout(2000);
    console.log(`  New tab result: ${newPage.url()}`);
    console.log(`  New tab success: ${!newPage.url().includes('/login') ? '✅' : '❌'}`);
    
    console.log('\n🎯 FINAL DIAGNOSIS:');
    console.log('==================');
    
    const finalCookies = await context.cookies();
    const hasSessionToken = finalCookies.some(c => c.name === 'sessionToken');
    
    console.log(`Session cookie present: ${hasSessionToken ? '✅' : '❌'}`);
    console.log(`Main page accessible: ${!page.url().includes('/login') ? '✅' : '❌'}`);
    console.log(`New tab accessible: ${!newPage.url().includes('/login') ? '✅' : '❌'}`);
    
    if (hasSessionToken && !page.url().includes('/login')) {
      console.log('✅ VERDICT: Authentication is working correctly');
      console.log('   User issue might be: browser cache, extensions, or network issues');
    } else {
      console.log('❌ VERDICT: Authentication issue confirmed');
      console.log('   The user is experiencing a real technical problem');
    }
    
    console.log('\n⏸️ Browser staying open for manual inspection...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.log(`❌ Error during real user flow test: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testRealUserFlow().catch(console.error);