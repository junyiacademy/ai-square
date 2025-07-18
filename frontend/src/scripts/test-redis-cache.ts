#!/usr/bin/env node

/**
 * Test Redis cache integration
 */

import { redisCacheService } from '../lib/cache/redis-cache-service';
import { distributedCacheService } from '../lib/cache/distributed-cache-service';

async function testRedisCache() {
  console.log('Testing Redis cache service...\n');
  
  // Test 1: Basic get/set
  console.log('Test 1: Basic get/set');
  await redisCacheService.set('test-key', { value: 'Hello Redis' }, { ttl: 60000 });
  const value = await redisCacheService.get('test-key');
  console.log('Set value:', { value: 'Hello Redis' });
  console.log('Get value:', value);
  console.log('✅ Basic get/set:', value?.value === 'Hello Redis' ? 'PASSED' : 'FAILED');
  
  // Test 2: Cache stats
  console.log('\nTest 2: Cache stats');
  const stats = await redisCacheService.getStats();
  console.log('Stats:', stats);
  console.log('✅ Redis connected:', stats.redisConnected ? 'YES' : 'NO (using fallback)');
  
  // Test 3: Multiple keys
  console.log('\nTest 3: Multiple keys');
  await redisCacheService.mset([
    ['key1', { data: 'value1' }],
    ['key2', { data: 'value2' }],
    ['key3', { data: 'value3' }]
  ], { ttl: 60000 });
  
  const multiValues = await redisCacheService.mget(['key1', 'key2', 'key3', 'missing']);
  console.log('Multiple values:', multiValues);
  console.log('✅ Multiple keys test:', multiValues[0]?.data === 'value1' ? 'PASSED' : 'FAILED');
  
  // Cleanup
  await redisCacheService.delete('test-key');
  await redisCacheService.delete('key1');
  await redisCacheService.delete('key2');
  await redisCacheService.delete('key3');
}

async function testDistributedCache() {
  console.log('\n\nTesting distributed cache service...\n');
  
  // Test 1: Basic operations
  console.log('Test 1: Basic operations');
  await distributedCacheService.set('dist-key', { message: 'Distributed cache' }, { ttl: 60000 });
  const value = await distributedCacheService.get('dist-key');
  console.log('Value:', value);
  console.log('✅ Basic operations:', value?.message === 'Distributed cache' ? 'PASSED' : 'FAILED');
  
  // Test 2: Stale-while-revalidate
  console.log('\nTest 2: Stale-while-revalidate');
  let fetchCount = 0;
  const fetcher = async () => {
    fetchCount++;
    await new Promise(resolve => setTimeout(resolve, 50));
    return { data: `Fetched ${fetchCount}` };
  };
  
  const result1 = await distributedCacheService.getWithRevalidation('swr-key', fetcher, {
    ttl: 100,
    staleWhileRevalidate: 1000
  });
  console.log('First fetch:', result1, 'Fetch count:', fetchCount);
  
  // Should return cached value
  const result2 = await distributedCacheService.getWithRevalidation('swr-key', fetcher, {
    ttl: 100,
    staleWhileRevalidate: 1000
  });
  console.log('Second fetch (cached):', result2, 'Fetch count:', fetchCount);
  console.log('✅ SWR test:', fetchCount === 1 ? 'PASSED' : 'FAILED');
  
  // Test 3: Cache stats
  console.log('\nTest 3: Cache stats');
  const stats = await distributedCacheService.getStats();
  console.log('Distributed cache stats:', stats);
  
  // Cleanup
  await distributedCacheService.clear();
}

async function runTests() {
  console.log('🧪 Testing Redis and distributed cache integration...\n');
  
  try {
    await testRedisCache();
    await testDistributedCache();
    
    console.log('\n✅ All cache tests completed!');
    console.log('\n📝 Note: If Redis is not running, the system automatically uses in-memory fallback cache.');
  } catch (error) {
    console.error('\n❌ Error during tests:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);