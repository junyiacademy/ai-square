/**
 * Cache Service Test Suite
 * 
 * Comprehensive tests for unified cache service including memory cache,
 * localStorage cache, TTL handling, and fetch wrapper functionality
 */

import { cacheService } from '../cache-service';
import type { CacheOptions } from '../cache-service';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      if (Object.keys(store).length >= 100) {
        // Simulate storage quota exceeded for testing
        throw new Error('QuotaExceededError');
      }
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Date.now for consistent testing
const mockDateNow = jest.fn();
const originalDateNow = Date.now;

describe('CacheService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockFetch.mockClear();
    mockDateNow.mockClear();
    
    // Set a fixed time for testing
    mockDateNow.mockReturnValue(1640995200000); // 2022-01-01 00:00:00
    Date.now = mockDateNow;
    
    // Clear memory cache
    cacheService.clear();
  });
  
  afterEach(() => {
    Date.now = originalDateNow;
    jest.restoreAllMocks();
  });

  describe('Memory Cache Operations', () => {
    it('should store and retrieve data from memory cache', async () => {
      const testData = { message: 'Hello World' };
      
      await cacheService.set('test-key', testData, { storage: 'memory' });
      const retrieved = await cacheService.get('test-key', 'memory');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent memory cache keys', async () => {
      const result = await cacheService.get('non-existent-key', 'memory');
      expect(result).toBeNull();
    });

    it('should handle TTL expiration in memory cache', async () => {
      const testData = { message: 'Test TTL' };
      const ttl = 1000; // 1 second
      
      await cacheService.set('ttl-test', testData, { storage: 'memory', ttl });
      
      // Should be available immediately
      expect(await cacheService.get('ttl-test', 'memory')).toEqual(testData);
      
      // Simulate time passage
      mockDateNow.mockReturnValue(1640995200000 + ttl + 1);
      
      // Should be expired
      expect(await cacheService.get('ttl-test', 'memory')).toBeNull();
    });

    it('should enforce memory cache size limits', async () => {
      // Fill cache beyond limit (MAX_MEMORY_ENTRIES = 100)
      for (let i = 0; i < 110; i++) {
        await cacheService.set(`key-${i}`, { value: i }, { storage: 'memory' });
        mockDateNow.mockReturnValue(1640995200000 + i); // Increment time for each entry
      }
      
      // Oldest entries should be evicted
      expect(await cacheService.get('key-0', 'memory')).toBeNull();
      expect(await cacheService.get('key-5', 'memory')).toBeNull();
      
      // Newest entries should still exist
      expect(await cacheService.get('key-109', 'memory')).toEqual({ value: 109 });
      expect(await cacheService.get('key-105', 'memory')).toEqual({ value: 105 });
    });
  });

  describe('LocalStorage Cache Operations', () => {
    it('should store and retrieve data from localStorage', async () => {
      const testData = { message: 'LocalStorage Test' };
      
      await cacheService.set('ls-test', testData, { storage: 'localStorage' });
      const retrieved = await cacheService.get('ls-test', 'localStorage');
      
      expect(retrieved).toEqual(testData);
      expect(localStorageMock.getItem('cache:ls-test')).toBeDefined();
    });

    it('should handle localStorage TTL expiration', async () => {
      const testData = { message: 'LS TTL Test' };
      const ttl = 1000;
      
      await cacheService.set('ls-ttl-test', testData, { storage: 'localStorage', ttl });
      
      // Should be available
      expect(await cacheService.get('ls-ttl-test', 'localStorage')).toEqual(testData);
      
      // Simulate expiration
      mockDateNow.mockReturnValue(1640995200000 + ttl + 1);
      
      // Should be expired and cleaned up
      expect(await cacheService.get('ls-ttl-test', 'localStorage')).toBeNull();
      expect(localStorageMock.getItem('cache:ls-ttl-test')).toBeNull();
    });

    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      // Should not throw error
      await expect(
        cacheService.set('error-test', { data: 'test' }, { storage: 'localStorage' })
      ).resolves.not.toThrow();
      
      // Restore original method
      localStorageMock.setItem = originalSetItem;
    });

    it('should handle localStorage read errors gracefully', async () => {
      // Store invalid JSON
      localStorageMock.setItem('cache:invalid-json', 'invalid json{');
      
      const result = await cacheService.get('invalid-json', 'localStorage');
      expect(result).toBeNull();
    });
  });

  describe('Both Storage Mode', () => {
    it('should store data in both memory and localStorage', async () => {
      const testData = { message: 'Both Storage Test' };
      
      await cacheService.set('both-test', testData, { storage: 'both' });
      
      // Should be available in both storages
      expect(await cacheService.get('both-test', 'memory')).toEqual(testData);
      expect(await cacheService.get('both-test', 'localStorage')).toEqual(testData);
    });

    it('should sync data from localStorage to memory when using both mode', async () => {
      const testData = { message: 'Sync Test' };
      
      // Store only in localStorage
      await cacheService.set('sync-test', testData, { storage: 'localStorage' });
      
      // Should sync to memory when retrieved with 'both' mode
      const result = await cacheService.get('sync-test', 'both');
      expect(result).toEqual(testData);
      
      // Should now be available in memory
      expect(await cacheService.get('sync-test', 'memory')).toEqual(testData);
    });

    it('should prioritize memory cache over localStorage', async () => {
      const memoryData = { source: 'memory' };
      const localStorageData = { source: 'localStorage' };
      
      // Store different data in each storage
      await cacheService.set('priority-test', localStorageData, { storage: 'localStorage' });
      await cacheService.set('priority-test', memoryData, { storage: 'memory' });
      
      // Should return memory data
      const result = await cacheService.get('priority-test', 'both');
      expect(result).toEqual(memoryData);
    });
  });

  describe('Data Deletion and Cleanup', () => {
    it('should delete data from both storages', async () => {
      const testData = { message: 'Delete Test' };
      
      await cacheService.set('delete-test', testData);
      
      // Verify data exists
      expect(await cacheService.get('delete-test')).toEqual(testData);
      
      // Delete data
      await cacheService.delete('delete-test');
      
      // Should be removed from both storages
      expect(await cacheService.get('delete-test', 'memory')).toBeNull();
      expect(await cacheService.get('delete-test', 'localStorage')).toBeNull();
    });

    it('should clear all cache data', async () => {
      // Store multiple items
      await cacheService.set('clear-1', { data: 1 });
      await cacheService.set('clear-2', { data: 2 });
      await cacheService.set('clear-3', { data: 3 });
      
      // Clear all cache
      await cacheService.clear();
      
      // All items should be gone
      expect(await cacheService.get('clear-1')).toBeNull();
      expect(await cacheService.get('clear-2')).toBeNull();
      expect(await cacheService.get('clear-3')).toBeNull();
      
      // localStorage should also be cleared
      expect(localStorageMock.getItem('cache:clear-1')).toBeNull();
      expect(localStorageMock.getItem('cache:clear-2')).toBeNull();
      expect(localStorageMock.getItem('cache:clear-3')).toBeNull();
    });

    it('should only clear cache-prefixed items from localStorage', async () => {
      // Store cache and non-cache items
      localStorageMock.setItem('cache:test-item', 'cache data');
      localStorageMock.setItem('user-data', 'user data');
      localStorageMock.setItem('app-settings', 'app settings');
      
      await cacheService.clear();
      
      // Cache item should be removed
      expect(localStorageMock.getItem('cache:test-item')).toBeNull();
      
      // Non-cache items should remain
      expect(localStorageMock.getItem('user-data')).toBe('user data');
      expect(localStorageMock.getItem('app-settings')).toBe('app settings');
    });
  });

  describe('Fetch with Cache', () => {
    it('should fetch and cache data', async () => {
      const mockData = { result: 'success' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });
      
      const result = await cacheService.fetchWithCache('https://api.example.com/data');
      
      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {});
      
      // Should be cached for subsequent calls
      const cachedResult = await cacheService.fetchWithCache('https://api.example.com/data');
      expect(cachedResult).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should not call fetch again
    });

    it('should generate different cache keys for different requests', async () => {
      const mockData1 = { result: 'data1' };
      const mockData2 = { result: 'data2' };
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData1) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData2) });
      
      // Different URLs should have different cache keys
      const result1 = await cacheService.fetchWithCache('https://api.example.com/data1');
      const result2 = await cacheService.fetchWithCache('https://api.example.com/data2');
      
      expect(result1).toEqual(mockData1);
      expect(result2).toEqual(mockData2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should generate different cache keys for different HTTP methods', async () => {
      const getData = { result: 'GET' };
      const postData = { result: 'POST' };
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(getData) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(postData) });
      
      // Same URL but different methods should have different cache keys
      const getResult = await cacheService.fetchWithCache('https://api.example.com/data');
      const postResult = await cacheService.fetchWithCache('https://api.example.com/data', { method: 'POST' });
      
      expect(getResult).toEqual(getData);
      expect(postResult).toEqual(postData);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });
      
      await expect(
        cacheService.fetchWithCache('https://api.example.com/not-found')
      ).rejects.toThrow('HTTP error! status: 404');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(
        cacheService.fetchWithCache('https://api.example.com/data')
      ).rejects.toThrow('Network error');
    });

    it('should respect cache options for fetch', async () => {
      const mockData = { result: 'TTL test' };
      const shortTtl = 500; // 0.5 seconds
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });
      
      // First call with short TTL
      await cacheService.fetchWithCache('https://api.example.com/ttl-test', { ttl: shortTtl });
      
      // Simulate time passage beyond TTL
      mockDateNow.mockReturnValue(1640995200000 + shortTtl + 1);
      
      // Second call should fetch again due to expired cache
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ result: 'refreshed' }) });
      const refreshedResult = await cacheService.fetchWithCache('https://api.example.com/ttl-test', { ttl: shortTtl });
      
      expect(refreshedResult).toEqual({ result: 'refreshed' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', async () => {
      const testData1 = { data: 'test1' };
      const testData2 = { data: 'test2' };
      
      // Store data with same key
      await cacheService.set('consistent-key', testData1);
      
      // Retrieve data with same key
      const result1 = await cacheService.get('consistent-key');
      expect(result1).toEqual(testData1);
      
      // Update data with same key
      await cacheService.set('consistent-key', testData2);
      
      // Should get updated data
      const result2 = await cacheService.get('consistent-key');
      expect(result2).toEqual(testData2);
    });

    it('should handle special characters in keys', async () => {
      const testData = { message: 'Special chars test' };
      const specialKey = 'key-with-@#$%^&*()_+=[]{};:,.<>?';
      
      await cacheService.set(specialKey, testData);
      const result = await cacheService.get(specialKey);
      
      expect(result).toEqual(testData);
    });

    it('should handle empty and whitespace keys', async () => {
      const testData = { message: 'Empty key test' };
      
      await cacheService.set('', testData);
      await cacheService.set(' ', testData);
      await cacheService.set('\t\n\r', testData);
      
      expect(await cacheService.get('')).toEqual(testData);
      expect(await cacheService.get(' ')).toEqual(testData);
      expect(await cacheService.get('\t\n\r')).toEqual(testData);
    });
  });

  describe('Data Types and Serialization', () => {
    it('should handle different data types', async () => {
      const testCases = [
        { key: 'string', data: 'test string' },
        { key: 'number', data: 12345 },
        { key: 'boolean', data: true },
        { key: 'null', data: null },
        { key: 'array', data: [1, 2, 3, 'four'] },
        { key: 'object', data: { nested: { deep: 'value' } } },
        { key: 'date', data: new Date().toISOString() }
      ];
      
      // Store all test cases
      for (const { key, data } of testCases) {
        await cacheService.set(key, data);
      }
      
      // Retrieve and verify all test cases
      for (const { key, data } of testCases) {
        const result = await cacheService.get(key);
        expect(result).toEqual(data);
      }
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        users: [
          {
            id: 1,
            name: 'John Doe',
            profile: {
              email: 'john@example.com',
              preferences: {
                theme: 'dark',
                notifications: {
                  email: true,
                  push: false
                }
              }
            }
          }
        ],
        metadata: {
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          stats: {
            totalUsers: 1,
            activeUsers: 1
          }
        }
      };
      
      await cacheService.set('complex-data', complexData);
      const result = await cacheService.get('complex-data');
      
      expect(result).toEqual(complexData);
      expect((result as any).users[0].profile.preferences.theme).toBe('dark');
    });

    it('should handle large data sets', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: `Data for item ${i}`.repeat(10)
      }));
      
      await cacheService.set('large-data', largeArray);
      const result = await cacheService.get('large-data');
      
      expect(result).toEqual(largeArray);
      expect((result as any).length).toBe(1000);
      expect((result as any)[999].name).toBe('Item 999');
    });
  });

  describe('TTL and Expiration', () => {
    it('should use default TTL when not specified', async () => {
      const testData = { message: 'Default TTL test' };
      
      await cacheService.set('default-ttl-test', testData);
      
      // Should be available immediately
      expect(await cacheService.get('default-ttl-test')).toEqual(testData);
      
      // Simulate time passage beyond default TTL (5 minutes)
      mockDateNow.mockReturnValue(1640995200000 + 5 * 60 * 1000 + 1);
      
      // Should be expired
      expect(await cacheService.get('default-ttl-test')).toBeNull();
    });

    it('should handle custom TTL values', async () => {
      const testData = { message: 'Custom TTL test' };
      const customTtl = 2000; // 2 seconds
      
      await cacheService.set('custom-ttl-test', testData, { ttl: customTtl });
      
      // Should be available before expiration
      mockDateNow.mockReturnValue(1640995200000 + customTtl - 1);
      expect(await cacheService.get('custom-ttl-test')).toEqual(testData);
      
      // Should be expired after TTL
      mockDateNow.mockReturnValue(1640995200000 + customTtl + 1);
      expect(await cacheService.get('custom-ttl-test')).toBeNull();
    });

    it('should handle zero TTL (immediate expiration)', async () => {
      const testData = { message: 'Zero TTL test' };
      
      await cacheService.set('zero-ttl-test', testData, { ttl: 0 });
      
      // Should be immediately expired
      expect(await cacheService.get('zero-ttl-test')).toBeNull();
    });

    it('should handle negative TTL', async () => {
      const testData = { message: 'Negative TTL test' };
      
      await cacheService.set('negative-ttl-test', testData, { ttl: -1000 });
      
      // Should be immediately expired
      expect(await cacheService.get('negative-ttl-test')).toBeNull();
    });
  });

  describe('LocalStorage Cleanup', () => {
    it('should cleanup expired localStorage entries', async () => {
      // Store expired and valid entries
      await cacheService.set('expired-1', { data: 'expired1' }, { ttl: 1000, storage: 'localStorage' });
      mockDateNow.mockReturnValue(1640995200000 + 500);
      await cacheService.set('valid-1', { data: 'valid1' }, { ttl: 2000, storage: 'localStorage' });
      
      // Simulate expiration of first entry
      mockDateNow.mockReturnValue(1640995200000 + 1500);
      
      // Trigger cleanup by trying to store when localStorage is "full"
      const originalSetItem = localStorageMock.setItem;
      let callCount = 0;
      localStorageMock.setItem = jest.fn().mockImplementation((key, value) => {
        if (callCount === 0) {
          callCount++;
          throw new Error('QuotaExceededError');
        }
        return originalSetItem.call(localStorageMock, key, value);
      });
      
      await cacheService.set('trigger-cleanup', { data: 'new' }, { storage: 'localStorage' });
      
      // Expired entry should be cleaned up
      expect(await cacheService.get('expired-1', 'localStorage')).toBeNull();
      // Valid entry should remain
      expect(await cacheService.get('valid-1', 'localStorage')).toEqual({ data: 'valid1' });
      
      // Restore original method
      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('Server-Side Rendering (SSR) Compatibility', () => {
    it('should handle undefined window gracefully', async () => {
      // Mock server-side environment
      const originalWindow = global.window;
      delete (global as any).window;
      
      const testData = { message: 'SSR test' };
      
      // Should only use memory cache
      await cacheService.set('ssr-test', testData);
      const result = await cacheService.get('ssr-test');
      
      expect(result).toEqual(testData);
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle circular references gracefully', async () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;
      
      // Should handle circular reference without crashing
      // This might throw an error during JSON serialization
      await expect(
        cacheService.set('circular-test', circularData)
      ).resolves.not.toThrow();
    });

    it('should handle undefined and null data', async () => {
      await cacheService.set('undefined-test', undefined);
      await cacheService.set('null-test', null);
      
      expect(await cacheService.get('undefined-test')).toBeUndefined();
      expect(await cacheService.get('null-test')).toBeNull();
    });

    it('should handle concurrent operations', async () => {
      const testData = { message: 'Concurrent test' };
      
      // Simulate concurrent set operations
      const promises = Array.from({ length: 10 }, (_, i) =>
        cacheService.set(`concurrent-${i}`, { ...testData, id: i })
      );
      
      await Promise.all(promises);
      
      // All data should be stored correctly
      for (let i = 0; i < 10; i++) {
        const result = await cacheService.get(`concurrent-${i}`);
        expect(result).toEqual({ ...testData, id: i });
      }
    });

    it('should handle very long cache keys', async () => {
      const longKey = 'very-long-key-'.repeat(100);
      const testData = { message: 'Long key test' };
      
      await cacheService.set(longKey, testData);
      const result = await cacheService.get(longKey);
      
      expect(result).toEqual(testData);
    });
  });
});
