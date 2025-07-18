#!/usr/bin/env tsx
/**
 * API Performance Testing Framework
 * Tests all API endpoints and measures response times
 */

import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requiresAuth?: boolean;
  requiresParams?: string[];
  testPayload?: any;
}

interface TestResult {
  endpoint: string;
  method: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  errors: number;
  status: 'success' | 'failed' | 'skipped';
  errorDetails?: string[];
}

class APIPerformanceTester {
  private baseUrl = 'http://localhost:3000';
  private testIterations = 10;
  private results: TestResult[] = [];
  private authToken?: string;

  // Define all API endpoints with their configurations
  private endpoints: APIEndpoint[] = [
    // Relations API
    { path: '/api/relations', method: 'GET' },
    
    // KSA API
    { path: '/api/ksa', method: 'GET' },
    
    // Auth APIs
    { path: '/api/auth/check', method: 'GET' },
    { path: '/api/auth/login', method: 'POST', testPayload: { 
      email: 'test@example.com', 
      password: 'password123' 
    }},
    
    // Assessment APIs
    { path: '/api/assessment', method: 'GET' },
    { path: '/api/assessment/scenarios', method: 'GET' },
    { path: '/api/assessment/results', method: 'GET', requiresAuth: true },
    
    // PBL APIs
    { path: '/api/pbl/scenarios', method: 'GET' },
    { path: '/api/pbl/history', method: 'GET', requiresAuth: true },
    { path: '/api/pbl/recommendations', method: 'GET', requiresAuth: true },
    
    // Discovery APIs
    { path: '/api/discovery/scenarios', method: 'GET' },
    { path: '/api/discovery/my-programs', method: 'GET', requiresAuth: true },
    
    // Learning APIs
    { path: '/api/learning/progress', method: 'GET', requiresAuth: true },
    { path: '/api/learning/programs', method: 'GET', requiresAuth: true },
    
    // Chat APIs
    { path: '/api/chat/sessions', method: 'GET', requiresAuth: true },
    
    // Error tracking
    { path: '/api/error-tracking', method: 'POST', testPayload: {
      error: 'Test error',
      stack: 'Test stack trace',
      userAgent: 'Performance Tester',
      url: '/test'
    }},
  ];

  async runTests() {
    console.log('🚀 Starting API Performance Tests...\n');
    
    // Try to authenticate first
    await this.authenticate();
    
    // Test each endpoint
    for (const endpoint of this.endpoints) {
      await this.testEndpoint(endpoint);
    }
    
    // Generate report
    await this.generateReport();
  }

