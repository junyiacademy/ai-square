import { chromium } from 'playwright';

const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';
const TEST_EMAIL = `url.fixed.${Date.now()}@gmail.com`;
const TEST_PASSWORD = 'TestPassword123!';

async function testFinalUrl() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const page = await browser.newContext().then(ctx => ctx.newPage());
  
  console.log('=== 測試修復後的驗證郵件 URL ===');
  console.log('測試帳號:', TEST_EMAIL);
  
  try {
    await page.goto(STAGING_URL + '/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.fill('input[name="name"]', 'URL Fixed Test');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
    
    const checkbox = page.locator('input[type="checkbox"]');
    if (await checkbox.count() > 0) {
      await checkbox.check();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    if (!page.url().includes('/register')) {
      console.log('✅ 註冊成功！');
      console.log('📧 請檢查郵箱，驗證 URL 應該是:');
      console.log('   https://ai-square-staging-731209836128.asia-east1.run.app/verify-email?token=...');
    }
    
  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await browser.close();
  }
}

testFinalUrl().catch(console.error);