import {
  LAZY_ROUTES,
  PRELOAD_RESOURCES,
  IMAGE_CONFIG,
  CDN_LIBRARIES,
  EXTERNAL_LIBRARIES,
  SPLIT_CHUNKS,
  COMPRESSION_CONFIG,
  SW_CONFIG
} from '../bundle-optimization';

describe('bundle-optimization config', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  describe('LAZY_ROUTES', () => {
    it('contains expected lazy-loaded routes', () => {
      expect(LAZY_ROUTES).toEqual([
        '/pbl/history',
        '/admin',
        '/settings',
      ]);
    });

    it('is an array', () => {
      expect(Array.isArray(LAZY_ROUTES)).toBe(true);
    });
  });

  describe('PRELOAD_RESOURCES', () => {
    it('contains critical API endpoints', () => {
      expect(PRELOAD_RESOURCES).toEqual([
        '/api/relations',
        '/api/auth/check',
      ]);
    });
  });

  describe('IMAGE_CONFIG', () => {
    it('has correct device sizes', () => {
      expect(IMAGE_CONFIG.deviceSizes).toEqual([640, 750, 828, 1080, 1200]);
    });

    it('has correct image sizes', () => {
      expect(IMAGE_CONFIG.imageSizes).toEqual([16, 32, 48, 64, 96]);
    });

    it('includes modern image formats', () => {
      expect(IMAGE_CONFIG.formats).toEqual(['image/webp', 'image/avif']);
    });

    it('has 30-day cache TTL', () => {
      expect(IMAGE_CONFIG.minimumCacheTTL).toBe(60 * 60 * 24 * 30);
    });
  });

  describe('CDN_LIBRARIES', () => {
    it('returns empty object in non-production', () => {
      (process.env as any).NODE_ENV = 'development';
      // Re-import to get fresh value
      jest.resetModules();
      const { CDN_LIBRARIES: devCdn } = require('../bundle-optimization');
      expect(devCdn).toEqual({});
    });

    it('returns CDN URLs in production', () => {
      (process.env as any).NODE_ENV = 'production';
      jest.resetModules();
      const { CDN_LIBRARIES: prodCdn } = require('../bundle-optimization');
      expect(prodCdn).toEqual({
        react: 'https://unpkg.com/react@19.0.0/umd/react.production.min.js',
        'react-dom': 'https://unpkg.com/react-dom@19.0.0/umd/react-dom.production.min.js',
      });
    });
  });

  describe('EXTERNAL_LIBRARIES', () => {
    it('is an empty array by default', () => {
      expect(EXTERNAL_LIBRARIES).toEqual([]);
    });
  });

  describe('SPLIT_CHUNKS', () => {
    it('has vendor chunk configuration', () => {
      expect(SPLIT_CHUNKS.vendor).toBeDefined();
      expect(SPLIT_CHUNKS.vendor.test).toEqual(/[\\/]node_modules[\\/]/);
    });

    it('vendor name function extracts package name', () => {
      const mockModule = { context: '/path/to/node_modules/react/index.js' };
      const name = SPLIT_CHUNKS.vendor.name(mockModule);
      expect(name).toBe('vendor.react');
    });

    it('vendor name function handles scoped packages', () => {
      const mockModule = { context: '/path/to/node_modules/@tanstack/react-query/index.js' };
      const name = SPLIT_CHUNKS.vendor.name(mockModule);
      expect(name).toBe('vendor.tanstack/react-query');
    });

    it('vendor name function handles edge cases', () => {
      const mockModule = { context: '/some/weird/path' };
      const name = SPLIT_CHUNKS.vendor.name(mockModule);
      expect(name).toBe('vendor.unknown');
    });

    it('has common chunk configuration', () => {
      expect(SPLIT_CHUNKS.common).toEqual({
        minChunks: 2,
        priority: -10,
        reuseExistingChunk: true,
      });
    });

    it('has charts chunk configuration', () => {
      expect(SPLIT_CHUNKS.charts).toEqual({
        test: /[\\/]node_modules[\\/](recharts|d3|chart\.js)/,
        name: 'charts',
        priority: 10,
      });
    });

    it('has i18n chunk configuration', () => {
      expect(SPLIT_CHUNKS.i18n).toEqual({
        test: /[\\/]node_modules[\\/](i18next|react-i18next)/,
        name: 'i18n',
        priority: 10,
      });
    });
  });

  describe('COMPRESSION_CONFIG', () => {
    it('has correct compression settings', () => {
      expect(COMPRESSION_CONFIG).toEqual({
        threshold: 10240,
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        deleteOriginalAssets: false,
      });
    });
  });

  describe('SW_CONFIG', () => {
    it('has runtime caching for Google Fonts', () => {
      const fontCache = SW_CONFIG.runtimeCaching[0];
      expect(fontCache.urlPattern).toEqual(/^https:\/\/fonts\.googleapis\.com/);
      expect(fontCache.handler).toBe('CacheFirst');
      expect(fontCache.options.cacheName).toBe('google-fonts-stylesheets');
      expect(fontCache.options.expiration.maxAgeSeconds).toBe(60 * 60 * 24 * 365);
    });

    it('has runtime caching for images', () => {
      const imageCache = SW_CONFIG.runtimeCaching[1];
      expect(imageCache.urlPattern).toEqual(/\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/);
      expect(imageCache.handler).toBe('CacheFirst');
      expect(imageCache.options.cacheName).toBe('images');
      expect(imageCache.options.expiration.maxEntries).toBe(100);
      expect(imageCache.options.expiration.maxAgeSeconds).toBe(60 * 60 * 24 * 30);
    });
  });
});
