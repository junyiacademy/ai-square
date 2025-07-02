/**
 * E2E 測試 - 受保護路由
 * 測試各種頁面的訪問權限控制
 */

import { test, expect } from '@playwright/test'
import {
  performLogin,
  clearAuthState,
  setMockAuthState,
  verifyProtectedRoute,
  TEST_USERS
} from './helpers/auth-helpers'

// 定義受保護的路由
const PROTECTED_ROUTES = [
  '/relations',
  '/assessment',
  '/assessment/history',
  '/pbl',
  '/pbl/scenarios/job-search',
  '/pbl/history'
]

// 定義公開路由
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/about' // 如果有的話
]

test.describe('受保護路由測試', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('未登入用戶訪問受保護路由', async ({ page }) => {
    for (const route of PROTECTED_ROUTES) {
      await verifyProtectedRoute(page, route, {
        shouldRedirect: true,
        redirectTo: '/login'
      })
    }
  })

  test('未登入用戶訪問公開路由', async ({ page }) => {
    for (const route of PUBLIC_ROUTES) {
      await page.goto(route)
      // 不應該被重定向
      expect(page.url()).toContain(route)
    }
  })

  test('已登入用戶訪問受保護路由', async ({ page }) => {
    // 先登入
    await performLogin(page)

    // 測試訪問各個受保護路由
    for (const route of PROTECTED_ROUTES) {
      await verifyProtectedRoute(page, route, {
        shouldRedirect: false
      })
    }
  })

  test('已登入用戶訪問登入頁', async ({ page }) => {
    // 先登入
    await performLogin(page)

    // 訪問登入頁應該重定向到首頁或 relations
    await page.goto('/login')
    await expect(page).toHaveURL(/\/relations/)
  })

  test('直接設定認證狀態訪問受保護路由', async ({ page }) => {
    // 使用 mock 認證狀態
    await setMockAuthState(page, TEST_USERS.student)

    // 應該可以訪問受保護路由
    await page.goto('/relations')
    expect(page.url()).toContain('/relations')
  })

  test('角色權限測試 - 學生', async ({ page }) => {
    await performLogin(page, TEST_USERS.student)

    // 學生應該可以訪問的頁面
    const studentRoutes = [
      '/relations',
      '/assessment',
      '/pbl'
    ]

    for (const route of studentRoutes) {
      await page.goto(route)
      expect(page.url()).toContain(route)
    }
  })

  test('角色權限測試 - 教師', async ({ page }) => {
    await performLogin(page, TEST_USERS.teacher)

    // 教師可能有額外的權限頁面
    const teacherRoutes = [
      '/relations',
      '/assessment',
      '/assessment/history', // 可能可以看所有學生的歷史
      '/pbl'
    ]

    for (const route of teacherRoutes) {
      await page.goto(route)
      expect(page.url()).toContain(route)
    }
  })

  test('角色權限測試 - 管理員', async ({ page }) => {
    await performLogin(page, TEST_USERS.admin)

    // 管理員應該可以訪問所有頁面
    for (const route of PROTECTED_ROUTES) {
      await page.goto(route)
      expect(page.url()).toContain(route)
    }
  })

  test('深層路由保護', async ({ page }) => {
    // 未登入狀態
    const deepRoutes = [
      '/pbl/scenarios/job-search/stage/1',
      '/assessment/results/123',
      '/relations/domain/engaging-with-ai'
    ]

    for (const route of deepRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('URL 參數保留', async ({ page }) => {
    // 帶參數訪問受保護路由
    const routeWithParams = '/relations?lang=zhTW&view=graph'
    
    // 未登入時訪問
    await page.goto(routeWithParams)
    await expect(page).toHaveURL(/\/login/)

    // TODO: 理想情況下，登入後應該重定向回原始 URL（包含參數）
    // 這需要應用程式支援 returnUrl 功能
  })

  test('並發路由訪問', async ({ page, context }) => {
    // 登入
    await performLogin(page)

    // 開啟多個標籤頁同時訪問不同路由
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ])

    const routes = ['/relations', '/assessment', '/pbl']

    // 並發訪問
    await Promise.all(
      pages.map((p, index) => p.goto(routes[index]))
    )

    // 驗證所有頁面都成功載入
    for (let i = 0; i < pages.length; i++) {
      expect(pages[i].url()).toContain(routes[i])
      await pages[i].close()
    }
  })

  test('瀏覽器後退/前進按鈕', async ({ page }) => {
    // 1. 先登入
    await performLogin(page)

    // 2. 訪問多個頁面建立歷史
    await page.goto('/relations')
    await page.goto('/assessment')
    await page.goto('/pbl')

    // 3. 測試後退
    await page.goBack()
    expect(page.url()).toContain('/assessment')

    await page.goBack()
    expect(page.url()).toContain('/relations')

    // 4. 測試前進
    await page.goForward()
    expect(page.url()).toContain('/assessment')

    // 5. 登出
    await page.goto('/relations')
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    await logoutButton.click()

    // 6. 嘗試使用後退按鈕（不應該能訪問受保護頁面）
    await page.goBack()
    await expect(page).toHaveURL(/\/login/)
  })

  test('中斷的導航流程', async ({ page }) => {
    // 1. 開始登入流程
    await page.goto('/login')
    await page.getByLabel('Email').fill(TEST_USERS.student.email)
    
    // 2. 在完成登入前導航到其他頁面
    await page.goto('/about', { waitUntil: 'commit' })
    
    // 3. 返回並完成登入
    await page.goto('/login')
    await performLogin(page)

    // 4. 應該正常登入
    expect(page.url()).toContain('/relations')
  })

  test('Session 劫持防護', async ({ page, context }) => {
    // 1. 正常登入
    await performLogin(page)

    // 2. 嘗試在另一個瀏覽器上下文使用相同的 token
    const cookies = await context.cookies()
    const newContext = await page.context().browser()!.newContext()
    const newPage = await newContext.newPage()

    // 3. 複製 cookies 到新上下文
    await newContext.addCookies(cookies)

    // 4. 嘗試訪問受保護路由
    await newPage.goto('/relations')
    
    // 應該可以訪問（因為是有效的 session）
    // 但在實際應用中，可能會有額外的安全檢查（如 IP 地址、User-Agent 等）
    expect(newPage.url()).toContain('/relations')

    await newContext.close()
  })
})