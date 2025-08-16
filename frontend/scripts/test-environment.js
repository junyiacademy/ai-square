#!/usr/bin/env node

/**
 * Comprehensive Environment Testing Script
 * Tests both Staging and Production environments
 * Following CI/CD Deployment SOP
 */

const https = require('https');
const fs = require('fs');

// Environment configurations
const environments = {
  staging: {
    name: 'Staging',
    host: 'ai-square-staging-731209836128.asia-east1.run.app',
    testAccount: {
      email: 'student123@aisquare.com',
      password: 'Demo123456'
    }
  },
  production: {
    name: 'Production',
    host: 'ai-square-frontend-731209836128.asia-east1.run.app',
    testAccount: {
      email: 'student@example.com',
      password: 'student123'
    }
  }
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  environments: {}
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to make HTTPS requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Test suite for each environment
async function testEnvironment(envKey) {
  const env = environments[envKey];
  const results = {
    name: env.name,
    host: env.host,
    tests: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };
  
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}Testing ${env.name} Environment${colors.reset}`);
  console.log(`Host: ${env.host}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  // Test 1: Health Check
  console.log(`${colors.blue}[1/6] Testing Health Check...${colors.reset}`);
  try {
    const healthResponse = await makeRequest({
      hostname: env.host,
      path: '/api/health',
      method: 'GET'
    });
    
    const isHealthy = healthResponse.statusCode === 200;
    results.tests.healthCheck = {
      passed: isHealthy,
      statusCode: healthResponse.statusCode,
      response: healthResponse.data
    };
    
    if (isHealthy) {
      console.log(`${colors.green}✅ Health check passed${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Health check failed (Status: ${healthResponse.statusCode})${colors.reset}`);
    }
  } catch (error) {
    results.tests.healthCheck = { passed: false, error: error.message };
    console.log(`${colors.red}❌ Health check error: ${error.message}${colors.reset}`);
  }
  
  // Test 2: Database Connection (via login attempt)
  console.log(`\n${colors.blue}[2/6] Testing Database Connection...${colors.reset}`);
  let authToken = null;
  
  try {
    const loginData = JSON.stringify(env.testAccount);
    const loginResponse = await makeRequest({
      hostname: env.host,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    }, loginData);
    
    const loginResult = JSON.parse(loginResponse.data);
    const loginSuccess = loginResponse.statusCode === 200 && loginResult.success;
    
    results.tests.databaseConnection = {
      passed: loginSuccess,
      statusCode: loginResponse.statusCode,
      message: loginSuccess ? 'Login successful' : loginResult.error || 'Login failed'
    };
    
    if (loginSuccess) {
      authToken = loginResult.accessToken;
      console.log(`${colors.green}✅ Database connection verified (login successful)${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Database connection issue: ${loginResult.error || 'Login failed'}${colors.reset}`);
    }
  } catch (error) {
    results.tests.databaseConnection = { passed: false, error: error.message };
    console.log(`${colors.red}❌ Database connection error: ${error.message}${colors.reset}`);
  }
  
  // Test 3: PBL Scenarios API
  console.log(`\n${colors.blue}[3/6] Testing PBL Scenarios API...${colors.reset}`);
  try {
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const pblResponse = await makeRequest({
      hostname: env.host,
      path: '/api/pbl/scenarios?lang=zh',
      method: 'GET',
      headers
    });
    
    const pblData = JSON.parse(pblResponse.data);
    const pblSuccess = pblResponse.statusCode === 200 && pblData.success;
    
    results.tests.pblScenarios = {
      passed: pblSuccess,
      statusCode: pblResponse.statusCode,
      scenarioCount: pblSuccess ? (pblData.data?.scenarios?.length || 0) : 0
    };
    
    if (pblSuccess) {
      console.log(`${colors.green}✅ PBL API working (${pblData.data?.scenarios?.length || 0} scenarios)${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ PBL API failed${colors.reset}`);
    }
  } catch (error) {
    results.tests.pblScenarios = { passed: false, error: error.message };
    console.log(`${colors.red}❌ PBL API error: ${error.message}${colors.reset}`);
  }
  
  // Test 4: Discovery Scenarios API with Category Filtering
  console.log(`\n${colors.blue}[4/6] Testing Discovery Scenarios API...${colors.reset}`);
  try {
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const discoveryResponse = await makeRequest({
      hostname: env.host,
      path: '/api/discovery/scenarios?lang=zh',
      method: 'GET',
      headers
    });
    
    const discoveryData = JSON.parse(discoveryResponse.data);
    const discoverySuccess = discoveryResponse.statusCode === 200 && discoveryData.success;
    
    if (discoverySuccess) {
      const scenarios = discoveryData.data?.scenarios || [];
      const categories = {};
      
      scenarios.forEach(s => {
        const cat = s.discoveryData?.category || s.discovery_data?.category || 'unknown';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      
      results.tests.discoveryScenarios = {
        passed: discoverySuccess,
        statusCode: discoveryResponse.statusCode,
        scenarioCount: scenarios.length,
        categories: categories
      };
      
      console.log(`${colors.green}✅ Discovery API working (${scenarios.length} scenarios)${colors.reset}`);
      console.log(`   Categories: ${JSON.stringify(categories)}`);
      
      // Verify expected category distribution
      const expectedCategories = { arts: 4, technology: 4, business: 2, science: 2 };
      let categoryMatch = true;
      
      for (const [cat, count] of Object.entries(expectedCategories)) {
        if (categories[cat] !== count) {
          categoryMatch = false;
          console.log(`   ${colors.yellow}⚠ ${cat}: expected ${count}, got ${categories[cat] || 0}${colors.reset}`);
        }
      }
      
      if (categoryMatch) {
        console.log(`   ${colors.green}✅ All category counts match expected values${colors.reset}`);
      }
    } else {
      results.tests.discoveryScenarios = { passed: false, statusCode: discoveryResponse.statusCode };
      console.log(`${colors.red}❌ Discovery API failed${colors.reset}`);
    }
  } catch (error) {
    results.tests.discoveryScenarios = { passed: false, error: error.message };
    console.log(`${colors.red}❌ Discovery API error: ${error.message}${colors.reset}`);
  }
  
  // Test 5: Assessment Scenarios API
  console.log(`\n${colors.blue}[5/6] Testing Assessment Scenarios API...${colors.reset}`);
  try {
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const assessmentResponse = await makeRequest({
      hostname: env.host,
      path: '/api/assessment/scenarios?lang=zh',
      method: 'GET',
      headers
    });
    
    const assessmentData = JSON.parse(assessmentResponse.data);
    const assessmentSuccess = assessmentResponse.statusCode === 200 && assessmentData.success;
    
    results.tests.assessmentScenarios = {
      passed: assessmentSuccess,
      statusCode: assessmentResponse.statusCode,
      scenarioCount: assessmentSuccess ? (assessmentData.data?.scenarios?.length || 0) : 0
    };
    
    if (assessmentSuccess) {
      console.log(`${colors.green}✅ Assessment API working (${assessmentData.data?.scenarios?.length || 0} scenarios)${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Assessment API failed${colors.reset}`);
    }
  } catch (error) {
    results.tests.assessmentScenarios = { passed: false, error: error.message };
    console.log(`${colors.red}❌ Assessment API error: ${error.message}${colors.reset}`);
  }
  
  // Test 6: Static Assets (Images)
  console.log(`\n${colors.blue}[6/6] Testing Static Assets...${colors.reset}`);
  try {
    const imageResponse = await makeRequest({
      hostname: env.host,
      path: '/images/career-paths/app_developer.jpg',
      method: 'HEAD'
    });
    
    const imageSuccess = imageResponse.statusCode === 200;
    results.tests.staticAssets = {
      passed: imageSuccess,
      statusCode: imageResponse.statusCode
    };
    
    if (imageSuccess) {
      console.log(`${colors.green}✅ Static assets serving correctly${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Static assets issue (Status: ${imageResponse.statusCode})${colors.reset}`);
    }
  } catch (error) {
    results.tests.staticAssets = { passed: false, error: error.message };
    console.log(`${colors.red}❌ Static assets error: ${error.message}${colors.reset}`);
  }
  
  // Calculate summary
  for (const test of Object.values(results.tests)) {
    results.summary.total++;
    if (test.passed) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  }
  
  // Display summary
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${env.name} Test Summary${colors.reset}`);
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`${colors.green}Passed: ${results.summary.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.summary.failed}${colors.reset}`);
  
  if (results.summary.failed === 0) {
    console.log(`\n${colors.green}${colors.bright}🎉 All tests passed for ${env.name}!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠ Some tests failed for ${env.name}${colors.reset}`);
  }
  
  return results;
}

// Main execution
async function main() {
  console.log(`${colors.bright}AI Square Environment Testing${colors.reset}`);
  console.log(`Started at: ${new Date().toLocaleString()}`);
  
  // Test specified environment or both
  const envToTest = process.argv[2];
  
  if (envToTest && environments[envToTest]) {
    // Test single environment
    testResults.environments[envToTest] = await testEnvironment(envToTest);
  } else if (envToTest === 'all' || !envToTest) {
    // Test all environments
    for (const envKey of Object.keys(environments)) {
      testResults.environments[envKey] = await testEnvironment(envKey);
      
      // Add delay between environments
      if (envKey !== 'production') {
        console.log(`\n${colors.yellow}Waiting 2 seconds before next environment...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } else {
    console.log(`${colors.red}Invalid environment: ${envToTest}${colors.reset}`);
    console.log('Usage: node test-environment.js [staging|production|all]');
    process.exit(1);
  }
  
  // Final summary
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}Overall Test Results${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  let allPassed = true;
  for (const [envKey, results] of Object.entries(testResults.environments)) {
    const status = results.summary.failed === 0 ? 
      `${colors.green}✅ PASS${colors.reset}` : 
      `${colors.red}❌ FAIL${colors.reset}`;
    
    console.log(`${results.name}: ${status} (${results.summary.passed}/${results.summary.total} tests passed)`);
    
    if (results.summary.failed > 0) {
      allPassed = false;
      console.log(`  Failed tests:`);
      for (const [testName, test] of Object.entries(results.tests)) {
        if (!test.passed) {
          console.log(`    - ${testName}: ${test.error || `Status ${test.statusCode}`}`);
        }
      }
    }
  }
  
  // Save results to file
  const resultsFile = `test-results-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
  console.log(`\n${colors.blue}Results saved to: ${resultsFile}${colors.reset}`);
  
  // Exit with appropriate code
  if (allPassed) {
    console.log(`\n${colors.green}${colors.bright}🎉 All environments passed all tests!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠ Some tests failed. Please review the results.${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});