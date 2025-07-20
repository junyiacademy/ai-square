/**
 * Token Manager
 * 負責自動更新 access token，確保用戶保持登入狀態
 */

// Simple error logging function
const logError = (error: Error, options?: { context?: string }) => {
  console.error(`[${options?.context || 'Error'}]:`, error)
}

interface User {
  email: string
  role: string
  userId?: number
  name?: string
}

interface AuthCheckResponse {
  authenticated: boolean
  user?: User
  tokenExpiringSoon?: boolean
  expiresIn?: number // 秒
}

export class TokenManager {
  private refreshTimer?: NodeJS.Timeout
  private isRefreshing = false
  private refreshPromise?: Promise<boolean>
  private needsRefresh = false

  /**
   * 初始化 Token Manager
   */
  async initialize() {
    try {
      // 檢查當前認證狀態
      const response = await fetch('/api/auth/check', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        return
      }
      
      const data: AuthCheckResponse = await response.json()
      
      if (data.authenticated) {
        // 如果 token 即將過期，立即更新
        if (data.tokenExpiringSoon) {
          this.needsRefresh = true
          this.refreshToken()
        }
        
        // 設置自動更新
        if (data.expiresIn) {
          this.scheduleRefresh(data.expiresIn)
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'TokenManager.initialize' })
    }
  }

  /**
   * 更新 access token
   */
  async refreshToken(): Promise<boolean> {
    // 避免重複更新
    if (this.isRefreshing) {
      return this.refreshPromise!
    }
    
    this.isRefreshing = true
    this.refreshPromise = this.doRefresh()
    
    try {
      const result = await this.refreshPromise
      this.needsRefresh = !result
      return result
    } finally {
      this.isRefreshing = false
      this.refreshPromise = undefined
    }
  }

  /**
   * 執行 token 更新
   */
  private async doRefresh(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })
      
      if (!response.ok) {
        // 如果是 401，表示 refresh token 也過期了
        if (response.status === 401) {
          this.handleTokenExpired()
        }
        return false
      }
      
      const data = await response.json()
      
      if (data.success) {
        console.log('Token refreshed successfully')
        // 重新設置自動更新
        this.scheduleRefresh(15 * 60) // 15 分鐘
        return true
      }
      
      return false
    } catch (error) {
      logError(error as Error, { context: 'TokenManager.doRefresh' })
      return false
    }
  }

  /**
   * 設置自動更新排程
   */
  private scheduleRefresh(expiresIn: number) {
    // 清除現有的定時器
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }
    
    // 在過期前 5 分鐘更新（至少提前 30 秒）
    const refreshIn = Math.max((expiresIn - 300) * 1000, 30000)
    
    this.refreshTimer = setTimeout(() => {
      this.needsRefresh = true
      this.refreshToken()
    }, refreshIn)
  }

  /**
   * 處理 token 完全過期
   */
  private handleTokenExpired() {
    // 清除定時器
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }
    
    // 發送自定義事件，讓應用層處理
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
  }

  /**
   * 確保 token 有效（在 API 請求前調用）
   */
  async ensureValidToken(): Promise<boolean> {
    if (this.needsRefresh) {
      return this.refreshToken()
    }
    return true
  }

  /**
   * 帶認證的 fetch 包裝
   */
  async authenticatedFetch(url: string, options?: RequestInit): Promise<Response> {
    // 確保 token 有效
    await this.ensureValidToken()
    
    // 執行請求
    return fetch(url, {
      ...options,
      credentials: 'include'
    })
  }

  /**
   * 清理資源
   */
  cleanup() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }
  }
}

// 單例
let tokenManagerInstance: TokenManager | null = null

export function getTokenManager(): TokenManager {
  if (!tokenManagerInstance) {
    tokenManagerInstance = new TokenManager()
  }
  return tokenManagerInstance
}

// 自動初始化（在客戶端）
if (typeof window !== 'undefined') {
  const manager = getTokenManager()
  manager.initialize()
  
  // 監聽認證過期事件
  window.addEventListener('auth:expired', () => {
    // 可以在這裡顯示提示或重定向到登入頁
    console.warn('Authentication expired')
  })
  
  // 頁面卸載時清理
  window.addEventListener('beforeunload', () => {
    manager.cleanup()
  })
}