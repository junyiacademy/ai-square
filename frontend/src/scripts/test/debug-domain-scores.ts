#!/usr/bin/env npx tsx

/**
 * Debug script to check domain scores in database
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ai_square_db',
});

async function debugDomainScores() {
  try {
    console.log('🔍 Checking domain scores in evaluations...\n');
    
    // Get recent evaluations
    const result = await pool.query(`
      SELECT 
        e.id,
        e.score,
        domain_scores,
        e.pbl_data,
        e.created_at,
        t.title as task_title
      FROM evaluations e
      LEFT JOIN tasks t ON e.task_id = t.id
      WHERE e.mode = 'pbl'
      ORDER BY e.created_at DESC
      LIMIT 5
    `);
    
    if (result.rows.length === 0) {
      console.log('No evaluations found');
      return;
    }
    
    console.log(`Found ${result.rows.length} evaluations:\n`);
    
    result.rows.forEach((row, index) => {
      console.log(`\n📊 Evaluation ${index + 1}:`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Task: ${row.task_title || 'Unknown'}`);
      console.log(`   Overall Score: ${row.score}`);
      console.log(`   Created: ${row.created_at}`);
      
      console.log(`   Domain Scores: ${JSON.stringify(row.domain_scores || {}, null, 2)}`);
      
      if (row.pbl_data?.ksaScores) {
        console.log(`   KSA Scores: ${JSON.stringify(row.pbl_data.ksaScores, null, 2)}`);
      }
      
      // Domain scores should have 4 domains
      const hasDomainScores = row.domain_scores && Object.keys(row.domain_scores).length > 0;
      if (!hasDomainScores) {
        console.log(`   ⚠️  Domain scores are empty!`);
      }
    });
    
    // Check for evaluations with empty domain scores
    const emptyResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM evaluations
      WHERE domain_scores = '{}'::jsonb OR domain_scores IS NULL
    `);
    
    if (emptyResult.rows[0].count > 0) {
      console.log(`\n⚠️  Warning: Found ${emptyResult.rows[0].count} evaluations with empty domain scores`);
    }
    
  } catch (_error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugDomainScores();