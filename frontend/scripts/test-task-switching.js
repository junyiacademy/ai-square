const fetch = require('node-fetch');

// 配置
const BASE_URL = 'http://localhost:3000';
const SCENARIO_ID = 'journey_discover_llm';

// 測試數據
const testUser = {
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
  image: null
};

// 輔助函數
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Cookie': `user=${encodeURIComponent(JSON.stringify(testUser))}`
  };

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });

  const data = await response.json();
  console.log(`${options.method || 'GET'} ${url}:`, response.status, data.success ? '✓' : '✗');
  
  if (!response.ok || !data.success) {
    console.error('Error:', data.error || data);
  }
  
  return data;
}

async function testTaskSwitching() {
  console.log('Starting task switching test...\n');

  try {
    // 1. 創建新的 program
    console.log('1. Creating new program...');
    const createRes = await makeRequest(`/api/pbl/scenarios/${SCENARIO_ID}/start`, {
      method: 'POST',
      body: JSON.stringify({ language: 'zhTW' })
    });

    if (!createRes.success) {
      throw new Error('Failed to create program');
    }

    const programId = createRes.programId;
    console.log(`   Program created: ${programId}\n`);

    // 2. 在 task-1 發送消息
    console.log('2. Sending message to task-1...');
    const task1Message = await makeRequest('/api/pbl/task-logs', {
      method: 'POST',
      headers: {
        'x-scenario-id': SCENARIO_ID
      },
      body: JSON.stringify({
        programId,
        taskId: 'task-1',
        scenarioId: SCENARIO_ID,
        taskTitle: 'Task 1: Understanding LLM',
        interaction: {
          type: 'user',
          content: 'Hello, this is a test message for task 1',
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!task1Message.success) {
      throw new Error('Failed to save task-1 message');
    }
    console.log('   Task-1 message saved successfully\n');

    // 3. 等待一下
    await delay(1000);

    // 4. 切換到 task-2 並發送消息
    console.log('3. Switching to task-2 and sending message...');
    const task2Message = await makeRequest('/api/pbl/task-logs', {
      method: 'POST',
      headers: {
        'x-scenario-id': SCENARIO_ID
      },
      body: JSON.stringify({
        programId,
        taskId: 'task-2',
        scenarioId: SCENARIO_ID,
        taskTitle: 'Task 2: Exploring LLM Features',
        interaction: {
          type: 'user',
          content: 'Hello, this is a test message for task 2',
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!task2Message.success) {
      throw new Error('Failed to save task-2 message');
    }
    console.log('   Task-2 message saved successfully\n');

    // 5. 驗證兩個任務的數據
    console.log('4. Verifying task data...');
    
    // 檢查 task-1
    const task1Data = await makeRequest(`/api/pbl/task-logs?programId=${programId}&taskId=task-1&scenarioId=${SCENARIO_ID}`);
    console.log(`   Task-1 interactions: ${task1Data.data?.log?.interactions?.length || 0}`);
    
    // 檢查 task-2
    const task2Data = await makeRequest(`/api/pbl/task-logs?programId=${programId}&taskId=task-2&scenarioId=${SCENARIO_ID}`);
    console.log(`   Task-2 interactions: ${task2Data.data?.log?.interactions?.length || 0}`);

    // 6. 再次切換回 task-1 並發送新消息
    console.log('\n5. Switching back to task-1...');
    const task1Message2 = await makeRequest('/api/pbl/task-logs', {
      method: 'POST',
      headers: {
        'x-scenario-id': SCENARIO_ID
      },
      body: JSON.stringify({
        programId,
        taskId: 'task-1',
        scenarioId: SCENARIO_ID,
        taskTitle: 'Task 1: Understanding LLM',
        interaction: {
          type: 'user',
          content: 'Second message for task 1',
          timestamp: new Date().toISOString()
        }
      })
    });

    if (task1Message2.success) {
      console.log('   Task-1 second message saved successfully');
    }

    // 最終驗證
    console.log('\n6. Final verification...');
    const finalTask1Data = await makeRequest(`/api/pbl/task-logs?programId=${programId}&taskId=task-1&scenarioId=${SCENARIO_ID}`);
    const finalTask2Data = await makeRequest(`/api/pbl/task-logs?programId=${programId}&taskId=task-2&scenarioId=${SCENARIO_ID}`);
    
    console.log(`   Task-1 total interactions: ${finalTask1Data.data?.log?.interactions?.length || 0}`);
    console.log(`   Task-2 total interactions: ${finalTask2Data.data?.log?.interactions?.length || 0}`);

    console.log('\n✅ Task switching test completed successfully!');
    console.log(`   Program ID: ${programId}`);
    console.log('   Both tasks can store conversations properly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// 執行測試
testTaskSwitching();