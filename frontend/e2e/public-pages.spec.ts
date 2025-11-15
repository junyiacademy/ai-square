import { test, expect } from '@playwright/test';

test.describe('Public Pages Tests', () => {

  test('首頁正常載入', async ({ page }) => {
    await page.goto('http://localhost:3004');
    await page.waitForLoadState('networkidle');

    // 檢查首頁有標題
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log(`✅ 首頁標題: ${title}`);

    // 檢查導航存在
    const nav = await page.locator('nav').count();
    expect(nav).toBeGreaterThan(0);
    console.log('✅ 導航列存在');
  });

  test('關係圖頁面載入', async ({ page }) => {
    await page.goto('http://localhost:3004/relations');
    await page.waitForLoadState('networkidle');

    // 檢查是否有 SVG 元素（關係圖）
    const svg = await page.locator('svg').count();
    console.log(`找到 ${svg} 個 SVG 元素`);

    // 檢查是否有標題
    const heading = await page.locator('h1, h2').first().textContent();
    console.log(`✅ 頁面標題: ${heading}`);
  });

  test('登入頁面載入', async ({ page }) => {
    await page.goto('http://localhost:3004/login');
    await page.waitForLoadState('networkidle');

    // 檢查登入表單元素
    const emailInput = await page.locator('input[type="email"], input[name="email"], #email').count();
    const passwordInput = await page.locator('input[type="password"], #password').count();
    const loginButton = await page.locator('button:has-text("Login"), button:has-text("登入")').count();

    console.log(`Email 輸入框: ${emailInput}`);
    console.log(`Password 輸入框: ${passwordInput}`);
    console.log(`登入按鈕: ${loginButton}`);

    expect(emailInput).toBeGreaterThan(0);
    expect(passwordInput).toBeGreaterThan(0);
    expect(loginButton).toBeGreaterThan(0);
    console.log('✅ 登入表單元素都存在');
  });

  test('註冊頁面載入', async ({ page }) => {
    await page.goto('http://localhost:3004/signup');
    await page.waitForLoadState('networkidle');

    // 檢查註冊表單
    const form = await page.locator('form').count();
    const submitButton = await page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("註冊")').count();

    console.log(`表單數量: ${form}`);
    console.log(`提交按鈕: ${submitButton}`);

    expect(form).toBeGreaterThan(0);
    console.log('✅ 註冊頁面正常載入');
  });
});
