#!/usr/bin/env tsx

/**
 * Diagnose why feedback appears empty in completion API
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

async function diagnose() {
  const programId = '0940a243-4df4-4f65-b497-bb59795809b1';
  
  try {
    console.log('🔍 Diagnosing Feedback Issue\n');
    
    // 1. Check program metadata structure
    console.log('1️⃣ Checking program metadata:');
    const programResult = await pool.query(`
      SELECT 
        metadata->>'evaluationMetadata' IS NOT NULL as has_eval_metadata,
        metadata->'evaluationMetadata'->>'qualitativeFeedback' IS NOT NULL as has_feedback,
        jsonb_typeof(metadata->'evaluationMetadata'->'qualitativeFeedback') as feedback_type,
        metadata->'evaluationMetadata'->'qualitativeFeedback' ? 'en' as has_en_feedback
      FROM programs 
      WHERE id = $1
    `, [programId]);
    
    console.log('Program metadata check:', programResult.rows[0]);
    
    // 2. Check evaluation metadata
    console.log('\n2️⃣ Checking evaluation metadata:');
    const evalResult = await pool.query(`
      SELECT 
        e.id,
        e.metadata->>'qualitativeFeedback' IS NOT NULL as has_feedback,
        jsonb_typeof(e.metadata->'qualitativeFeedback') as feedback_type,
        e.metadata->'qualitativeFeedback' as feedback_content
      FROM evaluations e
      JOIN programs p ON e.id = (p.metadata->>'evaluationId')::uuid
      WHERE p.id = $1
    `, [programId]);
    
    if (evalResult.rows.length > 0) {
      console.log('Evaluation metadata:', evalResult.rows[0]);
    } else {
      console.log('No evaluation found');
    }
    
    // 3. Direct query to see what completion API should see
    console.log('\n3️⃣ Testing repository queries:');
    
    // Import repositories
    const { repositoryFactory } = await import('../../lib/repositories/base/repository-factory');
    const programRepo = repositoryFactory.getProgramRepository();
    const userRepo = repositoryFactory.getUserRepository();
    
    // Get user
    const user = await userRepo.findByEmail('student@example.com');
    if (!user) {
      console.log('User not found');
      return;
    }
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      console.log('Program not found');
      return;
    }
    
    console.log('\nProgram data from repository:');
    console.log('- Has metadata:', !!program.metadata);
    console.log('- Metadata keys:', Object.keys(program.metadata || {}));
    console.log('- evaluationMetadata:', program.metadata?.evaluationMetadata);
    
    // 4. Check the actual feedback content
    if (program.metadata?.evaluationMetadata?.qualitativeFeedback) {
      const feedback = program.metadata.evaluationMetadata.qualitativeFeedback;
      console.log('\n4️⃣ Feedback content:');
      console.log('- Type:', typeof feedback);
      console.log('- Is object:', feedback && typeof feedback === 'object');
      console.log('- Keys:', Object.keys(feedback));
      console.log('- Has en:', 'en' in feedback);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  diagnose();
}