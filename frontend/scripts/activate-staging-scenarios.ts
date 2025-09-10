#!/usr/bin/env npx tsx
/**
 * Script to activate all draft scenarios in staging database
 */

import { Pool } from 'pg';

async function activateScenarios() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Connecting to staging database...');
    
    // Update all draft scenarios to active
    const result = await pool.query(`
      UPDATE scenarios 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'draft'
      RETURNING id, mode, title
    `);
    
    console.log(`Updated ${result.rowCount || 0} scenarios to active status`);
    
    if (result.rowCount && result.rowCount > 0) {
      console.log('Updated scenarios:');
      result.rows.forEach(row => {
        const title = typeof row.title === 'object' ? 
          (row.title.en || row.title.zh || Object.values(row.title)[0]) : 
          row.title;
        console.log(`  - [${row.mode}] ${row.id}: ${title}`);
      });
    }
    
    // Verify counts
    const countResult = await pool.query(`
      SELECT mode, status, COUNT(*) as count
      FROM scenarios
      GROUP BY mode, status
      ORDER BY mode, status
    `);
    
    console.log('\nScenario counts by mode and status:');
    countResult.rows.forEach(row => {
      console.log(`  ${row.mode} - ${row.status}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
activateScenarios().catch(console.error);