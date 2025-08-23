const { chromium } = require('@playwright/test');

async function testUserScenarios() {
  console.log('👤 Testing potential user experience scenarios that might cause issues...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    // Scenario 1: User with disabled JavaScript
    console.log('\n🚫 Scenario 1: Testing with JavaScript disabled...');
    const context1 = await browser.newContext({ javaScriptEnabled: false });
    const page1 = await context1.newPage();
    
    try {
      await page1.goto('https://ai-square-staging-731209836128.asia-east1.run.app/assessment/scenarios', 
                        { waitUntil: 'domcontentloaded', timeout: 10000 });
      console.log(`  Result: ${page1.url().includes('/login') ? '❌ Redirected' : '⚠️ No redirect'}`);
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    await context1.close();
    
    // Scenario 2: User with cookies blocked
    console.log('\n🍪 Scenario 2: Testing with cookies blocked...');
    const context2 = await browser.newContext({
      permissions: [],
      acceptDownloads: false
    });
    await context2.addInitScript(() => {
      Object.defineProperty(document, 'cookie', {
        get() { return ''; },
        set() { return false; }
      });
    });
    const page2 = await context2.newPage();
    
    await page2.goto('https://ai-square-staging-731209836128.asia-east1.run.app/assessment/scenarios');
    console.log(`  Result: ${page2.url().includes('/login') ? '✅ Redirected to login' : '❌ No redirect'}`);
    
    // Try to login without cookies
    if (page2.url().includes('/login')) {
      await page2.fill('input[type="email"]', 'student@example.com');
      await page2.fill('input[type="password"]', 'student123');
      await page2.click('button[type="submit"]');
      await page2.waitForTimeout(3000);
      console.log(`  Login result: ${page2.url().includes('/login') ? '❌ Still on login (expected)' : '⚠️ Redirect occurred'}`);
    }
    await context2.close();
    
    // Scenario 3: User with different User-Agent (mobile browser)
    console.log('\n📱 Scenario 3: Testing with mobile User-Agent...');
    const context3 = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    });
    const page3 = await context3.newPage();
    
    await page3.goto('https://ai-square-staging-731209836128.asia-east1.run.app/login');
    await page3.fill('input[type="email"]', 'student@example.com');
    await page3.fill('input[type="password"]', 'student123');
    await page3.click('button[type="submit"]');
    await page3.waitForTimeout(3000);
    
    await page3.goto('https://ai-square-staging-731209836128.asia-east1.run.app/assessment/scenarios');
    console.log(`  Mobile result: ${page3.url().includes('/login') ? '❌ Redirected' : '✅ Accessible'}`);
    await context3.close();
    
    // Scenario 4: User with slow network (might cause timing issues)
    console.log('\n🐌 Scenario 4: Testing with slow network...');
    const context4 = await browser.newContext();
    const page4 = await context4.newPage();
    
    // Simulate slow network
    const client = await page4.context().newCDPSession(page4);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50000, // 50kb/s
      uploadThroughput: 20000,   // 20kb/s
      latency: 500 // 500ms
    });
    
    console.log('  🔄 Slow network: Attempting login...');
    await page4.goto('https://ai-square-staging-731209836128.asia-east1.run.app/login', { waitUntil: 'domcontentloaded' });
    await page4.fill('input[type="email"]', 'student@example.com');
    await page4.fill('input[type="password"]', 'student123');
    await page4.click('button[type="submit"]');
    await page4.waitForTimeout(8000); // Wait longer for slow network
    
    console.log(`  Slow network login result: ${page4.url()}`);
    
    await page4.goto('https://ai-square-staging-731209836128.asia-east1.run.app/assessment/scenarios', { waitUntil: 'domcontentloaded' });
    console.log(`  Slow network access result: ${page4.url().includes('/login') ? '❌ Redirected' : '✅ Accessible'}`);
    await context4.close();
    
    // Scenario 5: User trying invalid credentials first
    console.log('\n🔐 Scenario 5: Testing wrong credentials first, then correct...');
    const context5 = await browser.newContext();
    const page5 = await context5.newPage();
    
    await page5.goto('https://ai-square-staging-731209836128.asia-east1.run.app/login');
    
    // Wrong credentials first
    await page5.fill('input[type="email"]', 'wrong@example.com');
    await page5.fill('input[type="password"]', 'wrongpassword');
    await page5.click('button[type="submit"]');
    await page5.waitForTimeout(3000);
    
    console.log(`  After wrong credentials: ${page5.url()}`);
    
    // Now correct credentials
    await page5.fill('input[type="email"]', 'student@example.com');
    await page5.fill('input[type="password"]', 'student123');
    await page5.click('button[type="submit"]');
    await page5.waitForTimeout(3000);
    
    console.log(`  After correct credentials: ${page5.url()}`);
    
    await page5.goto('https://ai-square-staging-731209836128.asia-east1.run.app/assessment/scenarios');
    console.log(`  Wrong->Correct result: ${page5.url().includes('/login') ? '❌ Redirected' : '✅ Accessible'}`);
    await context5.close();
    
    // Scenario 6: Check what happens with direct API calls vs browser
    console.log('\n🔍 Scenario 6: Comparing direct API vs browser behavior...');
    const context6 = await browser.newContext();
    const page6 = await context6.newPage();
    
    // Login via browser
    await page6.goto('https://ai-square-staging-731209836128.asia-east1.run.app/login');
    await page6.fill('input[type="email"]', 'student@example.com');
    await page6.fill('input[type="password"]', 'student123');
    await page6.click('button[type="submit"]');
    await page6.waitForTimeout(3000);
    
    // Get cookies for API call
    const cookies = await context6.cookies();
    const sessionToken = cookies.find(c => c.name === 'sessionToken');
    
    if (sessionToken) {
      console.log(`  Session token found: ${sessionToken.value.substring(0, 20)}...`);
      
      // Try direct API call with the token
      const response = await page6.evaluate(async (token) => {
        const response = await fetch('/api/auth/check', {
          headers: {
            'Cookie': `sessionToken=${token}`
          }
        });
        return {
          status: response.status,
          text: await response.text()
        };
      }, sessionToken.value);
      
      console.log(`  Direct API call result: ${response.status} - ${response.text}`);
    }
    await context6.close();
    
  } catch (error) {
    console.log(`❌ Error in user scenario testing: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testUserScenarios().catch(console.error);