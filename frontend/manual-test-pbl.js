// Manual test script for PBL task-based sessions
// Run with: node manual-test-pbl.js

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';
const TEST_USER = {
  id: '3',
  email: 'teacher@example.com'
};

const userCookie = `user=${encodeURIComponent(JSON.stringify(TEST_USER))}`;

async function testPBLFlow() {
  console.log('🧪 Testing PBL Task-Based Sessions Flow\n');
  
  try {
    // 1. Create a new session for Task 1
    console.log('1️⃣ Creating session for Task 1...');
    const session1Response = await fetch(`${API_BASE}/pbl/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        scenarioId: 'ai-job-search',
        scenarioTitle: 'AI-Assisted Job Search Training',
        userId: TEST_USER.id,
        userEmail: TEST_USER.email,
        language: 'zh-TW',
        stageIndex: 0,
        stageId: 'stage-1-research',
        stageTitle: 'Job Market Research',
        taskId: 'task-1-1',
        taskTitle: 'Industry Analysis',
        taskIndex: 0
      })
    });
    
    const session1Data = await session1Response.json();
    console.log('Session 1 created:', {
      id: session1Data.data?.sessionId,
      logId: session1Data.data?.logId,
      taskId: session1Data.data?.sessionData?.currentTaskId
    });
    
    // 2. Simulate some activity for Task 1
    console.log('\n2️⃣ Simulating chat for Task 1...');
    const chat1Response = await fetch(`${API_BASE}/pbl/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        sessionId: session1Data.data?.sessionId,
        message: 'How do I analyze industry trends with AI?',
        userId: TEST_USER.id,
        language: 'zh-TW',
        stageContext: {
          stageId: 'stage-1-research',
          stageName: 'Job Market Research',
          taskId: 'task-1-1',
          taskTitle: 'Industry Analysis'
        }
      })
    });
    
    console.log('Chat response status:', chat1Response.status);
    
    // 3. Complete Task 1
    console.log('\n3️⃣ Completing Task 1...');
    const complete1Response = await fetch(`${API_BASE}/pbl/sessions/${session1Data.data?.sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({ action: 'complete' })
    });
    
    console.log('Task 1 completion status:', complete1Response.status);
    
    // 4. Create a new session for Task 2
    console.log('\n4️⃣ Creating session for Task 2...');
    const session2Response = await fetch(`${API_BASE}/pbl/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        scenarioId: 'ai-job-search',
        scenarioTitle: 'AI-Assisted Job Search Training',
        userId: TEST_USER.id,
        userEmail: TEST_USER.email,
        language: 'zh-TW',
        stageIndex: 0,
        stageId: 'stage-1-research',
        stageTitle: 'Job Market Research',
        taskId: 'task-1-2',
        taskTitle: 'Company Research',
        taskIndex: 1
      })
    });
    
    const session2Data = await session2Response.json();
    console.log('Session 2 created:', {
      id: session2Data.data?.sessionId,
      logId: session2Data.data?.logId,
      taskId: session2Data.data?.sessionData?.currentTaskId
    });
    
    // 5. Check history
    console.log('\n5️⃣ Checking history...');
    const historyResponse = await fetch(`${API_BASE}/pbl/history?lang=zh-TW`, {
      headers: {
        'Cookie': userCookie
      }
    });
    
    const historyData = await historyResponse.json();
    console.log('History entries:', historyData.data?.length || 0);
    
    if (historyData.data && historyData.data.length > 0) {
      console.log('\n📋 Task Cards in History:');
      historyData.data.forEach((entry, index) => {
        console.log(`\nCard ${index + 1}:`);
        console.log('  - Session ID:', entry.id);
        console.log('  - Task ID:', entry.currentTaskId);
        console.log('  - Task Title:', entry.currentTaskTitle);
        console.log('  - Status:', entry.status);
        console.log('  - Progress:', `${entry.progress.completedStages}/${entry.progress.totalStages} stages`);
        console.log('  - Interactions:', entry.totalInteractions);
      });
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      const errorText = await error.response.text();
      console.error('Response:', errorText);
    }
  }
}

// Run the test
testPBLFlow();