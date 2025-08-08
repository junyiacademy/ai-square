import { contentService } from '../content-service';
import { cacheService } from '@/lib/cache/cache-service';
import { performanceMonitor } from '@/lib/performance/performance-monitor';

jest.mock('@/lib/cache/cache-service');
jest.mock('@/lib/performance/performance-monitor');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (performanceMonitor.measureAsync as jest.Mock) = jest.fn((name, fn) => fn());
    (cacheService.delete as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (cacheService.clear as jest.Mock) = jest.fn().mockResolvedValue(undefined);
  });

  describe('getRelationsTree', () => {
    it('should fetch relations tree with cache', async () => {
      const mockData = {
        domains: [{ id: '1', name: 'Domain 1' }],
        kMap: { k1: 'Knowledge 1' },
        sMap: { s1: 'Skill 1' },
        aMap: { a1: 'Attitude 1' },
        ksa: {
          knowledge: { k1: 'Knowledge 1' },
          skills: { s1: 'Skill 1' },
          attitudes: { a1: 'Attitude 1' }
        }
      };

      (cacheService.fetchWithCache as jest.Mock).mockResolvedValue(mockData);

      const result = await contentService.getRelationsTree('en');

      expect(result).toEqual(mockData);
      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/relations?lang=en',
        {
          ttl: 30 * 60 * 1000,
          storage: 'both'
        }
      );
      expect(performanceMonitor.measureAsync).toHaveBeenCalledWith(
        'content.getRelationsTree',
        expect.any(Function)
      );
    });
  });

  describe('getAssessment', () => {
    it('should fetch assessment with cache', async () => {
      const mockData = { id: 'assessment-1', title: 'Test Assessment' };

      (cacheService.fetchWithCache as jest.Mock).mockResolvedValue(mockData);

      const result = await contentService.getAssessment('assessment-1');

      expect(result).toEqual(mockData);
      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/assessments/assessment-1',
        {
          ttl: 60 * 60 * 1000,
          storage: 'localStorage'
        }
      );
    });
  });

  describe('getPBLScenario', () => {
    it('should fetch single PBL scenario with cache', async () => {
      const mockData = { id: '1', title: 'PBL Scenario 1', description: 'Test scenario' };

      (cacheService.fetchWithCache as jest.Mock).mockResolvedValue(mockData);

      const result = await contentService.getPBLScenario('1');

      expect(result).toEqual(mockData);
      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/pbl/scenarios/1',
        {
          ttl: 60 * 60 * 1000,
          storage: 'localStorage'
        }
      );
    });
  });

  describe('getKSADefinitions', () => {
    it('should fetch KSA definitions with cache', async () => {
      const mockData = {
        knowledge: { k1: 'Knowledge 1' },
        skills: { s1: 'Skill 1' },
        attitudes: { a1: 'Attitude 1' }
      };

      (cacheService.fetchWithCache as jest.Mock).mockResolvedValue(mockData);

      const result = await contentService.getKSADefinitions('en');

      expect(result).toEqual(mockData);
      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/ksa?lang=en',
        {
          ttl: 24 * 60 * 60 * 1000,
          storage: 'both'
        }
      );
    });
  });

  describe('preloadEssentialData', () => {
    it('should preload essential data in parallel', async () => {
      const mockTreeData = { domains: [] };
      const mockKSAData = { knowledge: {} };

      (cacheService.fetchWithCache as jest.Mock)
        .mockResolvedValueOnce(mockTreeData)
        .mockResolvedValueOnce(mockKSAData);

      await contentService.preloadEssentialData('en');

      expect(cacheService.fetchWithCache).toHaveBeenCalledTimes(2);
      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/relations?lang=en',
        expect.any(Object)
      );
      expect(cacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/ksa?lang=en',
        expect.any(Object)
      );
    });

    it('should handle preload errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (cacheService.fetchWithCache as jest.Mock).mockRejectedValue(new Error('Network error'));

      await contentService.preloadEssentialData('en');

      expect(consoleSpy).toHaveBeenCalledWith('Preload failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('clearLanguageCache', () => {
    it('should clear cache for specific language', async () => {
      await contentService.clearLanguageCache('en');

      expect(cacheService.delete).toHaveBeenCalledWith('relations:en');
      expect(cacheService.delete).toHaveBeenCalledWith('ksa:en');
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache', async () => {
      await contentService.clearAllCache();

      expect(cacheService.clear).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      // Set up mock localStorage entries
      localStorageMock.setItem('cache:test1', 'value1');
      localStorageMock.setItem('cache:test2', 'value2');
      localStorageMock.setItem('other:key', 'value3');

      // Mock Object.keys to return our test keys
      const originalKeys = Object.keys;
      Object.keys = jest.fn((obj) => {
        if (obj === localStorage) {
          return ['cache:test1', 'cache:test2', 'other:key'];
        }
        return originalKeys(obj);
      });

      const stats = contentService.getCacheStats();

      expect(stats).toEqual({
        memoryEntries: 0,
        localStorageSize: expect.any(Number)
      });

      // Restore Object.keys
      Object.keys = originalKeys;
    });

    it('should handle empty localStorage', () => {
      const stats = contentService.getCacheStats();

      expect(stats).toEqual({
        memoryEntries: 0,
        localStorageSize: 0
      });
    });
  });
});