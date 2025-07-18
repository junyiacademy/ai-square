#!/usr/bin/env node

/**
 * Test optimized API endpoints
 * Validates that optimizations work correctly and measure performance improvements
 */

interface TestResult {
  endpoint: string;
  method: string;
  status: 'success' | 'failed' | 'skipped';
  responseTime: number;
  cacheHit: boolean;
  statusCode: number;
  error?: string;
}

interface EndpointTest {
  endpoint: string;
  method: string;
  testCases: Array<{
    name: string;
    params?: Record<string, string>;
    headers?: Record<string, string>;
    expectedStatus?: number;
    skipCache?: boolean;
  }>;
}

const OPTIMIZED_ENDPOINTS: EndpointTest[] = [
  {
    endpoint: '/api/pbl/scenarios/550e8400-e29b-41d4-a716-446655440000',
    method: 'GET',
    testCases: [
      {
        name: 'Basic scenario fetch',
        params: { lang: 'en' },
        expectedStatus: 200
      },
      {
        name: 'Cached scenario fetch (should be faster)',
        params: { lang: 'en' },
        expectedStatus: 200
      },
      {
        name: 'Different language',
        params: { lang: 'zh' },
        expectedStatus: 200
      }
    ]
  },
  {
    endpoint: '/api/pbl/history',
    method: 'GET',
    testCases: [
      {
        name: 'Basic history fetch',
        params: { lang: 'en' },
        expectedStatus: 200
      },
      {
        name: 'Cached history fetch',
        params: { lang: 'en' },
        expectedStatus: 200
      },
      {
        name: 'Paginated history',
        params: { page: '1', limit: '10' },
        expectedStatus: 200
      }
    ]
  },
  {
    endpoint: '/api/pbl/user-programs',
    method: 'GET',
    testCases: [
      {
        name: 'Basic user programs fetch',
        expectedStatus: 200
      },
      {
        name: 'Cached user programs fetch',
        expectedStatus: 200
      },
      {
        name: 'Paginated user programs',
        params: { page: '1', limit: '5' },
        expectedStatus: 200
      }
    ]
  },
  {
    endpoint: '/api/assessment/results',
    method: 'GET',
    testCases: [
      {
        name: 'Basic assessment results',
        params: { userId: 'test-user-123' },
        expectedStatus: 200
      },
      {
        name: 'Cached assessment results',
        params: { userId: 'test-user-123' },
        expectedStatus: 200
      }
    ]
  },
  {
    endpoint: '/api/admin/data',
    method: 'GET',
    testCases: [
      {
        name: 'Basic data fetch',
        params: { type: 'pbl', filename: 'test' },
        expectedStatus: 200
      },
      {
        name: 'Cached data fetch',
        params: { type: 'pbl', filename: 'test' },
        expectedStatus: 200
      }
    ]
  },
  {
    endpoint: '/api/monitoring/performance',
    method: 'GET',
    testCases: [
      {
        name: 'Performance metrics',
        expectedStatus: 200
      },
      {
        name: 'Performance summary',
        params: { format: 'summary' },
        expectedStatus: 200
      }
    ]
  }
];

async function testEndpoint(endpointTest: EndpointTest): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  for (const testCase of endpointTest.testCases) {
    const startTime = Date.now();
    let result: TestResult;
    
    try {
      // Build URL with parameters
      const url = new URL(`http://localhost:3000${endpointTest.endpoint}`);
      if (testCase.params) {
        for (const [key, value] of Object.entries(testCase.params)) {
          url.searchParams.set(key, value);
        }
      }
      
      // Make request
      const response = await fetch(url.toString(), {
        method: endpointTest.method,
        headers: {
          'Content-Type': 'application/json',
          ...testCase.headers
        }
      });
      
      const responseTime = Date.now() - startTime;
      const cacheHit = response.headers.get('X-Cache') === 'HIT';
      
      // Check if response is as expected
      const expectedStatus = testCase.expectedStatus || 200;
      const success = response.status === expectedStatus;
      
      result = {
        endpoint: `${endpointTest.endpoint} (${testCase.name})`,
        method: endpointTest.method,
        status: success ? 'success' : 'failed',
        responseTime,
        cacheHit,
        statusCode: response.status,
        error: success ? undefined : `Expected ${expectedStatus}, got ${response.status}`
      };
      
      // Log cache performance
      if (cacheHit) {
        console.log(`✨ Cache hit for ${testCase.name}: ${responseTime}ms`);
      }
      
    } catch (error) {
      result = {
        endpoint: `${endpointTest.endpoint} (${testCase.name})`,
        method: endpointTest.method,
        status: 'failed',
        responseTime: Date.now() - startTime,
        cacheHit: false,
        statusCode: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    results.push(result);
  }
  
  return results;
}

async function runTests() {
  console.log('🧪 Testing optimized API endpoints...\n');
  
  const allResults: TestResult[] = [];
  
  for (const endpointTest of OPTIMIZED_ENDPOINTS) {
    console.log(`Testing ${endpointTest.endpoint}...`);
    const results = await testEndpoint(endpointTest);
    allResults.push(...results);
    
    // Wait a bit between endpoint tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Generate report
  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(60));
  
  const successes = allResults.filter(r => r.status === 'success');
  const failures = allResults.filter(r => r.status === 'failed');
  const cacheHits = allResults.filter(r => r.cacheHit);
  
  console.log(`✅ Successful: ${successes.length}/${allResults.length}`);
  console.log(`❌ Failed: ${failures.length}/${allResults.length}`);
  console.log(`⚡ Cache hits: ${cacheHits.length}/${allResults.length}`);
  
  const avgResponseTime = allResults.reduce((sum, r) => sum + r.responseTime, 0) / allResults.length;
  const avgCacheHitTime = cacheHits.reduce((sum, r) => sum + r.responseTime, 0) / cacheHits.length || 0;
  const avgCacheMissTime = allResults.filter(r => !r.cacheHit).reduce((sum, r) => sum + r.responseTime, 0) / allResults.filter(r => !r.cacheHit).length || 0;
  
  console.log(`📈 Average response time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`⚡ Average cache hit time: ${avgCacheHitTime.toFixed(0)}ms`);
  console.log(`🐌 Average cache miss time: ${avgCacheMissTime.toFixed(0)}ms`);
  
  if (avgCacheHitTime > 0 && avgCacheMissTime > 0) {
    const speedup = avgCacheMissTime / avgCacheHitTime;
    console.log(`🚀 Cache speedup: ${speedup.toFixed(1)}x faster`);
  }
  
  // Show failures
  if (failures.length > 0) {
    console.log('\n❌ Failed Tests:');
    failures.forEach(failure => {
      console.log(`  - ${failure.endpoint}: ${failure.error}`);
    });
  }
  
  // Show slow endpoints
  const slowEndpoints = allResults.filter(r => r.responseTime > 1000);
  if (slowEndpoints.length > 0) {
    console.log('\n⚠️  Slow Endpoints (>1s):');
    slowEndpoints.forEach(slow => {
      console.log(`  - ${slow.endpoint}: ${slow.responseTime}ms`);
    });
  }
  
  console.log('\n✅ Optimization testing completed!');
  
  // Exit with error if any tests failed
  if (failures.length > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
}