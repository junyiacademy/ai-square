/**
 * Header 導航功能測試
 * 測試導航連結和 i18n 整合
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
const mockPush = jest.fn()
const mockUsePathname = jest.fn()
jest.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      push: mockPush,
      replace: jest.fn(),
    }),
    usePathname: () => mockUsePathname(),
  }
})

import { Header } from '../Header'

// Mock ThemeContext
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'light',
    toggleTheme: jest.fn(),
  })),
}))

// Mock Link component
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
      <a href={href} className={className}>{children}</a>
    ),
  }
})

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        'home': 'Home',
        'relations': 'Relations',
        'ksa': 'KSA Framework',
        'signIn': 'Sign in',
        'signOut': 'Sign out',
        'userRole.student': 'Student',
        'userRole.teacher': 'Teacher',
        'userRole.admin': 'Administrator',
      }
      return translations[key] || key
    },
    i18n: { 
      language: 'en',
      changeLanguage: jest.fn()
    }
  })
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('Header Navigation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    mockUsePathname.mockReturnValue('/')
  })

  describe('Navigation Links', () => {
    it('should display navigation links', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      // Check for navigation links
      expect(screen.getByText('Relations')).toBeInTheDocument()
      expect(screen.getByText('KSA Framework')).toBeInTheDocument()
    })

    it('should have correct href attributes', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      const relationsLink = screen.getByText('Relations').closest('a')
      const ksaLink = screen.getByText('KSA Framework').closest('a')

      expect(relationsLink).toHaveAttribute('href', '/relations')
      expect(ksaLink).toHaveAttribute('href', '/ksa')
    })

    it('should highlight active page', () => {
      mockUsePathname.mockReturnValue('/relations')
      
      render(<Header />)

      const relationsLink = screen.getByText('Relations').closest('a')
      expect(relationsLink).toHaveClass('active')
    })
  })

  describe('Mobile Navigation', () => {
    it('should show hamburger menu on mobile', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      // Check for hamburger menu button
      const hamburgerButton = screen.getByLabelText('Toggle navigation menu')
      expect(hamburgerButton).toBeInTheDocument()
    })

    it('should toggle mobile menu on hamburger click', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      const user = userEvent.setup()
      
      render(<Header />)

      const hamburgerButton = screen.getByLabelText('Toggle navigation menu')
      
      // Initially menu should be closed
      expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()

      // Click to open
      await user.click(hamburgerButton)
      expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()

      // Click to close
      await user.click(hamburgerButton)
      expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
    })
  })

  describe('i18n Integration', () => {
    it('should use translated text for navigation', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      // All text should come from translations
      expect(screen.getByText('Relations')).toBeInTheDocument()
      expect(screen.getByText('KSA Framework')).toBeInTheDocument()
      expect(screen.getByText('Sign in')).toBeInTheDocument()
    })

    it('should translate user roles', () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'teacher',
        name: 'Test User'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true'
        if (key === 'user') return JSON.stringify(mockUser)
        return null
      })

      render(<Header />)

      // Should display teacher role text twice (desktop and mobile)
      const teacherRoles = screen.getAllByText('Teacher')
      expect(teacherRoles).toHaveLength(2)
    })
  })

  describe('Navigation with Auth State', () => {
    it('should show all navigation links when logged out', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<Header />)

      expect(screen.getByText('Relations')).toBeInTheDocument()
      expect(screen.getByText('KSA Framework')).toBeInTheDocument()
      expect(screen.getByText('Sign in')).toBeInTheDocument()
    })

    it('should show all navigation links when logged in', () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true'
        if (key === 'user') return JSON.stringify(mockUser)
        return null
      })

      render(<Header />)

      expect(screen.getByText('Relations')).toBeInTheDocument()
      expect(screen.getByText('KSA Framework')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    })
  })
})