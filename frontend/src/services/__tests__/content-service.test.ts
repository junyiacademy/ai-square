/**
 * Content Service Tests
 * 提升覆蓋率從 0% 到 80%+
 */

import { ContentService, contentService } from '../content-service';
import { cacheService } from '@/lib/cache/cache-service';
import { performanceMonitor } from '@/lib/performance/performance-monitor';

// Mock dependencies
jest.mock('@/lib/cache/cache-service');
jest.mock('@/lib/performance/performance-monitor');

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation()
};

describe('ContentService', () => {
  let service: ContentService;
  const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
  const mockPerformanceMonitor = performanceMonitor as jest.Mocked<typeof performanceMonitor>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContentService();
    
    // Setup default performance monitor behavior
    mockPerformanceMonitor.measureAsync.mockImplementation(async (name, fn) => {
      return fn();
    });
  });

  afterEach(() => {
    consoleSpy.error.mockClear();
  });

  describe('getRelationsTree', () => {
    it('should fetch relations tree data with correct parameters', async () => {
      const mockTreeData = {
        domains: [{ id: 'domain1', name: 'Domain 1' }],
        kMap: { K1: 'Knowledge 1' },
        sMap: { S1: 'Skill 1' },
        aMap: { A1: 'Attitude 1' }
      };

      mockCacheService.fetchWithCache.mockResolvedValue(mockTreeData);

      const result = await service.getRelationsTree('en');

      expect(mockCacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/relations?lang=en',
        {
          ttl: 30 * 60 * 1000, // 30 minutes
          storage: 'both'
        }
      );
      expect(result).toEqual(mockTreeData);
    });

    it('should measure performance for getRelationsTree', async () => {
      const mockTreeData = { domains: [] };
      mockCacheService.fetchWithCache.mockResolvedValue(mockTreeData);

      await service.getRelationsTree('zh');

      expect(mockPerformanceMonitor.measureAsync).toHaveBeenCalledWith(
        'content.getRelationsTree',
        expect.any(Function)
      );
    });

    it('should handle errors from cache service', async () => {
      const error = new Error('Cache fetch failed');
      mockCacheService.fetchWithCache.mockRejectedValue(error);

      await expect(service.getRelationsTree('en')).rejects.toThrow('Cache fetch failed');
    });
  });

  describe('getAssessment', () => {
    it('should fetch assessment data with correct parameters', async () => {
      const mockAssessmentData = {
        id: 'assessment-123',
        title: 'Test Assessment',
        questions: []
      };

      mockCacheService.fetchWithCache.mockResolvedValue(mockAssessmentData);

      const result = await service.getAssessment('assessment-123');

      expect(mockCacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/assessments/assessment-123',
        {
          ttl: 60 * 60 * 1000, // 1 hour
          storage: 'localStorage'
        }
      );
      expect(result).toEqual(mockAssessmentData);
    });

    it('should not use performance monitor for getAssessment', async () => {
      const mockAssessmentData = { id: 'assessment-123' };
      mockCacheService.fetchWithCache.mockResolvedValue(mockAssessmentData);

      await service.getAssessment('assessment-123');

      // getAssessment doesn't use performanceMonitor
      expect(mockPerformanceMonitor.measureAsync).not.toHaveBeenCalled();
    });
  });

  describe('getPBLScenario', () => {
    it('should fetch PBL scenario data with correct parameters', async () => {
      const mockPBLData = {
        id: 'pbl-456',
        title: 'Test PBL Scenario',
        tasks: []
      };

      mockCacheService.fetchWithCache.mockResolvedValue(mockPBLData);

      const result = await service.getPBLScenario('pbl-456');

      expect(mockCacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/pbl/scenarios/pbl-456',
        {
          ttl: 60 * 60 * 1000, // 1 hour
          storage: 'localStorage'
        }
      );
      expect(result).toEqual(mockPBLData);
    });
  });

  describe('getKSADefinitions', () => {
    it('should fetch KSA definitions with correct parameters', async () => {
      const mockKSAData = {
        knowledge: { K1: 'Knowledge definition' },
        skills: { S1: 'Skill definition' },
        attitudes: { A1: 'Attitude definition' }
      };

      mockCacheService.fetchWithCache.mockResolvedValue(mockKSAData);

      const result = await service.getKSADefinitions('en');

      expect(mockCacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/ksa?lang=en',
        {
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          storage: 'both'
        }
      );
      expect(result).toEqual(mockKSAData);
    });
  });

  describe('preloadEssentialData', () => {
    it('should preload relations tree and KSA definitions in parallel', async () => {
      const mockTreeData = { domains: [] };
      const mockKSAData = { knowledge: {} };

      mockCacheService.fetchWithCache
        .mockResolvedValueOnce(mockTreeData) // for getRelationsTree
        .mockResolvedValueOnce(mockKSAData); // for getKSADefinitions

      await service.preloadEssentialData('en');

      // Should call both methods
      expect(mockCacheService.fetchWithCache).toHaveBeenCalledTimes(2);
      expect(mockCacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/relations?lang=en',
        expect.any(Object)
      );
      expect(mockCacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/ksa?lang=en',
        expect.any(Object)
      );
    });

    it('should not throw error if preload fails', async () => {
      const error = new Error('Network error');
      mockCacheService.fetchWithCache.mockRejectedValue(error);

      // Should not throw
      await expect(service.preloadEssentialData('en')).resolves.toBeUndefined();

      // Should log error
      expect(consoleSpy.error).toHaveBeenCalledWith('Preload failed:', error);
    });

    it('should handle partial failures in preload', async () => {
      mockCacheService.fetchWithCache
        .mockResolvedValueOnce({ domains: [] }) // Success for relations
        .mockRejectedValueOnce(new Error('KSA fetch failed')); // Fail for KSA

      await expect(service.preloadEssentialData('en')).resolves.toBeUndefined();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('clearLanguageCache', () => {
    it('should clear cache for specific language', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.clearLanguageCache('en');

      expect(mockCacheService.delete).toHaveBeenCalledWith('relations:en');
      expect(mockCacheService.delete).toHaveBeenCalledWith('ksa:en');
      expect(mockCacheService.delete).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when clearing cache', async () => {
      const error = new Error('Delete failed');
      mockCacheService.delete.mockRejectedValue(error);

      await expect(service.clearLanguageCache('en')).rejects.toThrow('Delete failed');
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache', async () => {
      mockCacheService.clear.mockResolvedValue(undefined);

      await service.clearAllCache();

      expect(mockCacheService.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCacheStats', () => {
    let mockLocalStorage: Record<string, string>;
    let originalObjectKeys: typeof Object.keys;

    beforeEach(() => {
      // Save original Object.keys
      originalObjectKeys = Object.keys;
      
      // Mock localStorage
      mockLocalStorage = {
        'cache:item1': 'x'.repeat(100), // 100 characters
        'cache:item2': 'y'.repeat(200), // 200 characters
        'other:item': 'z'.repeat(50),   // Should be ignored
      };

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
          length: Object.keys(mockLocalStorage).length,
          key: jest.fn((index: number) => Object.keys(mockLocalStorage)[index])
        },
        writable: true
      });

      // Replace Object.keys implementation
      Object.keys = jest.fn((obj) => {
        if (obj === localStorage) {
          return originalObjectKeys(mockLocalStorage);
        }
        return originalObjectKeys(obj);
      }) as any;
    });
    
    afterEach(() => {
      // Restore original Object.keys
      Object.keys = originalObjectKeys;
    });

    it('should calculate localStorage size correctly', () => {
      const stats = service.getCacheStats();

      // (100 + 200) * 2 (UTF-16) / 1024 = 0.5859375 KB
      expect(stats.localStorageSize).toBeCloseTo(0.586, 2);
      expect(stats.memoryEntries).toBe(0); // Not implemented yet
    });

    it('should handle empty localStorage', () => {
      mockLocalStorage = {};
      
      const stats = service.getCacheStats();

      expect(stats.localStorageSize).toBe(0);
      expect(stats.memoryEntries).toBe(0);
    });

    it('should only count cache prefixed keys', () => {
      mockLocalStorage = {
        'cache:item1': 'x'.repeat(100),
        'notcache:item2': 'y'.repeat(200), // Should be ignored
        'somethingelse': 'z'.repeat(300),   // Should be ignored
      };

      const stats = service.getCacheStats();

      // Only cache:item1 should be counted: 100 * 2 / 1024
      expect(stats.localStorageSize).toBeCloseTo(0.195, 2);
    });
  });

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(contentService).toBeInstanceOf(ContentService);
    });

    it('should use the same configuration as new instance', async () => {
      const mockData = { domains: [] };
      mockCacheService.fetchWithCache.mockResolvedValue(mockData);

      // Use the exported singleton
      await contentService.getRelationsTree('en');

      // Should use same TTL as defined in class
      expect(mockCacheService.fetchWithCache).toHaveBeenCalledWith(
        '/api/relations?lang=en',
        {
          ttl: 30 * 60 * 1000,
          storage: 'both'
        }
      );
    });
  });

  describe('TTL configuration', () => {
    it('should use correct TTL for each content type', async () => {
      mockCacheService.fetchWithCache.mockResolvedValue({});

      // Test each method to verify TTL
      await service.getRelationsTree('en');
      expect(mockCacheService.fetchWithCache).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ ttl: 30 * 60 * 1000 })
      );

      await service.getAssessment('123');
      expect(mockCacheService.fetchWithCache).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ ttl: 60 * 60 * 1000 })
      );

      await service.getPBLScenario('456');
      expect(mockCacheService.fetchWithCache).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ ttl: 60 * 60 * 1000 })
      );

      await service.getKSADefinitions('en');
      expect(mockCacheService.fetchWithCache).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ ttl: 24 * 60 * 60 * 1000 })
      );
    });
  });

  describe('storage configuration', () => {
    it('should use correct storage type for each content type', async () => {
      mockCacheService.fetchWithCache.mockResolvedValue({});

      await service.getRelationsTree('en');
      expect(mockCacheService.fetchWithCache).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ storage: 'both' })
      );

      await service.getAssessment('123');
      expect(mockCacheService.fetchWithCache).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ storage: 'localStorage' })
      );

      await service.getPBLScenario('456');
      expect(mockCacheService.fetchWithCache).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ storage: 'localStorage' })
      );

      await service.getKSADefinitions('en');
      expect(mockCacheService.fetchWithCache).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ storage: 'both' })
      );
    });
  });
});
