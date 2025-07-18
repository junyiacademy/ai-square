#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const USER_COOKIE = 'user=%7B%22email%22%3A%22test%40example.com%22%2C%22name%22%3A%22Test%20User%22%7D; isLoggedIn=true';

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Cookie': body && body.action === 'start' ? 
          `user=${encodeURIComponent(JSON.stringify({email: `test-${Date.now()}@example.com`, name: 'Test User'}))}; isLoggedIn=true` : 
          USER_COOKIE,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data, error: e.message });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function debugAssessment() {
  console.log('🔍 Debugging Assessment Module\n');

  try {
    // 1. Get scenarios to find the assessment scenario
    console.log('1️⃣ Getting assessment scenarios...');
    const scenariosRes = await makeRequest('GET', '/api/assessment/scenarios?lang=en');
    console.log(`   Status: ${scenariosRes.status}`);
    
    if (scenariosRes.data?.data?.scenarios?.length > 0) {
      const scenario = scenariosRes.data.data.scenarios[0];
      console.log(`   Scenario ID: ${scenario.id}`);
      console.log(`   Title: ${scenario.title}`);
      console.log(`   Source Type: ${scenario.sourceType}`);
      console.log(`   Source Ref:`, JSON.stringify(scenario.sourceRef, null, 2));
      
      // 2. Get scenario details via direct API
      console.log('\n2️⃣ Getting scenario details from API...');
      const detailRes = await makeRequest('GET', `/api/assessment/scenarios/${scenario.id}?lang=en`);
      console.log(`   Status: ${detailRes.status}`);
      
      if (detailRes.data) {
        const data = detailRes.data.data || detailRes.data;
        console.log(`   Has sourceRef: ${!!data.sourceRef}`);
        console.log(`   Has metadata: ${!!data.sourceRef?.metadata}`);
        console.log(`   Config path: ${data.sourceRef?.metadata?.configPath}`);
        console.log(`   Full scenario data:`, JSON.stringify(data, null, 2));
      }
      
      // 3. Try to start assessment with unique session
      console.log('\n3️⃣ Starting assessment program...');
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const uniqueCookie = `user=${encodeURIComponent(JSON.stringify({email: uniqueEmail, name: 'Test User'}))}; isLoggedIn=true`;
      
      const startRes = await makeRequest('POST', `/api/assessment/scenarios/${scenario.id}/programs`, {
        action: 'start',
        language: 'en'
      });
      console.log(`   Status: ${startRes.status}`);
      
      if (startRes.status === 200) {
        console.log(`   Program created: ${startRes.data.program?.id}`);
        console.log(`   Tasks created: ${startRes.data.tasks?.length || 0}`);
        console.log(`   Questions count: ${startRes.data.questionsCount || 0}`);
        
        if (startRes.data.tasks && startRes.data.tasks.length > 0) {
          console.log('\n   Task details:');
          startRes.data.tasks.forEach((task, idx) => {
            console.log(`   Task ${idx + 1}:`);
            console.log(`     ID: ${task.id}`);
            console.log(`     Title: ${task.title}`);
            console.log(`     Type: ${task.type}`);
            console.log(`     Questions: ${task.content?.context?.questions?.length || 0}`);
          });
        }
      } else {
        console.log('   Error:', startRes.data?.error || 'Unknown error');
      }
      
    } else {
      console.log('   No assessment scenarios found');
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
  }
}

// Run the debug
debugAssessment().catch(console.error);