#!/usr/bin/env node

// Test script for PBL module flow
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
        'Cookie': USER_COOKIE,
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

async function testPBLFlow() {
  console.log('🧪 Testing PBL Module Flow\n');

  try {
    // 1. Test scenarios list
    console.log('1️⃣ Testing scenarios list...');
    const scenariosRes = await makeRequest('GET', '/api/pbl/scenarios?lang=en');
    console.log(`   Status: ${scenariosRes.status}`);
    console.log(`   Scenarios found: ${scenariosRes.data?.data?.scenarios?.length || 0}`);
    
    if (!scenariosRes.data?.data?.scenarios?.length) {
      throw new Error('No scenarios found');
    }

    const scenario = scenariosRes.data.data.scenarios.find(s => s.yamlId === 'high-school-climate-change');
    if (!scenario) {
      throw new Error('Test scenario not found');
    }
    console.log(`   ✅ Found test scenario: ${scenario.id}\n`);

    // 2. Test scenario detail
    console.log('2️⃣ Testing scenario detail...');
    const detailRes = await makeRequest('GET', `/api/pbl/scenarios/${scenario.id}?lang=en`);
    console.log(`   Status: ${detailRes.status}`);
    console.log(`   Title: ${detailRes.data?.data?.title}`);
    console.log(`   Tasks: ${detailRes.data?.data?.tasks?.length || 0}`);
    console.log(`   ✅ Scenario details retrieved\n`);

    // 3. Start new program
    console.log('3️⃣ Starting new program...');
    const startRes = await makeRequest('POST', `/api/pbl/scenarios/${scenario.id}/start`, {
      language: 'en'
    });
    console.log(`   Status: ${startRes.status}`);
    
    if (!startRes.data?.success) {
      throw new Error('Failed to start program: ' + JSON.stringify(startRes.data));
    }

    const programId = startRes.data.programId;
    const firstTaskId = startRes.data.firstTaskId;
    console.log(`   ✅ Program created: ${programId}`);
    console.log(`   First task: ${firstTaskId}\n`);

    // 4. Test user programs endpoint
    console.log('4️⃣ Testing user programs retrieval...');
    const userProgramsRes = await makeRequest('GET', `/api/pbl/user-programs?scenarioId=${scenario.id}`);
    console.log(`   Status: ${userProgramsRes.status}`);
    console.log(`   Programs found: ${userProgramsRes.data?.data?.length || 0}`);
    
    // Also try the scenario-specific programs endpoint
    const scenarioProgramsRes = await makeRequest('GET', `/api/pbl/scenarios/${scenario.id}/programs?lang=en`);
    console.log(`   Scenario programs status: ${scenarioProgramsRes.status}`);
    console.log(`   Scenario programs found: ${scenarioProgramsRes.data?.data?.programs?.length || 0}\n`);

    // 5. Test task interaction (chat)
    console.log('5️⃣ Testing task interaction...');
    const chatContext = {
      scenarioId: scenario.id,
      taskId: firstTaskId,
      taskTitle: "Climate Data Collection",
      taskDescription: "Use AI to gather and organize climate data for your local area",
      instructions: ["Use AI to find reliable climate data sources"],
      expectedOutcome: "A comprehensive climate data collection for your area",
      conversationHistory: []
    };

    const chatRes = await makeRequest('POST', '/api/pbl/chat', {
      message: "Hello, can you help me find climate data?",
      sessionId: "test-session-" + Date.now(),
      context: chatContext
    });
    console.log(`   Chat status: ${chatRes.status}`);
    if (chatRes.data?.error) {
      console.log(`   ⚠️  Chat error: ${chatRes.data.error}`);
    } else {
      console.log(`   ✅ Chat response received`);
    }

    // 6. Test evaluation
    console.log('\n6️⃣ Testing evaluation...');
    const evalRes = await makeRequest('POST', '/api/pbl/evaluate', {
      programId: programId,
      taskId: firstTaskId,
      userResponse: "I have collected climate data showing temperature increases.",
      language: 'en',
      conversations: [],
      task: {
        title: "Climate Data Collection",
        description: "Use AI to gather and organize climate data",
        expectedOutcome: "A comprehensive climate data collection"
      }
    });
    console.log(`   Evaluation status: ${evalRes.status}`);
    if (evalRes.data?.error) {
      console.log(`   ⚠️  Evaluation error: ${evalRes.data.error}`);
    }

    // 7. Test completion
    console.log('\n7️⃣ Testing completion view...');
    const completionRes = await makeRequest('GET', `/api/pbl/completion?programId=${programId}&scenarioId=${scenario.id}&lang=en`);
    console.log(`   Completion status: ${completionRes.status}`);
    if (completionRes.data?.error) {
      console.log(`   ⚠️  Completion error: ${completionRes.data.error}`);
    }

    // 8. Test program history
    console.log('\n8️⃣ Testing program history...');
    const historyRes = await makeRequest('GET', `/api/pbl/history?userEmail=test@example.com`);
    console.log(`   History status: ${historyRes.status}`);
    console.log(`   Programs in history: ${historyRes.data?.data?.programs?.length || 0}`);

    console.log('\n✅ PBL Flow Test Complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testPBLFlow().catch(console.error);