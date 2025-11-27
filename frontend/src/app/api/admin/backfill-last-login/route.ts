/**
 * Backfill last_login_at from sessions data
 * ONE-TIME MIGRATION ENDPOINT
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/get-pool';

export async function POST(_request: NextRequest) {
  const pool = getPool();

  try {
    // Step 1: Check current state
    const beforeResult = await pool.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN last_login_at IS NULL THEN 1 END) as null_last_login,
        COUNT(CASE WHEN last_login_at IS NOT NULL THEN 1 END) as has_last_login
      FROM users
    `);

    const before = beforeResult.rows[0];

    // Step 2: Update last_login_at for users with sessions
    const updateSessionsResult = await pool.query(`
      UPDATE users u
      SET last_login_at = s.max_session_created,
          updated_at = CURRENT_TIMESTAMP
      FROM (
        SELECT user_id, MAX(created_at) as max_session_created
        FROM sessions
        GROUP BY user_id
      ) s
      WHERE u.id = s.user_id
        AND u.last_login_at IS NULL
      RETURNING u.id, u.email, u.last_login_at
    `);

    const updatedFromSessions = updateSessionsResult.rowCount || 0;

    // Step 3: For users without sessions, use their created_at as fallback
    const updateCreatedResult = await pool.query(`
      UPDATE users
      SET last_login_at = created_at,
          updated_at = CURRENT_TIMESTAMP
      WHERE last_login_at IS NULL
      RETURNING id, email, last_login_at
    `);

    const updatedFromCreated = updateCreatedResult.rowCount || 0;

    // Step 4: Verify the migration
    const afterResult = await pool.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN last_login_at IS NULL THEN 1 END) as null_last_login,
        COUNT(CASE WHEN last_login_at IS NOT NULL THEN 1 END) as has_last_login,
        MIN(last_login_at) as earliest_login,
        MAX(last_login_at) as latest_login
      FROM users
    `);

    const after = afterResult.rows[0];

    // Step 5: Get sample of updated records
    const sampleResult = await pool.query(`
      SELECT
        id,
        email,
        created_at,
        last_login_at,
        EXTRACT(EPOCH FROM (last_login_at - created_at)) / 86400 as days_since_creation
      FROM users
      ORDER BY last_login_at DESC
      LIMIT 10
    `);

    return NextResponse.json({
      success: true,
      message: 'last_login_at backfill completed',
      summary: {
        before: {
          total: before.total_users,
          nullCount: before.null_last_login,
          hasData: before.has_last_login
        },
        after: {
          total: after.total_users,
          nullCount: after.null_last_login,
          hasData: after.has_last_login,
          earliestLogin: after.earliest_login,
          latestLogin: after.latest_login
        },
        updates: {
          fromSessions: updatedFromSessions,
          fromCreatedAt: updatedFromCreated,
          total: updatedFromSessions + updatedFromCreated
        }
      },
      sampleRecords: sampleResult.rows
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
