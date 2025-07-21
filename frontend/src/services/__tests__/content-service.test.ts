import { contentService } from '../content-service'
import { cacheService } from '@/lib/cache/cache-service'
import { performanceMonitor } from '@/lib/performance/performance-monitor'

// Mock dependencies
jest.mock('@/lib/cache/cache-service', () => ({
  cacheService: {
    fetchWithCache: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
  }
}))

jest.mock('@/lib/performance/performance-monitor', () => ({
  performanceMonitor: {
    measureAsync: jest.fn((name, fn) => fn())
  }
}))

// Mock localStorage
interface LocalStorageMock {
  store: Record<string, string>;
  getItem: jest.Mock<string | null, [string]>;
  setItem: jest.Mock<void, [string, string]>;
  removeItem: jest.Mock<void, [string]>;
  clear: jest.Mock<void, []>;
  key: jest.Mock<string | null, [number]>;
  readonly length: number;
}

const localStorageMock: LocalStorageMock = {
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
  }),
  key: jest.fn((index: number) => Object.keys(localStorageMock.store)[index] || null),
  get length() {
    return Object.keys(localStorageMock.store).length
  }
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock console methods
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.store = {}
  })

  afterEach(() => {
    consoleErrorSpy.mockClear()
  })

  describe('getRelationsTree', () => {
    it('should fetch relations tree data with correct parameters', async () => {
      const mockTreeData = {
        domains: [{ id: 'domain1' }],
        kMap: { k1: 'knowledge1' },
        sMap: { s1: 'skill1' },
        aMap: { a1: 'attitude1' }
      }

      ;(cacheService.fetchWithCache as jest.Mock).mockResolvedValue(mockTreeData)

      const result = await contentService.getRelationsTree('en')

      expect(performanceMonitor.measureAsync).toHaveBeenCalledWith(
        'content.getRelationsTree',
        expect.any(Function)
      )

      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/relations?lang=en',
        {
          ttl: 30 * 60 * 1000,
          storage: 'both'
        }
      )

      expect(result).toEqual(mockTreeData)
    })

    it('should handle errors during fetch', async () => {
      const mockError = new Error('Network error')
      ;(cacheService.fetchWithCache as jest.Mock).mockRejectedValue(mockError)

      await expect(contentService.getRelationsTree('en')).rejects.toThrow('Network error')
    })
  })

  describe('getAssessment', () => {
    it('should fetch assessment data with correct parameters', async () => {
      const mockAssessment = {
        id: 'assessment1',
        title: { en: 'Test Assessment' },
        questions: []
      }

      ;(cacheService.fetchWithCache as jest.Mock).mockResolvedValue(mockAssessment)

      const result = await contentService.getAssessment('assessment1')

      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/assessments/assessment1',
        {
          ttl: 60 * 60 * 1000,
          storage: 'localStorage'
        }
      )

      expect(result).toEqual(mockAssessment)
    })
  })

  describe('getPBLScenario', () => {
    it('should fetch single PBL scenario with correct parameters', async () => {
      const mockScenario = {
        id: 'scenario1',
        title: { en: 'Test Scenario' },
        description: { en: 'Description' }
      }

      ;(cacheService.fetchWithCache as jest.Mock).mockResolvedValue(mockScenario)

      const result = await contentService.getPBLScenario('scenario1')

      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/pbl/scenarios/scenario1',
        {
          ttl: 60 * 60 * 1000,
          storage: 'localStorage'
        }
      )

      expect(result).toEqual(mockScenario)
    })
  })

  describe('getKSADefinitions', () => {
    it('should fetch KSA definitions with correct parameters', async () => {
      const mockKSA = {
        K001: { name: 'Knowledge 1' },
        S001: { name: 'Skill 1' },
        A001: { name: 'Attitude 1' }
      }

      ;(cacheService.fetchWithCache as jest.Mock).mockResolvedValue(mockKSA)

      const result = await contentService.getKSADefinitions('es')

      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/ksa?lang=es',
        {
          ttl: 24 * 60 * 60 * 1000,
          storage: 'both'
        }
      )

      expect(result).toEqual(mockKSA)
    })
  })

  describe('preloadEssentialData', () => {
    it('should preload relations tree and KSA definitions in parallel', async () => {
      const mockTreeData = { domains: [] }
      const mockKSA = { K001: {} }

      ;(cacheService.fetchWithCache as jest.Mock)
        .mockResolvedValueOnce(mockTreeData)
        .mockResolvedValueOnce(mockKSA)

      await contentService.preloadEssentialData('en')

      expect(cacheService.fetchWithCache).toHaveBeenCalledTimes(2)
      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/relations?lang=en',
        expect.any(Object)
      )
      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/ksa?lang=en',
        expect.any(Object)
      )
    })

    it('should not throw errors if preload fails', async () => {
      const mockError = new Error('Network error')
      ;(cacheService.fetchWithCache as jest.Mock).mockRejectedValue(mockError)

      await expect(contentService.preloadEssentialData('en')).resolves.not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Preload failed:', mockError)
    })

    it('should handle partial failures during preload', async () => {
      ;(cacheService.fetchWithCache as jest.Mock)
        .mockResolvedValueOnce({ domains: [] })
        .mockRejectedValueOnce(new Error('KSA fetch failed'))

      await expect(contentService.preloadEssentialData('en')).resolves.not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Preload failed:', expect.any(Error))
    })
  })

  describe('clearLanguageCache', () => {
    it('should clear relations and KSA cache for specific language', async () => {
      ;(cacheService.delete as jest.Mock).mockResolvedValue(undefined)

      await contentService.clearLanguageCache('zhTW')

      expect(cacheService.delete).toHaveBeenCalledTimes(2)
      expect(cacheService.delete).toHaveBeenCalledWith('relations:zhTW')
      expect(cacheService.delete).toHaveBeenCalledWith('ksa:zhTW')
    })

    it('should handle errors during cache deletion', async () => {
      ;(cacheService.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'))

      await expect(contentService.clearLanguageCache('en')).rejects.toThrow()
    })
  })

  describe('clearAllCache', () => {
    it('should clear all cache', async () => {
      ;(cacheService.clear as jest.Mock).mockResolvedValue(undefined)

      await contentService.clearAllCache()

      expect(cacheService.clear).toHaveBeenCalledTimes(1)
    })
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      // Add some cache entries to localStorage
      localStorageMock.store['cache:test1'] = 'a'.repeat(100)
      localStorageMock.store['cache:test2'] = 'b'.repeat(200)
      localStorageMock.store['other:key'] = 'should not count'

      // Mock the localStorage iteration by making Object.keys return our store keys
      const originalKeys = Object.keys
      Object.keys = jest.fn().mockImplementation((obj) => {
        if (obj === localStorage) {
          return originalKeys(localStorageMock.store)
        }
        return originalKeys(obj)
      })

      const stats = contentService.getCacheStats()

      expect(stats).toEqual({
        memoryEntries: 0,
        localStorageSize: expect.any(Number)
      })

      // Size should be (100 + 200) * 2 / 1024 KB
      expect(stats.localStorageSize).toBeCloseTo(0.5859375)

      // Restore original Object.keys
      Object.keys = originalKeys
    })

    it('should handle empty localStorage', () => {
      const stats = contentService.getCacheStats()

      expect(stats).toEqual({
        memoryEntries: 0,
        localStorageSize: 0
      })
    })

    it('should count only cache entries', () => {
      // Add mixed entries to localStorage
      localStorageMock.store['cache:item1'] = 'test1'
      localStorageMock.store['cache:item2'] = 'test2'
      localStorageMock.store['user:profile'] = 'should not count'
      localStorageMock.store['settings'] = 'should not count'

      // Mock the localStorage iteration
      const originalKeys = Object.keys
      Object.keys = jest.fn().mockImplementation((obj) => {
        if (obj === localStorage) {
          return originalKeys(localStorageMock.store)
        }
        return originalKeys(obj)
      })

      const stats = contentService.getCacheStats()

      expect(stats.localStorageSize).toBeGreaterThan(0)

      // Restore original Object.keys
      Object.keys = originalKeys
    })
  })

  describe('integration tests', () => {
    it('should support multiple languages', async () => {
      const languages = ['en', 'zhTW', 'es', 'ja', 'ko']
      
      for (const lang of languages) {
        ;(cacheService.fetchWithCache as jest.Mock).mockResolvedValue({ data: lang })
        
        const result = await contentService.getRelationsTree(lang)
        
        expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
          `/api/relations?lang=${lang}`,
          expect.any(Object)
        )
        expect(result).toEqual({ data: lang })
      }
    })

    it('should use different TTL for different content types', async () => {
      // Relations Tree - 30 minutes TTL
      await contentService.getRelationsTree('en')
      expect(cacheService.fetchWithCache).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ ttl: 30 * 60 * 1000, storage: 'both' })
      )

      // Assessment - 60 minutes TTL
      await contentService.getAssessment('test')
      expect(cacheService.fetchWithCache).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ ttl: 60 * 60 * 1000, storage: 'localStorage' })
      )

      // KSA Definitions - 24 hours TTL
      await contentService.getKSADefinitions('en')
      expect(cacheService.fetchWithCache).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ ttl: 24 * 60 * 60 * 1000, storage: 'both' })
      )
    })
  })
})