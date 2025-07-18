#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const PROGRAM_ID = '63ec6ae1-0d42-464a-b337-433fbcd0ab89';
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

async function testAssessmentCompletion() {
  console.log('🔍 Testing Assessment Completion for Program:', PROGRAM_ID, '\n');

  try {
    // 1. Check program status
    console.log('1️⃣ Checking program status...');
    const programRes = await makeRequest('GET', `/api/assessment/programs/${PROGRAM_ID}`);
    console.log(`   Status: ${programRes.status}`);
    
    if (programRes.data) {
      const program = programRes.data.program || programRes.data;
      console.log(`   Program status: ${program.status}`);
      console.log(`   Program metadata:`, JSON.stringify(program.metadata, null, 2));
      
      // 2. Check if program is completed
      if (program.status !== 'completed') {
        console.log('\n⚠️  Program is not completed. Checking tasks...');
        
        // Get all tasks
        const tasksRes = await makeRequest('GET', `/api/assessment/programs/${PROGRAM_ID}?includeAllTasks=true`);
        if (tasksRes.data?.allTasks) {
          console.log(`   Total tasks: ${tasksRes.data.allTasks.length}`);
          tasksRes.data.allTasks.forEach((task, idx) => {
            console.log(`   Task ${idx + 1}: ${task.status} (${task.interactions?.length || 0} interactions)`);
          });
        }
        
        console.log('\n3️⃣ Attempting to complete the program...');
        const completeRes = await makeRequest('POST', `/api/assessment/programs/${PROGRAM_ID}/complete`, {});
        console.log(`   Complete status: ${completeRes.status}`);
        
        if (completeRes.data?.evaluation) {
          console.log(`   ✅ Program completed!`);
          console.log(`   Score: ${completeRes.data.evaluation.score}%`);
          console.log(`   Evaluation ID: ${completeRes.data.evaluation.id}`);
        } else {
          console.log(`   ❌ Completion failed:`, completeRes.data?.error || 'Unknown error');
        }
      }
      
      // 3. Check evaluation
      console.log('\n4️⃣ Checking evaluation...');
      const evalRes = await makeRequest('GET', `/api/assessment/programs/${PROGRAM_ID}/evaluation`);
      console.log(`   Evaluation status: ${evalRes.status}`);
      
      if (evalRes.data?.evaluation) {
        console.log(`   ✅ Evaluation found!`);
        console.log(`   Type: ${evalRes.data.evaluation.evaluationType}`);
        console.log(`   Score: ${evalRes.data.evaluation.score}%`);
        console.log(`   Metadata:`, JSON.stringify(evalRes.data.evaluation.metadata, null, 2));
      } else {
        console.log(`   ❌ No evaluation found`);
        console.log(`   Error:`, evalRes.data?.error);
      }
      
      // 4. Check what the complete page would see
      console.log('\n5️⃣ Simulating complete page load...');
      const completePageRes = await makeRequest('GET', `/api/assessment/programs/${PROGRAM_ID}/evaluation`);
      console.log(`   Complete page would see:`);
      console.log(`   - Status: ${completePageRes.status}`);
      console.log(`   - Has evaluation: ${!!completePageRes.data?.evaluation}`);
      
    } else {
      console.log('   ❌ Program not found');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testAssessmentCompletion().catch(console.error);