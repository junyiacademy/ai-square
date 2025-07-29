/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env tsx

/**
 * Test script for PBL completion page functionality
 * Tests overall score calculation and task evaluation display
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

async function testCompletionData() {
  console.log('🧪 Testing PBL Completion Page Data');
  console.log('===================================\n');

  try {
    // 1. Check for active programs
    console.log('1️⃣ Checking active programs...');
    const programs = await pool.query(`
      SELECT 
        p.id,
        p.user_id,
        p.scenario_id,
        p.status,
        p.total_task_count,
        p.metadata,
        u.email
      FROM programs p
      JOIN users u ON p.user_id = u.id
      WHERE p.status IN ('active', 'completed')
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    console.log(`Found ${programs.rows.length} programs\n`);

    if (programs.rows.length === 0) {
      console.log('❌ No active programs found. Please create a program first.');
      return;
    }

    // 2. Check tasks and evaluations for each program
    for (const program of programs.rows) {
      console.log(`\n📋 Program: ${program.id}`);
      console.log(`   User: ${program.email}`);
      console.log(`   Status: ${program.status}`);
      console.log(`   Total Tasks: ${program.total_task_count}`);

      // Get tasks
      const tasks = await pool.query(`
        SELECT 
          t.id,
          t.status,
          t.metadata,
          t.score
        FROM tasks t
        WHERE t.program_id = $1
        ORDER BY t.task_index
      `, [program.id]);

      console.log(`   Tasks: ${tasks.rows.length}`);

      // Get evaluations
      const evaluations = await pool.query(`
        SELECT 
          e.id,
          e.task_id,
          e.score,
          e.domain_scores,
          e.metadata,
          e.pbl_data
        FROM evaluations e
        JOIN tasks t ON e.task_id = t.id
        WHERE t.program_id = $1
      `, [program.id]);

      console.log(`   Task Evaluations: ${evaluations.rows.length}`);

      // Calculate scores
      const scores = evaluations.rows
        .map(e => e.score)
        .filter(s => typeof s === 'number' && !isNaN(s));

      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      console.log(`   Individual Scores: ${scores.join(', ')}`);
      console.log(`   Average Score: ${avgScore}%`);

      // Check program evaluation
      const programEval = await pool.query(`
        SELECT 
          e.id,
          e.score,
          e.domain_scores,
          e.metadata,
          e.pbl_data
        FROM evaluations e
        WHERE e.program_id = $1
          AND e.evaluation_type = 'program'
      `, [program.id]);

      if (programEval.rows.length > 0) {
        const evalData = programEval.rows[0];
        console.log(`\n   ✅ Program Evaluation Found:`);
        console.log(`      ID: ${evalData.id}`);
        console.log(`      Score: ${evalData.score}`);
        console.log(`      Metadata evaluatedTasks: ${evalData.metadata?.evaluatedTasks}`);
        console.log(`      Metadata evaluatedTaskCount: ${evalData.metadata?.evaluatedTaskCount}`);
        console.log(`      PBL Data evaluatedTasks: ${evalData.pbl_data?.evaluatedTasks}`);
        
        // Check domain scores
        if (evalData.domain_scores) {
          console.log(`      Domain Scores:`, evalData.domain_scores);
        }
      } else {
        console.log(`\n   ❌ No program evaluation found`);
      }

      console.log('\n' + '-'.repeat(50));
    }

    // 3. Test API endpoints
    console.log('\n\n🌐 Testing API Endpoints...');
    
    const testProgram = programs.rows[0];
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    
    console.log(`\nTesting with program: ${testProgram.id}`);
    
    // Test completion API
    try {
      const completionUrl = `${baseUrl}/api/pbl/completion?programId=${testProgram.id}&scenarioId=${testProgram.scenario_id}`;
      console.log(`\nFetching: ${completionUrl}`);
      
      const response = await fetch(completionUrl, {
        headers: {
          'Cookie': `isLoggedIn=true; user=${encodeURIComponent(JSON.stringify({ email: testProgram.email }))}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('\n✅ Completion API Response:');
        console.log(`   Success: ${data.success}`);
        console.log(`   Overall Score: ${data.data?.overallScore || 0}%`);
        console.log(`   Evaluated Tasks: ${data.data?.evaluatedTasks || 0}`);
        console.log(`   Total Tasks: ${data.data?.totalTasks || 0}`);
        console.log(`   Domain Scores:`, data.data?.domainScores || {});
      } else {
        console.log(`\n❌ Completion API Error: ${response.status} ${response.statusText}`);
      }
    } catch (_error) {
      console.log(`\n❌ Failed to call completion API:`, error);
    }

    // Test complete API
    try {
      const completeUrl = `${baseUrl}/api/pbl/programs/${testProgram.id}/complete`;
      console.log(`\nFetching: ${completeUrl}`);
      
      const response = await fetch(completeUrl, {
        headers: {
          'Cookie': `isLoggedIn=true; user=${encodeURIComponent(JSON.stringify({ email: testProgram.email }))}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('\n✅ Complete API Response:');
        console.log(`   Success: ${data.success}`);
        console.log(`   Evaluation Score: ${data.evaluation?.score || 0}%`);
        console.log(`   Debug Info:`, data.debug?.calculatedScores);
      } else {
        console.log(`\n❌ Complete API Error: ${response.status} ${response.statusText}`);
      }
    } catch (_error) {
      console.log(`\n❌ Failed to call complete API:`, error);
    }

  } catch (_error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await testCompletionData();
    console.log('\n\n✅ All tests completed!');
    console.log('\n📝 Summary:');
    console.log('- Check the console output above for detailed results');
    console.log('- If scores are 0, ensure tasks have been evaluated');
    console.log('- If "No program evaluation found", the POST to complete API needs to be triggered');
    console.log('\n🔗 Test the completion page at:');
    console.log('http://localhost:3002/pbl/scenarios/[scenarioId]/programs/[programId]/complete');
  } catch (_error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}