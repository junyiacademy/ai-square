#!/usr/bin/env node

// Test script for the new PBL flow
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testPBLFlow() {
  console.log('🧪 Testing PBL Program Flow\n');

  try {
    // 1. Test start API
    console.log('1️⃣ Testing: Create new program');
    const startRes = await fetch(`${BASE_URL}/api/pbl/scenarios/ai-job-search/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'user=%7B%22id%22%3A1%2C%22email%22%3A%22test%40example.com%22%7D' // test user
      },
      body: JSON.stringify({ language: 'en' })
    });

    if (!startRes.ok) {
      console.error('❌ Failed to start program:', await startRes.text());
      return;
    }

    const startData = await startRes.json();
    console.log('✅ Program created:', {
      programId: startData.programId,
      firstTaskId: startData.firstTaskId
    });

    const { programId, firstTaskId } = startData;

    // 2. Test task log API
    console.log('\n2️⃣ Testing: Add task interaction');
    const logRes = await fetch(`${BASE_URL}/api/pbl/task-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-scenario-id': 'ai-job-search',
        'Cookie': 'user=%7B%22id%22%3A1%2C%22email%22%3A%22test%40example.com%22%7D'
      },
      body: JSON.stringify({
        programId,
        taskId: firstTaskId,
        scenarioId: 'ai-job-search',
        interaction: {
          type: 'user',
          content: 'Hello, I need help with job search',
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!logRes.ok) {
      console.error('❌ Failed to save interaction:', await logRes.text());
      return;
    }

    console.log('✅ Interaction saved successfully');

    // 3. Test progress update
    console.log('\n3️⃣ Testing: Update task progress');
    const progressRes = await fetch(`${BASE_URL}/api/pbl/task-logs`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-scenario-id': 'ai-job-search',
        'Cookie': 'user=%7B%22id%22%3A1%2C%22email%22%3A%22test%40example.com%22%7D'
      },
      body: JSON.stringify({
        programId,
        taskId: firstTaskId,
        scenarioId: 'ai-job-search',
        progress: {
          status: 'completed',
          completedAt: new Date().toISOString(),
          timeSpentSeconds: 300,
          score: 85,
          feedback: 'Great job on the analysis!'
        }
      })
    });

    if (!progressRes.ok) {
      console.error('❌ Failed to update progress:', await progressRes.text());
      return;
    }

    console.log('✅ Progress updated successfully');

    // 4. Test history API
    console.log('\n4️⃣ Testing: Fetch history');
    const historyRes = await fetch(`${BASE_URL}/api/pbl/history?lang=en`, {
      headers: {
        'Cookie': 'user=%7B%22id%22%3A1%2C%22email%22%3A%22test%40example.com%22%7D'
      }
    });

    if (!historyRes.ok) {
      console.error('❌ Failed to fetch history:', await historyRes.text());
      return;
    }

    const historyData = await historyRes.json();
    console.log('✅ History fetched:', {
      totalPrograms: historyData.totalPrograms,
      latestProgram: historyData.programs[0]?.program?.id
    });

    // 5. Test page routes
    console.log('\n5️⃣ Testing: Page routes');
    const routes = [
      `/pbl/scenarios/ai-job-search/details`,
      `/pbl/program/${programId}/learn?scenarioId=ai-job-search&taskId=${firstTaskId}`,
      `/pbl/program/${programId}/complete?scenarioId=ai-job-search`,
      `/history`
    ];

    for (const route of routes) {
      const pageRes = await fetch(`${BASE_URL}${route}`);
      console.log(`${pageRes.ok ? '✅' : '❌'} ${route} - Status: ${pageRes.status}`);
    }

    console.log('\n✨ All tests completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run tests
testPBLFlow();