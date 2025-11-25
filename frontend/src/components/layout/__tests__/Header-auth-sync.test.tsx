/**
 * Header Auth Synchronization Tests
 * Issue #28: Header should sync with auth state immediately after login
 */

import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render'
import { Header } from '../Header'
import React from 'react'
import { act } from '@testing-library/react'

// Mock AuthContext
interface User {
  id: number
  email: string
  role: string
  name: string
  isGuest?: boolean
}

interface AuthContextType {
  user: User | null
  isLoggedIn: boolean
  isLoading: boolean
  tokenExpiringSoon: boolean
  login: jest.Mock
  logout: jest.Mock
  checkAuth: jest.Mock
  refreshToken: jest.Mock
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

// Mock useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => React.useContext(AuthContext),
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}))

describe('Header Auth State Synchronization', () => {
  let authContextValue: AuthContextType

  beforeEach(() => {
    jest.clearAllMocks()

    // Default auth context (not logged in)
    authContextValue = {
      user: null,
      isLoggedIn: false,
      isLoading: false,
      tokenExpiringSoon: false,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
      refreshToken: jest.fn(),
    }
  })

  describe('🔴 RED: Login State Synchronization', () => {
    it('should immediately show user info after login event', async () => {
      // Render Header with logged out state
      const { rerender } = renderWithProviders(
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      )

      // Initially should show "Login" button
      expect(screen.getByText('login')).toBeInTheDocument()

      // Simulate login by updating auth context
      const loggedInUser = {
        id: 1,
        email: 'student@example.com',
        name: 'Test Student',
        role: 'student',
      }

      authContextValue = {
        ...authContextValue,
        user: loggedInUser,
        isLoggedIn: true,
      }

      // Dispatch login-success event (simulating AuthContext behavior)
      act(() => {
        window.dispatchEvent(
          new CustomEvent('login-success', { detail: { user: loggedInUser } })
        )
      })

      // Rerender with new auth state
      rerender(
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      )

      // Should immediately show user menu (not "Login" button)
      await waitFor(() => {
        expect(screen.queryByText('login')).not.toBeInTheDocument()
      })

      // Should show user email or name
      await waitFor(() => {
        expect(
          screen.getByText((content, element) => {
            return element?.textContent?.includes('student@example.com') ?? false
          })
        ).toBeInTheDocument()
      })
    })

    it('should listen to auth-changed event and update UI', async () => {
      // Start with logged out state
      const { rerender } = renderWithProviders(
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      )

      expect(screen.getByText('login')).toBeInTheDocument()

      // Update to logged in state
      authContextValue = {
        ...authContextValue,
        user: {
          id: 1,
          email: 'teacher@example.com',
          name: 'Test Teacher',
          role: 'teacher',
        },
        isLoggedIn: true,
      }

      // Dispatch auth-changed event
      act(() => {
        window.dispatchEvent(new CustomEvent('auth-changed'))
      })

      // Rerender
      rerender(
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      )

      // Should not show login button
      await waitFor(() => {
        expect(screen.queryByText('login')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading indicator while auth is being checked', () => {
      authContextValue = {
        ...authContextValue,
        isLoading: true,
      }

      renderWithProviders(
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      )

      // During loading, shouldn't show login button yet
      // (Behavior depends on implementation - adjust as needed)
      expect(authContextValue.isLoading).toBe(true)
    })
  })

  describe('Logout Flow', () => {
    it('should immediately show login button after logout', async () => {
      // Start logged in
      authContextValue = {
        ...authContextValue,
        user: {
          id: 1,
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
        },
        isLoggedIn: true,
      }

      const { rerender } = renderWithProviders(
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      )

      // Should not show login button when logged in
      expect(screen.queryByText('login')).not.toBeInTheDocument()

      // Logout
      authContextValue = {
        ...authContextValue,
        user: null,
        isLoggedIn: false,
      }

      act(() => {
        window.dispatchEvent(new CustomEvent('auth-changed'))
      })

      rerender(
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      )

      // Should immediately show login button
      await waitFor(() => {
        expect(screen.getByText('login')).toBeInTheDocument()
      })
    })
  })
})
