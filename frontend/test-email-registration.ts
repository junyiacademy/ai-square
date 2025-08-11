import { chromium } from 'playwright';

const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';
const TEST_EMAIL = `test.email.${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'Email Test User';

async function testEmailRegistration() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log('=== 測試郵件註冊功能 ===\n');
  console.log('測試時間:', new Date().toLocaleString());
  console.log('測試帳號:', TEST_EMAIL);
  console.log('');

  try {
    // 1. 進入註冊頁面
    console.log('📝 1. 進入註冊頁面...');
    await page.goto(STAGING_URL + '/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/email-1-register-page.png' });
    
    // 2. 填寫註冊表單
    console.log('📝 2. 填寫註冊表單...');
    await page.fill('input[name="name"]', TEST_NAME);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
    
    // 勾選同意條款
    const checkbox = page.locator('input[type="checkbox"]');
    if (await checkbox.count() > 0) {
      await checkbox.check();
    }
    
    await page.screenshot({ path: 'test-screenshots/email-2-form-filled.png' });
    
    // 3. 提交註冊
    console.log('📤 3. 提交註冊...');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // 等待回應
    await page.waitForTimeout(5000);
    
    // 4. 檢查結果
    const currentUrl = page.url();
    await page.screenshot({ path: 'test-screenshots/email-3-after-submit.png' });
    
    if (currentUrl.includes('/verify-email') || currentUrl.includes('/dashboard')) {
      console.log('✅ 註冊成功！已跳轉到驗證頁面或儀表板');
      
      // 檢查頁面上的訊息
      const messages = await page.locator('text=/check.*email|verify.*email|verification/i').all();
      if (messages.length > 0) {
        console.log('✅ 顯示郵件驗證提示');
      }
    } else if (currentUrl.includes('/register')) {
      // 檢查錯誤訊息
      const errorMessages = await page.locator('.error, .alert, [role="alert"]').all();
      if (errorMessages.length > 0) {
        for (const msg of errorMessages) {
          const text = await msg.textContent();
          console.log('⚠️ 錯誤訊息:', text);
        }
      }
    } else {
      console.log('📍 當前頁面:', currentUrl);
    }
    
    // 5. 測試登入（不管郵件是否驗證）
    console.log('\n🔐 4. 測試登入（未驗證郵件）...');
    await page.goto(STAGING_URL + '/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();
    await page.waitForTimeout(5000);
    
    const loginUrl = page.url();
    if (!loginUrl.includes('/login')) {
      console.log('✅ 登入成功（即使郵件未驗證）');
      await page.screenshot({ path: 'test-screenshots/email-4-logged-in.png' });
    } else {
      console.log('❌ 登入失敗');
    }
    
    // 6. 檢查 API 日誌
    console.log('\n📧 5. 檢查郵件發送狀態...');
    console.log('註：請檢查 Cloud Run 日誌確認郵件是否成功發送');
    console.log('如果郵件發送成功，應該會在日誌中看到：');
    console.log('  - "📧 Sending verification email to [email]"');
    console.log('  - 或 "⚠️ Failed to send verification email"');
    
  } catch (error) {
    console.error('\n❌ 測試錯誤:', error instanceof Error ? error.message : String(error));
    await page.screenshot({ path: 'test-screenshots/email-error.png' });
  } finally {
    console.log('\n=== 測試總結 ===');
    console.log('1. 郵件服務已配置：');
    console.log('   - GMAIL_USER: ai-square@junyiacademy.org');
    console.log('   - GMAIL_APP_PASSWORD: 已設置');
    console.log('\n2. 預期行為：');
    console.log('   - 註冊成功後應發送驗證郵件');
    console.log('   - 即使未驗證也可以登入（目前不強制驗證）');
    console.log('   - 用戶可以稍後驗證郵件');
    console.log('\n截圖已保存在 test-screenshots 目錄');
    
    await browser.close();
  }
}

testEmailRegistration().catch(console.error);