import { chromium } from 'playwright';

const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';
const TEST_EMAIL = `verify.${Date.now()}@gmail.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'Verify URL Test';

async function testUrlAfterRedeploy() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log('=== 測試重新部署後的驗證 URL ===\n');
  console.log('測試時間:', new Date().toLocaleString());
  console.log('測試帳號:', TEST_EMAIL);
  console.log('');

  try {
    console.log('📝 註冊新帳號...');
    await page.goto(STAGING_URL + '/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.fill('input[name="name"]', TEST_NAME);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
    
    const checkbox = page.locator('input[type="checkbox"]');
    if (await checkbox.count() > 0) {
      await checkbox.check();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);
    
    const currentUrl = page.url();
    if (!currentUrl.includes('/register')) {
      console.log('✅ 註冊成功！');
      console.log('📧 驗證郵件已發送到:', TEST_EMAIL);
      console.log('\n請檢查您的郵箱，驗證 URL 現在應該是:');
      console.log('https://ai-square-staging-731209836128.asia-east1.run.app/verify-email?token=...');
    }
    
  } catch (error) {
    console.error('❌ 錯誤:', error instanceof Error ? error.message : String(error));
  } finally {
    await browser.close();
  }
}

// 檢查最新日誌
async function checkLatestLogs() {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    const { stdout } = await execPromise(`
      gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-square-staging AND resource.labels.revision_name=ai-square-staging-00025-vxx AND \\"Verification URL\\"" --limit=2 --format="value(textPayload)"
    `);
    
    console.log('\n📋 最新版本的驗證 URL 日誌：');
    if (stdout && stdout.includes('Verification URL')) {
      const urlMatch = stdout.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        const url = urlMatch[0];
        if (url.includes('localhost')) {
          console.log('   ❌ 仍然使用 localhost:', url);
        } else if (url.includes('ai-square-staging')) {
          console.log('   ✅ 正確！使用 staging URL:', url);
        }
      }
    } else {
      console.log('   等待新的日誌...');
    }
  } catch (error) {
    console.log('   無法獲取日誌');
  }
}

testUrlAfterRedeploy().then(() => {
  setTimeout(checkLatestLogs, 5000);
}).catch(console.error);