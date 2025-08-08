import { cacheService } from './cache-service';

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Clear the cache before each test
    cacheService.clear();
    
    // Mock localStorage for browser environment tests
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get', () => {
    it('should return cached value from memory', async () => {
      await cacheService.set('key1', 'value1', { storage: 'memory' });
      const result = await cacheService.get('key1', 'memory');
      expect(result).toBe('value1');
    });

    it('should return cached value from localStorage', async () => {
      const mockData = { data: 'test', timestamp: Date.now(), ttl: 300000 };
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockData));
      
      const result = await cacheService.get('testKey', 'localStorage');
      expect(result).toBe('test');
      expect(localStorage.getItem).toHaveBeenCalledWith('cache:testKey');
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheService.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for expired entries', async () => {
      await cacheService.set('expiredKey', 'value', { ttl: 1000, storage: 'memory' });
      
      jest.advanceTimersByTime(1100);
      
      const result = await cacheService.get('expiredKey', 'memory');
      expect(result).toBeNull();
    });

    it('should sync localStorage to memory when storage is both', async () => {
      const mockData = { data: 'syncedData', timestamp: Date.now(), ttl: 300000 };
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockData));
      
      const result = await cacheService.get('syncKey', 'both');
      expect(result).toBe('syncedData');
      
      // Should now be in memory cache
      const memoryResult = await cacheService.get('syncKey', 'memory');
      expect(memoryResult).toBe('syncedData');
    });

    it('should handle localStorage read errors gracefully', async () => {
      (localStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = await cacheService.get('errorKey', 'localStorage');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store values in memory cache', async () => {
      await cacheService.set('key2', { data: 'test' }, { storage: 'memory' });
      const result = await cacheService.get('key2', 'memory');
      expect(result).toEqual({ data: 'test' });
    });

    it('should store values in localStorage', async () => {
      await cacheService.set('key3', 'localValue', { storage: 'localStorage' });
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cache:key3',
        expect.stringContaining('"data":"localValue"')
      );
    });

    it('should store values in both storages', async () => {
      await cacheService.set('key4', 'bothValue', { storage: 'both' });
      
      expect(localStorage.setItem).toHaveBeenCalled();
      const memoryResult = await cacheService.get('key4', 'memory');
      expect(memoryResult).toBe('bothValue');
    });

    it('should use default TTL when not specified', async () => {
      await cacheService.set('key5', 'defaultTTL');
      
      jest.advanceTimersByTime(4 * 60 * 1000); // 4 minutes
      expect(await cacheService.get('key5', 'memory')).toBe('defaultTTL');
      
      jest.advanceTimersByTime(2 * 60 * 1000); // 6 minutes total
      expect(await cacheService.get('key5', 'memory')).toBeNull();
    });

    it('should handle localStorage quota exceeded', async () => {
      (localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      // Should not throw
      await expect(cacheService.set('key6', 'value', { storage: 'localStorage' }))
        .resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should remove items from memory cache', async () => {
      await cacheService.set('key7', 'value7', { storage: 'memory' });
      await cacheService.delete('key7');
      const result = await cacheService.get('key7', 'memory');
      expect(result).toBeNull();
    });

    it('should remove items from localStorage', async () => {
      await cacheService.delete('key8');
      expect(localStorage.removeItem).toHaveBeenCalledWith('cache:key8');
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      await cacheService.set('key9', 'value9', { storage: 'memory' });
      await cacheService.set('key10', 'value10', { storage: 'memory' });
      await cacheService.clear();
      
      const result1 = await cacheService.get('key9', 'memory');
      const result2 = await cacheService.get('key10', 'memory');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should clear localStorage cache entries', async () => {
      Object.keys = jest.fn().mockReturnValue(['cache:item1', 'cache:item2', 'other:item']);
      
      await cacheService.clear();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('cache:item1');
      expect(localStorage.removeItem).toHaveBeenCalledWith('cache:item2');
      expect(localStorage.removeItem).not.toHaveBeenCalledWith('other:item');
    });
  });

  describe('fetchWithCache', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should return cached data if available', async () => {
      await cacheService.set('GET:http://api.test/data:', { cached: true });
      
      const result = await cacheService.fetchWithCache('http://api.test/data');
      
      expect(result).toEqual({ cached: true });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch and cache data if not cached', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ fresh: true })
      });
      
      const result = await cacheService.fetchWithCache('http://api.test/data');
      
      expect(result).toEqual({ fresh: true });
      expect(global.fetch).toHaveBeenCalledWith('http://api.test/data', {});
      
      // Should be cached now
      const cachedResult = await cacheService.get('GET:http://api.test/data:');
      expect(cachedResult).toEqual({ fresh: true });
    });

    it('should throw on fetch error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      });
      
      await expect(cacheService.fetchWithCache('http://api.test/error'))
        .rejects.toThrow('HTTP error! status: 404');
    });

    it('should handle POST requests with body', async () => {
      const body = { test: 'data' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });
      
      await cacheService.fetchWithCache('http://api.test/post', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      expect(global.fetch).toHaveBeenCalledWith('http://api.test/post', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    });
  });
});