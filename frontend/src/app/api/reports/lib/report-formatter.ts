/**
 * Format weekly statistics into Slack-friendly markdown report
 */

import type { WeeklyStats } from "./db-queries";

interface AIInsight {
  summary: string;
  highlights: string[];
  recommendations: string[];
  concerns: string[];
}

/**
 * Format system health section for the report
 */
function formatSystemHealthSection(
  health: WeeklyStats["systemHealth"],
): string {
  if (!health) {
    return `
**🚀 系統健康**
• 監控數據: 尚未整合 Cloud Monitoring
• _說明: 需要整合 Cloud Logging/Monitoring API 以提供即時監控數據_
`;
  }

  return `
**🚀 系統健康**
• API 成功率: ${health.apiSuccessRate.toFixed(1)}%
• 平均響應時間: ${health.avgResponseTime}ms
• 系統可用性: ${health.uptime.toFixed(2)}%
• 資料庫連線: ${health.dbStatus === "normal" ? "正常" : health.dbStatus}
`;
}

/**
 * Get date range for the LAST complete week (Monday to Sunday)
 * When run on any day, this returns the previous week's full range
 * Example: Run on Tuesday 2025-12-09 → Returns "2025-12-01 ~ 2025-12-07"
 */
function getWeekDateRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Find this week's Monday first
  // Days since this Monday: (dayOfWeek + 6) % 7
  // For Sunday (0): (0 + 6) % 7 = 6 days ago
  // For Monday (1): (1 + 6) % 7 = 0 days ago
  // For Tuesday (2): (2 + 6) % 7 = 1 day ago
  const daysFromMonday = (dayOfWeek + 6) % 7;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysFromMonday);
  thisMonday.setHours(0, 0, 0, 0);

  // Last week's Monday is 7 days before this Monday
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  // Last week's Sunday is 6 days after last Monday
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);

  const formatDate = (date: Date) => {
    // Use local time to avoid timezone shift when formatting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`; // YYYY-MM-DD
  };

  return `${formatDate(lastMonday)} ~ ${formatDate(lastSunday)}`;
}

/**
 * Format daily trend as day names with counts
 */
function formatDailyTrend(trend: number[]): string {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return trend.map((count, index) => `${days[index]}: ${count}`).join(" | ");
}

/**
 * Format weekly statistics into markdown report
 */
export function formatWeeklyReport(
  stats: WeeklyStats,
  aiInsights: AIInsight | null = null,
): string {
  const dateRange = getWeekDateRange();
  const weekOverWeekSign = stats.userGrowth.weekOverWeekGrowth >= 0 ? "+" : "";

  // Build top content section if available
  let topContentSection = "";
  if (stats.learning.topContent.length > 0) {
    topContentSection = `• 最受歡迎內容 Top 3:
${stats.learning.topContent
  .map((item, index) => `  ${index + 1}. ${item.name} - ${item.count} 次`)
  .join("\n")}
`;
  }

  // Build AI insights section if available
  let aiInsightsSection = "";
  if (aiInsights) {
    aiInsightsSection = `
**🤖 AI 智能洞察**
${aiInsights.summary}

✅ **亮點**
${aiInsights.highlights.map((h) => `• ${h}`).join("\n")}

💡 **建議**
${aiInsights.recommendations.map((r) => `• ${r}`).join("\n")}

${aiInsights.concerns.length > 0 ? `⚠️ **關注點**\n${aiInsights.concerns.map((c) => `• ${c}`).join("\n")}\n` : ""}`;
  }

  // Build system health section
  const systemHealthSection = formatSystemHealthSection(stats.systemHealth);

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
${topContentSection}${systemHealthSection}${aiInsightsSection}
---
🤖 自動生成 | 每週一 09:00`;

  return report;
}
