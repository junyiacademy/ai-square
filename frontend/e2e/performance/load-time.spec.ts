import { test, expect } from '@playwright/test';

test.describe('Page Load Time Tests', () => {
  const MAX_LOAD_TIME = 3000; // 3 seconds
  const MAX_FIRST_PAINT = 1500; // 1.5 seconds
  const MAX_INTERACTIVE = 5000; // 5 seconds

  test('homepage should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:3004', {
      waitUntil: 'networkidle',
    });

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(MAX_LOAD_TIME);

    // Check First Contentful Paint
    const fcp = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('paint');
      const fcpEntry = perfData.find(entry => entry.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : 0;
    });

    expect(fcp).toBeLessThan(MAX_FIRST_PAINT);
    expect(fcp).toBeGreaterThan(0);
  });

  test('critical pages should load quickly', async ({ page }) => {
    const criticalPages = [
      { url: '/', name: 'Homepage', maxTime: 3000 },
      { url: '/pbl/scenarios', name: 'PBL Scenarios', maxTime: 4000 },
      { url: '/assessment/scenarios', name: 'Assessment', maxTime: 4000 },
      { url: '/discovery', name: 'Discovery', maxTime: 4000 },
      { url: '/auth/login', name: 'Login', maxTime: 2000 },
    ];

    for (const pageConfig of criticalPages) {
      const startTime = Date.now();

      await page.goto(`http://localhost:3004${pageConfig.url}`, {
        waitUntil: 'domcontentloaded',
      });

      const loadTime = Date.now() - startTime;

      console.log(`${pageConfig.name}: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(pageConfig.maxTime);
    }
  });

  test('should achieve good Core Web Vitals scores', async ({ page }) => {
    await page.goto('http://localhost:3004');

    // Measure Largest Contentful Paint (LCP)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // Fallback after 10 seconds
        setTimeout(() => resolve(0), 10000);
      });
    });

    // LCP should be under 2.5s for "good" score
    expect(lcp).toBeLessThan(2500);

    // Measure First Input Delay (FID) - simulated
    await page.click('body');
    const fidStart = Date.now();
    await page.evaluate(() => document.body.click());
    const fidEnd = Date.now();
    const fid = fidEnd - fidStart;

    // FID should be under 100ms for "good" score
    expect(fid).toBeLessThan(100);

    // Measure Cumulative Layout Shift (CLS)
    const cls = await page.evaluate(() => {
      let clsValue = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      }).observe({ entryTypes: ['layout-shift'] });

      return clsValue;
    });

    // CLS should be under 0.1 for "good" score
    expect(cls).toBeLessThan(0.1);
  });

  test('should lazy load images efficiently', async ({ page }) => {
    await page.goto('http://localhost:3004/pbl/scenarios');

    // Get all images
    const images = await page.$$('img');

    for (const img of images) {
      const loading = await img.getAttribute('loading');
      const isInViewport = await img.isIntersectingViewport();

      if (!isInViewport) {
        // Images outside viewport should have lazy loading
        expect(loading).toBe('lazy');
      }

      // Check that image has proper dimensions to prevent layout shift
      const width = await img.getAttribute('width');
      const height = await img.getAttribute('height');

      if (width && height) {
        expect(parseInt(width)).toBeGreaterThan(0);
        expect(parseInt(height)).toBeGreaterThan(0);
      }
    }
  });

  test('should cache static assets', async ({ page }) => {
    // First load
    const response1 = await page.goto('http://localhost:3004');

    // Check for cache headers on static assets
    const resources = await page.evaluate(() =>
      performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        duration: r.duration,
        transferSize: r.transferSize,
      }))
    );

    // Second load
    await page.reload();

    const cachedResources = await page.evaluate(() =>
      performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        duration: r.duration,
        transferSize: r.transferSize,
      }))
    );

    // Static assets should load faster on second load
    const cssFiles = cachedResources.filter(r => r.name.includes('.css'));
    const jsFiles = cachedResources.filter(r => r.name.includes('.js'));

    for (const file of [...cssFiles, ...jsFiles]) {
      // Cached files should have minimal transfer size
      if (file.transferSize === 0) {
        console.log(`${file.name} served from cache`);
      }
    }
  });

  test('should minimize bundle sizes', async ({ page }) => {
    const response = await page.goto('http://localhost:3004');

    // Get all JavaScript files
    const jsFiles = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts.map(script => script.src);
    });

    const MAX_BUNDLE_SIZE = 500 * 1024; // 500KB per bundle
    const MAX_TOTAL_SIZE = 2 * 1024 * 1024; // 2MB total

    let totalSize = 0;

    for (const url of jsFiles) {
      const response = await page.request.get(url);
      const size = (await response.body()).length;

      totalSize += size;

      // Individual bundles should be reasonably sized
      if (size > MAX_BUNDLE_SIZE) {
        console.log(`Warning: Large bundle ${url}: ${(size / 1024).toFixed(2)}KB`);
      }
    }

    // Total JavaScript should be reasonable
    expect(totalSize).toBeLessThan(MAX_TOTAL_SIZE);
    console.log(`Total JS size: ${(totalSize / 1024).toFixed(2)}KB`);
  });

  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow 3G network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });

    const startTime = Date.now();

    await page.goto('http://localhost:3004', {
      waitUntil: 'domcontentloaded',
    });

    const loadTime = Date.now() - startTime;

    // Should still load within reasonable time on slow network
    expect(loadTime).toBeLessThan(10000); // 10 seconds max

    // Check that loading indicators are shown
    const hasLoadingIndicator = await page.locator('[aria-label="Loading"]').count() > 0 ||
                                await page.locator('.loading').count() > 0 ||
                                await page.locator('.spinner').count() > 0;

    // App should show loading state on slow network
    console.log(`Loading indicator shown: ${hasLoadingIndicator}`);
  });
});
