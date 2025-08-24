import { chromium } from 'playwright';

async function testLoginHeader() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('1. 訪問首頁...');
  await page.goto('http://localhost:3007');
  await page.waitForLoadState('networkidle');

  // 截圖首頁初始狀態
  await page.screenshot({ path: 'screenshots/1-homepage-initial.png', fullPage: true });
  console.log('   已截圖: screenshots/1-homepage-initial.png');

  // 檢查初始 header 狀態
  const signInButton = await page.locator('text="Sign in"').first();
  if (await signInButton.isVisible()) {
    console.log('   ✓ Header 顯示 "Sign in" 按鈕');
  }

  console.log('\n2. 點擊登入按鈕...');
  await signInButton.click();
  await page.waitForURL('**/login');
  
  await page.screenshot({ path: 'screenshots/2-login-page.png', fullPage: true });
  console.log('   已截圖: screenshots/2-login-page.png');

  console.log('\n3. 使用 demo 帳號登入...');
  await page.fill('input[type="email"]', 'student@test.com');
  await page.fill('input[type="password"]', 'student123');
  
  await page.screenshot({ path: 'screenshots/3-login-filled.png', fullPage: true });
  console.log('   已截圖: screenshots/3-login-filled.png');

  // 點擊登入按鈕
  await page.click('button[type="submit"]');
  
  // 等待導航或登入完成
  try {
    await page.waitForURL('http://localhost:3007/', { timeout: 10000 });
    console.log('   ✓ 登入成功，已重定向到首頁');
  } catch (e) {
    console.log('   ! 可能仍在登入頁面，檢查是否有錯誤訊息');
    const errorMessage = await page.locator('.text-red-500, .error-message').textContent().catch(() => null);
    if (errorMessage) {
      console.log('   錯誤訊息:', errorMessage);
    }
  }

  // 等待一下讓頁面完全載入
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');

  console.log('\n4. 檢查登入後的 header 狀態...');
  await page.screenshot({ path: 'screenshots/4-after-login.png', fullPage: true });
  console.log('   已截圖: screenshots/4-after-login.png');

  // 檢查 header 狀態
  const signInButtonAfterLogin = await page.locator('text="Sign in"').first().isVisible().catch(() => false);
  const userMenu = await page.locator('[data-testid="user-menu"], .user-menu, button:has-text("student@test.com")').isVisible().catch(() => false);
  
  console.log('\n=== 測試結果 ===');
  if (signInButtonAfterLogin) {
    console.log('❌ BUG 復現: 登入後 header 仍顯示 "Sign in" 按鈕');
  } else {
    console.log('✓ Header 不再顯示 "Sign in" 按鈕');
  }
  
  if (userMenu) {
    console.log('✓ 顯示用戶選單');
  } else {
    console.log('❌ 未顯示用戶選單');
  }

  // 檢查 cookies
  const cookies = await context.cookies();
  const hasAuthCookie = cookies.some(cookie => 
    cookie.name === 'accessToken' || 
    cookie.name === 'auth-token' || 
    cookie.name.includes('auth')
  );
  console.log('\nCookies 狀態:', hasAuthCookie ? '✓ 有認證 cookie' : '❌ 沒有認證 cookie');
  console.log('所有 cookies:', cookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`).join(', '));

  // 檢查 localStorage
  const localStorageData = await page.evaluate(() => {
    return Object.keys(localStorage).reduce((acc, key) => {
      acc[key] = localStorage.getItem(key);
      return acc;
    }, {} as Record<string, string | null>);
  });
  console.log('\nlocalStorage 狀態:', Object.keys(localStorageData).length > 0 ? localStorageData : '空');

  // 等待用戶查看
  console.log('\n按 Ctrl+C 結束測試...');
  await page.waitForTimeout(60000);

  await browser.close();
}

// 創建 screenshots 目錄
import { mkdirSync } from 'fs';
try {
  mkdirSync('screenshots', { recursive: true });
} catch (e) {}

testLoginHeader().catch(console.error);