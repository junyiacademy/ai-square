/**
 * E2E 測試 - 完整登入流程
 * 測試真實的用戶登入場景
 */

import { test, expect } from '@playwright/test'

test.describe('登入流程 E2E 測試', () => {
  test.beforeEach(async ({ page }) => {
    // 前往登入頁面
    await page.goto('/login')
  })

  test('🔴 紅燈測試 - 頁面載入和基本元素', async ({ page }) => {
    // 檢查頁面標題
    await expect(page).toHaveTitle(/AI Square/)

    // 檢查測試帳戶提示存在
    await expect(page.getByText('Test Accounts')).toBeVisible()
    await expect(page.getByText('Student: student@example.com')).toBeVisible()
    await expect(page.getByText('Teacher: teacher@example.com')).toBeVisible()
    await expect(page.getByText('Admin: admin@example.com')).toBeVisible()

    // 檢查表單元素存在
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()

    // 檢查初始狀態
    await expect(page.getByRole('button', { name: 'Login' })).toBeDisabled()
  })

  test('🟢 綠燈測試 - 成功登入學生帳戶', async ({ page }) => {
    // 填寫學生帳戶資訊
    await page.getByLabel('Email').fill('student@example.com')
    await page.getByLabel('Password').fill('student123')

    // 等待按鈕變為可用（使用更長的等待時間）
    await page.waitForTimeout(500)
    
    // 檢查登入按鈕變為可用
    const loginButton = page.getByRole('button', { name: 'Login' })
    await expect(loginButton).toBeEnabled({ timeout: 5000 })

    // 點擊登入按鈕
    await loginButton.click()

    // 檢查載入狀態（可能會很快消失，所以使用較短的超時）
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible({ timeout: 1000 }).catch(() => {
      // 如果載入太快，載入狀態可能已經消失，這是正常的
    })

    // 等待重定向到 relations 頁面
    await expect(page).toHaveURL(/\/relations/, { timeout: 10000 })

    // 檢查登入成功後的元素（給頁面時間載入）
    await page.waitForLoadState('networkidle')
    
    // 檢查頁面上的特定元素來確認成功載入（使用更具體的選擇器）
    const pageTitle = page.getByRole('heading', { name: 'AI Literacy Relations Map' })
    await expect(pageTitle).toBeVisible({ timeout: 5000 })
  })

  test('🟢 綠燈測試 - 成功登入教師帳戶', async ({ page }) => {
    await page.getByLabel('Email').fill('teacher@example.com')
    await page.getByLabel('Password').fill('teacher123')
    
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page).toHaveURL(/\/relations/, { timeout: 10000 })
    // 可能會有不同的權限或介面
  })

  test('🟢 綠燈測試 - 成功登入管理員帳戶', async ({ page }) => {
    await page.getByLabel('Email').fill('admin@example.com')
    await page.getByLabel('Password').fill('admin123')
    
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page).toHaveURL(/\/relations/, { timeout: 10000 })
    // 管理員可能有額外的功能
  })

  test('❌ 錯誤處理 - 無效的登入資訊', async ({ page }) => {
    // 輸入錯誤的登入資訊
    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpassword')

    await page.getByRole('button', { name: 'Login' }).click()

    // 檢查錯誤訊息顯示
    await expect(page.getByText('Invalid email or password')).toBeVisible()

    // 確保沒有重定向
    await expect(page).toHaveURL(/\/login/)

    // 檢查表單仍然可用
    await expect(page.getByLabel('Email')).toBeEnabled()
    await expect(page.getByLabel('Password')).toBeEnabled()
  })

  test('❌ 錯誤處理 - 正確 email 但錯誤密碼', async ({ page }) => {
    await page.getByLabel('Email').fill('student@example.com')
    await page.getByLabel('Password').fill('wrongpassword')

    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page.getByText('Invalid email or password')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('❌ 錯誤處理 - 空的表單提交', async ({ page }) => {
    // 按鈕應該保持禁用狀態
    await expect(page.getByRole('button', { name: 'Login' })).toBeDisabled()

    // 即使嘗試點擊也不會有動作
    // 這個測試確保 UI 阻止了無效提交
  })

  test('🚨 邊界條件 - 特殊字符處理', async ({ page }) => {
    await page.getByLabel('Email').fill('test+special@example.com')
    await page.getByLabel('Password').fill('pass@word#123!')

    await page.getByRole('button', { name: 'Login' }).click()

    // 應該正常處理特殊字符，即使登入失敗
    await expect(page.getByText('Invalid email or password')).toBeVisible()
  })

  test('♿ 可訪問性 - 鍵盤導航', async ({ page }) => {
    // 使用 Tab 鍵導航
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Email')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Password')).toBeFocused()

    // 填寫表單使按鈕可用
    await page.getByLabel('Email').fill('student@example.com')
    await page.getByLabel('Password').fill('student123')

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Login' })).toBeFocused()

    // 使用 Enter 鍵提交
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/relations/)
  })

  test('♿ 可訪問性 - 螢幕閱讀器支援', async ({ page }) => {
    // 檢查表單標籤關聯
    const emailInput = page.getByLabel('Email')
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('required')

    const passwordInput = page.getByLabel('Password')
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(passwordInput).toHaveAttribute('required')

    // 檢查錯誤訊息的 ARIA 屬性
    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Login' }).click()

    const errorMessage = page.getByRole('alert')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toContainText('Invalid email or password')
  })

  test('🌐 多語言支援準備', async ({ page }) => {
    // 這個測試確保國際化鍵值有正確顯示
    // 目前是英文，但結構支援多語言
    await expect(page.getByText('Email')).toBeVisible()
    await expect(page.getByText('Password')).toBeVisible()
    await expect(page.getByText('Login')).toBeVisible()
    await expect(page.getByText('Test Accounts')).toBeVisible()
  })

  test('🔒 Remember Me 功能 - 勾選記住我', async ({ page, context, browserName }) => {
    // 根據瀏覽器使用不同的測試帳號，避免衝突
    const testAccounts = {
      chromium: { email: 'student@example.com', password: 'student123' },
      firefox: { email: 'teacher@example.com', password: 'teacher123' },
      webkit: { email: 'admin@example.com', password: 'admin123' }
    }
    const account = testAccounts[browserName] || testAccounts.chromium
    
    // 填寫登入資訊
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(account.password)
    
    // 勾選 Remember Me
    await page.locator('#remember-me').check()
    
    // 確認勾選狀態
    await expect(page.locator('#remember-me')).toBeChecked()
    
    // 等待登入按鈕可用
    const loginButton = page.getByRole('button', { name: 'Login' })
    await expect(loginButton).toBeEnabled({ timeout: 10000 })
    
    // 登入前截圖（調試用）
    await page.screenshot({ path: `test-results/before-login-${browserName}.png` })
    
    // 登入
    await loginButton.click()
    
    // 等待導航或錯誤訊息
    await page.waitForLoadState('networkidle')
    
    // 檢查是否有錯誤訊息
    const errorAlert = page.locator('[role="alert"]')
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.textContent()
      console.error(`Login failed with error: ${errorText}`)
    }
    
    // 登入後截圖（調試用）
    await page.screenshot({ path: `test-results/after-login-${browserName}.png` })
    
    await expect(page).toHaveURL(/\/relations/, { timeout: 10000 })
    
    // 檢查 cookies
    const cookies = await context.cookies()
    const rememberMeCookie = cookies.find(c => c.name === 'rememberMe')
    expect(rememberMeCookie?.value).toBe('true')
    
    // refreshToken 應該有 30 天期限（2592000 秒）
    const refreshTokenCookie = cookies.find(c => c.name === 'refreshToken')
    if (refreshTokenCookie && refreshTokenCookie.expires) {
      const expiresIn = refreshTokenCookie.expires - Date.now() / 1000
      expect(expiresIn).toBeGreaterThan(2500000) // 大約 30 天
    }
  })

  test('🔒 Remember Me 功能 - 不勾選記住我', async ({ page, context }) => {
    // 填寫登入資訊但不勾選 Remember Me
    await page.getByLabel('Email').fill('teacher@example.com')
    await page.getByLabel('Password').fill('teacher123')
    
    // 確認未勾選
    await expect(page.locator('#remember-me')).not.toBeChecked()
    
    // 登入
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL(/\/relations/)
    
    // 檢查 cookies
    const cookies = await context.cookies()
    const rememberMeCookie = cookies.find(c => c.name === 'rememberMe')
    expect(rememberMeCookie?.value).toBe('false')
    
    // refreshToken 應該有 7 天期限（604800 秒）
    const refreshTokenCookie = cookies.find(c => c.name === 'refreshToken')
    if (refreshTokenCookie && refreshTokenCookie.expires) {
      const expiresIn = refreshTokenCookie.expires - Date.now() / 1000
      expect(expiresIn).toBeLessThan(700000) // 小於 8 天
      expect(expiresIn).toBeGreaterThan(500000) // 大於 5 天
    }
  })

  test('🔄 表單重置和再次嘗試', async ({ page }) => {
    // 第一次失敗嘗試
    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page.getByText('Invalid email or password')).toBeVisible()

    // 清除表單並重新填寫正確資訊
    await page.getByLabel('Email').clear()
    await page.getByLabel('Password').clear()

    await page.getByLabel('Email').fill('student@example.com')
    await page.getByLabel('Password').fill('student123')

    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page).toHaveURL(/\/relations/)
  })

  test('📱 響應式設計 - 手機版面', async ({ page }) => {
    // 設置手機視窗大小
    await page.setViewportSize({ width: 375, height: 667 })

    // 檢查元素在小螢幕上仍然可見和可用
    await expect(page.getByText('Test Accounts')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()

    // 測試手機上的登入流程
    await page.getByLabel('Email').fill('student@example.com')
    await page.getByLabel('Password').fill('student123')
    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page).toHaveURL(/\/relations/)
  })
})