#!/usr/bin/env tsx

/**
 * Test script for feedback invalidation on evaluation updates
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

async function testFeedbackInvalidation() {
  console.log('🧪 Testing Feedback Invalidation on Evaluation Update');
  console.log('=====================================================\n');

  const programId = '0940a243-4df4-4f65-b497-bb59795809b1';
  const scenarioId = '8fb1f265-cd53-4199-9d5c-c2ab2297621d';
  const cookie = 'isLoggedIn=true; user=%7B%22email%22%3A%22student%40example.com%22%7D';

  try {
    // 1. Generate feedback for multiple languages
    console.log('1️⃣ Generating feedback for multiple languages...\n');
    
    const languages = ['en', 'zhTW', 'es'];
    for (const lang of languages) {
      console.log(`   Generating feedback for ${lang}...`);
      const response = await fetch(`${BASE_URL}/api/pbl/generate-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        },
        body: JSON.stringify({
          programId,
          scenarioId,
          language: lang
        })
      });
      
      const data = await response.json();
      console.log(`   ${lang}: ${data.success ? '✅' : '❌'} ${data.cached ? '(cached)' : '(generated)'}`);
    }

    // 2. Check current feedback status in database
    console.log('\n2️⃣ Checking feedback status in database...');
    const feedbackCheck = await pool.query(`
      SELECT 
        p.metadata->'evaluationMetadata'->'qualitativeFeedback' as feedback
      FROM programs p
      WHERE p.id = $1
    `, [programId]);
    
    if (feedbackCheck.rows.length > 0) {
      const feedback = feedbackCheck.rows[0].feedback;
      console.log('   Languages with feedback:', Object.keys(feedback || {}).join(', '));
    }

    // 3. Simulate task re-evaluation by updating program evaluation
    console.log('\n3️⃣ Simulating task re-evaluation...');
    const updateResponse = await fetch(`${BASE_URL}/api/pbl/programs/${programId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({})
    });
    
    const updateData = await updateResponse.json();
    console.log(`   Evaluation updated: ${updateData.success ? '✅' : '❌'}`);
    console.log(`   New lastSyncedAt: ${updateData.evaluation?.metadata?.lastSyncedAt}`);

    // 4. Try to get feedback again - should trigger invalidation
    console.log('\n4️⃣ Getting feedback after evaluation update...');
    const afterUpdateResponse = await fetch(`${BASE_URL}/api/pbl/generate-feedback`, {
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
    
    const afterUpdateData = await afterUpdateResponse.json();
    console.log(`   English feedback: ${afterUpdateData.cached ? 'CACHED ❌' : 'REGENERATED ✅'}`);
    console.log(`   Debug:`, afterUpdateData.debug);

    // 5. Check if other languages were invalidated
    console.log('\n5️⃣ Checking if other languages were invalidated...');
    const finalCheck = await pool.query(`
      SELECT 
        p.metadata->'evaluationMetadata'->'qualitativeFeedback' as feedback
      FROM programs p
      WHERE p.id = $1
    `, [programId]);
    
    if (finalCheck.rows.length > 0) {
      const feedback = finalCheck.rows[0].feedback;
      console.log('\n   Feedback status after update:');
      Object.entries(feedback || {}).forEach(([lang, data]: [string, any]) => {
        console.log(`   ${lang}: isValid=${data.isValid}, hasContent=${!!data.content}`);
      });
    }

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    if (!afterUpdateData.cached) {
      console.log('✅ Feedback was correctly regenerated after evaluation update');
      console.log('✅ All language feedback should be invalidated');
    } else {
      console.log('❌ Feedback was not regenerated - version check may have failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    await testFeedbackInvalidation();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}