/**
 * Database queries for weekly report generation
 */

import { Pool } from 'pg';

export interface WeeklyTrendData {
  weekLabel: string; // Monday date in "MM/DD" format
  value: number;
}

export interface WeeklyStats {
  userGrowth: {
    totalUsers: number;
    newThisWeek: number;
    newLastWeek: number;
    weekOverWeekGrowth: number;
    dailyTrend: number[]; // DEPRECATED: Use weeklyTrend instead
    avgPerDay: number;
    weeklyTrend: WeeklyTrendData[]; // NEW: 8 weeks of registration data
  };
  engagement: {
    weeklyActiveUsers: number;
    dailyAvgActive: number;
    retentionRate: number;
    activeRate: number;
    weeklyActiveTrend: WeeklyTrendData[]; // NEW: 8 weeks of active users data
  };
  learning: {
    assessmentCompletions: number;
    pblCompletions: number;
    discoveryCompletions: number;
    totalCompletions: number;
    completionRate: number;
    topContent: Array<{ name: string; count: number }>;
  };
  systemHealth: {
    apiSuccessRate: number;
    avgResponseTime: number;
    uptime: number;
    dbStatus: string;
  };
}

/**
 * Get comprehensive weekly statistics
 */
export async function getWeeklyStats(pool: Pool): Promise<WeeklyStats> {
  // Environment validation: Log database connection info for debugging
  try {
    const dbInfo = await pool.query("SELECT current_database() as db_name, inet_server_addr() as host");
    console.log(`📊 Weekly Report - Querying database: ${dbInfo.rows[0]?.db_name || 'unknown'} @ ${dbInfo.rows[0]?.host || 'unknown'}`);
  } catch (err) {
    console.warn('⚠️  Could not fetch database info:', err);
  }

  // Sanity check: Warn if user count seems suspiciously low
  const sanityCheck = await pool.query('SELECT COUNT(*) as count FROM users');
  const userCount = parseInt(sanityCheck.rows[0]?.count || '0');
  if (userCount < 10) {
    console.warn(`⚠️  WARNING: Low user count detected (${userCount}) - verify you're querying the correct environment`);
  }

  // Query 1: User growth statistics (basic counts)
  // Get last complete week's data (last Monday 00:00 to last Sunday 23:59)
  const userStatsQuery = `
    WITH week_bounds AS (
      SELECT
        -- Last Monday at 00:00
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 7)::timestamp as last_week_start,
        -- Last Sunday at 23:59:59.999
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 1)::timestamp + INTERVAL '1 day' - INTERVAL '1 millisecond' as last_week_end,
        -- Two weeks ago Monday at 00:00
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 14)::timestamp as two_weeks_ago_start,
        -- Two weeks ago Sunday at 23:59:59.999
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 8)::timestamp + INTERVAL '1 day' - INTERVAL '1 millisecond' as two_weeks_ago_end
    )
    SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      COUNT(CASE WHEN created_at >= (SELECT last_week_start FROM week_bounds)
                  AND created_at <= (SELECT last_week_end FROM week_bounds) THEN 1 END) as new_this_week,
      COUNT(CASE WHEN created_at >= (SELECT two_weeks_ago_start FROM week_bounds)
                  AND created_at <= (SELECT two_weeks_ago_end FROM week_bounds) THEN 1 END) as new_last_week
    FROM users;
  `;

  const userStatsResult = await pool.query(userStatsQuery);
  const userStats = userStatsResult.rows[0];

  // Query 1.5: Daily trend for last complete week (Monday to Sunday)
  const dailyTrendQuery = `
    WITH week_bounds AS (
      SELECT
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 7)::timestamp as last_week_start,
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 1)::timestamp + INTERVAL '1 day' - INTERVAL '1 millisecond' as last_week_end
    )
    SELECT
      DATE(created_at) as day,
      COUNT(*) as count
    FROM users, week_bounds
    WHERE created_at >= week_bounds.last_week_start
      AND created_at <= week_bounds.last_week_end
    GROUP BY DATE(created_at)
    ORDER BY day ASC;
  `;

  const dailyTrendResult = await pool.query(dailyTrendQuery);
  const dailyTrendMap = new Map(
    dailyTrendResult.rows.map(row => {
      const dateStr = row.day instanceof Date
        ? row.day.toISOString().split('T')[0]
        : row.day;
      return [dateStr, parseInt(row.count)];
    })
  );

  // Build daily trend array for last complete week (Mon to Sun)
  // Calculate last Monday's date using same logic as getWeekDateRange
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysFromMonday = (dayOfWeek + 6) % 7; // Days since this Monday
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysFromMonday);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7); // Last Monday is 7 days before this Monday

  const dailyTrend: number[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(lastMonday);
    date.setDate(lastMonday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyTrend.push(dailyTrendMap.get(dateStr) || 0);
  }

  const totalUsers = parseInt(userStats.total_users);
  const newThisWeek = parseInt(userStats.new_this_week);
  const newLastWeek = parseInt(userStats.new_last_week);
  const weekOverWeekGrowth = newLastWeek > 0
    ? ((newThisWeek - newLastWeek) / newLastWeek) * 100
    : 0;
  const avgPerDay = newThisWeek / 7;

  // Query 1.6: Weekly registration trend for last 8 complete weeks
  // Each week is labeled by Monday's date (MM/DD format)
  const weeklyRegistrationTrendQuery = `
    WITH week_series AS (
      -- Generate 8 weeks of Monday dates, ending with most recent complete Sunday
      SELECT
        generate_series(
          (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 7 * 8)::date,
          (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 7)::date,
          '7 days'::interval
        )::date as week_start
    ),
    weekly_counts AS (
      SELECT
        ws.week_start,
        COUNT(u.id) as new_users
      FROM week_series ws
      LEFT JOIN users u ON DATE(u.created_at) >= ws.week_start
                        AND DATE(u.created_at) < ws.week_start + 7
      GROUP BY ws.week_start
    )
    SELECT
      TO_CHAR(week_start, 'MM/DD') as week_label,
      new_users
    FROM weekly_counts
    ORDER BY week_start ASC;
  `;

  const weeklyRegTrendResult = await pool.query(weeklyRegistrationTrendQuery);
  const weeklyTrend: WeeklyTrendData[] = weeklyRegTrendResult.rows.map(row => ({
    weekLabel: row.week_label,
    value: parseInt(row.new_users)
  }));

  // Query 1.7: Weekly active users trend for last 8 complete weeks
  // Weekly active = distinct users who had task updates during that Mon-Sun period
  const weeklyActiveTrendQuery = `
    WITH week_series AS (
      SELECT
        generate_series(
          (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 7 * 8)::date,
          (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 7)::date,
          '7 days'::interval
        )::date as week_start
    ),
    weekly_active AS (
      SELECT
        ws.week_start,
        COUNT(DISTINCT p.user_id) as active_users
      FROM week_series ws
      LEFT JOIN tasks t ON t.updated_at >= ws.week_start::timestamp
                        AND t.updated_at < (ws.week_start + 7)::timestamp
      LEFT JOIN programs p ON t.program_id = p.id
      GROUP BY ws.week_start
    )
    SELECT
      TO_CHAR(week_start, 'MM/DD') as week_label,
      active_users
    FROM weekly_active
    ORDER BY week_start ASC;
  `;

  const weeklyActiveTrendResult = await pool.query(weeklyActiveTrendQuery);
  const weeklyActiveTrend: WeeklyTrendData[] = weeklyActiveTrendResult.rows.map(row => ({
    weekLabel: row.week_label,
    value: parseInt(row.active_users)
  }));

  // Query 2: User engagement statistics for last complete week
  // Weekly active users = users who had task updates last week (tasks.updated_at)
  // This is more reliable than last_login_at/last_active_date which are not consistently maintained
  // Rationale: tasks.updated_at reflects actual user interaction with learning content
  const engagementQuery = `
    WITH week_bounds AS (
      SELECT
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 7)::timestamp as last_week_start,
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 1)::timestamp + INTERVAL '1 day' - INTERVAL '1 millisecond' as last_week_end,
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 14)::timestamp as two_weeks_ago_start,
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 8)::timestamp + INTERVAL '1 day' - INTERVAL '1 millisecond' as two_weeks_ago_end
    ),
    active_users AS (
      -- Users who had task updates last week
      -- Join tasks → programs to get user_id
      SELECT DISTINCT p.user_id as id
      FROM tasks t
      JOIN programs p ON t.program_id = p.id
      CROSS JOIN week_bounds wb
      WHERE t.updated_at >= wb.last_week_start
        AND t.updated_at <= wb.last_week_end
    ),
    two_weeks_ago_users AS (
      SELECT u.id FROM users u, week_bounds
      WHERE u.created_at >= week_bounds.two_weeks_ago_start
        AND u.created_at <= week_bounds.two_weeks_ago_end
    ),
    retained_users AS (
      SELECT DISTINCT twu.id FROM two_weeks_ago_users twu
      WHERE EXISTS (
        -- Check if user had task updates last week
        SELECT 1 FROM active_users au WHERE au.id = twu.id
      )
    )
    SELECT
      (SELECT COUNT(*) FROM active_users) as weekly_active_users,
      ROUND((SELECT COUNT(*) FROM active_users)::numeric / 7, 0) as daily_avg_active,
      ROUND(
        (SELECT COUNT(*)::numeric FROM retained_users) /
        NULLIF((SELECT COUNT(*) FROM two_weeks_ago_users), 0) * 100,
        1
      ) as retention_rate;
  `;

  const engagementResult = await pool.query(engagementQuery);
  const engagementStats = engagementResult.rows[0];

  const weeklyActiveUsers = parseInt(engagementStats.weekly_active_users || '0');
  const dailyAvgActive = parseInt(engagementStats.daily_avg_active || '0');
  const retentionRate = parseFloat(engagementStats.retention_rate || '0');
  const activeRate = totalUsers > 0 ? (weeklyActiveUsers / totalUsers) * 100 : 0;

  // Query 3: Learning activity statistics by mode for last complete week
  // Count completions by mode (assessment, pbl, discovery)
  // Completion rate = (completed last week) / (created last week) * 100
  const learningQuery = `
    WITH week_bounds AS (
      SELECT
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 7)::timestamp as last_week_start,
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 1)::timestamp + INTERVAL '1 day' - INTERVAL '1 millisecond' as last_week_end
    )
    SELECT
      COUNT(CASE WHEN p.completed_at >= wb.last_week_start AND p.completed_at <= wb.last_week_end AND p.mode = 'assessment' THEN 1 END) as assessment_completions,
      COUNT(CASE WHEN p.completed_at >= wb.last_week_start AND p.completed_at <= wb.last_week_end AND p.mode = 'pbl' THEN 1 END) as pbl_completions,
      COUNT(CASE WHEN p.completed_at >= wb.last_week_start AND p.completed_at <= wb.last_week_end AND p.mode = 'discovery' THEN 1 END) as discovery_completions,
      COUNT(CASE WHEN p.completed_at >= wb.last_week_start AND p.completed_at <= wb.last_week_end THEN 1 END) as total_completions,
      ROUND(
        (COUNT(CASE WHEN p.completed_at IS NOT NULL AND p.completed_at >= wb.last_week_start AND p.completed_at <= wb.last_week_end THEN 1 END)::numeric /
        NULLIF(COUNT(CASE WHEN p.created_at >= wb.last_week_start AND p.created_at <= wb.last_week_end THEN 1 END), 0)) * 100,
        1
      ) as completion_rate
    FROM programs p
    CROSS JOIN week_bounds wb;
  `;

  const learningResult = await pool.query(learningQuery);
  const learningStats = learningResult.rows[0];

  const assessmentCompletions = parseInt(learningStats.assessment_completions || '0');
  const pblCompletions = parseInt(learningStats.pbl_completions || '0');
  const discoveryCompletions = parseInt(learningStats.discovery_completions || '0');
  const totalCompletions = parseInt(learningStats.total_completions || '0');
  const completionRate = parseFloat(learningStats.completion_rate || '0');

  // Query 3.5: Top content (most popular scenarios last complete week)
  const topContentQuery = `
    WITH week_bounds AS (
      SELECT
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 7)::timestamp as last_week_start,
        (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 - 1)::timestamp + INTERVAL '1 day' - INTERVAL '1 millisecond' as last_week_end
    )
    SELECT
      s.title->>'en' as name,
      COUNT(*) as count
    FROM programs p
    JOIN scenarios s ON p.scenario_id = s.id
    CROSS JOIN week_bounds wb
    WHERE p.completed_at >= wb.last_week_start
      AND p.completed_at <= wb.last_week_end
    GROUP BY s.id, s.title
    ORDER BY count DESC
    LIMIT 3;
  `;

  const topContentResult = await pool.query(topContentQuery);
  const topContent = topContentResult.rows.map(row => ({
    name: row.name || 'Untitled',
    count: parseInt(row.count)
  }));

  // Query 4: System health (placeholder for now)
  const healthStats = {
    apiSuccessRate: 99.8,
    avgResponseTime: 245,
    uptime: 99.95,
    dbStatus: 'normal'
  };

  return {
    userGrowth: {
      totalUsers,
      newThisWeek,
      newLastWeek,
      weekOverWeekGrowth,
      dailyTrend, // DEPRECATED: Kept for backward compatibility
      avgPerDay,
      weeklyTrend
    },
    engagement: {
      weeklyActiveUsers,
      dailyAvgActive,
      retentionRate,
      activeRate,
      weeklyActiveTrend
    },
    learning: {
      assessmentCompletions,
      pblCompletions,
      discoveryCompletions,
      totalCompletions,
      completionRate,
      topContent
    },
    systemHealth: healthStats
  };
}
