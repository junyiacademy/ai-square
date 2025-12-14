/**
 * Unit tests for weekly report formatter
 * TDD: Red → Green → Refactor
 */

import { formatWeeklyReport } from '../report-formatter';
import type { WeeklyStats } from '../db-queries';

describe('Weekly Report Formatter', () => {
  const mockStats: WeeklyStats = {
    userGrowth: {
      totalUsers: 394,
      newThisWeek: 142,
      newLastWeek: 135,
      weekOverWeekGrowth: 5.2,
      dailyTrend: [20, 23, 29, 34, 20, 8, 13],
      avgPerDay: 20.3,
      weeklyTrend: [
        { weekLabel: '11/04', value: 110 },
        { weekLabel: '11/11', value: 125 },
        { weekLabel: '11/18', value: 135 },
        { weekLabel: '11/25', value: 130 },
        { weekLabel: '12/02', value: 142 },
        { weekLabel: '12/09', value: 150 },
        { weekLabel: '12/16', value: 145 },
        { weekLabel: '12/23', value: 152 }
      ]
    },
    engagement: {
      weeklyActiveUsers: 245,
      dailyAvgActive: 85,
      retentionRate: 45.0,
      activeRate: 62.2,
      weeklyActiveTrend: [
        { weekLabel: '11/04', value: 200 },
        { weekLabel: '11/11', value: 215 },
        { weekLabel: '11/18', value: 230 },
        { weekLabel: '11/25', value: 220 },
        { weekLabel: '12/02', value: 245 },
        { weekLabel: '12/09', value: 250 },
        { weekLabel: '12/16', value: 255 },
        { weekLabel: '12/23', value: 260 }
      ]
    },
    learning: {
      assessmentCompletions: 234,
      pblCompletions: 89,
      discoveryCompletions: 156,
      totalCompletions: 479,
      completionRate: 78.5,
      topContent: [
        { name: 'Career Assessment', count: 45 },
        { name: 'Software Engineer PBL', count: 38 },
        { name: 'Data Science Discovery', count: 32 }
      ]
    },
    systemHealth: {
      apiSuccessRate: 99.8,
      avgResponseTime: 245,
      uptime: 99.95,
      dbStatus: 'normal'
    }
  };

  describe('formatWeeklyReport', () => {
    it('should format complete weekly report with all sections', () => {
      const result = formatWeeklyReport(mockStats);

      // Should include all major sections
      expect(result).toContain('📊 **AI Square 週報**');
      expect(result).toContain('**📈 用戶增長**');
      expect(result).toContain('**👥 用戶活躍度**');
      expect(result).toContain('**📚 學習數據**');
      expect(result).toContain('**🚀 系統健康**');
    });

    it('should include user growth statistics', () => {
      const result = formatWeeklyReport(mockStats);

      expect(result).toContain('本週新註冊: 142 人');
      expect(result).toContain('累計用戶: 394 人');
      expect(result).toContain('日均註冊: 20.3 人');
      expect(result).toContain('+5.2%');
    });

    it('should include daily trend formatted correctly', () => {
      const result = formatWeeklyReport(mockStats);

      expect(result).toContain('Mon: 20');
      expect(result).toContain('Tue: 23');
      expect(result).toContain('Sun: 13');
    });

    it('should include engagement statistics', () => {
      const result = formatWeeklyReport(mockStats);

      expect(result).toContain('本週活躍用戶: 245 人');
      expect(result).toContain('日均活躍: 85 人');
      expect(result).toContain('7 日留存率: 45.0%');
    });

    it('should include learning statistics', () => {
      const result = formatWeeklyReport(mockStats);

      expect(result).toContain('Assessment 完成: 234 次');
      expect(result).toContain('PBL 完成: 89 次');
      expect(result).toContain('Discovery 完成: 156 次');
      expect(result).toContain('總完成率: 78.5%');
    });

    it('should include top content when available', () => {
      const result = formatWeeklyReport(mockStats);

      expect(result).toContain('最受歡迎內容 Top 3:');
      expect(result).toContain('1. Career Assessment - 45 次');
      expect(result).toContain('2. Software Engineer PBL - 38 次');
      expect(result).toContain('3. Data Science Discovery - 32 次');
    });

    it('should include system health statistics', () => {
      const result = formatWeeklyReport(mockStats);

      expect(result).toContain('API 成功率: 99.8%');
      expect(result).toContain('平均響應時間: 245ms');
      expect(result).toContain('系統可用性: 99.95%');
    });

    it('should include footer with generation info', () => {
      const result = formatWeeklyReport(mockStats);

      expect(result).toContain('🤖 自動生成');
      expect(result).toContain('每週一 09:00');
    });

    it('should handle empty top content gracefully', () => {
      const statsWithoutTopContent: WeeklyStats = {
        ...mockStats,
        learning: {
          ...mockStats.learning,
          topContent: []
        }
      };

      const result = formatWeeklyReport(statsWithoutTopContent);

      expect(result).toContain('📚 學習數據');
      expect(result).not.toContain('最受歡迎內容');
    });

    it('should include date range in header for LAST complete week', () => {
      const result = formatWeeklyReport(mockStats);

      // Should contain date range (format: YYYY-MM-DD ~ YYYY-MM-DD)
      expect(result).toMatch(/\d{4}-\d{2}-\d{2} ~ \d{4}-\d{2}-\d{2}/);

      // Verify it's showing last week (not current week)
      // Extract dates from result
      const dateMatch = result.match(/(\d{4}-\d{2}-\d{2}) ~ (\d{4}-\d{2}-\d{2})/);
      expect(dateMatch).toBeTruthy();

      if (dateMatch) {
        const startDate = new Date(dateMatch[1]);
        const endDate = new Date(dateMatch[2]);

        // Should be exactly 6 days apart (Monday to Sunday)
        const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBe(6);

        // Start date should be a Monday (day of week = 1)
        expect(startDate.getDay()).toBe(1);

        // End date should be a Sunday (day of week = 0)
        expect(endDate.getDay()).toBe(0);

        // Both dates should be in the past (before today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expect(endDate.getTime()).toBeLessThan(today.getTime());
      }
    });

    it('should format numbers with proper precision', () => {
      const result = formatWeeklyReport(mockStats);

      // Percentages should have 1 decimal place
      expect(result).toMatch(/\d+\.\d%/);

      // Whole numbers should not have decimals
      expect(result).toContain('142 人');
      expect(result).toContain('394 人');
    });
  });
});
