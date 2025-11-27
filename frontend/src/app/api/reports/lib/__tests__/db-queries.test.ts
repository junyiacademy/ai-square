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
  });
});
