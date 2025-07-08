// Test assessment flow
const BASE_URL = 'http://localhost:3000';

async function testAssessmentFlow() {
  console.log('Testing Assessment Flow...\n');
  
  try {
    // 1. Create session
    console.log('1. Creating assessment session...');
    const sessionResponse = await fetch(`${BASE_URL}/api/v2/assessment/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionType: 'comprehensive',
        language: 'en'
      })
    });
    
    if (!sessionResponse.ok) {
      throw new Error(`Session creation failed: ${sessionResponse.status}`);
    }
    
    const { sessionId, config } = await sessionResponse.json();
    console.log(`✓ Session created: ${sessionId}`);
    console.log(`  Config: ${JSON.stringify(config, null, 2)}`);
    
    // 2. Load questions
    console.log('\n2. Loading assessment questions...');
    const questionsResponse = await fetch(`${BASE_URL}/api/v2/assessment/questions`);
    
    if (!questionsResponse.ok) {
      throw new Error(`Questions loading failed: ${questionsResponse.status}`);
    }
    
    const questionsData = await questionsResponse.json();
    console.log(`✓ Loaded ${questionsData.questions.length} questions`);
    console.log(`  Domains: ${Object.keys(questionsData.domains).join(', ')}`);
    
    // 3. Simulate answering questions
    console.log('\n3. Simulating answers...');
    const responses = questionsData.questions.map((q, index) => ({
      questionId: q.id,
      answer: ['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)],
      timeSpent: 30 + Math.floor(Math.random() * 60)
    }));
    
    // 4. Submit assessment
    console.log('\n4. Submitting assessment...');
    const submitResponse = await fetch(`${BASE_URL}/api/v2/assessment/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        responses,
        totalTimeSpent: 600,
        completedAt: new Date().toISOString()
      })
    });
    
    if (!submitResponse.ok) {
      const error = await submitResponse.text();
      throw new Error(`Submit failed: ${submitResponse.status} - ${error}`);
    }
    
    const results = await submitResponse.json();
    console.log('✓ Assessment submitted successfully!');
    console.log('\nResults:');
    console.log(`  Overall Score: ${results.overallScore}%`);
    console.log(`  Performance: ${results.performance}`);
    console.log(`  Domain Scores:`);
    Object.entries(results.domainScores).forEach(([domain, score]) => {
      console.log(`    - ${domain}: ${score}%`);
    });
    console.log(`  KSA Scores:`);
    Object.entries(results.ksaScores).forEach(([type, score]) => {
      console.log(`    - ${type}: ${score}%`);
    });
    
    // 5. Check history
    console.log('\n5. Checking user history...');
    const historyResponse = await fetch(`${BASE_URL}/api/v2/assessment/history`);
    
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      console.log(`✓ User has ${historyData.history?.stats?.totalAssessments || 0} total assessments`);
    }
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAssessmentFlow();