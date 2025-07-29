/**
 * Script to check task interactions in database
 * Usage: cd frontend && npx tsx src/scripts/test/check-task-interactions.ts
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

async function checkTaskInteractions(taskId: string) {
  try {
    console.log('Checking task interactions for task:', taskId);
    console.log('Database config:', {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'ai_square_db',
    });

    // Get task details
    const taskQuery = `
      SELECT 
        id,
        program_id,
        title,
        status,
        interactions,
        interaction_count,
        created_at,
        updated_at
      FROM tasks 
      WHERE id = $1
    `;

    const { rows } = await pool.query(taskQuery, [taskId]);
    
    if (rows.length === 0) {
      console.log('Task not found!');
      return;
    }

    const task = rows[0];
    console.log('\nTask details:');
    console.log('ID:', task.id);
    console.log('Program ID:', task.program_id);
    console.log('Title:', task.title);
    console.log('Status:', task.status);
    console.log('Created at:', task.created_at);
    console.log('Updated at:', task.updated_at);
    console.log('Interaction count:', task.interaction_count);

    console.log('\nInteractions:');
    if (task.interactions && Array.isArray(task.interactions)) {
      task.interactions.forEach((interaction: any, index: number) => {
        console.log(`\n${index + 1}. ${interaction.type} at ${interaction.timestamp}:`);
        console.log('   Content:', interaction.content.substring(0, 100) + '...');
      });
      console.log(`\nTotal interactions in DB: ${task.interactions.length}`);
    } else {
      console.log('No interactions found or invalid format');
    }

    // Also check if there are any recent updates
    const recentQuery = `
      SELECT 
        id,
        updated_at,
        interactions
      FROM tasks 
      WHERE program_id = $1
      ORDER BY updated_at DESC
      LIMIT 5
    `;

    const recentResult = await pool.query(recentQuery, [task.program_id]);
    console.log('\nRecent task updates in this program:');
    recentResult.rows.forEach((row: any) => {
      const interactionCount = row.interactions ? row.interactions.length : 0;
      console.log(`- Task ${row.id}: ${interactionCount} interactions, updated ${row.updated_at}`);
    });

  } catch (_error) {
    console.error('Error checking task interactions:', error);
  } finally {
    await pool.end();
  }
}

// Get task ID from command line or use the one from the issue
const taskId = process.argv[2] || '9d641ff6-208d-4919-9fb1-c6de99904f67';
checkTaskInteractions(taskId);