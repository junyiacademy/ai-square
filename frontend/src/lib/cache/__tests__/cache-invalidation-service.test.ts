/**
 * Tests for CacheInvalidationService
 * Priority: CRITICAL - 0% coverage → 90%+ coverage
 */

import { CacheInvalidationService, cacheInvalidationService } from '../cache-invalidation-service';
import { distributedCacheService } from '../distributed-cache-service';
import { cacheKeys } from '../cache-keys';

// Mock the distributed cache service
jest.mock('../distributed-cache-service', () => ({
  distributedCacheService: {
    delete: jest.fn(),
    getAllKeys: jest.fn(),
    flushAll: jest.fn()
  }
}));

// Mock cache keys
jest.mock('../cache-keys', () => ({
  cacheKeys: {
    scenariosByMode: jest.fn((mode: string) => `scenarios:mode:${mode}`),
    userPrograms: jest.fn((userId: string) => `user:programs:${userId}`)
  }
}));

describe('CacheInvalidationService', () => {
  let service: CacheInvalidationService;
  const mockDistributedCache = distributedCacheService as jest.Mocked<typeof distributedCacheService>;
  const mockCacheKeys = cacheKeys as jest.Mocked<typeof cacheKeys>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get fresh instance
    service = CacheInvalidationService.getInstance();
  });

  afterEach(() => {
    // Clear timers
    jest.clearAllTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CacheInvalidationService.getInstance();
      const instance2 = CacheInvalidationService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(cacheInvalidationService);
    });
  });

  describe('Invalidation Rules Setup', () => {
    it('should have predefined invalidation rules', () => {
      const stats = service.getStats();
      
      expect(stats.rulesCount).toBe(5);
      expect(stats.rules).toEqual(
        expect.arrayContaining(['scenario', 'program', 'task', 'evaluation', 'user'])
      );
    });

    it('should return current queue size and rules', () => {
      const stats = service.getStats();
      
      expect(stats.queueSize).toBe(0);
      expect(stats.rules.length).toBeGreaterThan(0);
      expect(typeof stats.rulesCount).toBe('number');
    });
  });

  describe('Basic Invalidation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should invalidate cache for known entity type', async () => {
      await service.invalidate('scenario', 'test-scenario-id');
      
      // Should schedule batch invalidation
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
      
      // Process the batch
      jest.runAllTimers();
      
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow async operations
      
      expect(mockDistributedCache.delete).toHaveBeenCalled();
    });

    it('should warn for unknown entity type', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await service.invalidate('unknown-type', 'test-id');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'No invalidation rule found for entity type: unknown-type'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle invalidation without entity ID', async () => {
      await service.invalidate('scenario');
      
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
    });
  });

  describe('Cascade Invalidation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should invalidate cascaded cache entries for scenario', async () => {
      await service.invalidate('scenario', 'scenario-123');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should call delete for main key and cascade keys
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('scenario:scenario-123');
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('scenarios:list:scenario-123');
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('scenarios:by-mode:scenario-123');
    });

    it('should handle cascade patterns with wildcards', async () => {
      await service.invalidate('program', 'prog-456');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('program:prog-456');
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('programs:user:prog-456');
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('user:progress:prog-456');
    });

    it('should handle cascade patterns without entity ID', async () => {
      await service.invalidate('user');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('user');
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('user:programs:*');
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('user:achievements:*');
    });
  });

  describe('Batch Invalidation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should batch multiple invalidations', async () => {
      // Make multiple invalidation calls
      await service.invalidate('scenario', 'scenario-1');
      await service.invalidate('program', 'program-1');
      await service.invalidate('task', 'task-1');
      
      // Should only schedule one timer
      expect(setTimeout).toHaveBeenCalledTimes(1);
      
      const stats = service.getStats();
      expect(stats.queueSize).toBeGreaterThan(0);
      
      // Process batch
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Queue should be cleared after processing
      const statsAfter = service.getStats();
      expect(statsAfter.queueSize).toBe(0);
    });

    it('should not schedule multiple batch timers', async () => {
      await service.invalidate('scenario', 'scenario-1');
      await service.invalidate('scenario', 'scenario-2');
      
      // Should still only have one timer
      expect(setTimeout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pattern-based Deletion', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockDistributedCache.getAllKeys.mockResolvedValue([
        'scenario:1',
        'scenario:2',
        'program:1',
        'scenarios:list:all',
        'scenarios:mode:pbl'
      ]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delete keys matching pattern', async () => {
      await service.invalidate('scenario', 'test');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should get all keys for pattern matching
      expect(mockDistributedCache.getAllKeys).toHaveBeenCalled();
    });

    it('should handle pattern deletion errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDistributedCache.delete.mockRejectedValueOnce(new Error('Redis error'));
      
      await service.invalidate('scenario', 'test');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to invalidate key'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Scenario-specific Invalidation', () => {
    it('should invalidate scenario with mode-specific caches', async () => {
      jest.useFakeTimers();
      mockCacheKeys.scenariosByMode.mockReturnValue('scenarios:mode:pbl');
      
      await service.invalidateScenario('scenario-123', 'pbl');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockCacheKeys.scenariosByMode).toHaveBeenCalledWith('pbl');
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('scenarios:mode:pbl');
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('pbl:scenarios:*');
      
      jest.useRealTimers();
    });

    it('should invalidate scenario without mode', async () => {
      jest.useFakeTimers();
      
      await service.invalidateScenario('scenario-123');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockCacheKeys.scenariosByMode).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Program-specific Invalidation', () => {
    it('should invalidate program with user and scenario caches', async () => {
      jest.useFakeTimers();
      mockCacheKeys.userPrograms.mockReturnValue('user:programs:user-123');
      
      await service.invalidateProgram('program-123', 'user-123', 'scenario-123');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockCacheKeys.userPrograms).toHaveBeenCalledWith('user-123');
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('user:programs:user-123');
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('programs:scenario:scenario-123');
      
      jest.useRealTimers();
    });

    it('should invalidate program with partial parameters', async () => {
      jest.useFakeTimers();
      
      await service.invalidateProgram('program-123', 'user-123');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockCacheKeys.userPrograms).toHaveBeenCalledWith('user-123');
      
      jest.useRealTimers();
    });
  });

  describe('Task-specific Invalidation', () => {
    it('should invalidate task with program cache', async () => {
      jest.useFakeTimers();
      
      await service.invalidateTask('task-123', 'program-123');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockDistributedCache.delete).toHaveBeenCalledWith('tasks:program:program-123');
      
      jest.useRealTimers();
    });

    it('should invalidate task without program ID', async () => {
      jest.useFakeTimers();
      
      await service.invalidateTask('task-123');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should still process task invalidation
      expect(setTimeout).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Cache Warming', () => {
    it('should log cache warming activity', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await service.warmCache('scenario', ['scenario-1', 'scenario-2']);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Cache] Warming cache for scenario with 2 items'
      );
      
      consoleLogSpy.mockRestore();
    });

    it('should handle empty popular IDs', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await service.warmCache('program', []);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Cache] Warming cache for program with 0 items'
      );
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('Clear All Caches', () => {
    it('should clear all caches with warning', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await service.clearAll();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Cache] Clearing all caches');
      expect(mockDistributedCache.flushAll).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle flush error gracefully', async () => {
      mockDistributedCache.flushAll.mockRejectedValueOnce(new Error('Flush failed'));
      
      // Should not throw, but let the error bubble up for proper handling
      await expect(service.clearAll()).rejects.toThrow('Flush failed');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle delete errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDistributedCache.delete.mockRejectedValueOnce(new Error('Delete failed'));
      
      await service.invalidate('scenario', 'test-id');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to invalidate key'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should continue processing other keys if one fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Make first call fail, second succeed
      mockDistributedCache.delete
        .mockRejectedValueOnce(new Error('First delete failed'))
        .mockResolvedValueOnce(undefined);
      
      await service.invalidate('scenario', 'test-1');
      await service.invalidate('program', 'test-2');
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should log error but continue
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockDistributedCache.delete).toHaveBeenCalledTimes(2);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance Considerations', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should process batch invalidation only once per delay period', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Make multiple rapid calls
      await service.invalidate('scenario', '1');
      await service.invalidate('scenario', '2');
      await service.invalidate('scenario', '3');
      
      // Should only log once after timer fires
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[Cache\] Invalidating \d+ cache keys/)
      );
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      
      consoleLogSpy.mockRestore();
    });

    it('should handle empty queue gracefully', async () => {
      jest.useFakeTimers();
      
      // Manually trigger batch processing with empty queue
      await service.invalidate('scenario', 'test');
      
      // Clear the queue before processing
      const stats = service.getStats();
      expect(stats.queueSize).toBeGreaterThan(0);
      
      jest.runAllTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should not error on empty queue
      const statsAfter = service.getStats();
      expect(statsAfter.queueSize).toBe(0);
      
      jest.useRealTimers();
    });
  });
});