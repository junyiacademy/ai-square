# 🧪 測試實作引導 - AI Square

## 📋 開發需求
**用戶輸入**: 單元測試 - 為 API 和組件加入測試，E2E 測試 - 完整登入流程自動化測試

## 🎯 產品維度 (BDD)

### 1. 測試故事分析
```
As a 開發者 
I want 完整的自動化測試套件
So that 我可以確保 Email 登入功能的品質和穩定性

As a 團隊成員  
I want 可靠的測試覆蓋
So that 未來的代碼變更不會破壞現有功能
```

### 2. 測試驗收標準
基於當前專案狀態：
- **當前功能**: Email 登入系統 (API + 前端)
- **測試目標**: 100% 核心邏輯覆蓋
- **測試類型**: 單元測試 + 整合測試 + E2E 測試

**具體標準**:
- API 路由所有情況都有單元測試覆蓋
- React 組件的交互邏輯有測試
- 完整登入流程有 E2E 自動化測試
- 測試可以在 CI/CD 中自動運行
- 測試報告清楚易讀

### 3. 測試場景 (Given-When-Then)
```gherkin
Feature: 登入功能測試套件

Scenario: API 單元測試
  Given 有完整的測試環境設置
  When 運行 API 單元測試
  Then 所有 API 端點都應該通過測試
  And 測試覆蓋率應該達到 95% 以上

Scenario: 組件單元測試  
  Given 有 React 測試環境
  When 運行組件測試
  Then LoginForm 組件應該正確處理用戶輸入
  And 錯誤狀態應該正確顯示

Scenario: E2E 測試
  Given 應用程式在測試環境運行
  When 執行完整登入流程測試
  Then 用戶應該能成功登入並導向正確頁面
  And 登入失敗應該顯示適當錯誤訊息
```

## 🏗️ 架構維度 (DDD)

### 1. 測試架構分析
**測試金字塔結構**:
```
        E2E Tests (少量)
      ↗               ↖
Integration Tests (中量)
      ↗               ↖  
   Unit Tests (大量)
```

### 2. 測試邊界劃分
- **單元測試**: 隔離測試單一函數/組件
- **整合測試**: 測試組件間的協作
- **E2E 測試**: 測試完整用戶流程

### 3. 測試領域語言
- **Test Double**: Mock, Stub, Spy 的使用策略
- **Assertion**: 斷言和驗證邏輯
- **Test Fixture**: 測試數據和環境準備

## 🔧 技術維度 (TDD)

### 1. 測試技術棧
**推薦工具組合**:
```typescript
// 單元測試
Jest + Testing Library (React)
Supertest (API 測試)

// E2E 測試  
Playwright (推薦) 或 Cypress

// 測試配置
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event
```

### 2. 測試目錄結構
```
frontend/
├── __tests__/                    # 全域測試
│   ├── api/                     # API 測試
│   │   └── auth/
│   │       └── login.test.ts
│   ├── components/              # 組件測試
│   │   └── auth/
│   │       └── LoginForm.test.tsx
│   └── e2e/                     # E2E 測試
│       └── login-flow.spec.ts
├── src/
│   ├── app/api/auth/login/
│   │   ├── route.ts
│   │   └── route.test.ts        # 同目錄測試
│   └── components/auth/
│       ├── LoginForm.tsx
│       └── LoginForm.test.tsx   # 同目錄測試
├── jest.config.js
├── playwright.config.ts
└── package.json
```

## 📋 實作步驟詳細指南

### Phase 1: 測試環境設置 (15-20分鐘)

#### 1.1 安裝測試依賴
```bash
# 單元測試
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev jest-environment-jsdom

# API 測試
npm install --save-dev supertest @types/supertest

# E2E 測試
npm install --save-dev @playwright/test
npx playwright install
```

#### 1.2 Jest 配置
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

#### 1.3 Jest Setup
```javascript
// jest.setup.js
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}))

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
}))
```

### Phase 2: API 單元測試 (20-25分鐘)

