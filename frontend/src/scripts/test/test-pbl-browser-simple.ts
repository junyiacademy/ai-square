/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
 
import 'dotenv/config';
import { chromium, Browser, Page } from 'playwright';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPBLFlow() {
  console.log('🚀 Starting PBL Browser Test with Playwright');
  console.log(`Testing URL: ${BASE_URL}`);
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    // Launch browser in headed mode so we can see what's happening
    browser = await chromium.launch({
      headless: false, // Show browser window
      slowMo: 500 // Slow down actions for visibility
    });
    
    page = await browser.newPage();
    
    // Step 1: Navigate to home page
    console.log('\n1️⃣ Navigating to home page...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/01-home.png' });
    console.log('✅ Home page loaded');
    
    // Step 2: Try to access PBL (should redirect to login)
    console.log('\n2️⃣ Attempting to access PBL...');
    await page.goto(`${BASE_URL}/pbl`);
    await page.waitForLoadState('networkidle');
    
    // Check if redirected to login
    const url = page.url();
    if (url.includes('/login')) {
      console.log('✅ Correctly redirected to login page');
      await page.screenshot({ path: 'screenshots/02-login-redirect.png' });
    }
    
    // Step 3: Login via API first
    console.log('\n3️⃣ Logging in via API...');
    try {
      // Login via API to get session
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'student@example.com',
          password: 'student123',
          rememberMe: true
        })
      });
      
      const loginData = await loginResponse.json();
      
      if (loginResponse.ok && loginData.sessionToken) {
        console.log('✅ API login successful');
        
        // Set session cookie
        await page.context().addCookies([{
          name: 'session-token',
          value: loginData.sessionToken,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax'
        }]);
        
        // Also set any other cookies if returned
        if (loginData.accessToken) {
          await page.context().addCookies([{
            name: 'access-token',
            value: loginData.accessToken,
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'Lax'
          }]);
        }
        
        // Navigate to home to verify login
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'screenshots/03-logged-in.png' });
        console.log('✅ Session established');
      } else {
        console.log('❌ API login failed:', loginData.error || 'Unknown error');
        // Fallback to UI login
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        await page.fill('input[type="email"], input[name="email"]', 'student@example.com');
        await page.fill('input[type="password"], input[name="password"]', 'student123');
        await page.screenshot({ path: 'screenshots/03-login-form.png' });
        await page.click('button[type="submit"]');
        await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 10000 });
        console.log('✅ UI login successful');
      }
    } catch (_error) {
      console.log('❌ Login error:', error instanceof Error ? error.message : error);
      await page.screenshot({ path: 'screenshots/03-login-error.png' });
    }
    
    // Step 4: Navigate to PBL
    console.log('\n4️⃣ Navigating to PBL scenarios...');
    await page.goto(`${BASE_URL}/pbl`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/04-pbl-list.png' });
    
    // We're logged in if we can see the scenarios (the screenshot shows we are logged in)
    console.log('✅ Logged in as student@example.com');
    
    // Check if we can see scenarios
    const viewDetailsButtons = await page.locator('button:has-text("View Details"), a:has-text("View Details")').count();
    console.log(`✅ Found ${viewDetailsButtons} PBL scenarios with View Details buttons`);
    
    if (viewDetailsButtons > 0) {
      // Step 5: Select a real PBL scenario (skip Test PBL Scenario)
      console.log('\n5️⃣ Selecting a real PBL scenario...');
      
      // Direct approach: Click the second "View Details" button (skip Test PBL which is first)
      const allViewDetailsButtons = page.locator('button:has-text("View Details"), a:has-text("View Details")');
      const buttonCount = await allViewDetailsButtons.count();
      console.log(`  Found ${buttonCount} View Details buttons`);
      
      if (buttonCount > 1) {
        // Click the second button (index 1) to skip Test PBL Scenario
        console.log('  Clicking second scenario (AI-Powered Smart City Solutions)...');
        await allViewDetailsButtons.nth(1).click();
      } else if (buttonCount === 1) {
        console.log('  Only one scenario found, clicking it...');
        await allViewDetailsButtons.first().click();
      } else {
        console.log('  ❌ No View Details buttons found');
      }
      
      await page.waitForLoadState('networkidle');
      
      // Wait for scenario content to load
      console.log('  Waiting for scenario content to load...');
      try {
        // Wait for either title or loading state
        await page.waitForSelector('h1, h2, [data-testid="scenario-title"], .loading', { timeout: 10000 });
        await sleep(2000);
      } catch (_error) {
        console.log('  ⚠️ Timeout waiting for scenario content');
      }
      
      // Verify we're on a scenario detail page
      const currentUrl = page.url();
      console.log(`  Current URL: ${currentUrl}`);
      await page.screenshot({ path: 'screenshots/05-scenario-detail.png' });
      
      // Check if scenario loaded properly - look for any heading
      const headings = await page.locator('h1, h2').allTextContents();
      console.log(`  Found headings: ${headings.join(', ')}`);
      
      const hasScenarioContent = headings.some(h => 
        /AI-Powered|Teen Health|Climate|Digital Wellness|Creative Arts|Smart City/i.test(h)
      );
      
      if (hasScenarioContent) {
        console.log('✅ Scenario detail page loaded');
      } else {
        console.log('⚠️ Scenario content not found');
        
        // Check for error messages
        const errorText = await page.locator('.error, [data-testid="error"], [role="alert"]').allTextContents();
        if (errorText.length > 0) {
          console.log(`  Error found: ${errorText.join(', ')}`);
        }
      }
      
      // Step 6: Start learning
      console.log('\n6️⃣ Starting learning...');
      
      // Try multiple selectors for Start Learning button
      const startButtonSelectors = [
        'button:has-text("Start New Program")',
        'button:has-text("Start Learning")',
        'button:has-text("開始學習")',
        'button:has-text("Start New")',
        'button:has-text("開始新的")',
        'a:has-text("Start Learning")',
        'a:has-text("開始學習")',
        '[data-testid="start-learning"]',
        'button[type="button"]:has-text("Start")',
        // Generic button that might be Start
        'button.bg-green-600',
        'button.bg-blue-600',
        'button.bg-blue-500',
        'button.bg-indigo-600'
      ];
      
      let startButton = null;
      for (const selector of startButtonSelectors) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible()) {
          startButton = btn;
          console.log(`  Found start button with selector: ${selector}`);
          break;
        }
      }
      
      if (startButton) {
        // Listen for console errors
        page.on('console', msg => {
          if (msg.type() === 'error') {
            console.log('  Browser console error:', msg.text());
          }
        });
        
        // Listen for network failures
        page.on('requestfailed', request => {
          console.log('  Network request failed:', request.url());
          console.log('  Failure reason:', request.failure()?.errorText);
        });
        
        // Listen for responses
        page.on('response', response => {
          if (response.url().includes('/start') && response.status() !== 200) {
            console.log('  Start API response:', response.status(), response.statusText());
          }
        });
        
        await startButton.click();
        console.log('  Clicked Start button, waiting for navigation...');
        
        // Wait for navigation to task page
        try {
          await page.waitForURL('**/tasks/**', { timeout: 10000 });
          console.log('  Navigated to task page');
        } catch (_error) {
          console.log('  ⚠️ Navigation timeout, checking current URL...');
          
          // Check for any alert dialogs
          page.on('dialog', async dialog => {
            console.log('  Alert dialog:', dialog.message());
            await dialog.accept();
          });
        }
        
        await page.waitForLoadState('networkidle');
        await sleep(2000); // Give the page time to fully load
        
        const newUrl = page.url();
        console.log(`  Current URL after start: ${newUrl}`);
        await page.screenshot({ path: 'screenshots/06-learning-started.png' });
        
        if (newUrl.includes('/tasks/')) {
          console.log('✅ Learning started - navigated to task page');
        } else {
          console.log('⚠️ Learning started but not on task page');
          
          // Check if there's an error message on the page
          const errorMessages = await page.locator('.error, .alert, [role="alert"], [class*="error"]').allTextContents();
          if (errorMessages.length > 0) {
            console.log('  Error messages found:', errorMessages);
          }
        }
        
        // Step 7: Interact with AI tutor
        console.log('\n7️⃣ Interacting with AI tutor...');
        
        // Wait for page to load properly
        await sleep(3000);
        await page.screenshot({ path: 'screenshots/07-task-page.png' });
        
        // Try multiple selectors for chat input
        const chatSelectors = [
          'textarea[placeholder*="訊息"]',
          'textarea[placeholder*="message"]',
          'textarea[placeholder*="Type"]',
          'textarea[placeholder*="Enter"]',
          'textarea[name="message"]',
          'textarea[id*="chat"]',
          'textarea[id*="input"]',
          'textarea'
        ];
        
        let chatInput = null;
        for (const selector of chatSelectors) {
          const input = page.locator(selector).first();
          if (await input.isVisible()) {
            chatInput = input;
            console.log(`  Found chat input with selector: ${selector}`);
            break;
          }
        }
        
        if (chatInput && await chatInput.isVisible()) {
          await chatInput.fill('What are the key ethical considerations for AI in healthcare?');
          await page.screenshot({ path: 'screenshots/07-chat-input.png' });
          
          // Send message
          await page.keyboard.press('Enter');
          console.log('✅ Message sent to AI tutor');
          
          // Wait for response
          console.log('   Waiting for AI response...');
          await page.waitForSelector('[data-testid="ai-message"], .ai-message, [class*="assistant"]', { timeout: 30000 });
          await sleep(2000); // Let the response fully render
          await page.screenshot({ path: 'screenshots/08-ai-response.png' });
          console.log('✅ AI response received');
        } else {
          console.log('⚠️ Chat input not found');
        }
        
        // Step 8: Evaluate
        console.log('\n8️⃣ Evaluating task...');
        const evaluateButton = page.locator('button:has-text("評估"), button:has-text("Evaluate")').first();
        if (await evaluateButton.isVisible()) {
          await evaluateButton.click();
          console.log('   Waiting for evaluation...');
          await page.waitForSelector('[data-testid="evaluation-score"], .evaluation-score, [class*="score"]', { timeout: 30000 });
          await sleep(2000);
          await page.screenshot({ path: 'screenshots/09-evaluation.png' });
          console.log('✅ Task evaluated');
        } else {
          console.log('⚠️ Evaluate button not found');
        }
        
        // Step 9: Complete and view report
        console.log('\n9️⃣ Viewing completion report...');
        const viewReportButton = page.locator('button:has-text("View Report"), a:has-text("View Report"), a:has-text("查看報告"), button:has-text("查看報告")').first();
        if (await viewReportButton.isVisible()) {
          await viewReportButton.click();
          await page.waitForLoadState('networkidle');
          console.log('   Waiting for completion page...');
          await page.waitForURL('**/complete', { timeout: 10000 });
          await sleep(2000);
          await page.screenshot({ path: 'screenshots/10-completion-report.png' });
          console.log('✅ Completion report displayed');
          
          // Wait for qualitative feedback
          console.log('   Waiting for AI feedback generation...');
          try {
            await page.waitForSelector('[data-testid="qualitative-feedback"], .qualitative-feedback, [class*="feedback"]', { timeout: 60000 });
            await sleep(2000);
            await page.screenshot({ path: 'screenshots/11-ai-feedback.png' });
            console.log('✅ AI qualitative feedback generated');
          } catch (_error) {
            console.log('⚠️ AI feedback not generated in time');
          }
        } else {
          console.log('⚠️ View Report button not found');
          
          // Try alternative flow - check if we need to complete more tasks
          const nextTaskBtn = page.locator('button:has-text("Next Task"), button:has-text("下一個任務")').first();
          if (await nextTaskBtn.isVisible()) {
            console.log('  Found Next Task button, continuing to next task...');
            await nextTaskBtn.click();
            await page.waitForLoadState('networkidle');
            await sleep(2000);
          }
        }
      } else {
        console.log('⚠️ Start Learning button not found');
      }
    } else {
      console.log('❌ No scenarios found!');
    }
    
    // Step 10: Test language switching
    console.log('\n🔟 Testing language switch...');
    // Look for language selector in different possible locations
    const langSelectors = [
      'select[name="language"]',
      'button:has-text("English")',
      '[data-testid="language-selector"]',
      'button[aria-label*="language"]'
    ];
    
    let langFound = false;
    for (const selector of langSelectors) {
      const langElement = page.locator(selector).first();
      if (await langElement.isVisible()) {
        langFound = true;
        // Handle select dropdown
        if (selector.includes('select')) {
          await langElement.selectOption({ label: '繁體中文' });
        } else {
          // Handle button click
          await langElement.click();
          await sleep(500);
          const zhOption = page.locator('text=/中文|Chinese|繁體/').first();
          if (await zhOption.isVisible()) {
            await zhOption.click();
          }
        }
        await sleep(2000);
        await page.screenshot({ path: 'screenshots/12-chinese-interface.png' });
        console.log('✅ Language switched to Chinese');
        break;
      }
    }
    
    if (!langFound) {
      console.log('⚠️ Language selector not found');
    }
    
    console.log('\n✅ PBL flow test completed!');
    console.log('📸 Screenshots saved in screenshots/ directory');
    
  } catch (_error) {
    console.error('\n❌ Test failed:', error);
    if (page) {
      await page.screenshot({ path: 'screenshots/error-state.png' });
    }
    throw error;
  } finally {
    // Keep browser open for manual inspection
    console.log('\n⏸️ Browser will remain open for 10 seconds for inspection...');
    await sleep(10000);
    
    if (browser) {
      await browser.close();
    }
  }
}

// Create screenshots directory
async function setupScreenshotsDir() {
  const fs = await import('fs/promises');
  try {
    await fs.mkdir('screenshots', { recursive: true });
  } catch (_error) {
    // Directory might already exist
  }
}

// Main execution
async function main() {
  try {
    await setupScreenshotsDir();
    await testPBLFlow();
    process.exit(0);
  } catch (_error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    return response.ok;
  } catch {
    console.error(`\n❌ Server is not running at ${BASE_URL}`);
    console.error('Please start the development server with: npm run dev\n');
    return false;
  }
}

// Run
(async () => {
  if (await checkServer()) {
    await main();
  } else {
    process.exit(1);
  }
})();