#!/usr/bin/env tsx

/**
 * Test script for feedback regeneration on evaluation updates
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

async function testFeedbackUpdate() {
  console.log('🧪 Testing Feedback Update Detection');
  console.log('====================================\n');

  const programId = '0940a243-4df4-4f65-b497-bb59795809b1';
  const scenarioId = '8fb1f265-cd53-4199-9d5c-c2ab2297621d';
  const cookie = 'isLoggedIn=true; user=%7B%22email%22%3A%22student%40example.com%22%7D';

  try {
    // 1. Generate initial feedback
    console.log('1️⃣ Generating initial feedback...');
    const initialResponse = await fetch(`${BASE_URL}/api/pbl/generate-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        programId,
        scenarioId,
        language: 'en'
      })
    });

    const initialData = await initialResponse.json();
    console.log('Initial response:', {
      success: initialData.success,
      cached: initialData.cached,
      debug: initialData.debug
    });

    // 2. Try to get feedback again (should be cached)
    console.log('\n2️⃣ Getting feedback again (should be cached)...');
    const cachedResponse = await fetch(`${BASE_URL}/api/pbl/generate-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        programId,
        scenarioId,
        language: 'en'
      })
    });

    const cachedData = await cachedResponse.json();
    console.log('Cached response:', {
      success: cachedData.success,
      cached: cachedData.cached,
      debug: cachedData.debug
    });

    // 3. Update the program evaluation (simulate task re-evaluation)
    console.log('\n3️⃣ Updating program evaluation...');
    const updateResponse = await fetch(`${BASE_URL}/api/pbl/programs/${programId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({})
    });

    const updateData = await updateResponse.json();
    console.log('Update response:', {
      success: updateData.success,
      evaluationId: updateData.evaluation?.id,
      lastSyncedAt: updateData.evaluation?.metadata?.lastSyncedAt
    });

    // 4. Get feedback again (should detect update and regenerate)
    console.log('\n4️⃣ Getting feedback after evaluation update...');
    const updatedResponse = await fetch(`${BASE_URL}/api/pbl/generate-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        programId,
        scenarioId,
        language: 'en'
      })
    });

    const updatedData = await updatedResponse.json();
    console.log('Updated response:', {
      success: updatedData.success,
      cached: updatedData.cached,
      debug: updatedData.debug
    });

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log(`Initial request: ${initialData.cached ? 'CACHED' : 'GENERATED'}`);
    console.log(`Second request: ${cachedData.cached ? 'CACHED' : 'GENERATED'}`);
    console.log(`After evaluation update: ${updatedData.cached ? 'CACHED' : 'GENERATED'}`);
    
    if (!cachedData.cached) {
      console.log('\n⚠️  Warning: Second request should have been cached');
    }
    
    if (updatedData.cached && updatedData.debug?.outdated === false) {
      console.log('\n⚠️  Warning: Feedback should have been regenerated after evaluation update');
    } else {
      console.log('\n✅ Feedback regeneration detection is working correctly!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function main() {
  try {
    await testFeedbackUpdate();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}