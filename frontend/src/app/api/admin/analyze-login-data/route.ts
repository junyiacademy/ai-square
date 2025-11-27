/**
 * Analyze available data to estimate last_login_at
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/get-pool';

export async function GET(_request: NextRequest) {
  const pool = getPool();

  try {
    // 1. Check sessions table
    const sessionsQuery = `
      SELECT
        COUNT(*) as total_sessions,
        COUNT(DISTINCT user_id) as unique_users_with_sessions,
        MIN(created_at) as earliest_session,
        MAX(created_at) as latest_session
      FROM sessions
    `;
    const sessionsResult = await pool.query(sessionsQuery);

    // 2. Check if we can use sessions.created_at as proxy for last_login
    const sessionsByUserQuery = `
      SELECT
        user_id,
        MAX(created_at) as latest_session
      FROM sessions
      GROUP BY user_id
      ORDER BY latest_session DESC
      LIMIT 10
    `;
    const sessionsByUserResult = await pool.query(sessionsByUserQuery);

    // 3. Check programs.updated_at as alternative
    const programsQuery = `
      SELECT
        COUNT(DISTINCT user_id) as users_with_programs,
        MIN(updated_at) as earliest_update,
        MAX(updated_at) as latest_update
      FROM programs
    `;
    const programsResult = await pool.query(programsQuery);

    // 4. Check interactions table
    const interactionsQuery = `
      SELECT
        COUNT(*) as total_interactions,
        COUNT(DISTINCT user_id) as unique_users_with_interactions,
        MIN(timestamp) as earliest_interaction,
        MAX(timestamp) as latest_interaction
      FROM interactions
    `;
    const interactionsResult = await pool.query(interactionsQuery);

    // 5. Sample: users with NULL last_login_at but have sessions
    const sampleQuery = `
      SELECT
        u.id,
        u.email,
        u.created_at,
        u.last_login_at,
        s.max_session_created
      FROM users u
      LEFT JOIN (
        SELECT user_id, MAX(created_at) as max_session_created
        FROM sessions
        GROUP BY user_id
      ) s ON u.id = s.user_id
      WHERE u.last_login_at IS NULL
        AND s.max_session_created IS NOT NULL
      ORDER BY s.max_session_created DESC
      LIMIT 10
    `;
    const sampleResult = await pool.query(sampleQuery);

    // 6. Count users that can be migrated
    const countQuery = `
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN last_login_at IS NULL THEN 1 END) as null_last_login,
        COUNT(CASE WHEN last_login_at IS NOT NULL THEN 1 END) as has_last_login,
        COUNT(DISTINCT s.user_id) as has_sessions
      FROM users u
      LEFT JOIN sessions s ON u.id = s.user_id
    `;
    const countResult = await pool.query(countQuery);

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessionsResult.rows[0],
        programs: programsResult.rows[0],
        interactions: interactionsResult.rows[0],
        userCounts: countResult.rows[0],
        sampleUsersWithSessions: sampleResult.rows,
        latestSessionsByUser: sessionsByUserResult.rows.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
