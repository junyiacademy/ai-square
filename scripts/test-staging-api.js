#!/usr/bin/env node

const https = require('https');

// Test configuration
const testConfig = {
  baseUrl: 'https://ai-square-staging-m7s4ucbgba-de.a.run.app',
  credentials: {
    email: 'student@example.com',
    password: 'student123'
  }
};

// Function to make HTTPS request
function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Test health check endpoint first
async function testHealthCheck() {
  console.log('\n1. Testing health check endpoint...');
  console.log(`   GET ${testConfig.baseUrl}/api/health`);
  
  try {
    const url = new URL(`${testConfig.baseUrl}/api/health`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${response.body}`);
    
    if (response.statusCode !== 200) {
      console.log('   ❌ Health check failed!');
      return false;
    }
    
    console.log('   ✅ Health check passed!');
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

// Test login endpoint
async function testLogin() {
  console.log('\n2. Testing login endpoint...');
  console.log(`   POST ${testConfig.baseUrl}/api/auth/login`);
  console.log(`   Credentials: ${testConfig.credentials.email} / ${testConfig.credentials.password}`);
  
  try {
    const url = new URL(`${testConfig.baseUrl}/api/auth/login`);
    const postData = JSON.stringify(testConfig.credentials);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await makeRequest(options, postData);
    console.log(`\n   Status Code: ${response.statusCode}`);
    console.log(`   Headers:`);
    console.log(`     - Content-Type: ${response.headers['content-type']}`);
    console.log(`     - Set-Cookie: ${response.headers['set-cookie'] ? 'Present' : 'Not present'}`);
    
    console.log(`\n   Response Body:`);
    try {
      const jsonBody = JSON.parse(response.body);
      console.log(JSON.stringify(jsonBody, null, 2));
    } catch (e) {
      console.log(response.body);
    }
    
    if (response.statusCode === 200) {
      console.log('\n   ✅ Login successful!');
    } else {
      console.log('\n   ❌ Login failed!');
    }
    
    return response;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

// Test database connection
async function testDatabaseCheck() {
  console.log('\n3. Testing database connection (admin endpoint)...');
  console.log(`   GET ${testConfig.baseUrl}/api/admin/db-check`);
  
  try {
    const url = new URL(`${testConfig.baseUrl}/api/admin/db-check`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${response.body}`);
    
    if (response.statusCode === 200) {
      console.log('   ✅ Database connection working!');
    } else {
      console.log('   ⚠️  Database check endpoint not accessible or failing');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

// Main test function
async function runTests() {
  console.log('========================================');
  console.log('AI Square Staging API Test');
  console.log('========================================');
  console.log(`Target: ${testConfig.baseUrl}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('========================================');
  
  // Run tests
  const healthOk = await testHealthCheck();
  
  if (!healthOk) {
    console.log('\n⚠️  Service might be down or not deployed correctly!');
  }
  
  await testLogin();
  await testDatabaseCheck();
  
  console.log('\n========================================');
  console.log('Possible issues if login failed:');
  console.log('1. Database connection not configured');
  console.log('2. Environment variables missing');
  console.log('3. Demo accounts not seeded');
  console.log('4. Password hashing mismatch');
  console.log('5. CORS or security settings');
  console.log('========================================\n');
}

// Run the tests
runTests();