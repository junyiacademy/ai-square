import { cacheService } from '../cache-service'

// Type for accessing private properties in tests
interface CacheServicePrivate {
  memoryCache: Map<string, { data: unknown; timestamp: number; ttl: number }>
  isValid<T>(entry: { data: T; timestamp: number; ttl: number }): boolean
  getCacheKey(key: string): string
  generateCacheKey(url: string, options: RequestInit): string
  cleanupLocalStorage(): void
}

// Define LocalStorageMock interface
interface LocalStorageMock {
  store: Record<string, string>
  getItem: jest.Mock<string | null, [string]>
  setItem: jest.Mock<void, [string, string]>
  removeItem: jest.Mock<void, [string]>
  clear: jest.Mock<void, []>
  key: jest.Mock<string | null, [number]>
  readonly length: number
}

// Mock localStorage
const createLocalStorageMock = (): LocalStorageMock => {
  let store: Record<string, string> = {}
  const mock: LocalStorageMock = {
    store,
    getItem: jest.fn((key: string) => mock.store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      mock.store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete mock.store[key]
    }),
    clear: jest.fn(() => {
      store = {}
      mock.store = store
    }),
    get length() {
      return Object.keys(mock.store).length
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(mock.store)
      return keys[index] || null
    })
  }
  return mock
}
const localStorageMock = createLocalStorageMock()

// Mock fetch
global.fetch = jest.fn()

