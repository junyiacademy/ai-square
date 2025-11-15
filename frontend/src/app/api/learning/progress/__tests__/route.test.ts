/**
 * Learning Progress API Route Tests
 * 測試學習進度 API
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';
import { postgresqlLearningService } from '@/lib/services/postgresql-learning-service';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() => new Response(
    JSON.stringify({ success: false, error: 'Unauthorized' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )),
}));

jest.mock('@/lib/services/postgresql-learning-service', () => ({
  postgresqlLearningService: {
    getLearningProgress: jest.fn(),
  },
}));

// Mock console
const mockConsoleError = createMockConsoleError();

describe('/api/learning/progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET - Learning Progress', () => {
    const mockProgressData = {
      overall: {
        totalPrograms: 5,
        completedPrograms: 2,
        inProgressPrograms: 2,
        notStartedPrograms: 1,
        totalTimeSpent: 7200, // 2 hours
        averageScore: 85.5,
        lastActivityDate: '2025-07-31T10:00:00Z',
      },
      byMode: {
        pbl: {
          totalPrograms: 2,
          completedPrograms: 1,
          averageScore: 88.0,
          totalTimeSpent: 3600,
        },
        assessment: {
          totalPrograms: 2,
          completedPrograms: 1,
          averageScore: 82.0,
          totalTimeSpent: 1800,
        },
        discovery: {
          totalPrograms: 1,
          completedPrograms: 0,
          averageScore: null,
          totalTimeSpent: 1800,
        },
      },
      recentActivities: [
        {
          programId: 'prog-123',
          scenarioTitle: { en: 'AI Job Search' },
          mode: 'pbl',
          status: 'completed',
          completedAt: '2025-07-30T15:00:00Z',
          score: 92,
        },
        {
          programId: 'prog-456',
          scenarioTitle: { en: 'AI Literacy Assessment' },
          mode: 'assessment',
          status: 'completed',
          completedAt: '2025-07-29T14:00:00Z',
          score: 82,
        },
      ],
      achievements: [
        {
          id: 'ach-001',
          title: { en: 'Fast Learner' },
          description: { en: 'Complete 5 programs' },
          earnedAt: '2025-07-30T15:00:00Z',
        },
      ],
    };

    it('should return learning progress for authenticated user', async () => {
      const mockAuth = {
        user: {
          id: 'user-123',
          email: 'student@example.com',
          role: 'student',
        },
      };

      (getUnifiedAuth as jest.Mock).mockResolvedValue(mockAuth);
      (postgresqlLearningService.getLearningProgress as jest.Mock).mockResolvedValue(mockProgressData);

      const request = new NextRequest('http://localhost:3000/api/learning/progress');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockProgressData,
      });
      expect(postgresqlLearningService.getLearningProgress).toHaveBeenCalledWith('student@example.com');
    });

    it('should return 401 when user is not authenticated', async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/learning/progress');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(postgresqlLearningService.getLearningProgress).not.toHaveBeenCalled();
    });

    it('should return 401 when session has no user email', async () => {
      const mockAuth = {
        user: {
          id: 'user-123',
          // No email
          role: 'student',
        } as any,
      };

      (getUnifiedAuth as jest.Mock).mockResolvedValue(mockAuth);

      const request = new NextRequest('http://localhost:3000/api/learning/progress');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(postgresqlLearningService.getLearningProgress).not.toHaveBeenCalled();
    });

    it('should handle empty progress data', async () => {
      const mockAuth = {
        user: {
          id: 'user-456',
          email: 'newuser@example.com',
          role: 'student',
        },
      };

      const emptyProgress = {
        overall: {
          totalPrograms: 0,
          completedPrograms: 0,
          inProgressPrograms: 0,
          notStartedPrograms: 0,
          totalTimeSpent: 0,
          averageScore: null,
          lastActivityDate: null,
        },
        byMode: {
          pbl: {
            totalPrograms: 0,
            completedPrograms: 0,
            averageScore: null,
            totalTimeSpent: 0,
          },
          assessment: {
            totalPrograms: 0,
            completedPrograms: 0,
            averageScore: null,
            totalTimeSpent: 0,
          },
          discovery: {
            totalPrograms: 0,
            completedPrograms: 0,
            averageScore: null,
            totalTimeSpent: 0,
          },
        },
        recentActivities: [],
        achievements: [],
      };

      (getUnifiedAuth as jest.Mock).mockResolvedValue(mockAuth);
      (postgresqlLearningService.getLearningProgress as jest.Mock).mockResolvedValue(emptyProgress);

      const request = new NextRequest('http://localhost:3000/api/learning/progress');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: emptyProgress,
      });
    });

    it('should handle service errors gracefully', async () => {
      const mockAuth = {
        user: {
          id: 'user-789',
          email: 'error@example.com',
          role: 'student',
        },
      };

      const error = new Error('Database connection failed');
      (getUnifiedAuth as jest.Mock).mockResolvedValue(mockAuth);
      (postgresqlLearningService.getLearningProgress as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/learning/progress');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Internal server error',
      });
      expect(mockConsoleError).toHaveBeenCalledWith('Error getting learning progress:', error);
    });

    it('should handle session check errors', async () => {
      const error = new Error('Session service unavailable');
      (getUnifiedAuth as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/learning/progress');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Internal server error',
      });
      expect(mockConsoleError).toHaveBeenCalledWith('Error getting learning progress:', error);
    });
  });
});

/**
 * Learning Progress API Considerations:
 *
 * 1. Authentication:
 *    - Must check user session
 *    - Email is required for progress lookup
 *
 * 2. Progress Data Structure:
 *    - Overall statistics
 *    - Breakdown by learning mode
 *    - Recent activities
 *    - Achievements
 *
 * 3. Performance:
 *    - May aggregate large amounts of data
 *    - Consider caching for frequent requests
 *
 * 4. Privacy:
 *    - Users can only see their own progress
 *    - No cross-user data exposure
 *
 * 5. Empty State:
 *    - New users have zero progress
 *    - Should return valid empty structure
 */
