import { test, expect } from '@playwright/test';

const PREVIEW_URL = 'https://ai-square-preview-issue-28-m7s4ucbgba-de.a.run.app';

test.describe('Issue #28: Login Header State Sync', () => {
  test('should display user avatar after login (not "登入" button)', async ({ page }) => {
    // 1. Navigate to preview environment
    await page.goto(PREVIEW_URL);

    // 2. Wait for page to load
    await page.waitForLoadState('networkidle');

    // 3. Check initial state - should show "登入" button
    const loginButton = page.locator('text=登入').first();
    await expect(loginButton).toBeVisible({ timeout: 10000 });

    // 4. Click login button
    await loginButton.click();

    // 5. Wait for navigation to login page
    await page.waitForURL(/.*login.*/);

    // 6. Fill in login form
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'student123');

    // 7. Click 登入 button (wait for it to be enabled after filling fields)
    // Use form button[type="submit"] to avoid selecting Header login button
    const loginSubmitButton = page.locator('form button[type="submit"]');
    await expect(loginSubmitButton).toBeEnabled({ timeout: 5000 });
    await loginSubmitButton.click();

    // 8. Wait for redirect after login (should go to /pbl/scenarios based on login code)
    await page.waitForURL((url) => {
      const pathname = new URL(url).pathname;
      return pathname.includes('/pbl/scenarios') ||
             pathname.includes('/dashboard') ||
             pathname.includes('/onboarding');
    }, { timeout: 15000 });

    // 9. CRITICAL CHECK: Header should now show user avatar, NOT "登入" button
    await page.waitForTimeout(2000); // Wait for React state to propagate

    const loginButtonAfter = page.locator('text=登入').first();
    await expect(loginButtonAfter).not.toBeVisible({ timeout: 5000 });

    // 10. User avatar or menu should be visible
    const userAvatar = page.locator('[data-testid="user-avatar"]').or(page.locator('button:has-text("個人資料")'));
    await expect(userAvatar).toBeVisible({ timeout: 5000 });

    console.log('✅ Issue #28 FIXED: Header correctly displays user avatar after login');
  });

  test('should persist login state on page refresh', async ({ page }) => {
    // 1. Navigate and login
    await page.goto(PREVIEW_URL);
    await page.waitForLoadState('networkidle');

    const loginButton = page.locator('text=登入').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForURL(/.*login.*/);
      await page.fill('input[type="email"]', 'student@example.com');
      await page.fill('input[type="password"]', 'student123');
      const loginSubmitBtn = page.locator('form button[type="submit"]');
      await expect(loginSubmitBtn).toBeEnabled({ timeout: 5000 });
      await loginSubmitBtn.click();
      await page.waitForURL((url) => {
        const pathname = new URL(url).pathname;
        return pathname.includes('/pbl/scenarios') ||
               pathname.includes('/dashboard') ||
               pathname.includes('/onboarding');
      }, { timeout: 15000 });
      await page.waitForTimeout(2000);
    }

    // 2. Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 3. Header should still show user avatar
    const loginButtonAfterRefresh = page.locator('text=登入').first();
    await expect(loginButtonAfterRefresh).not.toBeVisible({ timeout: 5000 });

    console.log('✅ Login state persists after page refresh');
  });
});
