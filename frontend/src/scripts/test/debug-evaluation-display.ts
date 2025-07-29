/**
 * Debug evaluation display issue
 * Usage: cd frontend && npx tsx src/scripts/test/debug-evaluation-display.ts
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkEvaluationData() {
  try {
    // First check table structure
    const tableQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'evaluations'
      ORDER BY ordinal_position
    `;
    
    const tableResult = await pool.query(tableQuery);
    console.log('Evaluations table columns:');
    tableResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    // Get the most recent evaluation for the task
    const taskId = '9d641ff6-208d-4919-9fb1-c6de99904f67';
    
    const query = `
      SELECT *
      FROM evaluations e
      WHERE e.task_id = $1
      ORDER BY e.created_at DESC
      LIMIT 1
    `;
    
    const { rows } = await pool.query(query, [taskId]);
    
    if (rows.length === 0) {
      console.log('No evaluations found for task:', taskId);
      return;
    }
    
    const evaluation = rows[0];
    console.log('\nMost recent evaluation:');
    console.log('ID:', evaluation.id);
    console.log('Created at:', evaluation.created_at);
    console.log('Score:', evaluation.score);
    
    // Check all columns
    console.log('\nAll evaluation fields:');
    Object.keys(evaluation).forEach(key => {
      const value = evaluation[key];
      if (typeof value === 'object' && value !== null) {
        console.log(`${key}:`, JSON.stringify(value, null, 2));
      } else {
        console.log(`${key}:`, value);
      }
    });
    
  } catch (_error) {
    console.error('Error checking evaluation data:', error);
  } finally {
    await pool.end();
  }
}

checkEvaluationData();