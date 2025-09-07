const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // 慢一點以便觀察
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('===== 測試 Onboarding 不再阻擋使用者 =====\n');

    // 1. 先註冊一個新使用者
    console.log('1. 註冊新使用者...');
    await page.goto('http://localhost:3004/register');
    await page.waitForLoadState('networkidle');

    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = 'Test@1234';

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.fill('input[name="name"]', 'Test User');

    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);

    await page.click('button[type="submit"]');
    
    // 等待導航
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
    
    const afterRegisterUrl = page.url();
    console.log(`2. 註冊後導向到: ${afterRegisterUrl}`);
    
    if (afterRegisterUrl.includes('/dashboard')) {
      console.log('   ✅ 成功！註冊後直接進入 dashboard');
    } else if (afterRegisterUrl.includes('/onboarding')) {
      console.log('   ❌ 問題！註冊後被導向到 onboarding');
    }

    // 3. 測試直接訪問三大模式
    console.log('\n3. 測試直接訪問三大模式...');
    
    // PBL
    console.log('   訪問 PBL...');
    await page.goto('http://localhost:3004/pbl/scenarios');
    await page.waitForLoadState('networkidle');
    const pblUrl = page.url();
    if (pblUrl.includes('/pbl/scenarios')) {
      console.log('   ✅ 成功訪問 PBL');
    } else if (pblUrl.includes('/login')) {
      console.log('   ⚠️  需要登入（這是正常的）');
    } else {
      console.log(`   ❌ 被重定向到: ${pblUrl}`);
    }

    // Assessment
    console.log('   訪問 Assessment...');
    await page.goto('http://localhost:3004/assessment/scenarios');
    await page.waitForLoadState('networkidle');
    const assessmentUrl = page.url();
    if (assessmentUrl.includes('/assessment/scenarios')) {
      console.log('   ✅ 成功訪問 Assessment');
    } else if (assessmentUrl.includes('/login')) {
      console.log('   ⚠️  需要登入（這是正常的）');
    } else {
      console.log(`   ❌ 被重定向到: ${assessmentUrl}`);
    }

    // Discovery
    console.log('   訪問 Discovery...');
    await page.goto('http://localhost:3004/discovery/scenarios');
    await page.waitForLoadState('networkidle');
    const discoveryUrl = page.url();
    if (discoveryUrl.includes('/discovery/scenarios')) {
      console.log('   ✅ 成功訪問 Discovery');
    } else if (discoveryUrl.includes('/login')) {
      console.log('   ⚠️  需要登入（這是正常的）');
    } else {
      console.log(`   ❌ 被重定向到: ${discoveryUrl}`);
    }

    // 4. 測試登出後再登入
    console.log('\n4. 測試登出後再登入...');
    
    // 先登出
    await page.goto('http://localhost:3004/api/auth/logout');
    
    // 再登入
    await page.goto('http://localhost:3004/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
    
    const afterLoginUrl = page.url();
    console.log(`   登入後導向到: ${afterLoginUrl}`);
    
    if (afterLoginUrl.includes('/dashboard')) {
      console.log('   ✅ 成功！登入後直接進入 dashboard');
    } else if (afterLoginUrl.includes('/onboarding')) {
      console.log('   ❌ 問題！登入後被導向到 onboarding');
    }

    console.log('\n===== 測試總結 =====');
    console.log('如果看到 dashboard 和三大模式都能訪問，表示修改成功！');
    console.log('Onboarding 現在是可選的，不會阻擋使用者使用核心功能。');

  } catch (error) {
    console.error('測試過程中發生錯誤:', error);
  } finally {
    // 保持瀏覽器開啟 10 秒以便觀察
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();