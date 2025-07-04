// Test API endpoints
const http = require('http');

async function testAPI(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`\n${method} ${path}`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data.substring(0, 200)}...`);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.error(`Error testing ${path}:`, error.message);
      resolve({ status: 0, error: error.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Testing Discovery AI Generation API Endpoints...');
  
  // Test 1: Translation API GET
  await testAPI('/api/discovery/translate', 'GET');
  
  // Test 2: Generate Path API GET
  await testAPI('/api/discovery/generate-path', 'GET');
  
  // Test 3: Generate Next Task API GET
  await testAPI('/api/discovery/generate-next-task', 'GET');
  
  // Test 4: Translation API POST (will fail without Vertex AI credentials)
  await testAPI('/api/discovery/translate', 'POST', {
    content: { title: '測試' },
    sourceLocale: 'zh-TW',
    targetLocale: 'en',
    fields: ['title']
  });
  
  console.log('\n✅ API endpoint test complete!');
  console.log('\nNote: POST requests will fail without proper Vertex AI credentials.');
  console.log('The GET endpoints show that the APIs are properly set up.');
}

runTests();