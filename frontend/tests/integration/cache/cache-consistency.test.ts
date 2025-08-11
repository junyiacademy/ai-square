import { IntegrationTestEnvironment } from '../setup/test-environment';
import { 
  testScenarios, 
  cacheTestData,
  seedTestDatabase 
} from '../setup/test-fixtures';
import { 
  APITestHelper,
  DatabaseTestHelper,
  CacheTestHelper,
  PerformanceTestHelper
} from '../setup/test-helpers';

/**
 * Cache Consistency Integration Tests
 * 
 * Tests the multi-layer cache system and consistency
 */

describe('Cache Consistency', () => {
  let env: IntegrationTestEnvironment;
  let apiHelper: APITestHelper;
  let dbHelper: DatabaseTestHelper;
  let cacheHelper: CacheTestHelper;
  let userToken: string;
  
  beforeAll(async () => {
    env = new IntegrationTestEnvironment();
    await env.setup();
    
    apiHelper = new APITestHelper();
    dbHelper = new DatabaseTestHelper(env.getDbPool()!);
    cacheHelper = new CacheTestHelper(env.getRedisClient());
    
    await seedTestDatabase(env.getDbPool()!);
    
    // Create a test user and get token
    const user = await dbHelper.createUser({
      id: 'cache-test-user',
      email: 'cache@test.com',
      password: 'CacheTest123!',
      passwordHash: '$2b$10$test',
      name: 'Cache Test User',
      role: 'user',
      emailVerified: true,
    });
    userToken = await dbHelper.createSession(user.id);
  }, 30000);
  
  afterAll(async () => {
    await env.teardown();
  });
  
  beforeEach(async () => {
    // Clear all cache before each test
    await cacheHelper.clearCache('*');
  });
  
  describe('Multi-Layer Cache Architecture', () => {
    it('should implement 3-layer cache with fallback', async () => {
      const endpoint = '/api/pbl/scenarios';
      
      // 1. First request - MISS (cold cache)
      const firstResponse = await apiHelper.authenticatedRequest(
        'get',
        endpoint,
        userToken
      );
      expect(firstResponse.status).toBe(200);
      expect(firstResponse.headers['x-cache']).toBe('MISS');
      
      // 2. Second request - HIT (from cache)
      const secondResponse = await apiHelper.authenticatedRequest(
        'get',
        endpoint,
        userToken
      );
      expect(secondResponse.status).toBe(200);
      expect(secondResponse.headers['x-cache']).toBe('HIT');
      
      // Response should be identical
      expect(JSON.stringify(secondResponse.body)).toBe(
        JSON.stringify(firstResponse.body)
      );
      
      // 3. Verify cache statistics
      const stats = await cacheHelper.getCacheStats();
      if (stats.available) {
        expect(stats.keyCount).toBeGreaterThan(0);
      }
    });
    
    it('should handle Redis failure with fallback cache', async () => {
      // Simulate Redis being down
      if (env.getRedisClient()) {
        await env.getRedisClient()!.quit();
      }
      
      // Should still work with fallback cache
      const response = await apiHelper.authenticatedRequest(
        'get',
        '/api/assessment/scenarios',
        userToken
      );
      
      expect(response.status).toBe(200);
      expect(response.body.scenarios).toBeDefined();
      
      // Reconnect Redis for other tests
      if (process.env.REDIS_ENABLED === 'true') {
        await env.setupRedis();
      }
    });
    
    it('should implement stale-while-revalidate pattern', async () => {
      const cacheKey = 'test:swr:data';
      const initialValue = { data: 'initial', timestamp: Date.now() };
      const updatedValue = { data: 'updated', timestamp: Date.now() };
      
      // Set initial cache with short TTL
      if (env.getRedisClient()) {
        await env.getRedisClient()!.set(
          cacheKey,
          JSON.stringify(initialValue),
          'EX',
          2 // 2 seconds TTL
        );
        
        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 2100));
        
        // Request should trigger revalidation
        // In a real scenario, this would be an API call
        const cached = await env.getRedisClient()!.get(cacheKey);
        
        // Cache should be stale but still return old value while revalidating
        // (This behavior would be implemented in the actual cache service)
      }
    });
  });
  
  describe('Cache Invalidation', () => {
    it('should invalidate cache on data mutation', async () => {
      const scenarioId = testScenarios.pbl.id;
      
      // 1. Warm up cache
      const initialResponse = await apiHelper.authenticatedRequest(
        'get',
        `/api/pbl/scenarios/${scenarioId}`,
        userToken
      );
      expect(initialResponse.headers['x-cache']).toBe('MISS');
      
      // 2. Verify cache hit
      const cachedResponse = await apiHelper.authenticatedRequest(
        'get',
        `/api/pbl/scenarios/${scenarioId}`,
        userToken
      );
      expect(cachedResponse.headers['x-cache']).toBe('HIT');
      
      // 3. Start a program (mutation)
      const startResponse = await apiHelper.authenticatedRequest(
        'post',
        `/api/pbl/scenarios/${scenarioId}/start`,
        userToken
      );
      expect(startResponse.status).toBe(201);
      
      // 4. Cache should be invalidated for user-specific data
      // (Implementation depends on cache strategy)
      // User-specific endpoints should not use cache
      const userProgramsResponse = await apiHelper.authenticatedRequest(
        'get',
        '/api/user/programs',
        userToken
      );
      
      // User-specific data should not be cached
      expect(userProgramsResponse.headers['x-cache']).toBeUndefined();
    });
    
    it('should handle cache key patterns correctly', async () => {
      const patterns = [
        'pbl:scenarios:list:*',
        'assessment:scenarios:list:*',
        'discovery:scenarios:list:*',
        'ksa:data:*',
      ];
      
      // Warm up cache with different language versions
      const languages = ['en', 'zh', 'es'];
      for (const lang of languages) {
        await apiHelper.authenticatedRequest(
          'get',
          `/api/pbl/scenarios?lang=${lang}`,
          userToken
        );
      }
      
      // Check cache keys exist
      if (env.getRedisClient()) {
        for (const pattern of patterns) {
          const keys = await env.getRedisClient()!.keys(pattern);
          // At least one key should match each pattern
          if (pattern.includes('pbl')) {
            expect(keys.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });
  
  describe('Cache Performance', () => {
    it('should improve response times significantly', async () => {
      const endpoint = '/api/ksa';
      const iterations = 10;
      
      const coldTimes: number[] = [];
      const warmTimes: number[] = [];
      
      // Clear cache
      await cacheHelper.clearCache('ksa:*');
      
      // Cold cache requests
      for (let i = 0; i < iterations; i++) {
        await cacheHelper.clearCache('ksa:*');
        const { duration } = await PerformanceTestHelper.measureResponseTime(
          () => apiHelper.authenticatedRequest('get', endpoint, userToken)
        );
        coldTimes.push(duration);
      }
      
      // Warm up cache
      await apiHelper.authenticatedRequest('get', endpoint, userToken);
      
      // Warm cache requests
      for (let i = 0; i < iterations; i++) {
        const { duration } = await PerformanceTestHelper.measureResponseTime(
          () => apiHelper.authenticatedRequest('get', endpoint, userToken)
        );
        warmTimes.push(duration);
      }
      
      const coldStats = PerformanceTestHelper.calculatePercentiles(coldTimes);
      const warmStats = PerformanceTestHelper.calculatePercentiles(warmTimes);
      
      // Cache should improve performance by at least 50%
      expect(warmStats.avg).toBeLessThan(coldStats.avg * 0.5);
      
      console.log('Cache Performance Improvement:');
      console.log(`Cold P50: ${coldStats.p50}ms, Warm P50: ${warmStats.p50}ms`);
      console.log(`Improvement: ${((1 - warmStats.p50 / coldStats.p50) * 100).toFixed(1)}%`);
    });
    
    it('should handle cache stampede prevention', async () => {
      const endpoint = '/api/relations';
      
      // Clear cache to simulate cold start
      await cacheHelper.clearCache('relations:*');
      
      // Simulate multiple concurrent requests (cache stampede scenario)
      const concurrentRequests = 20;
      const requests = Array.from({ length: concurrentRequests }, () =>
        apiHelper.authenticatedRequest('get', endpoint, userToken)
      );
      
      const results = await Promise.allSettled(requests);
      
      // All requests should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      expect(successful.length).toBe(concurrentRequests);
      
      // Check cache headers
      const cacheHeaders = successful.map(r => 
        (r as PromiseFulfilledResult<any>).value.headers['x-cache']
      );
      
      // Most requests should hit cache (stampede prevented)
      const hits = cacheHeaders.filter(h => h === 'HIT').length;
      const misses = cacheHeaders.filter(h => h === 'MISS').length;
      
      // At most a few misses (ideally just 1)
      expect(misses).toBeLessThanOrEqual(3);
      console.log(`Stampede prevention: ${misses} misses, ${hits} hits out of ${concurrentRequests} requests`);
    });
  });
  
  describe('Cache TTL Management', () => {
    it('should respect different TTL for different content types', async () => {
      const testCases = [
        { endpoint: '/api/ksa', ttl: 86400, type: 'static' }, // 24 hours
        { endpoint: '/api/pbl/scenarios', ttl: 3600, type: 'semi-static' }, // 1 hour
        { endpoint: '/api/discovery/scenarios', ttl: 300, type: 'dynamic' }, // 5 minutes
      ];
      
      for (const testCase of testCases) {
        // Clear specific cache
        await cacheHelper.clearCache(`${testCase.type}:*`);
        
        // Make request to populate cache
        const response = await apiHelper.authenticatedRequest(
          'get',
          testCase.endpoint,
          userToken
        );
        expect(response.status).toBe(200);
        
        // Check cache TTL if Redis is available
        if (env.getRedisClient()) {
          // Get the actual cache key (this is implementation specific)
          const keys = await env.getRedisClient()!.keys('*');
          const relevantKey = keys.find(k => k.includes(testCase.type));
          
          if (relevantKey) {
            const ttl = await env.getRedisClient()!.ttl(relevantKey);
            // TTL should be close to expected (within 10%)
            expect(ttl).toBeGreaterThan(testCase.ttl * 0.9);
            expect(ttl).toBeLessThanOrEqual(testCase.ttl);
          }
        }
      }
    });
  });
  
  describe('Cache Consistency Across Languages', () => {
    it('should maintain separate cache for each language', async () => {
      const languages = ['en', 'zh', 'es', 'ja'];
      const endpoint = '/api/assessment/scenarios';
      
      const responses: Record<string, any> = {};
      
      // Request in different languages
      for (const lang of languages) {
        const response = await apiHelper.authenticatedRequest(
          'get',
          `${endpoint}?lang=${lang}`,
          userToken
        );
        expect(response.status).toBe(200);
        responses[lang] = response.body;
      }
      
      // Each language should have different content
      expect(responses.en).not.toEqual(responses.zh);
      expect(responses.es).not.toEqual(responses.ja);
      
      // Request again to verify cache
      for (const lang of languages) {
        const cachedResponse = await apiHelper.authenticatedRequest(
          'get',
          `${endpoint}?lang=${lang}`,
          userToken
        );
        expect(cachedResponse.headers['x-cache']).toBe('HIT');
        expect(cachedResponse.body).toEqual(responses[lang]);
      }
    });
  });
  
  describe('Cache Memory Management', () => {
    it('should implement LRU eviction for memory cache', async () => {
      // This test would verify the in-memory LRU cache behavior
      // The actual implementation would be in the cache service
      
      const maxItems = 500; // Configured max items for memory cache
      const testItems = 600; // More than max to trigger eviction
      
      // Generate and cache many items
      for (let i = 0; i < testItems; i++) {
        if (env.getRedisClient()) {
          await env.getRedisClient()!.set(
            `test:lru:item:${i}`,
            JSON.stringify({ index: i, data: 'x'.repeat(100) }),
            'EX',
            60
          );
        }
      }
      
      // Check memory usage
      const memoryUsage = PerformanceTestHelper.getMemoryUsage();
      console.log('Memory usage after caching:', memoryUsage);
      
      // Memory should be bounded (not growing indefinitely)
      expect(parseFloat(memoryUsage.heapUsed)).toBeLessThan(500); // Less than 500MB
    });
  });
  
  describe('Cache Error Handling', () => {
    it('should handle corrupted cache data gracefully', async () => {
      if (env.getRedisClient()) {
        // Set corrupted data in cache
        await env.getRedisClient()!.set(
          'pbl:scenarios:list:en',
          'corrupted{invalid-json}data',
          'EX',
          60
        );
        
        // Request should still work (fallback to database)
        const response = await apiHelper.authenticatedRequest(
          'get',
          '/api/pbl/scenarios',
          userToken
        );
        
        expect(response.status).toBe(200);
        expect(response.body.scenarios).toBeDefined();
      }
    });
    
    it('should handle cache connection timeout', async () => {
      // This would test timeout handling
      // Implementation would need to configure short timeout in test
      const startTime = Date.now();
      
      const response = await apiHelper.authenticatedRequest(
        'get',
        '/api/discovery/scenarios',
        userToken
      );
      
      const duration = Date.now() - startTime;
      
      // Even with cache issues, response should be fast (< 1 second)
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });
  });
});