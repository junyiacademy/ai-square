#!/usr/bin/env node

// Test to track when programs are created
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'teacher@example.com',
  cookie: 'user=%7B%22id%22%3A1%2C%22email%22%3A%22teacher%40example.com%22%7D'
};

async function checkPrograms(step) {
  const res = await fetch(`${BASE_URL}/api/pbl/user-programs?scenarioId=ai-job-search`, {
    headers: { 'Cookie': TEST_USER.cookie }
  });
  const data = await res.json();
  console.log(`   [${step}] Total programs: ${data.total}`);
  if (data.programs.length > 0) {
    console.log(`   Latest: ${data.programs[0].id} (created: ${data.programs[0].startedAt})`);
  }
  return data.total;
}

async function testProgramCreation() {
  console.log('🧪 Tracking Program Creation\n');

  try {
    // Step 1: Check initial state
    console.log('1️⃣ Initial state');
    const initialCount = await checkPrograms('Initial');
    
    // Step 2: Visit details page (should NOT create program)
    console.log('\n2️⃣ Visiting details page');
    const detailsRes = await fetch(`${BASE_URL}/pbl/scenarios/ai-job-search/details`, {
      headers: { 'Cookie': TEST_USER.cookie }
    });
    console.log(`   Status: ${detailsRes.status}`);
    await checkPrograms('After details');
    
    // Step 3: Call start API directly (this WILL create program)
    console.log('\n3️⃣ Calling start API directly');
    const startRes = await fetch(`${BASE_URL}/api/pbl/scenarios/ai-job-search/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': TEST_USER.cookie
      },
      body: JSON.stringify({ language: 'en' })
    });
    
    if (startRes.ok) {
      const startData = await startRes.json();
      console.log(`   ✅ Program created: ${startData.programId}`);
    }
    await checkPrograms('After start API');
    
    // Step 4: Check history API
    console.log('\n4️⃣ Checking history API');
    const historyRes = await fetch(`${BASE_URL}/api/pbl/history?lang=en`, {
      headers: { 'Cookie': TEST_USER.cookie }
    });
    
    if (historyRes.ok) {
      const historyData = await historyRes.json();
      console.log(`   History shows ${historyData.totalPrograms} programs`);
    }
    
    console.log('\n📌 Summary:');
    console.log('   - Details page should NOT create programs');
    console.log('   - Only the start API creates programs');
    console.log('   - Programs should only be created when explicitly called');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run test
testProgramCreation();