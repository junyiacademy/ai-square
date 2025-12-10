/**
 * Unit tests for chart generator
 * Tests Chart.js v3+ syntax and Chinese labels
 */

import {
  generateRegistrationChart,
  generateActiveUsersChart,
  generateCompletionRateChart,
  generateWeeklyCharts
} from '../chart-generator';
import type { WeeklyStats } from '../db-queries';

describe('Chart Generator', () => {
  const mockStats: WeeklyStats = {
    userGrowth: {
      totalUsers: 394,
      newThisWeek: 142,
      newLastWeek: 135,
      weekOverWeekGrowth: 5.2,
      dailyTrend: [20, 23, 29, 34, 20, 8, 13],
      avgPerDay: 20.3
    },
    engagement: {
      weeklyActiveUsers: 245,
      dailyAvgActive: 85,
      retentionRate: 45.0,
      activeRate: 62.2
    },
    learning: {
      assessmentCompletions: 234,
      pblCompletions: 89,
      discoveryCompletions: 156,
      totalCompletions: 479,
      completionRate: 78.5,
      topContent: []
    },
    systemHealth: {
      apiSuccessRate: 99.8,
      avgResponseTime: 245,
      uptime: 99.95,
      dbStatus: 'normal'
    }
  };

  describe('generateRegistrationChart', () => {
    it('should generate QuickChart URL with Chinese labels', () => {
      const url = generateRegistrationChart(mockStats);

      // Decode the URL to check configuration
      const decodedUrl = decodeURIComponent(url);

      // Check for Chinese day labels
      expect(decodedUrl).toContain('週一');
      expect(decodedUrl).toContain('週二');
      expect(decodedUrl).toContain('週三');
      expect(decodedUrl).toContain('週四');
      expect(decodedUrl).toContain('週五');
      expect(decodedUrl).toContain('週六');
      expect(decodedUrl).toContain('週日');

      // Check for Chinese dataset label
      expect(decodedUrl).toContain('每日新註冊用戶');

      // Check for Chart.js v3+ syntax (plugins)
      expect(decodedUrl).toContain('plugins');
      expect(decodedUrl).toContain('AI Square 週用戶增長趨勢');
    });

    it('should use Chart.js v3+ syntax with plugins.title', () => {
      const url = generateRegistrationChart(mockStats);
      const decodedUrl = decodeURIComponent(url);

      // Should NOT contain old v2 syntax
      expect(decodedUrl).not.toContain('yAxes');

      // Should contain new v3+ syntax
      expect(decodedUrl).toContain('"plugins"');
      expect(decodedUrl).toContain('"scales"');
    });

    it('should include axis titles in Chinese', () => {
      const url = generateRegistrationChart(mockStats);
      const decodedUrl = decodeURIComponent(url);

      expect(decodedUrl).toContain('用戶數');
      expect(decodedUrl).toContain('星期');
    });
  });

  describe('generateActiveUsersChart', () => {
    it('should generate QuickChart URL with Chinese labels', () => {
      const url = generateActiveUsersChart(mockStats);
      const decodedUrl = decodeURIComponent(url);

      // Check for Chinese day labels
      expect(decodedUrl).toContain('週一');
      expect(decodedUrl).toContain('每日活躍用戶');
      expect(decodedUrl).toContain('AI Square 每日活躍用戶趨勢');
    });

    it('should use Chart.js v3+ syntax', () => {
      const url = generateActiveUsersChart(mockStats);
      const decodedUrl = decodeURIComponent(url);

      expect(decodedUrl).not.toContain('yAxes');
      expect(decodedUrl).toContain('"plugins"');
    });
  });

  describe('generateCompletionRateChart', () => {
    it('should generate QuickChart URL with Chinese mode labels', () => {
      const url = generateCompletionRateChart(mockStats);
      const decodedUrl = decodeURIComponent(url);

      // Check for Chinese mode labels
      expect(decodedUrl).toContain('評量模式');
      expect(decodedUrl).toContain('PBL模式');
      expect(decodedUrl).toContain('探索模式');

      // Check for Chinese dataset label
      expect(decodedUrl).toContain('完成次數');

      // Check for Chinese title with completion rate
      expect(decodedUrl).toContain('學習模式完成分布');
      expect(decodedUrl).toContain('78.5%');
    });

    it('should use Chart.js v3+ syntax', () => {
      const url = generateCompletionRateChart(mockStats);
      const decodedUrl = decodeURIComponent(url);

      expect(decodedUrl).not.toContain('yAxes');
      expect(decodedUrl).toContain('"plugins"');
    });

    it('should include axis titles in Chinese', () => {
      const url = generateCompletionRateChart(mockStats);
      const decodedUrl = decodeURIComponent(url);

      expect(decodedUrl).toContain('完成次數');
      expect(decodedUrl).toContain('學習模式');
    });
  });

  describe('generateWeeklyCharts', () => {
    it('should generate all three chart URLs', () => {
      const charts = generateWeeklyCharts(mockStats);

      expect(charts.registrationChart).toContain('https://quickchart.io/chart');
      expect(charts.activeUsersChart).toContain('https://quickchart.io/chart');
      expect(charts.completionRateChart).toContain('https://quickchart.io/chart');
    });

    it('should generate unique URLs for each chart', () => {
      const charts = generateWeeklyCharts(mockStats);

      expect(charts.registrationChart).not.toBe(charts.activeUsersChart);
      expect(charts.activeUsersChart).not.toBe(charts.completionRateChart);
      expect(charts.registrationChart).not.toBe(charts.completionRateChart);
    });
  });
});
