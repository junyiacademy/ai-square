import { TokenManager, getTokenManager } from '../token-manager'
import { logError } from '@/lib/utils/error-logger'

// Mock dependencies
jest.mock('@/lib/utils/error-logger')

// Mock fetch
global.fetch = jest.fn()

// Mock timers
jest.useFakeTimers()

describe('TokenManager', () => {
  let tokenManager: TokenManager
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  const mockLogError = logError as jest.MockedFunction<typeof logError>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    tokenManager = new TokenManager()
    
    // Reset window event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('auth:expired', jest.fn())
    }
  })

  afterEach(() => {
    tokenManager.cleanup()
  })

  describe('initialize', () => {
    it('should check authentication status on initialization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 1, email: 'test@example.com' },
          tokenExpiringSoon: false,
          expiresIn: 900 // 15 minutes
        })
      } as Response)

      await tokenManager.initialize()

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/check', {
        credentials: 'include'
      })
    })

    it('should refresh token immediately if expiring soon', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            authenticated: true,
            tokenExpiringSoon: true,
            expiresIn: 240 // 4 minutes
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)

      await tokenManager.initialize()

      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })
    })

    it('should schedule refresh when authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          expiresIn: 900 // 15 minutes
        })
      } as Response)

      await tokenManager.initialize()

      // Should schedule refresh for 10 minutes (900 - 300 seconds)
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 600000)
    })

    it('should handle initialization errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await tokenManager.initialize()

      expect(mockLogError).toHaveBeenCalledWith(
        expect.any(Error),
        { context: 'TokenManager.initialize' }
      )
    })

    it('should handle non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response)

      await tokenManager.initialize()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(setTimeout).not.toHaveBeenCalled()
    })

    it('should not schedule refresh if not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: false
        })
      } as Response)

      await tokenManager.initialize()

      expect(setTimeout).not.toHaveBeenCalled()
    })
  })

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      const result = await tokenManager.refreshToken()

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })
    })

    it('should return false on refresh failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      } as Response)

      const result = await tokenManager.refreshToken()

      expect(result).toBe(false)
    })

    it('should handle 401 response', async () => {
      const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent')
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response)

      const result = await tokenManager.refreshToken()

      expect(result).toBe(false)
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth:expired'
        })
      )
    })

    it('should prevent concurrent refreshes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      // Start two refreshes simultaneously
      const promise1 = tokenManager.refreshToken()
      const promise2 = tokenManager.refreshToken()

      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only one actual refresh
    })

    it('should handle refresh errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await tokenManager.refreshToken()

      expect(result).toBe(false)
      expect(mockLogError).toHaveBeenCalledWith(
        expect.any(Error),
        { context: 'TokenManager.doRefresh' }
      )
    })

    it('should handle unsuccessful refresh response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false })
      } as Response)

      const result = await tokenManager.refreshToken()

      expect(result).toBe(false)
    })

    it('should log success and reschedule on successful refresh', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      await tokenManager.refreshToken()

      expect(consoleLogSpy).toHaveBeenCalledWith('Token refreshed successfully')
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 600000) // 10 minutes
      
      consoleLogSpy.mockRestore()
    })
  })

  describe('ensureValidToken', () => {
    it('should return true if no refresh needed', async () => {
      const result = await tokenManager.ensureValidToken()
      expect(result).toBe(true)
    })

    it('should refresh token if needed', async () => {
      // Simulate token expiring soon scenario
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            authenticated: true,
            tokenExpiringSoon: true
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)

      await tokenManager.initialize()
      const result = await tokenManager.ensureValidToken()

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })
    })
  })

  describe('authenticatedFetch', () => {
    it('should perform fetch with credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' })
      } as Response)

      const response = await tokenManager.authenticatedFetch('/api/data')

      expect(mockFetch).toHaveBeenCalledWith('/api/data', {
        credentials: 'include'
      })
      expect(response.ok).toBe(true)
    })

    it('should ensure valid token before fetch', async () => {
      // Set up token needing refresh
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            authenticated: true,
            tokenExpiringSoon: true
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' })
        } as Response)

      await tokenManager.initialize()
      await tokenManager.authenticatedFetch('/api/data', {
        method: 'POST',
        body: JSON.stringify({ test: true })
      })

      expect(mockFetch).toHaveBeenNthCalledWith(3, '/api/data', {
        method: 'POST',
        body: JSON.stringify({ test: true }),
        credentials: 'include'
      })
    })
  })

  describe('cleanup', () => {
    it('should clear refresh timer', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          expiresIn: 900
        })
      } as Response)

      await tokenManager.initialize()
      tokenManager.cleanup()

      expect(clearTimeout).toHaveBeenCalled()
    })
  })

  describe('scheduleRefresh', () => {
    it('should schedule refresh with minimum 30 seconds delay', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          expiresIn: 10 // Only 10 seconds
        })
      } as Response)

      await tokenManager.initialize()

      // Should use minimum 30 seconds
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 30000)
    })

    it('should trigger refresh when timer expires', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            authenticated: true,
            expiresIn: 900
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)

      await tokenManager.initialize()

      // Fast-forward time
      jest.advanceTimersByTime(600000) // 10 minutes

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })
    })
  })

  describe('getTokenManager', () => {
    it('should return singleton instance', () => {
      const instance1 = getTokenManager()
      const instance2 = getTokenManager()

      expect(instance1).toBe(instance2)
    })
  })

  describe('window event handling', () => {
    it('should handle auth:expired event', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      window.dispatchEvent(new CustomEvent('auth:expired'))
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Authentication expired')
      
      consoleWarnSpy.mockRestore()
    })
  })
})