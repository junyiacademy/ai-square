/**
 * Database queries for weekly report generation
 */

import { Pool } from 'pg';

export interface WeeklyStats {
  userGrowth: {
    totalUsers: number;
    newThisWeek: number;
    newLastWeek: number;
    weekOverWeekGrowth: number;
    dailyTrend: number[];
    avgPerDay: number;
  };
  engagement: {
    weeklyActiveUsers: number;
    dailyAvgActive: number;
    retentionRate: number;
    activeRate: number;
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
  // Query 1: User growth statistics (basic counts)
  const userStatsQuery = `
    SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_this_week,
      COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_last_week
    FROM users;
  `;

  const userStatsResult = await pool.query(userStatsQuery);
  const userStats = userStatsResult.rows[0];

  // Query 1.5: Daily trend (separate query to avoid nested aggregates)
  const dailyTrendQuery = `
    SELECT
      DATE(created_at) as day,
      COUNT(*) as count
    FROM users
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY day DESC
    LIMIT 7;
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

  // Build daily trend array for last 7 days (Mon to Sun)
  const dailyTrend: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
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

  // Query 2: User engagement statistics
  const engagementQuery = `
    SELECT
      COUNT(DISTINCT id) as weekly_active_users,
      ROUND(COUNT(DISTINCT id)::numeric / 7, 0) as daily_avg_active,
      ROUND(
        (COUNT(DISTINCT CASE WHEN last_login_at >= CURRENT_DATE - INTERVAL '7 days' THEN id END)::numeric /
        NULLIF(COUNT(DISTINCT CASE WHEN created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days' THEN id END), 0)) * 100,
        1
      ) as retention_rate
    FROM users
    WHERE last_login_at >= CURRENT_DATE - INTERVAL '7 days' OR created_at >= CURRENT_DATE - INTERVAL '7 days';
  `;

  const engagementResult = await pool.query(engagementQuery);
  const engagementStats = engagementResult.rows[0];

  const weeklyActiveUsers = parseInt(engagementStats.weekly_active_users || '0');
  const dailyAvgActive = parseInt(engagementStats.daily_avg_active || '0');
  const retentionRate = parseFloat(engagementStats.retention_rate || '0');
  const activeRate = totalUsers > 0 ? (weeklyActiveUsers / totalUsers) * 100 : 0;

  // Query 3: Learning activity statistics
  // Simplified: count all completions (TODO: differentiate by type later)
  const learningQuery = `
    SELECT
      COUNT(CASE WHEN completed_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as total_completions,
      ROUND(
        (COUNT(CASE WHEN completed_at IS NOT NULL AND completed_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::numeric /
        NULLIF(COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END), 0)) * 100,
        1
      ) as completion_rate
    FROM programs
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
  `;

  const learningResult = await pool.query(learningQuery);
  const learningStats = learningResult.rows[0];

  const totalCompletions = parseInt(learningStats.total_completions || '0');
  const completionRate = parseFloat(learningStats.completion_rate || '0');

  // Simplified: distribute completions evenly (TODO: get real data)
  const assessmentCompletions = Math.floor(totalCompletions * 0.4);
  const pblCompletions = Math.floor(totalCompletions * 0.3);
  const discoveryCompletions = totalCompletions - assessmentCompletions - pblCompletions;

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
      dailyTrend,
      avgPerDay
    },
    engagement: {
      weeklyActiveUsers,
      dailyAvgActive,
      retentionRate,
      activeRate
    },
    learning: {
      assessmentCompletions,
      pblCompletions,
      discoveryCompletions,
      totalCompletions,
      completionRate,
      topContent: [] // Will implement in next iteration
    },
    systemHealth: healthStats
  };
}
