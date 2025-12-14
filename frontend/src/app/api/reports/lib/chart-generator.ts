/**
 * QuickChart API Integration for Weekly Report Charts
 * Generates chart URLs for registration, active users, and completion rate trends
 */

import type { ChartConfig } from './chart-types';
import type { WeeklyStats } from './db-queries';

const QUICKCHART_BASE_URL = 'https://quickchart.io/chart';

/**
 * Generate QuickChart URL from chart configuration
 */
export function generateQuickChartUrl(config: ChartConfig, width = 800, height = 400, devicePixelRatio = 2): string {
  // QuickChart expects just the chart config in 'c' parameter
  // and other parameters separately in the URL
  const chartJson = JSON.stringify(config);

  // Use URLSearchParams to properly encode all parameters
  // Do NOT manually encodeURIComponent - URLSearchParams handles encoding
  const params = new URLSearchParams({
    c: chartJson,
    width: width.toString(),
    height: height.toString(),
    devicePixelRatio: devicePixelRatio.toString(),
    backgroundColor: 'white'
  });

  return `${QUICKCHART_BASE_URL}?${params.toString()}`;
}

/**
 * Generate weekly registration trend chart (8 weeks)
 * Shows total new registrations per week, labeled by Monday's date
 */
export function generateRegistrationChart(stats: WeeklyStats): string {
  const weekLabels = stats.userGrowth.weeklyTrend.map(w => w.weekLabel);
  const weeklyData = stats.userGrowth.weeklyTrend.map(w => w.value);

  const config: ChartConfig = {
    type: 'line',
    data: {
      labels: weekLabels,
      datasets: [
        {
          label: '週註冊用戶',
          data: weeklyData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'AI Square 週註冊用戶趨勢',
          font: { size: 18 }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '用戶數'
          }
        },
        x: {
          title: {
            display: true,
            text: '週（週一日期）'
          }
        }
      }
    }
  };

  return generateQuickChartUrl(config);
}

/**
 * Generate weekly active users trend chart (8 weeks)
 * Shows distinct active users per week, labeled by Monday's date
 */
export function generateActiveUsersChart(stats: WeeklyStats): string {
  const weekLabels = stats.engagement.weeklyActiveTrend.map(w => w.weekLabel);
  const weeklyData = stats.engagement.weeklyActiveTrend.map(w => w.value);

  const config: ChartConfig = {
    type: 'line',
    data: {
      labels: weekLabels,
      datasets: [
        {
          label: '週活躍用戶',
          data: weeklyData,
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'AI Square 週活躍用戶趨勢',
          font: { size: 18 }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '用戶數'
          }
        },
        x: {
          title: {
            display: true,
            text: '週（週一日期）'
          }
        }
      }
    }
  };

  return generateQuickChartUrl(config);
}

/**
 * Generate completion rate breakdown by mode (Assessment/PBL/Discovery)
 */
export function generateCompletionRateChart(stats: WeeklyStats): string {
  const config: ChartConfig = {
    type: 'bar',
    data: {
      labels: ['評量模式', 'PBL模式', '探索模式'],
      datasets: [
        {
          label: '完成次數',
          data: [
            stats.learning.assessmentCompletions,
            stats.learning.pblCompletions,
            stats.learning.discoveryCompletions
          ],
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 1
        }
      ]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `學習模式完成分布（整體完成率 ${stats.learning.completionRate.toFixed(1)}%）`,
          font: { size: 18 }
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '完成次數'
          }
        },
        x: {
          title: {
            display: true,
            text: '學習模式'
          }
        }
      }
    }
  };

  return generateQuickChartUrl(config);
}

/**
 * Generate all weekly report charts
 */
export function generateWeeklyCharts(stats: WeeklyStats): {
  registrationChart: string;
  activeUsersChart: string;
  completionRateChart: string;
} {
  return {
    registrationChart: generateRegistrationChart(stats),
    activeUsersChart: generateActiveUsersChart(stats),
    completionRateChart: generateCompletionRateChart(stats)
  };
}
