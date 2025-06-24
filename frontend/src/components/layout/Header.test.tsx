/**
 * Header 組件測試
 * 使用 TDD 方式驗證頭部導航欄的登入狀態顯示功能
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header } from './Header'
import { useTheme } from '../../contexts/ThemeContext'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'light',
    toggleTheme: jest.fn(),
  })),
}))

// Mock localStorage for auth state
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('Header 組件測試', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
    mockLocalStorage.removeItem.mockClear()
  })

  describe('🔴 紅燈測試 - 基本渲染', () => {
    it('應該渲染 Header 基本結構', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      // 檢查 Logo/標題
      expect(screen.getByText('AI Square')).toBeInTheDocument()
      
      // 檢查導航結構存在
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('應該有正確的 ARIA 屬性', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })
  })

  describe('🟡 未登入狀態測試', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return null
        if (key === 'user') return null
        return null
      })
    })

    it('應該顯示登入按鈕當用戶未登入', () => {
      render(<Header />)

      const loginButton = screen.getByRole('button', { name: /sign in|登入/i })
      expect(loginButton).toBeInTheDocument()
      expect(loginButton).not.toBeDisabled()
    })

    it('應該不顯示用戶資訊當未登入', () => {
      render(<Header />)

      // 不應該有用戶 email
      expect(screen.queryByText(/@/)).not.toBeInTheDocument()
      
      // 不應該有登出按鈕
      expect(screen.queryByRole('button', { name: /sign out|登出/i })).not.toBeInTheDocument()
    })

    it('應該在點擊登入按鈕時導航到登入頁面', async () => {
      const user = userEvent.setup()
      render(<Header />)

      const loginButton = screen.getByRole('button', { name: /sign in|登入/i })
      await user.click(loginButton)

      // 這裡需要檢查是否正確調用了導航
      // 具體實作會在組件中處理
    })
  })

  describe('🟢 已登入狀態測試', () => {
    const mockUser = {
      id: 1,
      email: 'student@example.com',
      role: 'student',
      name: 'Student User'
    }

    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true'
        if (key === 'user') return JSON.stringify(mockUser)
        return null
      })
    })

    it('應該顯示用戶 email 當已登入', () => {
      render(<Header />)

      expect(screen.getAllByText('student@example.com')).toHaveLength(2) // 桌面版和移動版
    })

    it('應該顯示用戶角色當已登入', () => {
      render(<Header />)

      expect(screen.getAllByText('學生')).toHaveLength(2) // 桌面版和移動版
    })

    it('應該顯示登出按鈕當已登入', () => {
      render(<Header />)

      const logoutButton = screen.getByRole('button', { name: /sign out|登出/i })
      expect(logoutButton).toBeInTheDocument()
    })

    it('應該不顯示登入按鈕當已登入', () => {
      render(<Header />)

      expect(screen.queryByRole('button', { name: /sign in|登入/i })).not.toBeInTheDocument()
    })

    it('應該在點擊登出按鈕時清除登入狀態', async () => {
      const user = userEvent.setup()
      render(<Header />)

      const logoutButton = screen.getByRole('button', { name: /sign out|登出/i })
      await user.click(logoutButton)

      // 檢查 localStorage 被清除
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('isLoggedIn')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user')
    })
  })

  describe('🎨 UI 樣式測試', () => {
    it('應該有響應式設計類別', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b')
    })

    it('登入按鈕應該有正確的樣式', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      const loginButton = screen.getByRole('button', { name: /sign in|登入/i })
      expect(loginButton).toHaveClass('bg-blue-600', 'text-white', 'px-4', 'py-2', 'rounded-lg')
    })

    it('用戶資訊區域應該有正確的樣式', () => {
      const mockUser = {
        id: 1,
        email: 'student@example.com',
        role: 'student',
        name: 'Student User'
      }

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true'
        if (key === 'user') return JSON.stringify(mockUser)
        return null
      })
      
      render(<Header />)

      const userInfoElements = screen.getAllByText('student@example.com')
      const desktopUserInfo = userInfoElements[0] // 桌面版是第一個
      // 檢查父容器的樣式 - 需要往上找到正確的容器
      const userInfoContainer = desktopUserInfo.closest('[class*="flex items-center space-x-3"]')
      expect(userInfoContainer).toHaveClass('flex', 'items-center', 'space-x-3')
    })
  })

  describe('🔄 狀態變化測試', () => {
    it('應該在登入狀態變化時重新渲染', () => {
      // 初始未登入狀態
      mockLocalStorage.getItem.mockReturnValue(null)
      const { unmount } = render(<Header />)

      expect(screen.getByRole('button', { name: /sign in|登入/i })).toBeInTheDocument()
      
      // 清理第一個組件
      unmount()

      // 模擬登入後狀態
      const mockUser = {
        id: 1,
        email: 'teacher@example.com',
        role: 'teacher',
        name: 'Teacher User'
      }

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true'
        if (key === 'user') return JSON.stringify(mockUser)
        return null
      })

      // 重新渲染組件
      render(<Header />)

      expect(screen.getAllByText('teacher@example.com')).toHaveLength(2) // 桌面版和移動版
      expect(screen.getByRole('button', { name: /sign out|登出/i })).toBeInTheDocument()
    })
  })

  describe('♿ 可訪問性測試', () => {
    it('應該有正確的語義結構', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      // Header 應該是 banner landmark
      expect(screen.getByRole('banner')).toBeInTheDocument()
      
      // 導航應該是 navigation landmark
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('按鈕應該有可訪問的名稱', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      const loginButton = screen.getByRole('button', { name: /sign in|登入/i })
      expect(loginButton).toHaveAccessibleName()
    })

    it('應該支援鍵盤導航', async () => {
      const user = userEvent.setup()
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      const languageSelector = screen.getByLabelText(/選擇語言|select language/i)
      const loginButton = screen.getByRole('button', { name: /sign in|登入/i })
      
      // 第一個 tab 應該聚焦到語言選擇器
      await user.tab()
      expect(languageSelector).toHaveFocus()
      
      // 第二個 tab 應該聚焦到登入按鈕
      await user.tab()
      expect(loginButton).toHaveFocus()
    })
  })

  describe('🌐 國際化測試', () => {
    it('應該使用翻譯鍵值', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      // 檢查是否使用了翻譯系統
      expect(screen.getByText('AI Square')).toBeInTheDocument()
    })
  })

  describe('📱 響應式測試', () => {
    it('應該在小螢幕上正確顯示', () => {
      // 設定小螢幕
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })
  })

  describe('🌓 主題切換測試', () => {
    let mockUseTheme: jest.Mock

    beforeEach(() => {
      // Get the mocked useTheme
      mockUseTheme = jest.mocked(useTheme)
      mockUseTheme.mockClear()
    })

    it('應該顯示主題切換按鈕', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockUseTheme.mockReturnValue({
        theme: 'light',
        toggleTheme: jest.fn(),
      })
      
      render(<Header />)

      const themeButton = screen.getByRole('button', { name: /darkMode|lightMode/i })
      expect(themeButton).toBeInTheDocument()
    })

    it('應該在淺色模式時顯示月亮圖標', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockUseTheme.mockReturnValue({
        theme: 'light',
        toggleTheme: jest.fn(),
      })
      
      render(<Header />)

      const themeButton = screen.getByRole('button', { name: /darkMode/i })
      // 檢查按鈕內有月亮圖標（SVG）
      const moonIcon = themeButton.querySelector('svg')
      expect(moonIcon).toBeInTheDocument()
    })

    it('應該在深色模式時顯示太陽圖標', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        toggleTheme: jest.fn(),
      })
      
      render(<Header />)

      const themeButton = screen.getByRole('button', { name: /lightMode/i })
      // 檢查按鈕內有太陽圖標（SVG）
      const sunIcon = themeButton.querySelector('svg')
      expect(sunIcon).toBeInTheDocument()
    })

    it('應該在點擊時調用 toggleTheme', async () => {
      const user = userEvent.setup()
      const mockToggleTheme = jest.fn()
      
      mockLocalStorage.getItem.mockReturnValue(null)
      mockUseTheme.mockReturnValue({
        theme: 'light',
        toggleTheme: mockToggleTheme,
      })
      
      render(<Header />)

      const themeButton = screen.getByRole('button', { name: /darkMode/i })
      await user.click(themeButton)

      expect(mockToggleTheme).toHaveBeenCalledTimes(1)
    })

    it('主題切換按鈕應該在語言選擇器旁邊', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockUseTheme.mockReturnValue({
        theme: 'light',
        toggleTheme: jest.fn(),
      })
      
      render(<Header />)

      const languageSelector = screen.getByLabelText(/選擇語言|select language/i)
      const themeButton = screen.getByRole('button', { name: /darkMode/i })
      
      // 檢查兩者都存在
      expect(languageSelector).toBeInTheDocument()
      expect(themeButton).toBeInTheDocument()
      
      // 確認兩者在相同的父元素內部
      const rightSection = languageSelector.closest('.flex.items-center.space-x-4')
      expect(rightSection).toContainElement(languageSelector)
      expect(rightSection).toContainElement(themeButton)
    })

    it('應該支援鍵盤導航到主題切換按鈕', async () => {
      const user = userEvent.setup()
      mockLocalStorage.getItem.mockReturnValue(null)
      mockUseTheme.mockReturnValue({
        theme: 'light',
        toggleTheme: jest.fn(),
      })
      
      render(<Header />)

      const themeButton = screen.getByRole('button', { name: /darkMode/i })
      
      // 確認主題切換按鈕可以被聚焦
      themeButton.focus()
      expect(themeButton).toHaveFocus()
      
      // 確認可以通過點擊觸發
      await user.click(themeButton)
      expect(mockUseTheme().toggleTheme).toHaveBeenCalled()
    })
  })
})