#!/usr/bin/env node

// Test script for Discovery module flow using unified architecture
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

async function testDiscoveryFlow() {
  console.log('🧪 Testing Discovery Module Flow (Unified Architecture)\n');

  try {
    // 1. Test Discovery scenarios list
    console.log('1️⃣ Testing Discovery scenarios list...');
    const scenariosRes = await makeRequest('GET', '/api/discovery/scenarios?lang=en');
    console.log(`   Status: ${scenariosRes.status}`);
    
    if (scenariosRes.status === 200) {
      const scenarios = Array.isArray(scenariosRes.data) ? scenariosRes.data : scenariosRes.data?.data?.scenarios || [];
      console.log(`   Scenarios found: ${scenarios.length}`);
      
      if (scenarios.length > 0) {
        const scenario = scenarios[0];
        console.log(`   ✅ Found test scenario: ${scenario.id}`);
        console.log(`   Title: ${scenario.title}`);
        console.log(`   YAML ID: ${scenario.yamlId}\n`);

        // 2. Get scenario detail
        console.log('2️⃣ Getting scenario detail...');
        const detailRes = await makeRequest('GET', `/api/discovery/scenarios/${scenario.id}?lang=en`);
        console.log(`   Status: ${detailRes.status}`);
        
        if (detailRes.status === 200) {
          const detailData = detailRes.data?.data || detailRes.data;
          console.log(`   Tasks: ${detailData.tasks?.length || 0}`);
          console.log(`   ✅ Scenario details retrieved\n`);
          
          // 3. Start new program
          console.log('3️⃣ Starting new Discovery program...');
          const programsRes = await makeRequest('POST', `/api/discovery/scenarios/${scenario.id}/programs`, {
            language: 'en'
          });
          console.log(`   Status: ${programsRes.status}`);
          
          if (programsRes.status === 200 || programsRes.status === 201) {
            const programData = programsRes.data?.data || programsRes.data;
            const program = programData.program || programData;
            
            if (program && program.id) {
              console.log(`   ✅ Program created: ${program.id}`);
              console.log(`   Status: ${program.status}`);
              console.log(`   Current task: ${program.currentTaskId}`);
              console.log(`   Total tasks: ${program.taskIds?.length || 0}\n`);
              
              // 4. Get current task
              if (program.currentTaskId) {
                console.log('4️⃣ Getting current task...');
                const taskRes = await makeRequest('GET', 
                  `/api/discovery/scenarios/${scenario.id}/programs/${program.id}/tasks/${program.currentTaskId}?lang=en`
                );
                console.log(`   Status: ${taskRes.status}`);
                
                if (taskRes.status === 200) {
                  const taskData = taskRes.data?.data || taskRes.data;
                  const task = taskData.task || taskData;
                  console.log(`   Task title: ${task.title}`);
                  console.log(`   Task stage: ${task.metadata?.stage}`);
                  console.log(`   ✅ Task retrieved\n`);
                  
                  // 5. Submit task interaction
                  console.log('5️⃣ Submitting task interaction...');
                  const submitRes = await makeRequest('PUT', 
                    `/api/discovery/scenarios/${scenario.id}/programs/${program.id}/tasks/${program.currentTaskId}`,
                    {
                      userResponse: "I'm interested in learning more about this career path and its opportunities.",
                      action: "submit",
                      language: 'en'
                    }
                  );
                  console.log(`   Status: ${submitRes.status}`);
                  
                  if (submitRes.status === 200) {
                    const submitData = submitRes.data?.data || submitRes.data;
                    console.log(`   Evaluation score: ${submitData.evaluation?.score || 'N/A'}`);
                    console.log(`   AI feedback received: ${submitData.comprehensiveFeedback ? 'Yes' : 'No'}`);
                    console.log(`   ✅ Task submitted\n`);
                  }
                  
                  // 6. Check program completion status
                  console.log('6️⃣ Checking program status...');
                  const statusRes = await makeRequest('GET', 
                    `/api/discovery/scenarios/${scenario.id}/programs/${program.id}?lang=en`
                  );
                  console.log(`   Status: ${statusRes.status}`);
                  
                  if (statusRes.status === 200) {
                    const statusData = statusRes.data?.data || statusRes.data;
                    const updatedProgram = statusData.program || statusData;
                    console.log(`   Program status: ${updatedProgram.status}`);
                    console.log(`   Completed tasks: ${statusData.completedTasks || 0}/${statusData.totalTasks || program.taskIds?.length || 0}`);
                    console.log(`   Current task: ${updatedProgram.currentTaskId || 'None'}`);
                    
                    // 7. Get my programs
                    console.log('\n7️⃣ Getting my Discovery programs...');
                    const myProgramsRes = await makeRequest('GET', '/api/discovery/my-programs?lang=en');
                    console.log(`   Status: ${myProgramsRes.status}`);
                    
                    if (myProgramsRes.status === 200) {
                      const myPrograms = myProgramsRes.data?.data || myProgramsRes.data || [];
                      console.log(`   Total programs: ${myPrograms.length}`);
                      const currentProgram = myPrograms.find(p => p.id === program.id);
                      console.log(`   Current program found: ${currentProgram ? 'Yes' : 'No'}`);
                    }
                  }
                }
              }
            } else {
              console.log('   ❌ Program creation failed - no program data returned');
            }
          } else {
            console.log(`   ❌ Program creation failed: ${programsRes.data?.error || 'Unknown error'}`);
          }
        }
      } else {
        console.log('   ℹ️  No Discovery scenarios available');
      }
    } else {
      console.log(`   ❌ Failed to get scenarios: ${scenariosRes.data?.error || 'Unknown error'}`);
    }

    console.log('\n✅ Discovery Flow Test Complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testDiscoveryFlow().catch(console.error);