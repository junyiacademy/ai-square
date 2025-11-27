/**
 * Admin API: Migrate metadata.completedAt to completed_at field
 *
 * IMPORTANT: This endpoint should be protected in production
 * For now, it's a one-time migration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/get-pool';

export async function POST(_request: NextRequest) {
  const pool = getPool();

  try {
    // Check current status
    const checkQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN metadata->>'completedAt' IS NOT NULL AND completed_at IS NULL THEN 1 END) as needs_migration
      FROM programs
      WHERE status = 'completed'
    `;
    const checkResult = await pool.query(checkQuery);
    const beforeStatus = checkResult.rows[0];

    const needsMigration = parseInt(beforeStatus.needs_migration || '0');
    if (needsMigration === 0) {
      return NextResponse.json({
        success: true,
        message: 'No programs need migration',
        before: beforeStatus,
        migrated: 0
      });
    }

    // Execute migration
    const migrateQuery = `
      UPDATE programs
      SET completed_at = (metadata->>'completedAt')::timestamp
      WHERE status = 'completed'
        AND metadata->>'completedAt' IS NOT NULL
        AND completed_at IS NULL
      RETURNING id, metadata->>'completedAt' as metadata_completed_at, completed_at
    `;

    const result = await pool.query(migrateQuery);

    // Verify
    const verifyResult = await pool.query(checkQuery);
    const afterStatus = verifyResult.rows[0];

    return NextResponse.json({
      success: true,
      message: `Migrated ${result.rowCount} programs`,
      before: beforeStatus,
      after: afterStatus,
      migrated: result.rowCount,
      samples: result.rows.slice(0, 5).map(row => ({
        id: row.id,
        metadataCompletedAt: row.metadata_completed_at,
        columnCompletedAt: row.completed_at
      }))
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
