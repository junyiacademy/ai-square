import { chromium } from 'playwright';

const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';
const TEST_EMAIL = `test.user.${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'Test User';

async function testCompleteFlow() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log('=== AI Square 完整功能測試 ===\n');
  console.log('測試時間:', new Date().toLocaleString());
  console.log('測試 URL:', STAGING_URL);
  console.log('測試帳號:', TEST_EMAIL);
  console.log('');

  const testResults = {
    database: false,
    registration: false,
    login: false,
    pbl: false,
    assessment: false,
    discovery: false
  };

  try {
    // ========== 1. 驗證資料庫連接 ==========
    console.log('📊 1. 驗證資料庫連接...');
    const pblResponse = await page.request.get(STAGING_URL + '/api/pbl/scenarios');
    const pblData = await pblResponse.json();
    
    if (pblData.success && pblData.data.scenarios.length > 0) {
      console.log(`  ✅ 資料庫連接正常，找到 ${pblData.data.scenarios.length} 個 PBL 場景`);
      testResults.database = true;
    } else {
      console.log('  ❌ 資料庫連接失敗或無資料');
    }

    // ========== 2. 註冊測試 ==========
    console.log('\n📝 2. 測試註冊功能...');
    await page.goto(STAGING_URL + '/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/complete-1-register.png' });
    
    // 填寫註冊表單
    const nameInput = page.locator('input[name="name"], input[id="name"]');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[name="password"], input[id="password"]').first();
    const confirmPasswordInput = page.locator('input[name="confirmPassword"], input[id="confirmPassword"]');
    const termsCheckbox = page.locator('input[type="checkbox"]');
    
    if (await nameInput.count() > 0) {
      await nameInput.fill(TEST_NAME);
      await emailInput.fill(TEST_EMAIL);
      await passwordInput.fill(TEST_PASSWORD);
      await confirmPasswordInput.fill(TEST_PASSWORD);
      
      if (await termsCheckbox.count() > 0) {
        await termsCheckbox.check();
      }
      
      // 提交註冊
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      await page.waitForTimeout(5000);
      
      // 檢查是否成功註冊
      const currentUrl = page.url();
      if (!currentUrl.includes('/register')) {
        console.log('  ✅ 註冊成功！');
        testResults.registration = true;
        await page.screenshot({ path: 'test-screenshots/complete-2-after-register.png' });
      } else {
        const errorMessage = await page.locator('.error, .alert').textContent().catch(() => '');
        console.log('  ⚠️ 註冊可能失敗:', errorMessage || '帳號可能已存在');
      }
    }

    // ========== 3. 登入測試 ==========
    if (!testResults.registration) {
      console.log('\n🔐 3. 測試登入功能（使用現有帳號）...');
      await page.goto(STAGING_URL + '/login', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      const loginEmailInput = page.locator('input[type="email"]');
      const loginPasswordInput = page.locator('input[type="password"]');
      
      await loginEmailInput.fill(TEST_EMAIL);
      await loginPasswordInput.fill(TEST_PASSWORD);
      
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.click();
      await page.waitForTimeout(5000);
      
      if (!page.url().includes('/login')) {
        console.log('  ✅ 登入成功！');
        testResults.login = true;
        await page.screenshot({ path: 'test-screenshots/complete-3-after-login.png' });
      } else {
        console.log('  ❌ 登入失敗');
      }
    } else {
      testResults.login = true;
    }

    // ========== 4. PBL 模組測試 ==========
    console.log('\n📚 4. 測試 PBL 模組...');
    await page.goto(STAGING_URL + '/pbl/scenarios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/complete-4-pbl-list.png' });
    
    const pblCards = await page.locator('article, .card, div[role="article"], a[href*="/pbl/scenarios/"]').all();
    console.log(`  找到 ${pblCards.length} 個 PBL 場景卡片`);
    
    if (pblCards.length > 0) {
      // 點擊第一個場景
      await pblCards[0].click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-screenshots/complete-5-pbl-detail.png' });
      
      // 檢查開始按鈕
      const startButtons = await page.locator('button:has-text("Start"), button:has-text("開始"), button:has-text("Begin")').all();
      if (startButtons.length > 0) {
        console.log('  ✅ PBL 場景載入成功');
        testResults.pbl = true;
        
        // 嘗試開始學習
        await startButtons[0].click();
        await page.waitForTimeout(5000);
        
        if (page.url().includes('/tasks/') || page.url().includes('/program/')) {
          console.log('  ✅ 成功進入 PBL 學習任務');
          await page.screenshot({ path: 'test-screenshots/complete-6-pbl-task.png' });
        }
      }
    }

    // ========== 5. Assessment 模組測試 ==========
    console.log('\n📊 5. 測試 Assessment 模組...');
    await page.goto(STAGING_URL + '/assessment/scenarios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/complete-7-assessment-list.png' });
    
    const assessmentCards = await page.locator('article, .card, div[role="article"], a[href*="/assessment/scenarios/"]').all();
    console.log(`  找到 ${assessmentCards.length} 個 Assessment 場景卡片`);
    
    if (assessmentCards.length > 0) {
      await assessmentCards[0].click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-screenshots/complete-8-assessment-detail.png' });
      
      const assessmentStartButtons = await page.locator('button:has-text("Start"), button:has-text("開始"), button:has-text("Begin")').all();
      if (assessmentStartButtons.length > 0) {
        console.log('  ✅ Assessment 場景載入成功');
        testResults.assessment = true;
      }
    }

    // ========== 6. Discovery 模組測試 ==========
    console.log('\n🔍 6. 測試 Discovery 模組...');
    await page.goto(STAGING_URL + '/discovery/scenarios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/complete-9-discovery-list.png' });
    
    const discoveryCards = await page.locator('article, .card, div[role="article"], a[href*="/discovery/scenarios/"]').all();
    console.log(`  找到 ${discoveryCards.length} 個 Discovery 場景卡片`);
    
    if (discoveryCards.length > 0) {
      await discoveryCards[0].click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-screenshots/complete-10-discovery-detail.png' });
      
      const discoveryStartButtons = await page.locator('button:has-text("Start"), button:has-text("開始"), button:has-text("Explore")').all();
      if (discoveryStartButtons.length > 0) {
        console.log('  ✅ Discovery 場景載入成功');
        testResults.discovery = true;
      }
    }

    // ========== 7. 測試用戶資料持久化 ==========
    if (testResults.login || testResults.registration) {
      console.log('\n💾 7. 驗證用戶資料持久化...');
      
      // 檢查 profile API
      const profileResponse = await page.request.get(STAGING_URL + '/api/auth/profile');
      if (profileResponse.ok()) {
        const profileData = await profileResponse.json();
        console.log('  ✅ 用戶資料已儲存到資料庫');
        console.log('    - Email:', profileData.email || profileData.user?.email || TEST_EMAIL);
      }
      
      // 檢查學習進度 API
      const progressResponse = await page.request.get(STAGING_URL + '/api/learning/progress');
      if (progressResponse.ok()) {
        console.log('  ✅ 學習進度 API 正常');
      }
    }

  } catch (error) {
    console.error('\n❌ 測試錯誤:', error instanceof Error ? error.message : String(error));
    await page.screenshot({ path: 'test-screenshots/complete-error.png', fullPage: true });
  } finally {
    // ========== 測試結果總結 ==========
    console.log('\n' + '='.repeat(50));
    console.log('📊 測試結果總結\n');
    
    const results = [
      { name: '資料庫連接', status: testResults.database },
      { name: '用戶註冊', status: testResults.registration },
      { name: '用戶登入', status: testResults.login },
      { name: 'PBL 模組', status: testResults.pbl },
      { name: 'Assessment 模組', status: testResults.assessment },
      { name: 'Discovery 模組', status: testResults.discovery }
    ];
    
    results.forEach(result => {
      console.log(`${result.status ? '✅' : '❌'} ${result.name}`);
    });
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n整體成功率: ${successRate}% (${passedTests}/${totalTests})`);
    
    if (successRate === '100') {
      console.log('\n🎉 所有測試通過！Staging 環境完全正常運作。');
    } else if (parseFloat(successRate) >= 50) {
      console.log('\n⚠️ 部分功能正常，但仍有問題需要修復。');
    } else {
      console.log('\n❌ 多數功能失敗，需要檢查配置和程式碼。');
    }
    
    console.log('\n截圖已保存在 test-screenshots 目錄。');
    console.log('='.repeat(50));
    
    await browser.close();
  }
}

// 執行測試
testCompleteFlow().catch(console.error);