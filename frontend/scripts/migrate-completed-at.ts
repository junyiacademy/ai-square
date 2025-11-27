#!/usr/bin/env tsx
/**
 * Migration: Copy metadata.completedAt to completed_at field
 *
 * Background:
 * - Bug in ProgramRepository.update() caused completed_at to NOT be set
 * - All 113 completed programs have completedAt in metadata but NULL in DB column
 * - This migration fixes historical data
 */

import { getPool } from '../src/lib/db/get-pool';

async function main() {
  const pool = getPool();

  try {
    console.log('🔍 Checking programs with metadata.completedAt but NULL completed_at...');

    // Check current status
    const checkQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN metadata->>'completedAt' IS NOT NULL AND completed_at IS NULL THEN 1 END) as needs_migration
      FROM programs
      WHERE status = 'completed'
    `;
    const checkResult = await pool.query(checkQuery);
    console.log('Status:', checkResult.rows[0]);

    const needsMigration = parseInt(checkResult.rows[0].needs_migration || '0');
    if (needsMigration === 0) {
      console.log('✅ No programs need migration');
      return;
    }

    console.log(`\n🔄 Migrating ${needsMigration} programs...`);

    // Migration query
    const migrateQuery = `
      UPDATE programs
      SET completed_at = (metadata->>'completedAt')::timestamp
      WHERE status = 'completed'
        AND metadata->>'completedAt' IS NOT NULL
        AND completed_at IS NULL
      RETURNING id, metadata->>'completedAt' as metadata_completed_at, completed_at
    `;

    const result = await pool.query(migrateQuery);
    console.log(`✅ Migrated ${result.rowCount} programs`);

    // Show some examples
    if (result.rows.length > 0) {
      console.log('\n📊 Sample results (first 5):');
      result.rows.slice(0, 5).forEach((row, i) => {
        console.log(`  ${i + 1}. ID: ${row.id.substring(0, 8)}...`);
        console.log(`     metadata: ${row.metadata_completed_at}`);
        console.log(`     column:   ${row.completed_at}`);
      });
    }

    // Verify
    console.log('\n🔍 Verification...');
    const verifyResult = await pool.query(checkQuery);
    console.log('After migration:', verifyResult.rows[0]);

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main();
