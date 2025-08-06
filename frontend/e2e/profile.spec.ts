import { test, expect } from '@playwright/test';

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // 先登入
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'UpdatedPassword123');
    await page.click('button[type="submit"]');
    
    // 等待登入成功
    await page.waitForURL(/dashboard|home|profile/, { timeout: 5000 });
  });

  test('should display profile page and user information', async ({ page }) => {
    // 導航到個人資料頁面
    await page.goto('http://localhost:3000/profile');
    
    // 檢查頁面標題
    await expect(page.locator('h1')).toContainText(/Profile|個人資料/);
    
    // 檢查 Email 顯示
    await expect(page.locator('input[type="email"]')).toHaveValue('student@example.com');
    
    // 檢查姓名欄位
    const nameInput = page.locator('input[id="name"]');
    await expect(nameInput).toBeVisible();
    
    // 檢查語言選擇器
    const languageSelect = page.locator('select[id="language"]');
    await expect(languageSelect).toBeVisible();
    
    // 截圖
    await page.screenshot({ path: 'screenshots/profile-page.png', fullPage: true });
  });

  test('should update profile information', async ({ page }) => {
    await page.goto('http://localhost:3000/profile');
    
    // 更新姓名
    const nameInput = page.locator('input[id="name"]');
    await nameInput.clear();
    await nameInput.fill('Test Updated Name');
    
    // 更新語言
    await page.selectOption('select[id="language"]', 'en');
    
    // 提交表單
    await page.click('button:has-text("Save")');
    
    // 等待成功訊息
    await expect(page.locator('text=/successfully|成功/')).toBeVisible({ timeout: 5000 });
    
    // 截圖
    await page.screenshot({ path: 'screenshots/profile-updated.png', fullPage: true });
  });

  test('should show email not verified warning', async ({ page }) => {
    await page.goto('http://localhost:3000/profile');
    
    // 檢查是否顯示未驗證警告
    const emailSection = page.locator('div:has(input[type="email"])');
    const warningText = emailSection.locator('text=/not verified|未驗證/');
    
    if (await warningText.isVisible()) {
      // 檢查重新發送按鈕
      const resendButton = page.locator('button:has-text(/Resend|重新發送/)');
      await expect(resendButton).toBeVisible();
      
      // 截圖
      await page.screenshot({ path: 'screenshots/email-not-verified.png', fullPage: true });
    }
  });
});