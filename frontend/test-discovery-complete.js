// Test script to verify task title localization in completion page

async function testDiscoveryComplete() {
  const programId = 'b1940bdd-5540-48fe-a684-b8a953985b9b';
  
  console.log('Testing Discovery completion API...\n');
  
  // Test with zh-TW language
  console.log('Testing with zh-TW:');
  const responseZhTW = await fetch(`http://localhost:3000/api/discovery/programs/${programId}/evaluation`, {
    headers: {
      'Accept-Language': 'zh-TW',
      'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN' // Replace with actual token
    }
  });
  
  if (responseZhTW.ok) {
    const dataZhTW = await responseZhTW.json();
    console.log('Task evaluations (zh-TW):');
    dataZhTW.evaluation?.taskEvaluations?.forEach(task => {
      console.log(`- ${task.taskTitle}`);
    });
  } else {
    console.log('Error:', responseZhTW.status, await responseZhTW.text());
  }
  
  console.log('\n---\n');
  
  // Test with en language
  console.log('Testing with en:');
  const responseEn = await fetch(`http://localhost:3000/api/discovery/programs/${programId}/evaluation`, {
    headers: {
      'Accept-Language': 'en',
      'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN' // Replace with actual token
    }
  });
  
  if (responseEn.ok) {
    const dataEn = await responseEn.json();
    console.log('Task evaluations (en):');
    dataEn.evaluation?.taskEvaluations?.forEach(task => {
      console.log(`- ${task.taskTitle}`);
    });
  } else {
    console.log('Error:', responseEn.status, await responseEn.text());
  }
}

testDiscoveryComplete().catch(console.error);