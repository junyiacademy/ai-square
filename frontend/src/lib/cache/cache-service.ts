/**
 * 統一的快取服務
 * 提供記憶體快取和 localStorage 快取
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  storage?: 'memory' | 'localStorage' | 'both'
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry<unknown>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_MEMORY_ENTRIES = 100

  /**
   * 取得快取資料
   */
  async get<T>(key: string, storage: 'memory' | 'localStorage' | 'both' = 'both'): Promise<T | null> {
    // 先檢查記憶體快取
    if (storage === 'memory' || storage === 'both') {
      const memoryEntry = this.memoryCache.get(key)
      if (memoryEntry && this.isValid(memoryEntry)) {
        return memoryEntry.data as T
      }
    }

    // 再檢查 localStorage (只在瀏覽器環境)
    if ((storage === 'localStorage' || storage === 'both') && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.getCacheKey(key))
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored)
          if (this.isValid(entry)) {
            // 如果設定為 both，同步到記憶體快取
            if (storage === 'both') {
              this.memoryCache.set(key, entry)
            }
            return entry.data
          } else {
            // 清理過期的 localStorage 項目
            localStorage.removeItem(this.getCacheKey(key))
          }
        }
      } catch {
        // Silently ignore cache read errors
      }
    }

    return null
  }

  /**
   * 設定快取資料
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const { ttl = this.DEFAULT_TTL, storage = 'both' } = options

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    }

    // 儲存到記憶體快取
    if (storage === 'memory' || storage === 'both') {
      this.memoryCache.set(key, entry)
      this.enforceMemoryLimit()
    }

    // 儲存到 localStorage (只在瀏覽器環境)
    if ((storage === 'localStorage' || storage === 'both') && typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getCacheKey(key), JSON.stringify(entry))
      } catch {
        // 如果 localStorage 滿了，清理最舊的項目
        this.cleanupLocalStorage()
      }
    }
  }

  /**
   * 刪除快取項目
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.getCacheKey(key))
    }
  }

  /**
   * 清除所有快取
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()

    // 清除所有 cache 開頭的 localStorage 項目 (只在瀏覽器環境)
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('cache:')) {
          localStorage.removeItem(key)
        }
      })
    }
  }

  /**
   * 使用快取的 fetch 包裝器
   */
  async fetchWithCache<T>(
    url: string,
    options: RequestInit & CacheOptions = {}
  ): Promise<T> {
    const { ttl, storage, ...fetchOptions } = options
    const cacheKey = this.generateCacheKey(url, fetchOptions)

    // 嘗試從快取取得
    const cached = await this.get<T>(cacheKey, storage)
    if (cached !== null) {
      return cached
    }

    // 執行實際的 fetch
    const response = await fetch(url, fetchOptions)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // 儲存到快取
    await this.set(cacheKey, data, { ttl, storage })

    return data
  }

  /**
   * 檢查快取項目是否有效
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  /**
   * 取得 localStorage 的 key
   */
  private getCacheKey(key: string): string {
    return `cache:${key}`
  }

  /**
   * 產生快取 key
   */
  private generateCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET'
    const body = options.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }

  /**
   * 強制記憶體快取大小限制
   */
  private enforceMemoryLimit(): void {
    if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
      const entries = Array.from(this.memoryCache.entries())
      // 按時間戳排序，刪除最舊的
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toDelete = entries.slice(0, entries.length - this.MAX_MEMORY_ENTRIES)
      toDelete.forEach(([key]) => this.memoryCache.delete(key))
    }
  }

  /**
   * 清理 localStorage 中過期或最舊的項目
   */
  private cleanupLocalStorage(): void {
    // 只在瀏覽器環境執行
    if (typeof window === 'undefined') {
      return
    }

    const cacheItems: Array<{ key: string; entry: CacheEntry<unknown> }> = []

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache:')) {
        try {
          const entry = JSON.parse(localStorage.getItem(key) || '{}')
          cacheItems.push({ key, entry })
        } catch {
          // 移除無效項目
          localStorage.removeItem(key)
        }
      }
    })

    // 移除過期項目
    cacheItems.forEach(({ key, entry }) => {
      if (!this.isValid(entry)) {
        localStorage.removeItem(key)
      }
    })

    // 如果還是太多，移除最舊的
    if (cacheItems.length > 50) {
      cacheItems
        .sort((a, b) => a.entry.timestamp - b.entry.timestamp)
        .slice(0, cacheItems.length - 50)
        .forEach(({ key }) => localStorage.removeItem(key))
    }
  }
}

// 匯出單例
export const cacheService = new CacheService()

// 匯出快取選項類型
export type { CacheOptions }
