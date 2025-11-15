import { BaseYAMLLoader, type YAMLLoaderOptions, type LoadResult } from '../base-yaml-loader';

// Create a concrete implementation for testing
class TestYAMLLoader extends BaseYAMLLoader<Record<string, any>> {
  private mockData: Record<string, any> = {};
  private shouldFail = false;

  setMockData(filePath: string, data: Record<string, any>) {
    this.mockData[filePath] = data;
  }

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async load(filePath: string): Promise<LoadResult<Record<string, any>>> {
    // Check cache first
    const cached = this.getFromCache(filePath);
    if (cached) {
      return { data: cached, fromCache: true };
    }

    // Simulate async loading
    await new Promise(resolve => setTimeout(resolve, 10));

    if (this.shouldFail) {
      return {
        data: null,
        error: new Error(`Failed to load ${filePath}`),
      };
    }

    const data = this.mockData[filePath] || null;
    if (data) {
      this.setToCache(filePath, data);
    }

    return { data };
  }
}

describe('BaseYAMLLoader', () => {
  let loader: TestYAMLLoader;

  beforeEach(() => {
    loader = new TestYAMLLoader();
  });

  describe('constructor', () => {
    it('uses default options when none provided', () => {
      const defaultLoader = new TestYAMLLoader();
      expect(defaultLoader['options']).toEqual({
        basePath: 'public',
        cache: true,
      });
    });

    it('merges provided options with defaults', () => {
      const customLoader = new TestYAMLLoader({
        basePath: 'custom/path',
        language: 'en',
      });
      expect(customLoader['options']).toEqual({
        basePath: 'custom/path',
        cache: true,
        language: 'en',
      });
    });

    it('allows disabling cache', () => {
      const noCacheLoader = new TestYAMLLoader({ cache: false });
      expect(noCacheLoader['options'].cache).toBe(false);
    });
  });

  describe('caching', () => {
    it('caches loaded data when cache is enabled', async () => {
      const testData = { key: 'value', items: [1, 2, 3] };
      loader.setMockData('test.yaml', testData);

      // First load
      const result1 = await loader.load('test.yaml');
      expect(result1.data).toEqual(testData);
      expect(result1.fromCache).toBeUndefined();

      // Second load should come from cache
      const result2 = await loader.load('test.yaml');
      expect(result2.data).toEqual(testData);
      expect(result2.fromCache).toBe(true);
    });

    it('does not cache when cache is disabled', async () => {
      const noCacheLoader = new TestYAMLLoader({ cache: false });
      const testData = { key: 'value' };
      noCacheLoader.setMockData('test.yaml', testData);

      // First load
      const result1 = await noCacheLoader.load('test.yaml');
      expect(result1.data).toEqual(testData);

      // Second load should not come from cache
      const result2 = await noCacheLoader.load('test.yaml');
      expect(result2.data).toEqual(testData);
      expect(result2.fromCache).toBeUndefined();
    });

    it('clears cache when clearCache is called', async () => {
      const testData = { key: 'value' };
      loader.setMockData('test.yaml', testData);

      // Load and cache
      await loader.load('test.yaml');

      // Clear cache
      loader.clearCache();

      // Next load should not come from cache
      const result = await loader.load('test.yaml');
      expect(result.fromCache).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('returns error in result when loading fails', async () => {
      loader.setShouldFail(true);

      const result = await loader.load('error.yaml');
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Failed to load error.yaml');
    });

    it('does not cache failed loads', async () => {
      loader.setShouldFail(true);

      // First load fails
      await loader.load('error.yaml');

      // Fix the loader
      loader.setShouldFail(false);
      loader.setMockData('error.yaml', { recovered: true });

      // Second load should not use cache
      const result = await loader.load('error.yaml');
      expect(result.data).toEqual({ recovered: true });
      expect(result.fromCache).toBeUndefined();
    });
  });

  describe('protected methods', () => {
    it('getFromCache returns null when cache is disabled', () => {
      const noCacheLoader = new TestYAMLLoader({ cache: false });
      // Set data directly to cache map
      noCacheLoader['cache'].set('test', { data: 'value' });

      const result = noCacheLoader['getFromCache']('test');
      expect(result).toBeNull();
    });

    it('setToCache does not set when cache is disabled', () => {
      const noCacheLoader = new TestYAMLLoader({ cache: false });
      noCacheLoader['setToCache']('test', { data: 'value' });

      expect(noCacheLoader['cache'].has('test')).toBe(false);
    });

    it('cache operations work correctly when enabled', () => {
      const testData = { test: 'data' };

      // Test setToCache
      loader['setToCache']('key1', testData);
      expect(loader['cache'].has('key1')).toBe(true);

      // Test getFromCache
      const retrieved = loader['getFromCache']('key1');
      expect(retrieved).toEqual(testData);

      // Test non-existent key
      const notFound = loader['getFromCache']('nonexistent');
      expect(notFound).toBeNull();
    });
  });

  describe('multiple file handling', () => {
    it('caches multiple files independently', async () => {
      const data1 = { file: 'one' };
      const data2 = { file: 'two' };

      loader.setMockData('file1.yaml', data1);
      loader.setMockData('file2.yaml', data2);

      await loader.load('file1.yaml');
      await loader.load('file2.yaml');

      // Both should be cached
      const result1 = await loader.load('file1.yaml');
      const result2 = await loader.load('file2.yaml');

      expect(result1.data).toEqual(data1);
      expect(result1.fromCache).toBe(true);
      expect(result2.data).toEqual(data2);
      expect(result2.fromCache).toBe(true);
    });
  });
});
