#!/usr/bin/env node

/**
 * Deployment QA Agent - Automated Verification Script
 * Demonstrates comprehensive deployment testing capabilities
 */

const https = require('https');
const http = require('http');

class DeploymentQAAgent {
  constructor(config = {}) {
    this.config = {
      environment: config.environment || 'staging',
      baseUrl: config.baseUrl || 'https://ai-square-staging-731209836128.asia-east1.run.app',
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      ...config
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      baseUrl: this.config.baseUrl,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async makeRequest(path, options = {}) {
    const url = `${this.config.baseUrl}${path}`;
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);
      
      const req = client.get(url, (res) => {
        clearTimeout(timeout);
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            contentType: res.headers['content-type'] || ''
          });
        });
      });
      
      req.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async runTest(test) {
    const startTime = Date.now();
    let attempt = 0;
    
    while (attempt < this.config.retries) {
      try {
        const response = await this.makeRequest(test.path);
        const responseTime = Date.now() - startTime;
        
        const result = {
          name: test.name,
          path: test.path,
          expected: test.expectedStatus,
          actual: response.statusCode,
          responseTime,
          attempt: attempt + 1,
          status: 'pass',
          details: null,
          critical: test.critical || false
        };
        
        // Validate status code
        if (response.statusCode !== test.expectedStatus) {
          result.status = 'fail';
          result.details = `Expected ${test.expectedStatus}, got ${response.statusCode}`;
        }
        
        // Validate content type if specified
        if (test.expectedContentType && !response.contentType.includes(test.expectedContentType)) {
          result.status = 'warning';
          result.details = `Expected content-type: ${test.expectedContentType}, got: ${response.contentType}`;
        }
        
        // Custom validation
        if (test.validate && typeof test.validate === 'function') {
          try {
            const customResult = test.validate(response);
            if (!customResult.valid) {
              result.status = 'fail';
              result.details = customResult.message;
            }
          } catch (error) {
            result.status = 'fail';
            result.details = `Validation error: ${error.message}`;
          }
        }
        
        return result;
      } catch (error) {
        attempt++;
        if (attempt >= this.config.retries) {
          return {
            name: test.name,
            path: test.path,
            status: 'fail',
            attempt,
            details: `Network error after ${attempt} attempts: ${error.message}`,
            critical: test.critical || false
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async runAllTests() {
    console.log(`🚀 Deployment QA Agent - ${this.config.environment.toUpperCase()}`);
    console.log(`📊 Testing: ${this.config.baseUrl}`);
    console.log(`⏰ Started: ${this.results.timestamp}\n`);

    const testSuite = [
      {
        name: 'Health Check Endpoint',
        path: '/api/health',
        expectedStatus: 200,
        expectedContentType: 'application/json',
        critical: true,
        validate: (response) => {
          try {
            const data = JSON.parse(response.body);
            if (!data.status) {
              return { valid: false, message: 'Missing status field' };
            }
            if (!['healthy', 'degraded', 'unhealthy'].includes(data.status)) {
              return { valid: false, message: `Invalid status: ${data.status}` };
            }
            return { valid: true };
          } catch (error) {
            return { valid: false, message: 'Invalid JSON response' };
          }
        }
      },
      {
        name: 'Home Page',
        path: '/',
        expectedStatus: 200,
        expectedContentType: 'text/html',
        critical: true
      },
      {
        name: 'PBL Scenarios API',
        path: '/api/pbl/scenarios',
        expectedStatus: 200,
        expectedContentType: 'application/json',
        critical: true,
        validate: (response) => {
          try {
            const data = JSON.parse(response.body);
            if (!Array.isArray(data)) {
              return { valid: false, message: 'Response is not an array' };
            }
            return { valid: true };
          } catch (error) {
            return { valid: false, message: 'Invalid JSON response' };
          }
        }
      },
      {
        name: 'Discovery Scenarios API',
        path: '/api/discovery/scenarios',
        expectedStatus: 200,
        expectedContentType: 'application/json',
        critical: false
      },
      {
        name: 'Assessment Scenarios API',
        path: '/api/assessment/scenarios',
        expectedStatus: 200,
        expectedContentType: 'application/json',
        critical: false
      },
      {
        name: 'Relations API',
        path: '/api/relations',
        expectedStatus: 200,
        expectedContentType: 'application/json',
        critical: false
      }
    ];

    // Run tests sequentially to avoid overwhelming the server
    for (const test of testSuite) {
      process.stdout.write(`Testing ${test.name}... `);
      
      const result = await this.runTest(test);
      this.results.tests.push(result);
      this.results.summary.total++;
      
      // Update summary
      if (result.status === 'pass') {
        this.results.summary.passed++;
        console.log(`✅ PASS (${result.responseTime}ms)`);
      } else if (result.status === 'warning') {
        this.results.summary.warnings++;
        console.log(`⚠️  WARN - ${result.details}`);
      } else {
        this.results.summary.failed++;
        console.log(`❌ FAIL - ${result.details}`);
      }
    }

    return this.generateReport();
  }

  generateReport() {
    const { summary, tests } = this.results;
    const criticalFailures = tests.filter(t => t.status === 'fail' && t.critical);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 DEPLOYMENT QA REPORT');
    console.log('='.repeat(60));
    
    console.log(`Environment: ${this.config.environment}`);
    console.log(`Base URL: ${this.config.baseUrl}`);
    console.log(`Timestamp: ${this.results.timestamp}\n`);
    
    console.log('📊 SUMMARY:');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}\n`);
    
    if (criticalFailures.length > 0) {
      console.log('🚨 CRITICAL FAILURES:');
      criticalFailures.forEach(test => {
        console.log(`   ❌ ${test.name}: ${test.details}`);
      });
      console.log();
    }
    
    console.log('📋 DETAILED RESULTS:');
    tests.forEach(test => {
      const status = test.status === 'pass' ? '✅' : 
                    test.status === 'warning' ? '⚠️' : '❌';
      const critical = test.critical ? ' (CRITICAL)' : '';
      console.log(`   ${status} ${test.name}${critical}`);
      if (test.details) {
        console.log(`      └─ ${test.details}`);
      }
    });
    
    const overallStatus = criticalFailures.length > 0 ? 'FAILED' : 
                         summary.failed > 0 ? 'DEGRADED' : 'HEALTHY';
    
    console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);
    
    if (overallStatus === 'FAILED') {
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      console.log('   1. Check deployment logs for errors');
      console.log('   2. Verify all required files are included in build');
      console.log('   3. Validate environment configuration');
      console.log('   4. Consider rollback if critical services affected');
    }
    
    console.log('\n' + '='.repeat(60));
    
    return {
      status: overallStatus,
      results: this.results,
      criticalFailures: criticalFailures.length
    };
  }
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    config[key] = value;
  }
  
  const qa = new DeploymentQAAgent(config);
  
  qa.runAllTests()
    .then(report => {
      process.exit(report.criticalFailures > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ QA Agent Error:', error.message);
      process.exit(1);
    });
}

module.exports = DeploymentQAAgent;