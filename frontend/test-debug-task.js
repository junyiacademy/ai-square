// Debug task retrieval
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'task-debug@example.com';
const SCENARIO_ID = 'ai-job-search';

const headers = {
  'Cookie': `user=${encodeURIComponent(JSON.stringify({ email: USER_EMAIL }))}`,
  'Content-Type': 'application/json'
};

async function debugTask() {
  console.log('=== Debug Task Retrieval ===\n');

  try {
    // Step 1: Start program
    console.log('1. Starting new program...');
    const startRes = await fetch(`${BASE_URL}/api/pbl/scenarios/${SCENARIO_ID}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language: 'en' })
    });
    
    const startData = await startRes.json();
    if (!startData.success) {
      console.error('Failed to start:', startData);
      return;
    }
    
    const programId = startData.programId;
    const taskId = startData.firstTaskId;
    
    console.log(`Program: ${programId}`);
    console.log(`Task: ${taskId}`);
    
    // Step 2: Try task-logs (works)
    console.log('\n2. Testing task-logs endpoint...');
    const taskLogsRes = await fetch(
      `${BASE_URL}/api/pbl/task-logs?programId=${programId}&taskId=${taskId}&scenarioId=${SCENARIO_ID}`,
      { headers }
    );
    console.log('Task-logs status:', taskLogsRes.status);
    
    // Step 3: List all tasks for program
    console.log('\n3. Listing all program tasks...');
    const tasksRes = await fetch(`${BASE_URL}/api/pbl/programs/${programId}/tasks`, {
      headers
    });
    
    if (tasksRes.ok) {
      const tasksData = await tasksRes.json();
      console.log(`Found ${tasksData.tasks?.length || 0} tasks`);
      if (tasksData.tasks) {
        console.log('Tasks:', tasksData.tasks.map(t => ({ 
          id: t.id, 
          title: t.title,
          status: t.status
        })));
      }
    }
    
    // Step 4: Try chat (fails)
    console.log('\n4. Testing chat endpoint...');
    const chatRes = await fetch(`${BASE_URL}/api/pbl/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Hello',
        programId: programId,
        taskId: taskId,
        context: {
          scenarioId: SCENARIO_ID
        }
      })
    });
    
    console.log('Chat status:', chatRes.status);
    if (!chatRes.ok) {
      const error = await chatRes.json();
      console.log('Chat error:', error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTask();