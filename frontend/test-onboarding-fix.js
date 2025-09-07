const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('1. 訪問登入頁面...');
  await page.goto('http://localhost:3003/login');
  await page.waitForLoadState('networkidle');

  console.log('2. 填寫登入表單...');
  await page.fill('input[name="email"]', 'demo@example.com');
  await page.fill('input[name="password"]', 'Demo@1234');
  
  console.log('3. 點擊登入按鈕...');
  await page.click('button[type="submit"]');
  
  console.log('4. 等待導航...');
  await page.waitForNavigation({ timeout: 10000 });
  
  const currentUrl = page.url();
  console.log('5. 登入後的頁面 URL:', currentUrl);
  
  if (currentUrl.includes('/dashboard')) {
    console.log('✅ 成功！登入後直接進入 dashboard，沒有被導向到 onboarding');
  } else if (currentUrl.includes('/onboarding')) {
    console.log('❌ 問題！登入後仍然被導向到 onboarding');
  } else {
    console.log('⚠️ 登入後導向到:', currentUrl);
  }

  // 測試能否直接訪問三大模式
  console.log('\n6. 測試直接訪問 PBL...');
  await page.goto('http://localhost:3003/pbl/scenarios');
  await page.waitForLoadState('networkidle');
  
  const pblUrl = page.url();
  if (pblUrl.includes('/pbl/scenarios')) {
    console.log('✅ 成功訪問 PBL 頁面');
  } else {
    console.log('❌ 無法訪問 PBL，被重定向到:', pblUrl);
  }

  console.log('\n7. 測試直接訪問 Assessment...');
  await page.goto('http://localhost:3003/assessment/scenarios');
  await page.waitForLoadState('networkidle');
  
  const assessmentUrl = page.url();
  if (assessmentUrl.includes('/assessment/scenarios')) {
    console.log('✅ 成功訪問 Assessment 頁面');
  } else {
    console.log('❌ 無法訪問 Assessment，被重定向到:', assessmentUrl);
  }

  console.log('\n8. 測試直接訪問 Discovery...');
  await page.goto('http://localhost:3003/discovery/scenarios');
  await page.waitForLoadState('networkidle');
  
  const discoveryUrl = page.url();
  if (discoveryUrl.includes('/discovery/scenarios')) {
    console.log('✅ 成功訪問 Discovery 頁面');
  } else {
    console.log('❌ 無法訪問 Discovery，被重定向到:', discoveryUrl);
  }

  await browser.close();
})();