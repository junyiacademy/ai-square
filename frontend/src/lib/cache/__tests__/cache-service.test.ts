import { cacheService } from '../cache-service'

// Mock fetch
global.fetch = jest.fn()

describe('CacheService', () => {
  beforeEach(() => {
    // 清理快取和 mock
    cacheService.clear()
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('get/set operations', () => {
    it('should store and retrieve data from memory cache', async () => {
      const testData = { id: 1, name: 'Test' }
      await cacheService.set('test-key', testData, { storage: 'memory' })
      
      const retrieved = await cacheService.get('test-key', 'memory')
      expect(retrieved).toEqual(testData)
    })

    it('should store and retrieve data from localStorage', async () => {
      const testData = { id: 2, name: 'LocalStorage Test' }
      await cacheService.set('test-key', testData, { storage: 'localStorage' })
      
      const retrieved = await cacheService.get('test-key', 'localStorage')
      expect(retrieved).toEqual(testData)
    })

    it('should store in both memory and localStorage when storage is "both"', async () => {
      const testData = { id: 3, name: 'Both Storage Test' }
      await cacheService.set('test-key', testData, { storage: 'both' })
      
      const memoryData = await cacheService.get('test-key', 'memory')
      const localData = await cacheService.get('test-key', 'localStorage')
      
      expect(memoryData).toEqual(testData)
      expect(localData).toEqual(testData)
    })
  })

  describe('TTL functionality', () => {
    it('should return null for expired data', async () => {
      const testData = { id: 4, name: 'Expired Test' }
      // Set with 100ms TTL
      await cacheService.set('test-key', testData, { ttl: 100 })
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const retrieved = await cacheService.get('test-key')
      expect(retrieved).toBeNull()
    })

    it('should return data within TTL period', async () => {
      const testData = { id: 5, name: 'Valid TTL Test' }
      // Set with 1 second TTL
      await cacheService.set('test-key', testData, { ttl: 1000 })
      
      // Retrieve immediately
      const retrieved = await cacheService.get('test-key')
      expect(retrieved).toEqual(testData)
    })
  })

  describe('fetchWithCache', () => {
    it('should fetch data and cache it on first call', async () => {
      const mockData = { id: 6, name: 'Fetch Test' }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const result = await cacheService.fetchWithCache('/api/test')
      
      expect(fetch).toHaveBeenCalledWith('/api/test', {})
      expect(result).toEqual(mockData)
    })

    it('should return cached data on subsequent calls', async () => {
      const mockData = { id: 7, name: 'Cached Fetch Test' }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      // First call - should fetch
      await cacheService.fetchWithCache('/api/test')
      
      // Second call - should use cache
      const result = await cacheService.fetchWithCache('/api/test')
      
      expect(fetch).toHaveBeenCalledTimes(1) // Only called once
      expect(result).toEqual(mockData)
    })

    it('should handle fetch errors properly', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await expect(cacheService.fetchWithCache('/api/error')).rejects.toThrow(
        'HTTP error! status: 404'
      )
    })
  })

  describe('cache management', () => {
    it('should delete specific cache entries', async () => {
      const testData = { id: 8, name: 'Delete Test' }
      await cacheService.set('test-key', testData)
      
      await cacheService.delete('test-key')
      
      const retrieved = await cacheService.get('test-key')
      expect(retrieved).toBeNull()
    })

    it('should clear all cache entries', async () => {
      await cacheService.set('key1', { data: 1 })
      await cacheService.set('key2', { data: 2 })
      
      await cacheService.clear()
      
      const data1 = await cacheService.get('key1')
      const data2 = await cacheService.get('key2')
      
      expect(data1).toBeNull()
      expect(data2).toBeNull()
    })
  })

  describe('localStorage sync', () => {
    it('should sync from localStorage to memory when using "both" storage', async () => {
      const testData = { id: 9, name: 'Sync Test' }
      
      // Manually set in localStorage
      const entry = {
        data: testData,
        timestamp: Date.now(),
        ttl: 60000
      }
      localStorage.setItem('cache:sync-key', JSON.stringify(entry))
      
      // Get with "both" should sync to memory
      const retrieved = await cacheService.get('sync-key', 'both')
      expect(retrieved).toEqual(testData)
      
      // Now it should be in memory too
      const memoryData = await cacheService.get('sync-key', 'memory')
      expect(memoryData).toEqual(testData)
    })
  })
})