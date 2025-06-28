/**
 * Token Manager 測試
 * 測試自動 token refresh 功能
 */

import { TokenManager } from '../token-manager'

// Mock error logger
jest.mock('../../utils/error-logger', () => ({
  logError: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

describe('TokenManager', () => {
  let tokenManager: TokenManager
  
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    tokenManager = new TokenManager()
  })
  
  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  describe('初始化', () => {
    it('應該在初始化時檢查 token 狀態', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 1, email: 'test@example.com' },
          tokenExpiringSoon: false
        })
      } as Response)
      
      await tokenManager.initialize()
      
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/check', {
        credentials: 'include'
      })
    })

    it('當 token 即將過期時應該啟動自動更新', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 1, email: 'test@example.com' },
          tokenExpiringSoon: true
        })
      } as Response)
      
      const refreshSpy = jest.spyOn(tokenManager, 'refreshToken')
      
      await tokenManager.initialize()
      
      // 等待一小段時間讓 refresh 被觸發
      jest.advanceTimersByTime(1000)
      
      expect(refreshSpy).toHaveBeenCalled()
    })
  })

  describe('Token 更新', () => {
    it('應該成功更新 token', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Token refreshed successfully'
        })
      } as Response)
      
      const result = await tokenManager.refreshToken()
      
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })
      expect(result).toBe(true)
    })

    it('當 refresh token 無效時應該處理錯誤', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Invalid refresh token'
        })
      } as Response)
      
      const result = await tokenManager.refreshToken()
      
      expect(result).toBe(false)
    })

    it('應該處理網路錯誤', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      const result = await tokenManager.refreshToken()
      
      expect(result).toBe(false)
    })
  })

  describe('自動更新機制', () => {
    it('應該在 token 過期前 5 分鐘自動更新', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      
      // 初始檢查回應
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 1, email: 'test@example.com' },
          tokenExpiringSoon: false,
          expiresIn: 600 // 10 分鐘後過期
        })
      } as Response)
      
      await tokenManager.initialize()
      
      // Mock refresh 請求
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Token refreshed successfully'
        })
      } as Response)
      
      // 快進到過期前 5 分鐘
      jest.advanceTimersByTime(5 * 60 * 1000)
      
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })
    })

    it('應該處理多次 API 請求的 token 更新', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      let refreshCallCount = 0
      
      // 設置 needsRefresh 為 true
      tokenManager['needsRefresh'] = true
      
      // Mock refresh endpoint
      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/refresh') {
          refreshCallCount++
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              message: 'Token refreshed successfully'
            })
          } as Response)
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })
      
      // 同時發起多個需要 token 的請求
      const promises = [
        tokenManager.ensureValidToken(),
        tokenManager.ensureValidToken(),
        tokenManager.ensureValidToken()
      ]
      
      await Promise.all(promises)
      
      // 應該只調用一次 refresh
      expect(refreshCallCount).toBe(1)
    })
  })

  describe('API 請求攔截', () => {
    it('應該在 API 請求前確保 token 有效', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      
      // Mock token 需要更新
      tokenManager['needsRefresh'] = true
      
      // Mock refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Token refreshed successfully'
        })
      } as Response)
      
      // Mock API 請求
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' })
      } as Response)
      
      await tokenManager.authenticatedFetch('/api/test')
      
      // 應該先 refresh，再執行 API 請求
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/auth/refresh', expect.any(Object))
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/test', expect.any(Object))
    })
  })

  describe('生命週期', () => {
    it('應該能正確清理定時器', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
      
      // 先設置一個定時器
      tokenManager['refreshTimer'] = setTimeout(() => {}, 1000)
      
      tokenManager.cleanup()
      
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })
})