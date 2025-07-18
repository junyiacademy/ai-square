#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Cookie': cookie || 'user=%7B%22email%22%3A%22test%40example.com%22%2C%22name%22%3A%22Test%20User%22%7D; isLoggedIn=true',
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

async function testFullAssessmentFlow() {
  console.log('🧪 Testing Full Assessment Flow\n');

  // Use a unique user for this test
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const userCookie = `user=${encodeURIComponent(JSON.stringify({email: uniqueEmail, name: 'Test User'}))}; isLoggedIn=true`;

  try {
    // 1. Get assessment scenario
    console.log('1️⃣ Getting assessment scenario...');
    const scenariosRes = await makeRequest('GET', '/api/assessment/scenarios?lang=en', null, userCookie);
    const scenario = scenariosRes.data?.data?.scenarios?.[0];
    
    if (!scenario) {
      throw new Error('No assessment scenario found');
    }
    
    console.log(`   ✅ Found scenario: ${scenario.id}`);
    console.log(`   Title: ${scenario.title}`);
    
    // 2. Start new assessment
    console.log('\n2️⃣ Starting new assessment...');
    const startRes = await makeRequest('POST', `/api/assessment/scenarios/${scenario.id}/programs`, {
      action: 'start',
      language: 'en'
    }, userCookie);
    
    if (startRes.status !== 200) {
      throw new Error(`Failed to start assessment: ${startRes.data?.error || startRes.status}`);
    }
    
    const program = startRes.data.program;
    console.log(`   ✅ Program created: ${program.id}`);
    console.log(`   Tasks: ${startRes.data.tasks?.length || 0}`);
    console.log(`   Questions: ${startRes.data.questionsCount || 0}`);
    
    // 3. Get next task and answer questions
    console.log('\n3️⃣ Answering assessment questions...');
    let taskCount = 0;
    let totalQuestions = 0;
    
    while (true) {
      // Get next task
      const nextTaskRes = await makeRequest('GET', `/api/assessment/programs/${program.id}/next-task`, null, userCookie);
      
      if (nextTaskRes.status === 404 || !nextTaskRes.data?.task) {
        console.log('   No more tasks');
        break;
      }
      
      const task = nextTaskRes.data.task;
      taskCount++;
      const questions = task.content?.context?.questions || [];
      console.log(`   Task ${taskCount}: ${task.title} (${questions.length} questions)`);
      
      if (questions.length > 0) {
        // Submit answers for this task
        const answers = questions.map((q, idx) => ({
          questionId: q.id,
          answer: idx % 4 // Just pick different answers for testing
        }));
        
        const submitRes = await makeRequest('POST', `/api/assessment/programs/${program.id}/batch-answers`, {
          taskId: task.id,
          answers: answers
        }, userCookie);
        
        if (submitRes.status === 200) {
          console.log(`   ✅ Submitted ${answers.length} answers`);
          totalQuestions += answers.length;
        } else {
          console.log(`   ❌ Failed to submit answers: ${submitRes.data?.error}`);
        }
      }
    }
    
    console.log(`   Total questions answered: ${totalQuestions}`);
    
    // 4. Complete the assessment
    console.log('\n4️⃣ Completing assessment...');
    const completeRes = await makeRequest('POST', `/api/assessment/programs/${program.id}/complete`, {}, userCookie);
    
    if (completeRes.status !== 200) {
      console.log(`   ❌ Failed to complete: ${completeRes.data?.error || completeRes.status}`);
    } else {
      console.log(`   ✅ Assessment completed!`);
      console.log(`   Score: ${completeRes.data.evaluation?.score}%`);
      console.log(`   Level: ${completeRes.data.evaluation?.metadata?.level}`);
      console.log(`   Correct answers: ${completeRes.data.evaluation?.metadata?.correctAnswers}/${completeRes.data.evaluation?.metadata?.totalQuestions}`);
    }
    
    // 5. Check evaluation endpoint
    console.log('\n5️⃣ Checking evaluation endpoint...');
    const evalRes = await makeRequest('GET', `/api/assessment/programs/${program.id}/evaluation`, null, userCookie);
    
    if (evalRes.status === 200 && evalRes.data?.evaluation) {
      console.log(`   ✅ Evaluation found!`);
      console.log(`   Type: ${evalRes.data.evaluation.evaluationType}`);
      console.log(`   Score: ${evalRes.data.evaluation.score}%`);
    } else {
      console.log(`   ❌ Evaluation not found: ${evalRes.data?.error || evalRes.status}`);
    }
    
    // 6. Simulate complete page
    console.log('\n6️⃣ Complete page URLs:');
    console.log(`   Program page: ${BASE_URL}/assessment/scenarios/${scenario.id}/programs/${program.id}`);
    console.log(`   Complete page: ${BASE_URL}/assessment/scenarios/${scenario.id}/programs/${program.id}/complete`);
    console.log(`   User email: ${uniqueEmail}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testFullAssessmentFlow().catch(console.error);