#### 2.1 登入 API 測試
```typescript
// __tests__/api/auth/login.test.ts
import { createMocks } from 'node-mocks-http'
import { POST } from '@/app/api/auth/login/route'

describe('/api/auth/login', () => {
  it('should return success for valid credentials', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        email: 'student@example.com',
        password: 'student123',
      },
    })

    const response = await POST(req as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user).toEqual({
      id: 1,
      email: 'student@example.com',
      role: 'student',
      name: 'Student User'
    })
  })

  it('should return error for invalid credentials', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      },
    })

    const response = await POST(req as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid email or password')
  })

  it('should return error for missing fields', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        email: 'student@example.com',
        // missing password
      },
    })

    const response = await POST(req as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Email and password are required')
  })

  it('should handle server errors gracefully', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {}, // Invalid JSON will cause error
    })

    const response = await POST(req as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })
})
```

### Phase 3: React 組件測試 (25-30分鐘)

#### 3.1 LoginForm 組件測試
```typescript
// src/components/auth/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'email': 'Email',
        'password': 'Password',
        'login': 'Login',
        'loading': 'Signing in...',
        'testAccounts.title': 'Test Accounts',
        'testAccounts.student': 'Student: student@example.com / student123',
      }
      return translations[key] || key
    },
  }),
}))

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders login form with all elements', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByText('Test Accounts')).toBeInTheDocument()
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Login' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('shows loading state when loading prop is true', () => {
    render(<LoginForm onSubmit={mockOnSubmit} loading={true} />)

    expect(screen.getByText('Signing in...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'Invalid credentials'
    render(<LoginForm onSubmit={mockOnSubmit} error={errorMessage} />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('disables submit button when form is incomplete', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: 'Login' })
    expect(submitButton).toBeDisabled()
  })

  it('enables submit button when form is complete', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Login' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    expect(submitButton).not.toBeDisabled()
  })

  it('prevents form submission when loading', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} loading={true} />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    // Try to submit form (should not work due to loading state)
    fireEvent.submit(screen.getByRole('form') || screen.getByTestId('login-form'))

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })
})
```

#### 3.2 LoginPage 整合測試
```typescript
// src/app/login/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from './page'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock fetch
global.fetch = jest.fn()

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  it('renders login page correctly', () => {
    render(<LoginPage />)

    expect(screen.getByText('Sign in to AI Square')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('handles successful login', async () => {
    const user = userEvent.setup()
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        user: { id: 1, email: 'test@example.com', role: 'student' },
      }),
    })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/relations')
    })
  })

  it('handles login failure', async () => {
    const user = userEvent.setup()
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: false,
        error: 'Invalid email or password',
      }),
    })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'wrong@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })
  })

  it('handles network errors', async () => {
    const user = userEvent.setup()
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })
})
```

### Phase 4: E2E 測試 (30-35分鐘)

