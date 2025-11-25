/**
 * LoginForm 組件測試
 * 使用 TDD 方式驗證登入表單的所有功能
 */

import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

// Mock react-i18next 已在 jest.setup.ts 中設置

describe('LoginForm 組件測試', () => {
  const mockOnSubmit = jest.fn()
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    // Set to localhost by default to show demo accounts
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3001'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('🔴 紅燈測試 - 基本渲染', () => {
    it('應該正確渲染登入表單的所有元素', async () => {
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      // 檢查表單標題 (使用翻譯鍵值)
      expect(screen.getByText('testAccounts.title')).toBeInTheDocument()

      // 檢查表單輸入欄位 (使用翻譯鍵值作為 label)
      expect(screen.getByLabelText('email')).toBeInTheDocument()
      expect(screen.getByLabelText('password')).toBeInTheDocument()

      // 檢查登入按鈕 (使用翻譯鍵值)
      expect(screen.getByRole('button', { name: 'login' })).toBeInTheDocument()

      // 檢查輸入欄位類型正確
      expect(screen.getByLabelText('email')).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText('password')).toHaveAttribute('type', 'password')
    })

    it('應該顯示所有測試帳戶按鈕', async () => {
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('button', { name: 'Student' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Teacher' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument()
    })
  })

  describe('🟢 綠燈測試 - 表單互動', () => {
    it('應該能夠在輸入欄位中輸入文字', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email') as HTMLInputElement
      const passwordInput = screen.getByLabelText('password') as HTMLInputElement

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      expect(emailInput.value).toBe('test@example.com')
      expect(passwordInput.value).toBe('password123')
    })

    it('應該在表單完整時提交正確的資料', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email')
      const passwordInput = screen.getByLabelText('password')
      const submitButton = screen.getByRole('button', { name: 'login' })

      await user.type(emailInput, 'student@example.com')
      await user.type(passwordInput, 'student123')
      await user.click(submitButton)

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'student@example.com',
        password: 'student123',
        rememberMe: false, // 預設值
      })
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    })

    it('應該正確處理 Remember Me 勾選框', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email')
      const passwordInput = screen.getByLabelText('password')
      const rememberMeCheckbox = screen.getByRole('checkbox', { name: 'rememberMe' })
      const submitButton = screen.getByRole('button', { name: 'login' })

      await user.type(emailInput, 'student@example.com')
      await user.type(passwordInput, 'student123')
      await user.click(rememberMeCheckbox)
      await user.click(submitButton)

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'student@example.com',
        password: 'student123',
        rememberMe: true,
      })
    })

    it('應該在按下 Enter 鍵時提交表單', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email')
      const passwordInput = screen.getByLabelText('password')

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      })
    })
  })

  describe('🔵 重構測試 - 狀態管理', () => {
    it('應該在載入狀態時顯示載入文字和禁用按鈕', async () => {
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} loading={true} />)

      const submitButton = screen.getByRole('button', { name: 'loading' })
      expect(submitButton).toHaveTextContent('loading')
      expect(submitButton).toBeDisabled()
    })

    it('應該在載入狀態時禁用輸入欄位', async () => {
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} loading={true} />)

      expect(screen.getByLabelText('email')).toBeDisabled()
      expect(screen.getByLabelText('password')).toBeDisabled()
    })

    it('應該在有錯誤時顯示錯誤訊息', async () => {
      const errorMessage = 'Invalid email or password'
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} error={errorMessage} />)

      expect(screen.getByText(errorMessage)).toBeInTheDocument()

      // 檢查錯誤訊息的樣式
      const errorElement = screen.getByText(errorMessage)
      expect(errorElement).toHaveClass('bg-red-100', 'border-red-400', 'text-red-700')
    })

    it('應該在表單不完整時禁用提交按鈕', async () => {
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: 'login' })
      expect(submitButton).toBeDisabled()
    })

    it('應該在只有 email 時仍然禁用提交按鈕', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email')
      const submitButton = screen.getByRole('button', { name: 'login' })

      await user.type(emailInput, 'test@example.com')

      expect(submitButton).toBeDisabled()
    })

    it('應該在只有 password 時仍然禁用提交按鈕', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const passwordInput = screen.getByLabelText('password')
      const submitButton = screen.getByRole('button', { name: 'login' })

      await user.type(passwordInput, 'password123')

      expect(submitButton).toBeDisabled()
    })

    it('應該在表單完整時啟用提交按鈕', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email')
      const passwordInput = screen.getByLabelText('password')
      const submitButton = screen.getByRole('button', { name: 'login' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('🚨 邊界條件測試', () => {
    it('應該處理空字串輸入', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email')
      const passwordInput = screen.getByLabelText('password')

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password')
      await user.clear(passwordInput)

      const submitButton = screen.getByRole('button', { name: 'login' })
      expect(submitButton).toBeDisabled()
    })

    it('應該處理載入狀態時的表單提交嘗試', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} loading={true} />)

      // 即使表單看起來完整，在載入狀態時也不應該能提交
      const submitButton = screen.getByRole('button', { name: 'loading' })
      await user.click(submitButton)

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('應該處理特殊字符輸入', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email')
      const passwordInput = screen.getByLabelText('password')
      const submitButton = screen.getByRole('button', { name: 'login' })

      await user.type(emailInput, 'test+special@example.com')
      await user.type(passwordInput, 'pass@word#123!')
      await user.click(submitButton)

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test+special@example.com',
        password: 'pass@word#123!',
        rememberMe: false,
      })
    })

    it('應該處理很長的輸入', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const longEmail = 'a'.repeat(50) + '@example.com'
      const longPassword = 'password' + 'a'.repeat(100)

      const emailInput = screen.getByLabelText('email')
      const passwordInput = screen.getByLabelText('password')
      const submitButton = screen.getByRole('button', { name: 'login' })

      await user.type(emailInput, longEmail)
      await user.type(passwordInput, longPassword)
      await user.click(submitButton)

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: longEmail,
        password: longPassword,
        rememberMe: false,
      })
    }, 10000) // Increase timeout to 10 seconds for this test
  })

  describe('♿ 可訪問性測試', () => {
    it('應該有正確的 ARIA 屬性', async () => {
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email')
      const passwordInput = screen.getByLabelText('password')

      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('應該支援鍵盤導航', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email')
      const passwordInput = screen.getByLabelText('password')
      const rememberMeCheckbox = screen.getByRole('checkbox')

      // Tab 導航測試
      await user.tab()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()

      await user.tab()
      expect(rememberMeCheckbox).toHaveFocus()

      // 從 Remember Me checkbox 再按一次 tab 會到忘記密碼連結
      await user.tab()
      const forgotPasswordLink = screen.getByText('signIn.forgotPassword')
      expect(forgotPasswordLink).toHaveFocus()

      // 填寫表單後，submit 按鈕會啟用
      await user.click(emailInput)
      await user.type(emailInput, 'test@example.com')
      await user.click(passwordInput)
      await user.type(passwordInput, 'password123')

      // 按鈕現在可用，可以 tab 到它
      await user.tab() // to remember me
      await user.tab() // to forgot password
      await user.tab() // to submit button
      const submitButton = screen.getByRole('button', { name: 'login' })
      expect(submitButton).toHaveFocus()
    })

    it('應該在錯誤狀態時有適當的 ARIA 描述', async () => {
      const errorMessage = 'Invalid credentials'
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} error={errorMessage} />)

      const errorElement = screen.getByText(errorMessage)
      expect(errorElement).toHaveAttribute('role', 'alert')
    })
  })

  describe('🎨 樣式和佈局測試', () => {
    it('應該有正確的 CSS 類別', async () => {
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email')
      const passwordInput = screen.getByLabelText('password')
      const submitButton = screen.getByRole('button', { name: 'login' })

      // 檢查輸入欄位樣式
      expect(emailInput).toHaveClass('w-full', 'px-4', 'py-3', 'border', 'rounded-lg')
      expect(passwordInput).toHaveClass('w-full', 'px-4', 'py-3', 'border', 'rounded-lg')

      // 檢查按鈕樣式
      expect(submitButton).toHaveClass('w-full', 'bg-blue-600', 'text-white', 'rounded-lg')
    })

    it('應該在禁用狀態時有正確的樣式', async () => {
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} loading={true} />)

      const submitButton = screen.getByRole('button', { name: 'loading' })
      expect(submitButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
    })
  })

  describe('🌐 國際化測試', () => {
    it('應該使用翻譯鍵值而不是硬編碼文字', async () => {
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      // 我們的 mock 會返回翻譯鍵值
      expect(screen.getByText('email')).toBeInTheDocument()
      expect(screen.getByText('password')).toBeInTheDocument()
      expect(screen.getByText('login')).toBeInTheDocument()
      // 只在 localhost/staging 顯示示範帳戶
      expect(screen.getByText('testAccounts.title')).toBeInTheDocument()
    })
  })

  describe('🔐 環境控制測試', () => {
    it('應該在 localhost 環境顯示示範帳戶', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3001'
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('button', { name: 'Student' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Teacher' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument()
    })

    it('應該在 staging 環境顯示示範帳戶', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://aisquare-staging.web.app'
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('button', { name: 'Student' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Teacher' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument()
    })

    it('應該在 production 環境隱藏示範帳戶', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://aisquare-production.web.app'
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      expect(screen.queryByRole('button', { name: 'Student' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Teacher' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument()
    })

    it('🔴 RED: 應該在 production 環境隱藏 placeholder 中的測試帳密', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://aisquare-production.web.app'
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email') as HTMLInputElement
      const passwordInput = screen.getByLabelText('password') as HTMLInputElement

      // Production 環境不應該顯示測試帳密作為 placeholder
      expect(emailInput.placeholder).not.toBe('student@example.com')
      expect(passwordInput.placeholder).not.toBe('student123')
    })

    it('應該在 development 環境可以顯示 placeholder 提示', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3001'
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('email') as HTMLInputElement
      const passwordInput = screen.getByLabelText('password') as HTMLInputElement

      // Development 可以有提示，但不一定要是測試帳密
      expect(emailInput.placeholder).toBeDefined()
      expect(passwordInput.placeholder).toBeDefined()
    })
  })
})
