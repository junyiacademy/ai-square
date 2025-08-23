const { chromium } = require('@playwright/test');

async function testStagingAuthDetailed() {
  console.log('🔍 Detailed staging authentication investigation...');
  
  const browser = await chromium.launch({ headless: false }); // Show browser
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';
  
  // Enable logging
  page.on('response', response => {
    if (response.url().includes('/api/auth/') || response.url().includes('/login') || response.url().includes('/assessment/scenarios')) {
      console.log(`📡 ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    // Test 1: Clear state first
    console.log('\n🧹 Test 1: Starting with clean slate...');
    await context.clearCookies();
    
    // Test 2: Access different protected routes
    const protectedRoutes = [
      '/assessment/scenarios',
      '/pbl',
      '/discovery',
      '/dashboard'
    ];
    
    for (const route of protectedRoutes) {
      console.log(`\n📋 Testing route: ${route}`);
      await page.goto(`${STAGING_URL}${route}`, { waitUntil: 'networkidle' });
      console.log(`  URL: ${page.url()}`);
      console.log(`  Redirected: ${page.url().includes('/login')}`);
    }
    
    // Test 3: Login and check session persistence
    console.log('\n📋 Test 3: Login process...');
    await page.goto(`${STAGING_URL}/login`);
    
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'student123');
    
    console.log('🔄 Submitting login form...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    console.log(`  Post-login URL: ${page.url()}`);
    
    // Check if login was successful by checking for error messages
    const errorElements = await page.$$('text=/error|invalid|wrong/i');
    if (errorElements.length > 0) {
      console.log('❌ Login appears to have failed - error messages found');
    } else {
      console.log('✅ No error messages found');
    }
    
    // Test 4: Check session across multiple page visits
    console.log('\n📋 Test 4: Session persistence test...');
    
    for (const route of protectedRoutes) {
      await page.goto(`${STAGING_URL}${route}`, { waitUntil: 'networkidle' });
      const redirected = page.url().includes('/login');
      console.log(`  ${route}: ${redirected ? '❌ Redirected' : '✅ Accessible'}`);
      
      if (redirected) {
        console.log('🚨 Session lost! Checking why...');
        
        // Check cookies
        const cookies = await context.cookies();
        console.log(`    Cookies: ${cookies.length}`);
        cookies.forEach(cookie => {
          console.log(`      ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
        });
        
        // Check auth status
        try {
          const authResp = await page.goto(`${STAGING_URL}/api/auth/check`);
          const authData = await authResp.text();
          console.log(`    Auth API: ${authResp.status()} - ${authData.substring(0, 100)}`);
        } catch (e) {
          console.log(`    Auth API Error: ${e.message}`);
        }
        
        break; // Stop testing if session is lost
      }
    }
    
    // Test 5: Simulate page refresh
    console.log('\n📋 Test 5: Page refresh test...');
    await page.goto(`${STAGING_URL}/assessment/scenarios`);
    console.log(`  Before refresh: ${page.url().includes('/login') ? '❌ Login' : '✅ Protected'}`);
    
    await page.reload({ waitUntil: 'networkidle' });
    console.log(`  After refresh: ${page.url().includes('/login') ? '❌ Login' : '✅ Protected'}`);
    
    // Test 6: Check with a new browser tab
    console.log('\n📋 Test 6: New tab test...');
    const newPage = await context.newPage();
    await newPage.goto(`${STAGING_URL}/assessment/scenarios`, { waitUntil: 'networkidle' });
    console.log(`  New tab: ${newPage.url().includes('/login') ? '❌ Login' : '✅ Protected'}`);
    await newPage.close();
    
    // Test 7: Wait and see if session expires
    console.log('\n📋 Test 7: Wait for potential session timeout (10 seconds)...');
    await page.waitForTimeout(10000);
    await page.goto(`${STAGING_URL}/assessment/scenarios`, { waitUntil: 'networkidle' });
    console.log(`  After wait: ${page.url().includes('/login') ? '❌ Login' : '✅ Protected'}`);
    
    console.log('\n📊 Final Summary:');
    const finalCookies = await context.cookies();
    console.log(`Final cookies count: ${finalCookies.length}`);
    console.log(`Current URL: ${page.url()}`);
    
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser staying open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testStagingAuthDetailed().catch(console.error);