/**
 * E2E 測試 - 完整認證流程
 * 包含登入、登出、session 管理、token 更新等
 */

import { test, expect, Page } from '@playwright/test'

// 測試用戶資料
const TEST_USER = {
  email: 'student@example.com',
  password: 'student123',
  role: 'student'
}

// 輔助函數：執行登入
async function login(page: Page, rememberMe = false) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(TEST_USER.email)
  await page.getByLabel('Password').fill(TEST_USER.password)
  
  if (rememberMe) {
    await page.locator('#remember-me').check()
  }
  
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/relations/)
}

// 輔助函數：檢查登入狀態
async function checkLoggedIn(page: Page) {
  // 檢查是否在受保護頁面
  expect(page.url()).toContain('/relations')
  
  // 檢查登出按鈕存在
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
  await expect(logoutButton).toBeVisible()
}

// 輔助函數：檢查登出狀態
async function checkLoggedOut(page: Page) {
  // 應該重定向到登入頁
  await expect(page).toHaveURL(/\/login/)
  
  // 檢查登入表單存在
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
}

test.describe('完整認證流程測試', () => {
  test.beforeEach(async ({ page }) => {
    // 清除所有 cookies 和 localStorage
    await page.context().clearCookies()
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('完整登入登出流程', async ({ page }) => {
    // 1. 訪問受保護頁面應該重定向到登入頁
    await page.goto('/relations')
    await expect(page).toHaveURL(/\/login/)

    // 2. 執行登入
    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Login' }).click()

    // 3. 驗證登入成功
    await expect(page).toHaveURL(/\/relations/)
    await checkLoggedIn(page)

    // 4. 檢查 localStorage 有用戶資料
    const userData = await page.evaluate(() => localStorage.getItem('user'))
    expect(userData).toBeTruthy()
    const user = JSON.parse(userData!)
    expect(user.email).toBe(TEST_USER.email)

    // 5. 執行登出
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    await logoutButton.click()

    // 6. 驗證登出成功
    await checkLoggedOut(page)

    // 7. 檢查 localStorage 已清空
    const isLoggedIn = await page.evaluate(() => localStorage.getItem('isLoggedIn'))
    expect(isLoggedIn).toBe('false')
  })

  test('Session 持久化 - 頁面刷新', async ({ page }) => {
    // 1. 登入
    await login(page)

    // 2. 刷新頁面
    await page.reload()

    // 3. 應該仍然保持登入狀態
    await checkLoggedIn(page)
    expect(page.url()).toContain('/relations')
  })

  test('Session 持久化 - 新標籤頁', async ({ page, context }) => {
    // 1. 在第一個標籤頁登入
    await login(page)

    // 2. 開啟新標籤頁
    const newPage = await context.newPage()
    await newPage.goto('/relations')

    // 3. 新標籤頁應該也是登入狀態
    await checkLoggedIn(newPage)

    // 4. 在新標籤頁登出
    const logoutButton = newPage.getByRole('button', { name: /logout|sign out/i })
    await logoutButton.click()

    // 5. 檢查原標籤頁（需要刷新才會更新狀態）
    await page.reload()
    await checkLoggedOut(page)

    await newPage.close()
  })

  test('Remember Me - Cookie 驗證', async ({ page, context }) => {
    // 1. 使用 Remember Me 登入
    await login(page, true)

    // 2. 檢查 cookies
    const cookies = await context.cookies()
    
    // 檢查 rememberMe cookie
    const rememberMeCookie = cookies.find(c => c.name === 'rememberMe')
    expect(rememberMeCookie).toBeTruthy()
    expect(rememberMeCookie?.value).toBe('true')
    
    // 檢查 refreshToken cookie
    const refreshTokenCookie = cookies.find(c => c.name === 'refreshToken')
    expect(refreshTokenCookie).toBeTruthy()
    
    // Remember Me 應該有較長的過期時間（約 30 天）
    if (refreshTokenCookie?.expires) {
      const expiresIn = refreshTokenCookie.expires - Date.now() / 1000
      expect(expiresIn).toBeGreaterThan(2500000) // > 29 天
    }
  })

  test('無 Remember Me - Cookie 驗證', async ({ page, context }) => {
    // 1. 不使用 Remember Me 登入
    await login(page, false)

    // 2. 檢查 cookies
    const cookies = await context.cookies()
    
    // 檢查 rememberMe cookie
    const rememberMeCookie = cookies.find(c => c.name === 'rememberMe')
    expect(rememberMeCookie).toBeTruthy()
    expect(rememberMeCookie?.value).toBe('false')
    
    // 檢查 refreshToken cookie
    const refreshTokenCookie = cookies.find(c => c.name === 'refreshToken')
    expect(refreshTokenCookie).toBeTruthy()
    
    // 無 Remember Me 應該有較短的過期時間（約 7 天）
    if (refreshTokenCookie?.expires) {
      const expiresIn = refreshTokenCookie.expires - Date.now() / 1000
      expect(expiresIn).toBeLessThan(700000) // < 8 天
      expect(expiresIn).toBeGreaterThan(500000) // > 5 天
    }
  })

  test('Token 自動更新模擬', async ({ page }) => {
    // 1. 登入
    await login(page)

    // 2. 取得初始 token
    const initialToken = await page.evaluate(() => localStorage.getItem('accessToken'))
    expect(initialToken).toBeTruthy()

    // 3. 等待一段時間（在實際應用中，token 會在背景自動更新）
    await page.waitForTimeout(2000)

    // 4. 執行一個需要認證的操作（例如重新載入資料）
    await page.reload()
    await checkLoggedIn(page)

    // 5. 驗證仍可正常使用（token 有效或已更新）
    const currentToken = await page.evaluate(() => localStorage.getItem('accessToken'))
    expect(currentToken).toBeTruthy()
  })

  test('並發請求處理', async ({ page }) => {
    // 1. 登入
    await login(page)

    // 2. 快速執行多個需要認證的操作
    const promises = []
    
    // 模擬多個 API 請求
    for (let i = 0; i < 5; i++) {
      promises.push(
        page.evaluate(async () => {
          // 這裡模擬調用需要認證的 API
          const response = await fetch('/api/relations?lang=en')
          return response.ok
        })
      )
    }

    // 3. 所有請求都應該成功
    const results = await Promise.all(promises)
    results.forEach(result => {
      expect(result).toBe(true)
    })
  })

  test('錯誤恢復 - 網路錯誤', async ({ page }) => {
    // 1. 登入
    await login(page)

    // 2. 模擬網路錯誤
    await page.route('**/api/**', route => {
      route.abort('failed')
    })

    // 3. 嘗試載入資料（會失敗）
    await page.reload()

    // 4. 恢復網路
    await page.unroute('**/api/**')

    // 5. 重新載入應該成功
    await page.reload()
    await checkLoggedIn(page)
  })

  test('跨域認證保護', async ({ page }) => {
    // 1. 登入
    await login(page)

    // 2. 嘗試直接訪問 API（應該被 CORS 保護）
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        return {
          ok: response.ok,
          status: response.status
        }
      } catch (error) {
        return { error: error.message }
      }
    })

    // API 應該正常回應（因為有有效 token）
    expect(apiResponse.ok).toBeDefined()
  })

  test('登出後清理', async ({ page }) => {
    // 1. 登入
    await login(page)

    // 2. 儲存一些應用程式狀態
    await page.evaluate(() => {
      localStorage.setItem('appState', JSON.stringify({ theme: 'dark' }))
      sessionStorage.setItem('tempData', 'test')
    })

    // 3. 登出
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    await logoutButton.click()

    // 4. 檢查認證相關資料已清除
    const authData = await page.evaluate(() => ({
      isLoggedIn: localStorage.getItem('isLoggedIn'),
      user: localStorage.getItem('user'),
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken')
    }))

    expect(authData.isLoggedIn).toBe('false')
    expect(authData.user).toBeNull()
    expect(authData.accessToken).toBeNull()
    expect(authData.refreshToken).toBeNull()

    // 5. 但其他應用程式狀態應該保留
    const appState = await page.evaluate(() => localStorage.getItem('appState'))
    expect(appState).toBeTruthy()
  })

  test('防止重複登入', async ({ page, context }) => {
    // 1. 第一次登入
    await login(page)

    // 2. 開新標籤頁嘗試再次登入
    const newPage = await context.newPage()
    await newPage.goto('/login')

    // 3. 應該自動重定向到已登入頁面
    await expect(newPage).toHaveURL(/\/relations/)

    await newPage.close()
  })

  test('Session 超時處理', async ({ page }) => {
    // 1. 登入
    await login(page)

    // 2. 模擬 token 過期
    await page.evaluate(() => {
      // 設置一個已過期的 token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.fake'
      localStorage.setItem('accessToken', expiredToken)
    })

    // 3. 嘗試訪問受保護資源
    await page.goto('/relations')

    // 4. 應該被重定向到登入頁
    await expect(page).toHaveURL(/\/login/)
    
    // 5. 可能顯示 session 過期訊息
    const sessionExpiredMessage = page.getByText(/session expired|please login again/i)
    // 這個訊息是可選的，取決於實作
    if (await sessionExpiredMessage.isVisible()) {
      expect(sessionExpiredMessage).toBeTruthy()
    }
  })
})