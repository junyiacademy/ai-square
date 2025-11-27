/**
 * Diagnostic endpoint - check actual production data
 * TEMPORARY - should be removed after diagnosis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/get-pool';

export async function GET(_request: NextRequest) {
  const pool = getPool();

  try {
    // Check programs data
    const programsQuery = `
      SELECT
        COUNT(*) as total_programs,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_all_time,
        COUNT(CASE WHEN completed_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as completed_this_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as created_this_week
      FROM programs
    `;
    const programsResult = await pool.query(programsQuery);

    // Check retention data
    const retentionQuery = `
      SELECT
        COUNT(DISTINCT CASE
          WHEN created_at >= CURRENT_DATE - INTERVAL '14 days'
          AND created_at < CURRENT_DATE - INTERVAL '7 days'
          THEN id
        END) as cohort_size,
        COUNT(DISTINCT CASE
          WHEN created_at >= CURRENT_DATE - INTERVAL '14 days'
          AND created_at < CURRENT_DATE - INTERVAL '7 days'
          AND last_login_at >= CURRENT_DATE - INTERVAL '7 days'
          THEN id
        END) as retained_users
      FROM users
    `;
    const retentionResult = await pool.query(retentionQuery);

    return NextResponse.json({
      success: true,
      data: {
        programs: programsResult.rows[0],
        retention: retentionResult.rows[0]
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
