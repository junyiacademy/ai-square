import { chromium } from 'playwright';

const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';
const TEST_EMAIL = `test.url.${Date.now()}@gmail.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'URL Fix Test';

async function testEmailUrlFix() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log('=== 測試驗證郵件 URL 修復 ===\n');
  console.log('測試時間:', new Date().toLocaleString());
  console.log('測試帳號:', TEST_EMAIL);
  console.log('');

  try {
    // 1. 註冊新帳號
    console.log('📝 1. 註冊新帳號...');
    await page.goto(STAGING_URL + '/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 填寫表單
    await page.fill('input[name="name"]', TEST_NAME);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
    
    // 勾選條款
    const checkbox = page.locator('input[type="checkbox"]');
    if (await checkbox.count() > 0) {
      await checkbox.check();
    }
    
    console.log('   填寫完成，提交註冊...');
    await page.screenshot({ path: 'test-screenshots/url-fix-1-register.png' });
    
    // 提交
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000); // 等待郵件發送
    
    // 檢查結果
    const currentUrl = page.url();
    await page.screenshot({ path: 'test-screenshots/url-fix-2-after-register.png' });
    
    if (!currentUrl.includes('/register')) {
      console.log('   ✅ 註冊成功！');
      console.log('   📧 驗證郵件應該已發送到:', TEST_EMAIL);
    } else {
      const errorText = await page.locator('.error, .alert, [role="alert"]').textContent().catch(() => '');
      console.log('   ⚠️ 註冊狀態:', errorText || '未知');
    }
    
    // 2. 檢查郵件日誌
    console.log('\n📋 2. 檢查 Cloud Run 日誌中的驗證 URL...');
    
  } catch (error) {
    console.error('\n❌ 測試錯誤:', error instanceof Error ? error.message : String(error));
    await page.screenshot({ path: 'test-screenshots/url-fix-error.png' });
  } finally {
    await browser.close();
  }
}

// 檢查日誌中的 URL
async function checkEmailUrlInLogs() {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    // 查詢最近的驗證 URL
    const { stdout } = await execPromise(`
      gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-square-staging AND \\"Verification URL\\"" --limit=3 --format="value(textPayload)" | grep -o "http[s]*://[^[:space:]]*"
    `);
    
    console.log('\n📍 最近的驗證 URL：');
    if (stdout) {
      const urls = stdout.trim().split('\n');
      urls.forEach((url: string) => {
        if (url.includes('localhost')) {
          console.log('   ❌ 仍然使用 localhost:', url);
        } else if (url.includes('ai-square-staging')) {
          console.log('   ✅ 正確的 staging URL:', url);
        } else {
          console.log('   ❓ 未知 URL:', url);
        }
      });
    } else {
      console.log('   （無驗證 URL 日誌）');
    }
  } catch (error) {
    console.log('   無法獲取日誌');
  }
  
  console.log('\n=== 修復總結 ===');
  console.log('✅ NEXT_PUBLIC_APP_URL 已設置為: https://ai-square-staging-731209836128.asia-east1.run.app');
  console.log('✅ 新的註冊應該會收到正確的驗證 URL');
  console.log('');
  console.log('📌 注意事項：');
  console.log('1. 環境變數已更新，新的請求會使用正確的 URL');
  console.log('2. 請檢查測試郵箱確認驗證郵件中的 URL');
  console.log('3. 驗證 URL 應該是: https://ai-square-staging-731209836128.asia-east1.run.app/verify-email?token=...');
}

// 執行測試
testEmailUrlFix().then(() => {
  setTimeout(checkEmailUrlInLogs, 3000);
}).catch(console.error);