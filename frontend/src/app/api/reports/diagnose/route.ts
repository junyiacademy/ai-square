/**
 * Diagnostic endpoint - investigate completed_at issue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/get-pool';

export async function GET(_request: NextRequest) {
  const pool = getPool();

  try {
    // Check programs with status='completed' but completed_at IS NULL
    const statusQuery = `
      SELECT
        COUNT(*) as total_programs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as status_completed,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as has_completed_at,
        COUNT(CASE WHEN status = 'completed' AND completed_at IS NULL THEN 1 END) as completed_status_null_timestamp,
        COUNT(CASE WHEN status = 'completed' AND completed_at IS NOT NULL THEN 1 END) as completed_status_with_timestamp
      FROM programs
    `;
    const statusResult = await pool.query(statusQuery);

    // Get some examples of completed programs
    const examplesQuery = `
      SELECT
        id,
        status,
        completed_at,
        started_at,
        created_at,
        metadata
      FROM programs
      WHERE status = 'completed'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const examplesResult = await pool.query(examplesQuery);

    // Check metadata for completedAt
    const metadataQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN metadata->>'completedAt' IS NOT NULL THEN 1 END) as has_metadata_completed_at,
        COUNT(CASE WHEN metadata->>'evaluationId' IS NOT NULL THEN 1 END) as has_evaluation_id
      FROM programs
      WHERE status = 'completed'
    `;
    const metadataResult = await pool.query(metadataQuery);

    return NextResponse.json({
      success: true,
      data: {
        statusCounts: statusResult.rows[0],
        metadataCounts: metadataResult.rows[0],
        examples: examplesResult.rows.map(row => ({
          id: row.id,
          status: row.status,
          completed_at: row.completed_at,
          started_at: row.started_at,
          created_at: row.created_at,
          metadata_completedAt: row.metadata?.completedAt,
          metadata_evaluationId: row.metadata?.evaluationId
        }))
      }
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
