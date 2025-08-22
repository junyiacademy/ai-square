const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Step 1: Navigating to /login page...');
  await page.goto('https://ai-square-staging-731209836128.asia-east1.run.app/login');
  await page.waitForLoadState('networkidle');
  console.log('Login page loaded');

  // Take screenshot of login page
  await page.screenshot({ path: 'login-page.png' });

  // Check for login form elements
  try {
    await page.waitForSelector('input[type="email"], input[name="email"], input[id="email"]', { timeout: 5000 });
    console.log('Email input field found');
  } catch (e) {
    console.log('Email input field not found');
  }

  try {
    await page.waitForSelector('input[type="password"], input[name="password"], input[id="password"]', { timeout: 5000 });
    console.log('Password input field found');
  } catch (e) {
    console.log('Password input field not found');
  }

  console.log('\nStep 2: Attempting to login with student@example.com / student123...');
  
  // Try different selectors for email field
  const emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[id="email"]', 'input[placeholder*="email" i]'];
  let emailFilled = false;
  for (const selector of emailSelectors) {
    try {
      await page.fill(selector, 'student@example.com');
      emailFilled = true;
      console.log(`Email filled using selector: ${selector}`);
      break;
    } catch (e) {
      // Try next selector
    }
  }

  if (!emailFilled) {
    console.log('Could not find email input field');
  }

  // Try different selectors for password field
  const passwordSelectors = ['input[type="password"]', 'input[name="password"]', 'input[id="password"]', 'input[placeholder*="password" i]'];
  let passwordFilled = false;
  for (const selector of passwordSelectors) {
    try {
      await page.fill(selector, 'student123');
      passwordFilled = true;
      console.log(`Password filled using selector: ${selector}`);
      break;
    } catch (e) {
      // Try next selector
    }
  }

  if (!passwordFilled) {
    console.log('Could not find password input field');
  }

  // Take screenshot before clicking login
  await page.screenshot({ path: 'before-login.png' });

  // Try to find and click login button
  const loginButtonSelectors = [
    'button[type="submit"]',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'button:has-text("登入")',
    'input[type="submit"]',
    '[role="button"]:has-text("Login")'
  ];

  let loginClicked = false;
  for (const selector of loginButtonSelectors) {
    try {
      await page.click(selector);
      loginClicked = true;
      console.log(`Login button clicked using selector: ${selector}`);
      break;
    } catch (e) {
      // Try next selector
    }
  }

  if (!loginClicked) {
    console.log('Could not find login button');
  }

  // Wait for navigation or response
  console.log('\nStep 3: Waiting for redirect...');
  try {
    await page.waitForNavigation({ timeout: 10000 });
    console.log(`Redirected to: ${page.url()}`);
  } catch (e) {
    console.log('No redirect occurred');
    console.log(`Current URL: ${page.url()}`);
  }

  // Check cookies
  console.log('\nStep 4: Checking cookies...');
  const cookies = await context.cookies();
  console.log('All cookies:');
  cookies.forEach(cookie => {
    console.log(`- ${cookie.name}: ${cookie.value.substring(0, 20)}... (domain: ${cookie.domain})`);
  });

  const sessionToken = cookies.find(c => c.name === 'sessionToken' || c.name === 'accessToken' || c.name.includes('session'));
  if (sessionToken) {
    console.log(`\nSession token found: ${sessionToken.name}`);
  } else {
    console.log('\nNo session token found in cookies');
  }

  // Step 5: Try to access protected page
  console.log('\nStep 5: Attempting to access /discovery/overview...');
  await page.goto('https://ai-square-staging-731209836128.asia-east1.run.app/discovery/overview');
  await page.waitForLoadState('networkidle');
  console.log(`Current URL after navigation: ${page.url()}`);
  
  if (page.url().includes('/login')) {
    console.log('Redirected back to login - authentication failed');
  } else if (page.url().includes('/discovery/overview')) {
    console.log('Successfully accessed protected page - authentication working');
  }

  // Check console errors
  console.log('\nStep 6: Console errors:');
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });

  // Take final screenshot
  await page.screenshot({ path: 'final-state.png' });

  // Keep browser open for manual inspection
  console.log('\nTest completed. Browser will remain open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
})();