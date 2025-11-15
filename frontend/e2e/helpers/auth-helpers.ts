/**
 * E2E 測試輔助函數 - 認證相關
 */

import { Page, expect } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
  role: 'student' | 'teacher' | 'admin'
}

// 預設測試用戶
export const TEST_USERS: Record<string, TestUser> = {
  student: {
    email: 'student@example.com',
    password: 'student123',
    role: 'student'
  },
  teacher: {
    email: 'teacher@example.com',
    password: 'teacher123',
    role: 'teacher'
  },
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin'
  }
}

/**
 * 執行登入操作
 */
export async function performLogin(
  page: Page,
  user: TestUser = TEST_USERS.student,
  options: {
    rememberMe?: boolean
    expectSuccess?: boolean
  } = {}
) {
  const { rememberMe = false, expectSuccess = true } = options

  // 前往登入頁
  await page.goto('/login')

  // 填寫表單 - 使用 id 選擇器更穩定
  await page.locator('#email').fill(user.email)
  await page.locator('#password').fill(user.password)

  // 設定 Remember Me
  if (rememberMe) {
    await page.locator('#remember-me').check()
  }

  // 提交表單 - 使用更穩定的選擇器
  await page.locator('button[type="submit"]').click()

  // 驗證結果
  if (expectSuccess) {
    await expect(page).toHaveURL(/\/(relations|onboarding|discovery|assessment|dashboard)/, { timeout: 10000 })
  }
}

/**
 * 執行登出操作
 */
export async function performLogout(page: Page) {
  // 尋找並點擊登出按鈕
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
  await logoutButton.click()

  // 驗證登出成功
  await expect(page).toHaveURL(/\/login/)
}

/**
 * 檢查是否已登入
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const isLoggedInStorage = await page.evaluate(() =>
    localStorage.getItem('isLoggedIn')
  )
  return isLoggedInStorage === 'true'
}

/**
 * 取得當前用戶資訊
 */
export async function getCurrentUser(page: Page): Promise<any | null> {
  const userData = await page.evaluate(() =>
    localStorage.getItem('user')
  )
  return userData ? JSON.parse(userData) : null
}

/**
 * 清除認證狀態
 */
export async function clearAuthState(page: Page) {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  })
}

/**
 * 設定假的認證狀態（用於測試特定場景）
 */
export async function setMockAuthState(
  page: Page,
  user: TestUser,
  options: {
    accessToken?: string
    refreshToken?: string
    rememberMe?: boolean
  } = {}
) {
  const {
    accessToken = 'mock-access-token',
    refreshToken = 'mock-refresh-token',
    rememberMe = false
  } = options

  await page.evaluate(({ user, accessToken, refreshToken }) => {
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('user', JSON.stringify({
      id: `${user.role}-123`,
      email: user.email,
      role: user.role
    }))
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  }, { user, accessToken, refreshToken })

  // 設定 cookies
  await page.context().addCookies([
    {
      name: 'accessToken',
      value: accessToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    },
    {
      name: 'refreshToken',
      value: refreshToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      expires: rememberMe
        ? Date.now() / 1000 + 30 * 24 * 60 * 60 // 30 天
        : Date.now() / 1000 + 7 * 24 * 60 * 60  // 7 天
    },
    {
      name: 'rememberMe',
      value: rememberMe.toString(),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax'
    }
  ])
}

/**
 * 等待認證相關的網路請求完成
 */
export async function waitForAuthRequest(
  page: Page,
  urlPattern: string | RegExp
): Promise<any> {
  return page.waitForResponse(
    response => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout: 10000 }
  )
}

/**
 * 驗證受保護頁面的訪問
 */
export async function verifyProtectedRoute(
  page: Page,
  route: string,
  options: {
    shouldRedirect?: boolean
    redirectTo?: string
  } = {}
) {
  const { shouldRedirect = true, redirectTo = '/login' } = options

  await page.goto(route)

  if (shouldRedirect) {
    await expect(page).toHaveURL(new RegExp(redirectTo))
  } else {
    await expect(page).toHaveURL(new RegExp(route))
  }
}

/**
 * 模擬 token 過期
 */
export async function simulateTokenExpiry(page: Page) {
  await page.evaluate(() => {
    // 設定一個過期的 token
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.expired'
    localStorage.setItem('accessToken', expiredToken)
  })
}

/**
 * 攔截並模擬 API 回應
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: {
    status?: number
    body?: unknown
    headers?: Record<string, string>
  }
) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: response.status || 200,
      headers: response.headers || { 'Content-Type': 'application/json' },
      body: JSON.stringify(response.body || {})
    })
  })
}
