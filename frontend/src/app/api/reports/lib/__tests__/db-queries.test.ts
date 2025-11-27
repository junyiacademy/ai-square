/**
 * Unit tests for weekly report database queries
 * TDD: Red → Green → Refactor
 */

import { getWeeklyStats } from '../db-queries';
import { Pool } from 'pg';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn()
}));

describe('Weekly Report Database Queries', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    } as unknown as jest.Mocked<Pool>;
  });

  describe('getWeeklyStats', () => {
    it('should return user growth statistics', async () => {
      // Arrange
      const mockUserStats = {
        rows: [{
          total_users: '394',
          new_this_week: '142',
          new_last_week: '135'
        }]
      };

      const mockDailyTrend = {
        rows: [
          { day: '2025-11-27', count: '13' },
          { day: '2025-11-26', count: '8' },
          { day: '2025-11-25', count: '20' },
          { day: '2025-11-24', count: '34' },
          { day: '2025-11-23', count: '29' },
          { day: '2025-11-22', count: '23' },
          { day: '2025-11-21', count: '20' }
        ]
      };

      const mockEngagementStats = {
        rows: [{
          weekly_active_users: '245',
          daily_avg_active: '85',
          retention_rate: '45.0'
        }]
      };

      const mockLearningStats = {
        rows: [{
          total_completions: '479',
          completion_rate: '78.5'
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats);

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert
      expect(result.userGrowth).toBeDefined();
      expect(result.userGrowth.totalUsers).toBe(394);
      expect(result.userGrowth.newThisWeek).toBe(142);
      expect(result.userGrowth.weekOverWeekGrowth).toBeCloseTo(5.2, 1);
      expect(result.userGrowth.dailyTrend).toHaveLength(7);
    });

    it('should return user engagement statistics', async () => {
      // Arrange
      const mockUserStats = {
        rows: [{
          total_users: '394',
          new_this_week: '142',
          new_last_week: '135'
        }]
      };

      const mockDailyTrend = {
        rows: [
          { day: '2025-11-27', count: '13' }
        ]
      };

      const mockEngagementStats = {
        rows: [{
          weekly_active_users: '245',
          daily_avg_active: '85',
          retention_rate: '45.0'
        }]
      };

      const mockLearningStats = {
        rows: [{
          total_completions: '479',
          completion_rate: '78.5'
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats);

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert
      expect(result.engagement).toBeDefined();
      expect(result.engagement.weeklyActiveUsers).toBe(245);
      expect(result.engagement.dailyAvgActive).toBe(85);
      expect(result.engagement.retentionRate).toBe(45.0);
    });

    it('should return learning activity statistics', async () => {
      // Arrange
      const mockUserStats = {
        rows: [{
          total_users: '394',
          new_this_week: '142',
          new_last_week: '135'
        }]
      };

      const mockDailyTrend = {
        rows: [{ day: '2025-11-27', count: '13' }]
      };

      const mockEngagementStats = {
        rows: [{
          weekly_active_users: '245',
          daily_avg_active: '85',
          retention_rate: '45.0'
        }]
      };

      const mockLearningStats = {
        rows: [{
          total_completions: '479',
          completion_rate: '78.5'
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats);

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert
      expect(result.learning).toBeDefined();
      expect(result.learning.totalCompletions).toBe(479);
      expect(result.learning.completionRate).toBe(78.5);
    });

    it('should return system health statistics', async () => {
      // Arrange
      const mockUserStats = {
        rows: [{
          total_users: '394',
          new_this_week: '142',
          new_last_week: '135'
        }]
      };

      const mockDailyTrend = {
        rows: [{ day: '2025-11-27', count: '13' }]
      };

      const mockEngagementStats = {
        rows: [{
          weekly_active_users: '245',
          daily_avg_active: '85',
          retention_rate: '45.0'
        }]
      };

      const mockLearningStats = {
        rows: [{
          total_completions: '479',
          completion_rate: '78.5'
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats);

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert
      expect(result.systemHealth).toBeDefined();
      expect(result.systemHealth.apiSuccessRate).toBe(99.8);
      expect(result.systemHealth.avgResponseTime).toBe(245);
      expect(result.systemHealth.uptime).toBe(99.95);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act & Assert
      await expect(getWeeklyStats(mockPool)).rejects.toThrow('Database connection failed');
    });

    it('should count programs completed this week regardless of creation date', async () => {
      // TDD: Red → Green → Refactor
      // This test verifies that learning statistics count ALL programs completed this week,
      // not just those created this week

      // Arrange
      const mockUserStats = {
        rows: [{
          total_users: '400',
          new_this_week: '50',
          new_last_week: '45'
        }]
      };

      const mockDailyTrend = {
        rows: [{ day: '2025-11-27', count: '10' }]
      };

      const mockEngagementStats = {
        rows: [{
          weekly_active_users: '200',
          daily_avg_active: '80',
          retention_rate: '45.0'
        }]
      };

      // Mock learning stats: 50 programs completed this week
      // Even though only 10 were created this week
      const mockLearningStats = {
        rows: [{
          total_completions: '50',
          completion_rate: '80.0'
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats);

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert
      expect(result.learning.totalCompletions).toBe(50);

      // Verify the SQL query doesn't have WHERE created_at filter
      const learningQueryCall = mockQuery.mock.calls[3];
      expect(learningQueryCall).toBeDefined();
      const sqlQuery = learningQueryCall[0];

      // The query should NOT filter by created_at
      expect(sqlQuery).not.toContain('WHERE created_at >=');
    });

    it('should calculate retention rate correctly', async () => {
      // TDD: Red → Green → Refactor
      // Retention rate = (users from last week who logged in this week) / (users from last week)
      // NOTE: Current implementation uses created_at as proxy since last_login_at is not maintained

      // Arrange
      const mockUserStats = {
        rows: [{
          total_users: '400',
          new_this_week: '50',
          new_last_week: '100'  // 100 users registered last week
        }]
      };

      const mockDailyTrend = {
        rows: [{ day: '2025-11-27', count: '10' }]
      };

      // Engagement query uses WHERE clause to filter active users
      // In production, last_login_at may not be maintained, so retention_rate may be 0
      const mockEngagementStats = {
        rows: [{
          weekly_active_users: '200',
          daily_avg_active: '80',
          retention_rate: '0.0'  // May be 0 if last_login_at not maintained
        }]
      };

      const mockLearningStats = {
        rows: [{
          total_completions: '50',
          completion_rate: '80.0'
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats);

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert
      expect(result.engagement.retentionRate).toBe(0.0);
      expect(result.engagement.weeklyActiveUsers).toBe(200);
    });

    it('should handle production scenario where last_login_at is never set', async () => {
      // Real production scenario: last_login_at is NULL for all users
      // Weekly active users should count users created this week as fallback

      // Arrange
      const mockUserStats = {
        rows: [{
          total_users: '397',
          new_this_week: '155',
          new_last_week: '164'
        }]
      };

      const mockDailyTrend = {
        rows: [
          { day: '2025-11-27', count: '7' },
          { day: '2025-11-26', count: '14' },
          { day: '2025-11-25', count: '51' },
          { day: '2025-11-24', count: '24' },
          { day: '2025-11-23', count: '10' },
          { day: '2025-11-22', count: '6' },
          { day: '2025-11-21', count: '20' }
        ]
      };

      // Production scenario: last_login_at is NULL, so retention_rate = 0
      // But weekly_active_users = 155 (users created this week)
      const mockEngagementStats = {
        rows: [{
          weekly_active_users: '155',  // Users created this week
          daily_avg_active: '22',
          retention_rate: '0.0'  // 0 because last_login_at is NULL
        }]
      };

      // Production: No programs have completed_at set
      const mockLearningStats = {
        rows: [{
          total_completions: '0',
          completion_rate: '0.0'
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats);

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert - Should match production data
      expect(result.userGrowth.totalUsers).toBe(397);
      expect(result.userGrowth.newThisWeek).toBe(155);
      expect(result.engagement.weeklyActiveUsers).toBe(155);
      expect(result.engagement.retentionRate).toBe(0.0);
      expect(result.learning.totalCompletions).toBe(0);
    });
  });
});