#### 4.1 Playwright 配置
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### 4.2 登入流程 E2E 測試
```typescript
// __tests__/e2e/login-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('successful login with student account', async ({ page }) => {
    // 填寫登入表單
    await page.fill('[data-testid="email-input"]', 'student@example.com')
    await page.fill('[data-testid="password-input"]', 'student123')
    
    // 點擊登入按鈕
    await page.click('[data-testid="login-button"]')
    
    // 等待導向到 relations 頁面
    await expect(page).toHaveURL('/relations')
    
    // 驗證頁面載入成功
    await expect(page.locator('h1')).toContainText('AI Literacy Relations')
  })

  test('login failure with invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'wrong@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')
    
    // 應該顯示錯誤訊息
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password')
    
    // 應該留在登入頁面
    await expect(page).toHaveURL('/login')
  })

  test('form validation', async ({ page }) => {
    // 測試空表單提交
    await page.click('[data-testid="login-button"]')
    
    // 應該顯示 HTML5 驗證錯誤
    const emailInput = page.locator('[data-testid="email-input"]')
    await expect(emailInput).toHaveAttribute('required')
  })

  test('loading state during login', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'student@example.com')
    await page.fill('[data-testid="password-input"]', 'student123')
    
    // 點擊登入並立即檢查載入狀態
    const loginPromise = page.click('[data-testid="login-button"]')
    
    // 驗證載入狀態
    await expect(page.locator('[data-testid="login-button"]')).toContainText('Signing in...')
    await expect(page.locator('[data-testid="login-button"]')).toBeDisabled()
    
    await loginPromise
  })

  test('responsive design on mobile', async ({ page }) => {
    // 設置手機視窗大小
    await page.setViewportSize({ width: 375, height: 667 })
    
    // 驗證登入表單在手機上顯示正確
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
    await expect(page.locator('[data-testid="test-accounts"]')).toBeVisible()
    
    // 測試手機登入流程
    await page.fill('[data-testid="email-input"]', 'teacher@example.com')
    await page.fill('[data-testid="password-input"]', 'teacher123')
    await page.click('[data-testid="login-button"]')
    
    await expect(page).toHaveURL('/relations')
  })

  test('multiple language support', async ({ page }) => {
    // 切換到中文
    await page.selectOption('[data-testid="language-selector"]', 'zh-TW')
    
    // 驗證中文界面
    await expect(page.locator('h2')).toContainText('登入 AI Square')
    
    // 測試中文錯誤訊息
    await page.fill('[data-testid="email-input"]', 'wrong@example.com')
    await page.fill('[data-testid="password-input"]', 'wrong')
    await page.click('[data-testid="login-button"]')
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('電子郵件或密碼錯誤')
  })

  test('test accounts information display', async ({ page }) => {
    // 驗證測試帳戶資訊顯示
    await expect(page.locator('[data-testid="test-accounts"]')).toBeVisible()
    await expect(page.locator('[data-testid="test-accounts"]')).toContainText('student@example.com')
    await expect(page.locator('[data-testid="test-accounts"]')).toContainText('teacher@example.com')
    await expect(page.locator('[data-testid="test-accounts"]')).toContainText('admin@example.com')
  })
})
```

### Phase 5: 測試腳本和 CI 整合 (10-15分鐘)

#### 5.1 Package.json 測試腳本
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:ci && npm run test:e2e"
  }
}
```

#### 5.2 GitHub Actions CI 配置 (可選)
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - run: npm ci
      - run: npm run test:ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## 🎯 測試最佳實踐

### 1. 測試命名規範
- **描述性**: `should return success for valid credentials`
- **行為導向**: `when user submits valid form, then redirects to dashboard`
- **場景覆蓋**: 成功案例、錯誤案例、邊界條件

### 2. 測試數據管理
- 使用固定的測試資料
- 避免依賴外部服務
- 每個測試獨立，不共享狀態

### 3. 測試覆蓋目標
- **單元測試**: 95% 以上
- **整合測試**: 關鍵流程 100%
- **E2E 測試**: 主要用戶路徑 100%

## 🚨 重要提醒

### 測試環境隔離
- 使用 Mock 避免真實 API 調用
- localStorage 清理
- 測試數據庫分離 (未來)

### 多語言測試
- 確保所有語言的錯誤訊息都有測試
- 測試語言切換功能
- 驗證 i18n 鍵值正確性

### 響應式測試
- 測試不同螢幕尺寸
- 驗證手機版功能完整性
- 確保觸控操作正常

## 📊 預期成果

完成後將擁有：
- **API 測試**: 100% 路由覆蓋
- **組件測試**: 關鍵互動測試
- **E2E 測試**: 完整用戶流程
- **測試報告**: 覆蓋率和結果視覺化
- **CI 整合**: 自動化測試流程

## 🎯 今日目標

**建議先完成**:
1. ✅ 設置測試環境和工具
2. ✅ 實作 API 單元測試
3. ✅ 實作 LoginForm 組件測試
4. ✅ 基本 E2E 測試

**下一步**: 請告訴我你想從哪裡開始？
1. 🛠️ 先設置測試環境
2. 🧪 先寫 API 單元測試
3. ⚛️ 先寫 React 組件測試
4. 🎭 先實作 E2E 測試

---

> **AI 助理提示**: 測試是確保軟體品質的關鍵，建議按照金字塔結構優先實作單元測試，再逐步加入整合和 E2E 測試。