  private async authenticate() {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Test123!@#'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        this.authToken = data.token || 'dummy-token';
        console.log('✅ Authentication successful\n');
      } else {
        console.log('⚠️  Authentication failed, continuing without auth\n');
      }
    } catch (error) {
      console.log('⚠️  Authentication error, continuing without auth\n');
    }
  }

  private async testEndpoint(endpoint: APIEndpoint) {
    console.log(`Testing ${endpoint.method} ${endpoint.path}...`);
    
    const times: number[] = [];
    const errors: string[] = [];
    let successCount = 0;
    
    // Skip if requires auth and we don't have token
    if (endpoint.requiresAuth && !this.authToken) {
      this.results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        iterations: 0,
        errors: 0,
        status: 'skipped',
        errorDetails: ['Requires authentication']
      });
      console.log('  ⏭️  Skipped (requires auth)\n');
      return;
    }
    
    // Run multiple iterations
    for (let i = 0; i < this.testIterations; i++) {
      try {
        const startTime = performance.now();
        
        const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {})
          },
          body: endpoint.testPayload ? JSON.stringify(endpoint.testPayload) : undefined
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        if (response.ok) {
          times.push(responseTime);
          successCount++;
          
          // Also measure JSON parsing time for GET requests
          if (endpoint.method === 'GET') {
            const jsonStart = performance.now();
            await response.json();
            const jsonTime = performance.now() - jsonStart;
            // Include JSON parsing in total time
            times[times.length - 1] += jsonTime;
          }
        } else {
          errors.push(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Calculate statistics
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      this.results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        averageTime: avgTime,
        minTime: minTime,
        maxTime: maxTime,
        iterations: successCount,
        errors: errors.length,
        status: errors.length === 0 ? 'success' : 'failed',
        errorDetails: errors.length > 0 ? errors : undefined
      });
      
      console.log(`  ✅ Avg: ${avgTime.toFixed(2)}ms | Min: ${minTime.toFixed(2)}ms | Max: ${maxTime.toFixed(2)}ms\n`);
    } else {
      this.results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        iterations: 0,
        errors: errors.length,
        status: 'failed',
        errorDetails: errors
      });
      
      console.log(`  ❌ Failed all attempts\n`);
    }
  }

  private async generateReport() {
    console.log('\n📊 Performance Test Results\n');
    console.log('='.repeat(80));
    
    // Sort by average time (slowest first)
    const sortedResults = [...this.results].sort((a, b) => b.averageTime - a.averageTime);
    
    // Print results table
    console.log('| Endpoint | Method | Avg Time | Min | Max | Status |');
    console.log('|----------|--------|----------|-----|-----|--------|');
    
    for (const result of sortedResults) {
      if (result.status === 'skipped') continue;
      
      const statusEmoji = result.status === 'success' ? '✅' : '❌';
      console.log(
        `| ${result.endpoint.padEnd(40)} | ${result.method.padEnd(6)} | ` +
        `${result.averageTime.toFixed(2).padStart(8)}ms | ` +
        `${result.minTime.toFixed(2).padStart(6)}ms | ` +
        `${result.maxTime.toFixed(2).padStart(6)}ms | ${statusEmoji} |`
      );
    }
    
    console.log('\n📈 Performance Analysis\n');
    console.log('='.repeat(80));
    
    // Identify slow endpoints (>500ms average)
    const slowEndpoints = sortedResults.filter(r => r.averageTime > 500);
    if (slowEndpoints.length > 0) {
      console.log('\n🐌 Slow Endpoints (>500ms):');
      for (const endpoint of slowEndpoints) {
        console.log(`  - ${endpoint.method} ${endpoint.endpoint}: ${endpoint.averageTime.toFixed(2)}ms`);
      }
    }
    
    // Identify very fast endpoints (<50ms average)
    const fastEndpoints = sortedResults.filter(r => r.averageTime < 50 && r.averageTime > 0);
    if (fastEndpoints.length > 0) {
      console.log('\n⚡ Fast Endpoints (<50ms):');
      for (const endpoint of fastEndpoints) {
        console.log(`  - ${endpoint.method} ${endpoint.endpoint}: ${endpoint.averageTime.toFixed(2)}ms`);
      }
    }
    
    // Failed endpoints
    const failedEndpoints = sortedResults.filter(r => r.status === 'failed');
    if (failedEndpoints.length > 0) {
      console.log('\n❌ Failed Endpoints:');
      for (const endpoint of failedEndpoints) {
        console.log(`  - ${endpoint.method} ${endpoint.endpoint}`);
        if (endpoint.errorDetails) {
          console.log(`    Errors: ${endpoint.errorDetails[0]}`);
        }
      }
    }
    
    // Save detailed report
    const reportPath = path.join(process.cwd(), 'api-performance-report.json');
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalEndpoints: this.results.length,
        successfulEndpoints: this.results.filter(r => r.status === 'success').length,
        failedEndpoints: this.results.filter(r => r.status === 'failed').length,
        skippedEndpoints: this.results.filter(r => r.status === 'skipped').length,
        averageResponseTime: this.results
          .filter(r => r.status === 'success')
          .reduce((sum, r) => sum + r.averageTime, 0) / 
          this.results.filter(r => r.status === 'success').length || 0
      }
    }, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run the tests
async function main() {
  const tester = new APIPerformanceTester();
  
  try {
    // Check if dev server is running
    const response = await fetch('http://localhost:3000');
    await tester.runTests();
  } catch (error) {
    console.error('❌ Error: Dev server is not running. Please start it with "npm run dev"');
    process.exit(1);
  }
}

main().catch(console.error);