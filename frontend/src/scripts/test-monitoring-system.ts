#!/usr/bin/env node

/**
 * Test performance monitoring system
 */

import { performanceMonitor, getPerformanceReport } from '../lib/monitoring/performance-monitor';
import { productionMonitor } from '../lib/monitoring/production-monitor';

async function testPerformanceMonitor() {
  console.log('Testing performance monitor...\n');
  
  // Clear existing metrics
  performanceMonitor.clearMetrics();
  
  // Simulate some API calls
  console.log('Simulating API calls...');
  
  // Fast endpoint
  performanceMonitor.recordMetric({
    endpoint: '/api/test/fast',
    method: 'GET',
    responseTime: 50,
    cacheHit: true,
    statusCode: 200,
    timestamp: new Date().toISOString()
  });
  
  // Slow endpoint
  performanceMonitor.recordMetric({
    endpoint: '/api/test/slow',
    method: 'GET',
    responseTime: 2000,
    cacheHit: false,
    statusCode: 200,
    timestamp: new Date().toISOString()
  });
  
  // Error endpoint
  performanceMonitor.recordMetric({
    endpoint: '/api/test/error',
    method: 'POST',
    responseTime: 100,
    cacheHit: false,
    statusCode: 500,
    timestamp: new Date().toISOString(),
    errorMessage: 'Internal server error'
  });
  
  // Multiple calls to same endpoint
  for (let i = 0; i < 10; i++) {
    performanceMonitor.recordMetric({
      endpoint: '/api/test/frequent',
      method: 'GET',
      responseTime: 100 + Math.random() * 50,
      cacheHit: i > 2, // Cache hit after first few calls
      statusCode: 200,
      timestamp: new Date().toISOString()
    });
  }
  
  // Wait a bit for aggregation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Get metrics
  console.log('\nPerformance Report:');
  const report = getPerformanceReport();
  
  console.log('\nSummary:');
  console.log(`- Total endpoints: ${report.summary.totalEndpoints}`);
  console.log(`- Average response time: ${report.summary.averageResponseTime.toFixed(0)}ms`);
  console.log(`- Average cache hit rate: ${report.summary.averageCacheHitRate.toFixed(1)}%`);
  console.log(`- Average error rate: ${report.summary.averageErrorRate.toFixed(1)}%`);
  
  console.log('\nEndpoints:');
  report.endpoints.forEach(endpoint => {
    console.log(`- ${endpoint.endpoint} (${endpoint.method})`);
    console.log(`  Response time: ${endpoint.averageResponseTime.toFixed(0)}ms`);
    console.log(`  Cache hit rate: ${endpoint.cacheHitRate.toFixed(1)}%`);
    console.log(`  Error rate: ${endpoint.errorRate.toFixed(1)}%`);
  });
  
  console.log('\nAlerts:');
  if (report.alerts.length > 0) {
    report.alerts.forEach(alert => console.log(`- ${alert}`));
  } else {
    console.log('- No alerts');
  }
  
  console.log('\n✅ Performance monitoring test completed!');
}

async function testProductionMonitor() {
  console.log('\n\nTesting production monitor...\n');
  
  const status = productionMonitor.getStatus();
  console.log('Production monitor status:');
  console.log(`- Enabled: ${status.enabled}`);
  console.log(`- External services: ${status.externalServices.join(', ') || 'None'}`);
  console.log(`- Alert thresholds:`);
  console.log(`  Response time: ${status.alertThresholds.responseTime}ms`);
  console.log(`  Error rate: ${status.alertThresholds.errorRate}%`);
  console.log(`  Cache hit rate: ${status.alertThresholds.cacheHitRate}%`);
  
  console.log('\n✅ Production monitoring test completed!');
}

async function runTests() {
  console.log('🧪 Testing monitoring system...\n');
  
  try {
    await testPerformanceMonitor();
    await testProductionMonitor();
    
    console.log('\n✅ All monitoring tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during tests:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);