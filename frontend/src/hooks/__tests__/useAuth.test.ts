import { renderHook, act, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../useAuth'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: jest.fn((key: string) => localStorageMock.store[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageMock.store[key] = value
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageMock.store[key]
  }),
  clear: jest.fn(() => {
    localStorageMock.store = {}
  })
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock console methods
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

describe('useAuth', () => {
  const mockPush = jest.fn()
  const mockRouter = { push: mockPush }
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.store = {}
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  afterEach(() => {
    consoleErrorSpy.mockClear()
  })

  describe('initial state', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAuth())
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isLoggedIn).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.tokenExpiringSoon).toBe(false)
    })

    it('should check authentication on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 1, email: 'test@example.com', role: 'student', name: 'Test User' },
          tokenExpiringSoon: false
        })
      } as Response)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/check')
      expect(result.current.isLoggedIn).toBe(true)
      expect(result.current.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      })
    })
  })

  describe('checkAuth', () => {
    it('should set user data when authenticated', async () => {
      const mockUser = { id: 1, email: 'test@example.com', role: 'student', name: 'Test User' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: mockUser,
          tokenExpiringSoon: true
        })
      } as Response)

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.checkAuth()
      })

      expect(result.current.isLoggedIn).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.tokenExpiringSoon).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('isLoggedIn', 'true')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser))
    })

    it('should clear auth state when not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: false
        })
      } as Response)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isLoggedIn).toBe(false)
      expect(result.current.user).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('isLoggedIn')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user')
    })

    it('should fallback to localStorage on API error', async () => {
      const storedUser = { id: 2, email: 'stored@example.com', role: 'teacher', name: 'Stored User' }
      localStorageMock.store['isLoggedIn'] = 'true'
      localStorageMock.store['user'] = JSON.stringify(storedUser)
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isLoggedIn).toBe(true)
      expect(result.current.user).toEqual(storedUser)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error checking auth:', expect.any(Error))
    })

    it('should clear auth state on invalid localStorage data', async () => {
      localStorageMock.store['isLoggedIn'] = 'true'
      localStorageMock.store['user'] = 'invalid-json'
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isLoggedIn).toBe(false)
      expect(result.current.user).toBeNull()
    })
  })

  describe('login', () => {
    it('should login successfully', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' }
      const mockUser = { id: 1, email: 'test@example.com', role: 'student', name: 'Test User' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: mockUser
        })
      } as Response)

      const { result } = renderHook(() => useAuth())

      let loginResult: any
      await act(async () => {
        loginResult = await result.current.login(credentials)
      })

      expect(loginResult).toEqual({ success: true })
      expect(result.current.isLoggedIn).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser))
      expect(localStorageMock.setItem).toHaveBeenCalledWith('isLoggedIn', 'true')
      
      // Check if auth-changed event was dispatched
      const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent')
      await act(async () => {
        await result.current.login(credentials)
      })
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'auth-changed'
      }))
    })

    it('should handle login failure', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Invalid credentials'
        })
      } as Response)

      const { result } = renderHook(() => useAuth())

      let loginResult: any
      await act(async () => {
        loginResult = await result.current.login(credentials)
      })

      expect(loginResult).toEqual({ success: false, error: 'Invalid credentials' })
      expect(result.current.isLoggedIn).toBe(false)
      expect(result.current.user).toBeNull()
    })

    it('should handle network error during login', async () => {
      const credentials = { email: 'test@example.com', password: 'password' }
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuth())

      let loginResult: any
      await act(async () => {
        loginResult = await result.current.login(credentials)
      })

      expect(loginResult).toEqual({ success: false, error: 'Network error' })
      expect(consoleErrorSpy).toHaveBeenCalledWith('Login error:', expect.any(Error))
    })

    it('should include rememberMe in login request', async () => {
      const credentials = { email: 'test@example.com', password: 'password', rememberMe: true }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: 1, email: 'test@example.com', role: 'student', name: 'Test' }
        })
      } as Response)

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.login(credentials)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })
    })
  })

  describe('logout', () => {
    it('should logout and clear auth state', async () => {
      // Setup logged in state
      localStorageMock.store['isLoggedIn'] = 'true'
      localStorageMock.store['user'] = JSON.stringify({ id: 1, email: 'test@example.com' })
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true, user: { id: 1, email: 'test@example.com' } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(true)
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
      expect(result.current.isLoggedIn).toBe(false)
      expect(result.current.user).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('isLoggedIn')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user')
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('should handle logout API error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.logout()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error))
      expect(result.current.isLoggedIn).toBe(false)
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            authenticated: true,
            user: { id: 1, email: 'test@example.com', role: 'student', name: 'Test' }
          })
        } as Response)

      const { result } = renderHook(() => useAuth())

      let refreshResult: boolean
      await act(async () => {
        refreshResult = await result.current.refreshToken()
      })

      expect(refreshResult!).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', { method: 'POST' })
    })

    it('should return false on refresh failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response)

      const { result } = renderHook(() => useAuth())

      let refreshResult: boolean
      await act(async () => {
        refreshResult = await result.current.refreshToken()
      })

      expect(refreshResult!).toBe(false)
    })

    it('should handle refresh network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuth())

      let refreshResult: boolean
      await act(async () => {
        refreshResult = await result.current.refreshToken()
      })

      expect(refreshResult!).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Token refresh error:', expect.any(Error))
    })
  })

  describe('event listeners', () => {
    it('should listen to auth-changed events', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 1, email: 'test@example.com', role: 'student', name: 'Test' }
        })
      } as Response)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Reset fetch mock
      mockFetch.mockClear()

      // Dispatch auth-changed event
      await act(async () => {
        window.dispatchEvent(new CustomEvent('auth-changed'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/check')
      })
    })

    it('should listen to storage events', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 1, email: 'test@example.com', role: 'student', name: 'Test' }
        })
      } as Response)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Reset fetch mock
      mockFetch.mockClear()

      // Dispatch storage event
      await act(async () => {
        window.dispatchEvent(new StorageEvent('storage'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/check')
      })
    })

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useAuth())

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('auth-changed', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function))
    })
  })

  describe('auto token refresh', () => {
    it('should auto-refresh when token is expiring soon', async () => {
      // First check returns tokenExpiringSoon: true
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            authenticated: true,
            user: { id: 1, email: 'test@example.com', role: 'student', name: 'Test' },
            tokenExpiringSoon: true
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            authenticated: true,
            user: { id: 1, email: 'test@example.com', role: 'student', name: 'Test' },
            tokenExpiringSoon: false
          })
        } as Response)

      renderHook(() => useAuth())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3) // Initial check + refresh + check after refresh
      })

      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/auth/refresh', { method: 'POST' })
    })
  })

  describe('periodic auth check', () => {
    jest.useFakeTimers()

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should check auth periodically when logged in', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 1, email: 'test@example.com', role: 'student', name: 'Test' }
        })
      } as Response)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(true)
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Fast forward 5 minutes
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })

    it('should not check auth periodically when not logged in', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: false
        })
      } as Response)

      renderHook(() => useAuth())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      // Fast forward 5 minutes
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000)
      })

      // Should not make additional calls
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should clear interval on unmount', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 1, email: 'test@example.com', role: 'student', name: 'Test' }
        })
      } as Response)

      const { result, unmount } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(true)
      })

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })
})