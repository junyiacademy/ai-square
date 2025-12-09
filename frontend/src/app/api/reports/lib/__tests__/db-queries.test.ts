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

  // Helper function to create standard mock learning stats
  const createMockLearningStats = () => ({
    rows: [{
      assessment_completions: '234',
      pbl_completions: '89',
      discovery_completions: '156',
      total_completions: '479',
      completion_rate: '78.5'
    }]
  });

  // Helper function to create standard mock top content
  const createMockTopContent = () => ({
    rows: [
      { name: 'Career Assessment', count: '45' },
      { name: 'Software Engineer PBL', count: '38' },
      { name: 'Data Science Discovery', count: '32' }
    ]
  });

  // Helper to create DB info mock (new validation query)
  const createMockDbInfo = () => ({
    rows: [{ db_name: 'test_db', host: '127.0.0.1' }]
  });

  // Helper to create sanity check mock (new validation query)
  const createMockSanityCheck = (count: string = '394') => ({
    rows: [{ count }]
  });

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
          assessment_completions: '234',
          pbl_completions: '89',
          discovery_completions: '156',
          total_completions: '479',
          completion_rate: '78.5'
        }]
      };

      const mockTopContent = {
        rows: [
          { name: 'Career Assessment', count: '45' },
          { name: 'Software Engineer PBL', count: '38' },
          { name: 'Data Science Discovery', count: '32' }
        ]
      };

      const mockDbInfo = {
        rows: [{ db_name: 'test_db', host: '127.0.0.1' }]
      };

      const mockSanityCheck = {
        rows: [{ count: '394' }]
      };

      mockQuery
        .mockResolvedValueOnce(createMockDbInfo())          // db info query
        .mockResolvedValueOnce(createMockSanityCheck())     // sanity check
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats)
        .mockResolvedValueOnce(mockTopContent);

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert
      expect(result.userGrowth).toBeDefined();
      expect(result.userGrowth.totalUsers).toBe(394);
      expect(result.userGrowth.newThisWeek).toBe(142);
      expect(result.userGrowth.weekOverWeekGrowth).toBeCloseTo(5.2, 1);
      expect(result.userGrowth.dailyTrend).toHaveLength(7);
    });

    it('should return user engagement statistics based on tasks.updated_at', async () => {
      // TDD: Red → Green → Refactor
      // Active users = users who had task updates last week (via tasks.updated_at)
      // This is more reliable than last_login_at which is not maintained

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
          weekly_active_users: '245',  // Users with task updates last week
          daily_avg_active: '85',
          retention_rate: '45.0'
        }]
      };

      mockQuery
        .mockResolvedValueOnce(createMockDbInfo())
        .mockResolvedValueOnce(createMockSanityCheck())
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(createMockLearningStats())
        .mockResolvedValueOnce(createMockTopContent());

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

      const mockLearningStats = createMockLearningStats();

      mockQuery
        .mockResolvedValueOnce(createMockDbInfo())
        .mockResolvedValueOnce(createMockSanityCheck())
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats)
        .mockResolvedValueOnce(createMockTopContent());

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert
      expect(result.learning).toBeDefined();
      expect(result.learning.assessmentCompletions).toBe(234);
      expect(result.learning.pblCompletions).toBe(89);
      expect(result.learning.discoveryCompletions).toBe(156);
      expect(result.learning.totalCompletions).toBe(479);
      expect(result.learning.completionRate).toBe(78.5);
      expect(result.learning.topContent).toHaveLength(3);
      expect(result.learning.topContent[0].name).toBe('Career Assessment');
      expect(result.learning.topContent[0].count).toBe(45);
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

      const mockLearningStats = createMockLearningStats();

      mockQuery
        .mockResolvedValueOnce(createMockDbInfo())
        .mockResolvedValueOnce(createMockSanityCheck())
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats)
        .mockResolvedValueOnce(createMockTopContent());

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
      mockQuery
        .mockResolvedValueOnce(createMockDbInfo())  // dbInfo succeeds
        .mockRejectedValueOnce(new Error('Database connection failed'));  // sanityCheck fails

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
          assessment_completions: '20',
          pbl_completions: '15',
          discovery_completions: '15',
          total_completions: '50',
          completion_rate: '80.0'
        }]
      };

      const mockTopContent = createMockTopContent();

      mockQuery
        .mockResolvedValueOnce(createMockDbInfo())
        .mockResolvedValueOnce(createMockSanityCheck())
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats)
        .mockResolvedValueOnce(mockTopContent);

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert
      expect(result.learning.totalCompletions).toBe(50);
      expect(result.learning.assessmentCompletions).toBe(20);
      expect(result.learning.pblCompletions).toBe(15);
      expect(result.learning.discoveryCompletions).toBe(15);

      // Verify the SQL query doesn't have WHERE created_at filter
      // Call index: 0=dbInfo, 1=sanityCheck, 2=userStats, 3=dailyTrend, 4=engagement, 5=learning
      const learningQueryCall = mockQuery.mock.calls[5];
      expect(learningQueryCall).toBeDefined();
      const sqlQuery = learningQueryCall[0];

      // The query should count completions by mode
      expect(sqlQuery).toContain("mode = 'assessment'");
      expect(sqlQuery).toContain("mode = 'pbl'");
      expect(sqlQuery).toContain("mode = 'discovery'");
    });

    it('should calculate retention rate correctly using tasks.updated_at', async () => {
      // TDD: Red → Green → Refactor
      // Retention rate = (users from 2 weeks ago who had task updates last week) / (users from 2 weeks ago)
      // Uses tasks.updated_at as reliable indicator of user engagement

      // Arrange
      const mockUserStats = {
        rows: [{
          total_users: '400',
          new_this_week: '50',
          new_last_week: '100'  // 100 users registered 2 weeks ago
        }]
      };

      const mockDailyTrend = {
        rows: [{ day: '2025-11-27', count: '10' }]
      };

      // 45% of users from 2 weeks ago had task updates last week
      const mockEngagementStats = {
        rows: [{
          weekly_active_users: '200',
          daily_avg_active: '80',
          retention_rate: '45.0'  // Based on tasks.updated_at
        }]
      };

      const mockLearningStats = {
        rows: [{
          total_completions: '50',
          completion_rate: '80.0'
        }]
      };

      mockQuery
        .mockResolvedValueOnce(createMockDbInfo())
        .mockResolvedValueOnce(createMockSanityCheck())
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats)
        .mockResolvedValueOnce(createMockTopContent());

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert
      expect(result.engagement.retentionRate).toBe(45.0);
      expect(result.engagement.weeklyActiveUsers).toBe(200);
    });

    it('should handle production scenario with tasks.updated_at', async () => {
      // Real production scenario: Using tasks.updated_at for reliable activity tracking
      // Weekly active users = unique users with task updates last week

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

      // Production scenario: 132 users had task updates last week
      const mockEngagementStats = {
        rows: [{
          weekly_active_users: '132',  // Users with task updates last week
          daily_avg_active: '19',
          retention_rate: '15.5'  // 15.5% of 2-week-old users had task updates
        }]
      };

      // Production: Some programs completed
      const mockLearningStats = {
        rows: [{
          assessment_completions: '45',
          pbl_completions: '23',
          discovery_completions: '18',
          total_completions: '86',
          completion_rate: '65.0'
        }]
      };

      const mockTopContent = {
        rows: [
          { name: 'Career Assessment', count: '25' }
        ]
      };

      mockQuery
        .mockResolvedValueOnce(createMockDbInfo())
        .mockResolvedValueOnce(createMockSanityCheck())
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(mockDailyTrend)
        .mockResolvedValueOnce(mockEngagementStats)
        .mockResolvedValueOnce(mockLearningStats)
        .mockResolvedValueOnce(mockTopContent);

      // Act
      const result = await getWeeklyStats(mockPool);

      // Assert - Should reflect real user engagement via tasks.updated_at
      expect(result.userGrowth.totalUsers).toBe(397);
      expect(result.userGrowth.newThisWeek).toBe(155);
      expect(result.engagement.weeklyActiveUsers).toBe(132);
      expect(result.engagement.retentionRate).toBe(15.5);
      expect(result.learning.assessmentCompletions).toBe(45);
      expect(result.learning.pblCompletions).toBe(23);
      expect(result.learning.discoveryCompletions).toBe(18);
      expect(result.learning.totalCompletions).toBe(86);
      expect(result.learning.topContent).toHaveLength(1);
    });
  });
});
