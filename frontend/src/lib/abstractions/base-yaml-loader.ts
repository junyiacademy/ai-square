/**
 * Base YAML Loader Abstract Class
 */

export interface YAMLLoaderOptions {
  basePath?: string;
  cache?: boolean;
  language?: string;
}

export interface LoadResult<T> {
  data: T | null;
  error?: Error;
  fromCache?: boolean;
}

export abstract class BaseYAMLLoader<T = unknown> {
  protected options: YAMLLoaderOptions;
  protected cache: Map<string, T> = new Map();

  constructor(options: YAMLLoaderOptions = {}) {
    this.options = {
      basePath: "public",
      cache: true,
      ...options,
    };
  }

  /**
   * Load YAML file
   */
  abstract load(filePath: string): Promise<LoadResult<T>>;

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get from cache
   */
  protected getFromCache(key: string): T | null {
    if (!this.options.cache) return null;
    return this.cache.get(key) || null;
  }

  /**
   * Set to cache
   */
  protected setToCache(key: string, data: T): void {
    if (this.options.cache) {
      this.cache.set(key, data);
    }
  }
}