describe('CacheService', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.store = {}
    
    // Clear memory cache by accessing private property
    ;(cacheService as unknown as CacheServicePrivate).memoryCache.clear()
    
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    })
  })

  describe('get', () => {
    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent')
      expect(result).toBeNull()
    })

    it('should get from memory cache when storage is memory', async () => {
      await cacheService.set('test-key', { data: 'test' }, { storage: 'memory' })
      
      const result = await cacheService.get('test-key', 'memory')
      expect(result).toEqual({ data: 'test' })
    })

    it('should get from localStorage when storage is localStorage', async () => {
      await cacheService.set('test-key', { data: 'test' }, { storage: 'localStorage' })
      
      const result = await cacheService.get('test-key', 'localStorage')
      expect(result).toEqual({ data: 'test' })
    })

    it('should get from both storages when storage is both', async () => {
      await cacheService.set('test-key', { data: 'test' }, { storage: 'both' })
      
      // Clear memory cache to force localStorage retrieval
      ;(cacheService as unknown as CacheServicePrivate).memoryCache.clear()
      
      const result = await cacheService.get('test-key', 'both')
      expect(result).toEqual({ data: 'test' })
      
      // Should sync back to memory cache
      const memoryResult = await cacheService.get('test-key', 'memory')
      expect(memoryResult).toEqual({ data: 'test' })
    })

    it('should return null for expired memory cache entry', async () => {
      await cacheService.set('test-key', { data: 'test' }, { ttl: 100 })
      
      // Fast forward time
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 200)
      
      const result = await cacheService.get('test-key', 'memory')
      expect(result).toBeNull()
    })

    it('should return null for expired localStorage entry', async () => {
      await cacheService.set('test-key', { data: 'test' }, { storage: 'localStorage', ttl: 100 })
      
      // Fast forward time
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 200)
      
      const result = await cacheService.get('test-key', 'localStorage')
      expect(result).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cache:test-key')
    })

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error')
      })
      
      const result = await cacheService.get('test-key', 'localStorage')
      expect(result).toBeNull()
    })

    it('should handle invalid JSON in localStorage', async () => {
      localStorageMock.store['cache:test-key'] = 'invalid-json'
      
      const result = await cacheService.get('test-key', 'localStorage')
      expect(result).toBeNull()
    })

    it('should work in SSR environment without window', async () => {
      const originalWindow = global.window;
      // Temporarily undefine window for SSR testing
      // @ts-expect-error - Deleting window for testing SSR
      delete global.window;
      
      await cacheService.set('test-key', { data: 'test' }, { storage: 'both' });
      const result = await cacheService.get('test-key', 'both');
      
      expect(result).toEqual({ data: 'test' });
      
      // Restore window
      (global as any).window = originalWindow;
    })
  })

  describe('set', () => {
    it('should set to memory cache when storage is memory', async () => {
      await cacheService.set('test-key', { data: 'test' }, { storage: 'memory' })
      
      const memCache = (cacheService as unknown as CacheServicePrivate).memoryCache
      expect(memCache.has('test-key')).toBe(true)
    })

    it('should set to localStorage when storage is localStorage', async () => {
      await cacheService.set('test-key', { data: 'test' }, { storage: 'localStorage' })
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cache:test-key',
        expect.stringContaining('"data":"test"')
      )
    })

    it('should set to both storages when storage is both', async () => {
      await cacheService.set('test-key', { data: 'test' }, { storage: 'both' })
      
      const memCache = (cacheService as unknown as CacheServicePrivate).memoryCache
      expect(memCache.has('test-key')).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should use default TTL when not specified', async () => {
      await cacheService.set('test-key', { data: 'test' })
      
      const memCache = (cacheService as unknown as CacheServicePrivate).memoryCache
      const entry = memCache.get('test-key')
      expect(entry?.ttl).toBe(5 * 60 * 1000) // 5 minutes
    })

    it('should use custom TTL when specified', async () => {
      await cacheService.set('test-key', { data: 'test' }, { ttl: 1000 })
      
      const memCache = (cacheService as unknown as CacheServicePrivate).memoryCache
      const entry = memCache.get('test-key')
      expect(entry?.ttl).toBe(1000)
    })

    it('should enforce memory limit', async () => {
      // Set max entries + 1
      for (let i = 0; i <= 100; i++) {
        await cacheService.set(`key-${i}`, { data: i }, { storage: 'memory' })
      }
      
      const memCache = (cacheService as unknown as CacheServicePrivate).memoryCache
      expect(memCache.size).toBe(100)
    })

    it('should handle localStorage quota exceeded', async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })
      
      // Should not throw
      await cacheService.set('test-key', { data: 'test' }, { storage: 'localStorage' })
      
      // Should call cleanup
      expect(localStorageMock.getItem).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete from both memory and localStorage', async () => {
      await cacheService.set('test-key', { data: 'test' }, { storage: 'both' })
      
      await cacheService.delete('test-key')
      
      const memCache = (cacheService as unknown as CacheServicePrivate).memoryCache
      expect(memCache.has('test-key')).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cache:test-key')
    })

    it('should handle delete in SSR environment', async () => {
      const originalWindow = global.window;
      // Temporarily undefine window for SSR testing
      // @ts-expect-error - Deleting window for testing SSR
      delete global.window;
      
      await cacheService.set('test-key', { data: 'test' }, { storage: 'memory' });
      await cacheService.delete('test-key');
      
      const memCache = (cacheService as unknown as CacheServicePrivate).memoryCache;
      expect(memCache.has('test-key')).toBe(false);
      
      // Restore window
      (global as any).window = originalWindow;
    })
  })

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      await cacheService.set('key1', { data: 1 }, { storage: 'both' })
      await cacheService.set('key2', { data: 2 }, { storage: 'both' })
      
      // Add non-cache localStorage item
      localStorageMock.store['other-key'] = 'value'
      
      await cacheService.clear()
      
      const memCache = (cacheService as unknown as CacheServicePrivate).memoryCache
      expect(memCache.size).toBe(0)
      expect(localStorageMock.store['cache:key1']).toBeUndefined()
      expect(localStorageMock.store['cache:key2']).toBeUndefined()
      expect(localStorageMock.store['other-key']).toBe('value')
    })

    it('should work in SSR environment', async () => {
      const originalWindow = global.window;
      // Temporarily undefine window for SSR testing
      // @ts-expect-error - Deleting window for testing SSR
      delete global.window;
      
      await cacheService.set('key1', { data: 1 }, { storage: 'memory' });
      await cacheService.clear();
      
      const memCache = (cacheService as unknown as CacheServicePrivate).memoryCache;
      expect(memCache.size).toBe(0);
      
      // Restore window
      (global as any).window = originalWindow;
    })
  })

  describe('fetchWithCache', () => {
    it('should return cached data if available', async () => {
      const cachedData = { result: 'cached' }
      await cacheService.set('GET:https://api.example.com/data:', cachedData)
      
      const result = await cacheService.fetchWithCache('https://api.example.com/data')
      
      expect(result).toEqual(cachedData)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should fetch and cache data if not cached', async () => {
      const responseData = { result: 'fresh' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData
      } as Response)
      
      const result = await cacheService.fetchWithCache('https://api.example.com/data')
      
      expect(result).toEqual(responseData)
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {})
      
      // Verify data was cached
      const cached = await cacheService.get('GET:https://api.example.com/data:')
      expect(cached).toEqual(responseData)
    })

    it('should handle POST requests with body', async () => {
      const body = { query: 'test' }
      const responseData = { result: 'data' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData
      } as Response)
      
      const result = await cacheService.fetchWithCache('https://api.example.com/search', {
        method: 'POST',
        body: JSON.stringify(body)
      })
      
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/search', {
        method: 'POST',
        body: JSON.stringify(body)
      })
      
      // Verify cache key includes method and body
      const cached = await cacheService.get(`POST:https://api.example.com/search:${JSON.stringify(JSON.stringify(body))}`)
      expect(cached).toEqual(responseData)
    })

    it('should throw error for non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response)
      
      await expect(
        cacheService.fetchWithCache('https://api.example.com/notfound')
      ).rejects.toThrow('HTTP error! status: 404')
    })

    it('should respect custom TTL and storage options', async () => {
      const responseData = { result: 'data' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData
      } as Response)
      
      await cacheService.fetchWithCache('https://api.example.com/data', {
        ttl: 1000,
        storage: 'memory'
      })
      
      const memCache = (cacheService as unknown as CacheServicePrivate).memoryCache
      const entry = memCache.get('GET:https://api.example.com/data:')
      expect(entry?.ttl).toBe(1000)
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  describe('private methods', () => {
    describe('isValid', () => {
      it('should validate non-expired entries', () => {
        const entry = {
          data: 'test',
          timestamp: Date.now(),
          ttl: 5000
        }
        
        const isValid = (cacheService as unknown as CacheServicePrivate).isValid(entry)
        expect(isValid).toBe(true)
      })

      it('should invalidate expired entries', () => {
        const entry = {
          data: 'test',
          timestamp: Date.now() - 10000,
          ttl: 5000
        }
        
        const isValid = (cacheService as unknown as CacheServicePrivate).isValid(entry)
        expect(isValid).toBe(false)
      })
    })

    describe('getCacheKey', () => {
      it('should prefix keys with cache:', () => {
        const key = (cacheService as unknown as CacheServicePrivate).getCacheKey('test-key')
        expect(key).toBe('cache:test-key')
      })
    })

    describe('generateCacheKey', () => {
      it('should generate key with method and URL', () => {
        const key = (cacheService as unknown as CacheServicePrivate).generateCacheKey('https://api.example.com', {})
        expect(key).toBe('GET:https://api.example.com:')
      })

      it('should include body in key', () => {
        const body = { test: true }
        const key = (cacheService as unknown as CacheServicePrivate).generateCacheKey('https://api.example.com', {
          method: 'POST',
          body: JSON.stringify(body)
        })
        expect(key).toBe(`POST:https://api.example.com:${JSON.stringify(body)}`)
      })
    })

    describe('enforceMemoryLimit', () => {
      it('should remove oldest entries when limit exceeded', async () => {
        // Add entries with different timestamps
        for (let i = 0; i < 101; i++) {
          jest.spyOn(Date, 'now').mockReturnValue(1000 + i)
          await cacheService.set(`key-${i}`, { data: i }, { storage: 'memory' })
        }
        
        const memCache = (cacheService as unknown as CacheServicePrivate).memoryCache
        expect(memCache.size).toBe(100)
        expect(memCache.has('key-0')).toBe(false) // Oldest removed
        expect(memCache.has('key-100')).toBe(true) // Newest kept
      })
    })

    describe('cleanupLocalStorage', () => {
      it('should remove expired localStorage entries', () => {
        // Add expired entry
        localStorageMock.store['cache:expired'] = JSON.stringify({
          data: 'test',
          timestamp: Date.now() - 10000,
          ttl: 5000
        })
        
        // Add valid entry
        localStorageMock.store['cache:valid'] = JSON.stringify({
          data: 'test',
          timestamp: Date.now(),
          ttl: 5000
        })
        
        ;(cacheService as unknown as CacheServicePrivate).cleanupLocalStorage()
        
        expect(localStorageMock.store['cache:expired']).toBeUndefined()
        expect(localStorageMock.store['cache:valid']).toBeDefined()
      })

      it('should remove invalid JSON entries', () => {
        localStorageMock.store['cache:invalid'] = 'not-json'
        localStorageMock.getItem.mockImplementation((key: string) => localStorageMock.store[key] || null)
        
        // Need to manually set up Object.keys for the mock
        Object.defineProperty(Object, 'keys', {
          value: jest.fn(() => ['cache:invalid']),
          writable: true,
          configurable: true
        })
        
        ;(cacheService as unknown as CacheServicePrivate).cleanupLocalStorage()
        
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('cache:invalid')
      })

      it('should keep only 50 most recent entries when too many', () => {
        // Add 60 entries
        for (let i = 0; i < 60; i++) {
          localStorageMock.store[`cache:key-${i}`] = JSON.stringify({
            data: i,
            timestamp: 1000 + i,
            ttl: 100000
          })
        }
        
        // Mock Object.keys to return all cache keys
        const cacheKeys = Object.keys(localStorageMock.store)
        Object.defineProperty(Object, 'keys', {
          value: jest.fn(() => cacheKeys),
          writable: true,
          configurable: true
        })
        
        ;(cacheService as unknown as CacheServicePrivate).cleanupLocalStorage()
        
        // Should remove 10 oldest entries
        expect(localStorageMock.removeItem).toHaveBeenCalledTimes(10)
      })

      it('should not run in SSR environment', () => {
        const originalWindow = global.window;
        // @ts-expect-error - Deleting window for testing SSR
        delete global.window;
        
        ;(cacheService as unknown as CacheServicePrivate).cleanupLocalStorage();
        
        expect(localStorageMock.removeItem).not.toHaveBeenCalled();
        
        // Restore window
        (global as any).window = originalWindow;
      })
    })
  })
})