/**
 * Format weekly statistics into Slack-friendly markdown report
 */

import type { WeeklyStats } from './db-queries';

/**
 * Get date range for the current week (Monday to Sunday)
 */
function getWeekDateRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday is 0, adjust to Monday

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  return `${formatDate(monday)} ~ ${formatDate(sunday)}`;
}

/**
 * Format daily trend as day names with counts
 */
function formatDailyTrend(trend: number[]): string {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return trend
    .map((count, index) => `${days[index]}: ${count}`)
    .join(' | ');
}

/**
 * Format weekly statistics into markdown report
 */
export function formatWeeklyReport(stats: WeeklyStats): string {
  const dateRange = getWeekDateRange();
  const weekOverWeekSign = stats.userGrowth.weekOverWeekGrowth >= 0 ? '+' : '';

  // Build top content section if available
  let topContentSection = '';
  if (stats.learning.topContent.length > 0) {
    topContentSection = `• 最受歡迎內容 Top 3:
${stats.learning.topContent.map((item, index) =>
  `  ${index + 1}. ${item.name} - ${item.count} 次`
).join('\n')}
`;
  }

  const report = `📊 **AI Square 週報** (${dateRange})

**📈 用戶增長**
• 本週新註冊: ${stats.userGrowth.newThisWeek} 人 (${weekOverWeekSign}${stats.userGrowth.weekOverWeekGrowth.toFixed(1)}% vs 上週)
• 累計用戶: ${stats.userGrowth.totalUsers} 人
• 日均註冊: ${stats.userGrowth.avgPerDay.toFixed(1)} 人
• 過去 7 天趨勢:
  ${formatDailyTrend(stats.userGrowth.dailyTrend)}

**👥 用戶活躍度**
• 本週活躍用戶: ${stats.engagement.weeklyActiveUsers} 人 (${stats.engagement.activeRate.toFixed(1)}% 活躍率)
• 日均活躍: ${stats.engagement.dailyAvgActive} 人
• 7 日留存率: ${stats.engagement.retentionRate.toFixed(1)}%

**📚 學習數據**
• Assessment 完成: ${stats.learning.assessmentCompletions} 次
• PBL 完成: ${stats.learning.pblCompletions} 次
• Discovery 完成: ${stats.learning.discoveryCompletions} 次
• 總完成率: ${stats.learning.completionRate.toFixed(1)}%
${topContentSection}
**🚀 系統健康**
• API 成功率: ${stats.systemHealth.apiSuccessRate.toFixed(1)}%
• 平均響應時間: ${stats.systemHealth.avgResponseTime}ms
• 系統可用性: ${stats.systemHealth.uptime.toFixed(2)}%
• 資料庫連線: ${stats.systemHealth.dbStatus === 'normal' ? '正常' : stats.systemHealth.dbStatus}

---
🤖 自動生成 | 每週一 09:00`;

  return report;
}
