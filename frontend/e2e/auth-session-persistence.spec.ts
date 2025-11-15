import { test, expect } from '@playwright/test';

/**
 * E2E 測試：確保登入後 session 正確維持
 *
 * 背景：2025-08-17 發生的 bug
 * - 用戶登入後訪問受保護頁面會被踢回登入頁
 * - 原因是 accessToken cookie 被錯誤設定為 sessionToken 的值
 *
 * 這個測試模擬真實用戶行為，確保問題不再發生
 */

test.describe('認證 Session 持久性測試', () => {
  test('登入後應該能夠訪問所有受保護頁面而不被重定向', async ({ page }) => {
    // 1. 前往登入頁面
    await page.goto('/login');

    // 2. 使用 Demo Account 登入
    await page.click('button:has-text("Student Demo Account")');
    await page.waitForTimeout(500); // 等待表單填充

    // 3. 提交登入
    await page.click('button[type="submit"]');

    // 4. 等待登入完成並導航到首頁
    await page.waitForURL((url) => !url.href.includes('/login'), {
      timeout: 10000,
      waitUntil: 'networkidle'
    });

    console.log('登入成功，當前頁面:', page.url());

    // 5. 檢查 cookies 是否正確設定
    const cookies = await page.context().cookies();
    const cookieMap = new Map(cookies.map(c => [c.name, c.value]));

    // 驗證必要的 cookies
    expect(cookieMap.has('isLoggedIn')).toBe(true);
    expect(cookieMap.get('isLoggedIn')).toBe('true');
    expect(cookieMap.has('sessionToken')).toBe(true);
    expect(cookieMap.has('accessToken')).toBe(true);

    // 關鍵檢查：確保 accessToken 和 sessionToken 的值不同
    const sessionTokenValue = cookieMap.get('sessionToken');
    const accessTokenValue = cookieMap.get('accessToken');
    expect(sessionTokenValue).toBeTruthy();
    expect(accessTokenValue).toBeTruthy();
    expect(accessTokenValue).not.toBe(sessionTokenValue);

    // 6. 測試訪問各個受保護頁面
    const protectedRoutes = [
      { path: '/pbl', name: 'PBL' },
      { path: '/assessment/scenarios', name: 'Assessment' },
      { path: '/discovery', name: 'Discovery' },
      { path: '/profile', name: 'Profile' }
    ];

    for (const route of protectedRoutes) {
      console.log(`測試訪問 ${route.name}...`);

      // 導航到受保護頁面
      await page.goto(route.path);

      // 等待頁面載入
      await page.waitForLoadState('networkidle');

      // 取得最終 URL
      const finalUrl = page.url();

      // 驗證沒有被重定向到登入頁面
      expect(finalUrl).not.toContain('/login');
      console.log(`✅ ${route.name} 訪問成功，URL: ${finalUrl}`);

      // 額外檢查：確保頁面有內容（不是空白或錯誤頁）
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
      expect(pageTitle).not.toBe('Error');
    }

    // 7. 測試頁面刷新後仍保持登入狀態
    console.log('測試刷新頁面...');
    await page.reload();
    await page.waitForLoadState('networkidle');

    const urlAfterReload = page.url();
    expect(urlAfterReload).not.toContain('/login');
    console.log('✅ 刷新後仍保持登入狀態');

    // 8. 使用導航連結測試（模擬真實用戶點擊）
    console.log('測試使用導航連結...');

    // 如果有導航選單，點擊 PBL 連結
    const pblLink = page.locator('a[href="/pbl"]').first();
    if (await pblLink.isVisible()) {
      await pblLink.click();
      await page.waitForLoadState('networkidle');

      const navUrl = page.url();
      expect(navUrl).not.toContain('/login');
      console.log('✅ 導航連結正常工作');
    }
  });

  test('檢查 API 認證狀態與 cookies 一致性', async ({ page }) => {
    // 1. 登入
    await page.goto('/login');
    await page.click('button:has-text("Student Demo Account")');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'));

    // 2. 直接呼叫 auth check API
    const authCheckResponse = await page.request.get('/api/auth/check');
    const authData = await authCheckResponse.json();

    // 3. 驗證 API 回應
    expect(authData.authenticated).toBe(true);
    expect(authData.user).toBeDefined();
    expect(authData.user.email).toBe('student@example.com');

    // 4. 取得瀏覽器中的 cookies
    const browserCookies = await page.evaluate(() => document.cookie);

    // 5. 驗證瀏覽器可以讀取必要的 cookies
    expect(browserCookies).toContain('isLoggedIn=true');

    console.log('✅ API 認證狀態正確');
  });
});

/**
 * 回歸測試：專門測試之前的 bug 情境
 */
test.describe('認證 Bug 回歸測試', () => {
  test('確保 accessToken 不會被設定為 sessionToken 的值', async ({ page }) => {
    // 登入前清除所有 cookies
    await page.context().clearCookies();

    // 執行登入
    await page.goto('/login');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'student123');
    await page.click('button[type="submit"]');

    // 等待登入完成
    await page.waitForURL((url) => !url.href.includes('/login'));

    // 取得所有 cookies
    const cookies = await page.context().cookies();

    // 建立 cookie map 方便檢查
    const cookiesByName = new Map<string, any>();
    cookies.forEach(cookie => {
      cookiesByName.set(cookie.name, cookie);
    });

    // 關鍵測試：確保這兩個 cookie 存在且值不同
    const sessionTokenCookie = cookiesByName.get('sessionToken');
    const accessTokenCookie = cookiesByName.get('accessToken');

    expect(sessionTokenCookie).toBeDefined();
    expect(accessTokenCookie).toBeDefined();

    // 這是最重要的檢查！
    expect(accessTokenCookie.value).not.toBe(sessionTokenCookie.value);

    // 額外檢查：確保 cookie 有合理的過期時間
    const accessTokenExpiry = new Date(accessTokenCookie.expires * 1000);
    const now = new Date();
    const hoursDiff = (accessTokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 應該至少有 20 小時的有效期（不是只有 15 分鐘）
    expect(hoursDiff).toBeGreaterThan(20);

    console.log('✅ Cookie 值正確且有效期合理');
  });
});
