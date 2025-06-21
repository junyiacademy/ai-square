/**
 * LoginForm 組件測試
 * 使用 TDD 方式驗證登入表單的所有功能
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

// Mock react-i18next 已在 jest.setup.js 中設置

describe('LoginForm 組件測試', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('🔴 紅燈測試 - 基本渲染', () => {
    it('應該正確渲染登入表單的所有元素', () => {
      render(<LoginForm onSubmit={mockOnSubmit} />)

      // 檢查表單標題和測試帳戶資訊
      expect(screen.getByText('Test Accounts')).toBeInTheDocument()
      expect(screen.getByText('Student: student@example.com / student123')).toBeInTheDocument()

      // 檢查表單輸入欄位
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      
      // 檢查登入按鈕
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()

      // 檢查輸入欄位類型正確
      expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    })

    it('應該顯示所有測試帳戶資訊', () => {
      render(<LoginForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/student@example.com/)).toBeInTheDocument()
      expect(screen.getByText(/teacher@example.com/)).toBeInTheDocument()
      expect(screen.getByText(/admin@example.com/)).toBeInTheDocument()
    })
  })

  describe('🟢 綠燈測試 - 表單互動', () => {
    it('應該能夠在輸入欄位中輸入文字', async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      expect(emailInput.value).toBe('test@example.com')
      expect(passwordInput.value).toBe('password123')
    })

    it('應該在表單完整時提交正確的資料', async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'student@example.com')
      await user.type(passwordInput, 'student123')
      await user.click(submitButton)

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'student@example.com',
        password: 'student123',
      })
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    })

    it('應該在按下 Enter 鍵時提交表單', async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  describe('🔵 重構測試 - 狀態管理', () => {
    it('應該在載入狀態時顯示載入文字和禁用按鈕', () => {
      render(<LoginForm onSubmit={mockOnSubmit} loading={true} />)

      const submitButton = screen.getByRole('button')
      expect(submitButton).toHaveTextContent('Signing in...')
      expect(submitButton).toBeDisabled()
    })

    it('應該在載入狀態時禁用輸入欄位', () => {
      render(<LoginForm onSubmit={mockOnSubmit} loading={true} />)

      expect(screen.getByLabelText('Email')).toBeDisabled()
      expect(screen.getByLabelText('Password')).toBeDisabled()
    })

    it('應該在有錯誤時顯示錯誤訊息', () => {
      const errorMessage = 'Invalid email or password'
      render(<LoginForm onSubmit={mockOnSubmit} error={errorMessage} />)

      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      
      // 檢查錯誤訊息的樣式
      const errorElement = screen.getByText(errorMessage)
      expect(errorElement).toHaveClass('bg-red-100', 'border-red-400', 'text-red-700')
    })

    it('應該在表單不完整時禁用提交按鈕', () => {
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: 'Login' })
      expect(submitButton).toBeDisabled()
    })

    it('應該在只有 email 時仍然禁用提交按鈕', async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('Email')
      const submitButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'test@example.com')
      
      expect(submitButton).toBeDisabled()
    })

    it('應該在只有 password 時仍然禁用提交按鈕', async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Login' })

      await user.type(passwordInput, 'password123')
      
      expect(submitButton).toBeDisabled()
    })

    it('應該在表單完整時啟用提交按鈕', async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('🚨 邊界條件測試', () => {
    it('應該處理空字串輸入', async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password')
      await user.clear(passwordInput)

      const submitButton = screen.getByRole('button', { name: 'Login' })
      expect(submitButton).toBeDisabled()
    })

    it('應該處理載入狀態時的表單提交嘗試', async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={mockOnSubmit} loading={true} />)

      // 即使表單看起來完整，在載入狀態時也不應該能提交
      const submitButton = screen.getByRole('button')
      await user.click(submitButton)

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('應該處理特殊字符輸入', async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, 'test+special@example.com')
      await user.type(passwordInput, 'pass@word#123!')
      await user.click(submitButton)

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test+special@example.com',
        password: 'pass@word#123!',
      })
    })

    it('應該處理很長的輸入', async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const longEmail = 'a'.repeat(50) + '@example.com'
      const longPassword = 'password' + 'a'.repeat(100)

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Login' })

      await user.type(emailInput, longEmail)
      await user.type(passwordInput, longPassword)
      await user.click(submitButton)

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: longEmail,
        password: longPassword,
      })
    })
  })

  describe('♿ 可訪問性測試', () => {
    it('應該有正確的 ARIA 屬性', () => {
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')

      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('應該支援鍵盤導航', async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')

      // Tab 導航測試
      await user.tab()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()

      // 在表單完整時按鈕才能獲得焦點
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      await user.tab()
      const submitButton = screen.getByRole('button', { name: 'Login' })
      expect(submitButton).toHaveFocus()
    })

    it('應該在錯誤狀態時有適當的 ARIA 描述', () => {
      const errorMessage = 'Invalid credentials'
      render(<LoginForm onSubmit={mockOnSubmit} error={errorMessage} />)

      const errorElement = screen.getByText(errorMessage)
      expect(errorElement).toHaveAttribute('role', 'alert')
    })
  })

  describe('🎨 樣式和佈局測試', () => {
    it('應該有正確的 CSS 類別', () => {
      render(<LoginForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Login' })

      // 檢查輸入欄位樣式
      expect(emailInput).toHaveClass('w-full', 'px-4', 'py-3', 'border', 'rounded-lg')
      expect(passwordInput).toHaveClass('w-full', 'px-4', 'py-3', 'border', 'rounded-lg')
      
      // 檢查按鈕樣式
      expect(submitButton).toHaveClass('w-full', 'bg-blue-600', 'text-white', 'rounded-lg')
    })

    it('應該在禁用狀態時有正確的樣式', () => {
      render(<LoginForm onSubmit={mockOnSubmit} loading={true} />)

      const submitButton = screen.getByRole('button')
      expect(submitButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
    })
  })

  describe('🌐 國際化測試', () => {
    it('應該使用翻譯鍵值而不是硬編碼文字', () => {
      render(<LoginForm onSubmit={mockOnSubmit} />)

      // 我們的 mock 會將翻譯鍵值轉換為對應的英文
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Password')).toBeInTheDocument()
      expect(screen.getByText('Login')).toBeInTheDocument()
      expect(screen.getByText('Test Accounts')).toBeInTheDocument()
    })
  })
})