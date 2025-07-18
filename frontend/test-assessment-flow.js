#!/usr/bin/env node

// Test script for Assessment module flow
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

async function testAssessmentFlow() {
  console.log('🧪 Testing Assessment Module Flow\n');

  try {
    // 1. Test assessments list
    console.log('1️⃣ Testing assessments list...');
    const assessmentsRes = await makeRequest('GET', '/api/assessment/scenarios?lang=en');
    console.log(`   Status: ${assessmentsRes.status}`);
    console.log(`   Assessments found: ${assessmentsRes.data?.data?.scenarios?.length || 0}`);
    
    if (!assessmentsRes.data?.data?.scenarios?.length) {
      console.log('   ⚠️  No assessments found, trying alternative endpoint...');
      // Try alternative endpoint
      const altRes = await makeRequest('GET', '/api/assessment?lang=en');
      console.log(`   Alt Status: ${altRes.status}`);
      if (altRes.status !== 200) {
        throw new Error('No assessment endpoints found');
      }
    }

    // For now, we'll check if any assessment scenarios exist
    const scenarios = assessmentsRes.data?.data?.scenarios || [];
    if (scenarios.length > 0) {
      const scenario = scenarios[0];
      console.log(`   ✅ Found test scenario: ${scenario.id}\n`);

      // 2. Test scenario detail
      console.log('2️⃣ Testing scenario detail...');
      const detailRes = await makeRequest('GET', `/api/assessment/scenarios/${scenario.id}?lang=en`);
      console.log(`   Status: ${detailRes.status}`);
      console.log(`   Title: ${detailRes.data?.data?.title}`);
      console.log(`   Tasks: ${detailRes.data?.data?.tasks?.length || 0}`);
      
      // 3. Start new assessment
      console.log('\n3️⃣ Starting new assessment...');
      const startRes = await makeRequest('POST', `/api/assessment/scenarios/${scenario.id}/programs`, {
        action: 'start',
        language: 'en'
      });
      console.log(`   Status: ${startRes.status}`);
      
      if (startRes.status === 200 && startRes.data) {
        const program = startRes.data.program;
        const programId = program?.id;
        const questionsCount = startRes.data.questionsCount || 0;
        console.log(`   ✅ Assessment started: ${programId}`);
        console.log(`   Questions loaded: ${questionsCount}`);
        console.log(`   Tasks created: ${startRes.data.tasks?.length || 0}`);
        
        // 4. Get next task
        console.log('\n4️⃣ Getting next assessment task...');
        const nextTaskRes = await makeRequest('GET', `/api/assessment/programs/${programId}/next-task`);
        console.log(`   Status: ${nextTaskRes.status}`);
        
        if (nextTaskRes.data?.task) {
          const task = nextTaskRes.data.task;
          console.log(`   Task ID: ${task.id}`);
          console.log(`   Questions in task: ${task.content?.context?.questions?.length || 0}`);
          console.log(`   Task type: ${task.type}`);
          if (task.content?.context?.questions?.[0]) {
            console.log(`   First question: ${task.content.context.questions[0].question?.substring(0, 60)}...`);
          }
          
          // 5. Submit answers for this task
          if (task.content?.context?.questions?.length > 0) {
            console.log('\n5️⃣ Submitting assessment answers...');
            const answers = task.content.context.questions.map((q, idx) => ({
              questionId: q.id,
              answer: idx % 4 // Just pick different answers for testing
            }));
            
            const submitRes = await makeRequest('POST', `/api/assessment/programs/${programId}/batch-answers`, {
              taskId: task.id,
              answers: answers
            });
            console.log(`   Status: ${submitRes.status}`);
            
            // 6. Complete the assessment
            console.log('\n6️⃣ Completing assessment...');
            const completeRes = await makeRequest('POST', `/api/assessment/programs/${programId}/complete`, {});
            console.log(`   Status: ${completeRes.status}`);
            
            if (completeRes.data?.evaluation) {
              console.log(`   Overall score: ${completeRes.data.evaluation.score}%`);
              console.log(`   Level: ${completeRes.data.evaluation.metadata?.level || 'N/A'}`);
              console.log(`   Correct answers: ${completeRes.data.evaluation.metadata?.correctAnswers || 0}/${completeRes.data.evaluation.metadata?.totalQuestions || 0}`);
            }
          } else {
            console.log('   ⚠️  No questions found in task');
          }
        } else {
          console.log('   ⚠️  No task data returned');
        }
      }
    } else {
      console.log('   ℹ️  No assessment scenarios available to test');
    }

    console.log('\n✅ Assessment Flow Test Complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Provide helpful information
    console.log('\n📝 Note: Assessment module may not be fully implemented yet.');
    console.log('   Common issues:');
    console.log('   - Endpoints may use different paths');
    console.log('   - Module may be under development');
    console.log('   - Authentication requirements may differ');
  }
}

// Check for Discovery module as alternative test
async function testDiscoveryFlow() {
  console.log('\n\n🧪 Testing Discovery Module Flow\n');

  try {
    // 1. Test Discovery careers list
    console.log('1️⃣ Testing Discovery careers list...');
    const careersRes = await makeRequest('GET', '/api/discovery/careers?lang=en');
    console.log(`   Status: ${careersRes.status}`);
    
    if (careersRes.status === 200 && careersRes.data?.careers?.length > 0) {
      console.log(`   Careers found: ${careersRes.data.careers.length}`);
      const career = careersRes.data.careers[0];
      console.log(`   ✅ Found test career: ${career.id} (${career.title})\n`);

      // 2. Get career detail (which creates a scenario)
      console.log('2️⃣ Getting career detail and creating scenario...');
      const detailRes = await makeRequest('GET', `/api/discovery/careers/${career.id}?lang=en`);
      console.log(`   Status: ${detailRes.status}`);
      
      if (detailRes.data?.scenario) {
        const scenarioId = detailRes.data.scenario.id;
        console.log(`   ✅ Scenario created: ${scenarioId}`);
        
        // 3. Start new program
        console.log('\n3️⃣ Starting new Discovery program...');
        const programsRes = await makeRequest('POST', `/api/discovery/scenarios/${scenarioId}/programs`, {
          language: 'en'
        });
        console.log(`   Status: ${programsRes.status}`);
        
        if (programsRes.data?.program) {
          const program = programsRes.data.program;
          console.log(`   ✅ Program created: ${program.id}`);
          console.log(`   Total tasks: ${program.taskIds?.length || 0}`);
          
          // 4. Get first task
          if (program.currentTaskId) {
            console.log('\n4️⃣ Getting current task...');
            const taskRes = await makeRequest('GET', 
              `/api/discovery/scenarios/${scenarioId}/programs/${program.id}/tasks/${program.currentTaskId}?lang=en`
            );
            console.log(`   Status: ${taskRes.status}`);
            console.log(`   Task stage: ${taskRes.data?.task?.metadata?.stage}`);
            
            // 5. Submit task interaction
            console.log('\n5️⃣ Submitting task interaction...');
            const submitRes = await makeRequest('PUT', 
              `/api/discovery/scenarios/${scenarioId}/programs/${program.id}/tasks/${program.currentTaskId}`,
              {
                userResponse: "I'm interested in this career path",
                action: "submit",
                language: 'en'
              }
            );
            console.log(`   Status: ${submitRes.status}`);
            
            // 6. Check program completion
            console.log('\n6️⃣ Checking program status...');
            const statusRes = await makeRequest('GET', 
              `/api/discovery/scenarios/${scenarioId}/programs/${program.id}?lang=en`
            );
            console.log(`   Status: ${statusRes.status}`);
            console.log(`   Program status: ${statusRes.data?.program?.status}`);
            console.log(`   Completed tasks: ${statusRes.data?.completedTasks || 0}/${statusRes.data?.totalTasks || 0}`);
          }
        }
      }
    } else {
      console.log('   ⚠️  No Discovery careers found');
    }

    console.log('\n✅ Discovery Flow Test Complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run both tests
async function runAllTests() {
  await testAssessmentFlow();
  await testDiscoveryFlow();
}

// Run the tests
runAllTests().catch(console.error);