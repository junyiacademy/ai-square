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

    // 檢查登入按鈕變為可用
    await expect(page.getByRole('button', { name: 'Login' })).toBeEnabled()

    // 點擊登入按鈕
    await page.getByRole('button', { name: 'Login' }).click()

    // 檢查載入狀態
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible()

    // 等待重定向到 relations 頁面
    await expect(page).toHaveURL(/\/relations/)

    // 檢查登入成功後的元素
    // 這裡需要根據實際的 relations 頁面來調整
    await expect(page.getByText(/AI 素養/)).toBeVisible()
  })

  test('🟢 綠燈測試 - 成功登入教師帳戶', async ({ page }) => {
    await page.getByLabel('Email').fill('teacher@example.com')
    await page.getByLabel('Password').fill('teacher123')

    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page).toHaveURL(/\/relations/)
    // 可能會有不同的權限或介面
  })

  test('🟢 綠燈測試 - 成功登入管理員帳戶', async ({ page }) => {
    await page.getByLabel('Email').fill('admin@example.com')
    await page.getByLabel('Password').fill('admin123')

    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page).toHaveURL(/\/relations/)
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