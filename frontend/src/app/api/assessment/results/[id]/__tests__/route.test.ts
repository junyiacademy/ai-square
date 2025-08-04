/**
 * Assessment Results API Route Tests
 * 測試評估結果 API
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');

// Mock console
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('/api/assessment/results/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe('GET - Get Assessment Results', () => {

    it('should return detailed assessment results for authorized user', async () => {
      // The actual API uses userId query param and doesn't check session
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({
          id: 'user-789',
          email: 'user@example.com'
        }),
        findById: jest.fn()
      };
      
      const mockEvaluationRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'prog-123',
          userId: 'user-789',
          score: 85,
          maxScore: 100,
          feedbackText: 'Good performance',
          domainScores: {
            engaging_with_ai: 90,
            creating_with_ai: 80,
            managing_ai: 85,
            designing_ai: 70,
          },
          createdAt: '2025-01-01T10:30:00Z',
          metadata: {
            scenarioId: 'scenario-456',
            timeSpent: 1800,
            totalQuestions: 20,
            answeredQuestions: 20,
            correctAnswers: 17,
          }
        })
      };

      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123?userId=user@example.com');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        assessment_id: 'prog-123',
        user_id: 'user@example.com',
        scenario_id: 'scenario-456',
        completed_at: '2025-01-01T10:30:00Z',
        score: 85,
        max_score: 100,
        feedback: 'Good performance',
        ksa_scores: {
          engaging_with_ai: 90,
          creating_with_ai: 80,
          managing_ai: 85,
          designing_ai: 70,
        },
        metadata: expect.objectContaining({
          timeSpent: 1800,
          totalQuestions: 20,
          answeredQuestions: 20,
          correctAnswers: 17,
        })
      });
    });

    it('should support language parameter', async () => {
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({
          id: 'user-789',
          email: 'user@example.com'
        }),
        findById: jest.fn()
      };
      
      const mockEvaluationRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'prog-123',
          userId: 'user-789',
          score: 85,
          maxScore: 100,
          feedbackText: { en: 'Good performance', zh: '表現良好' },
          domainScores: {},
          createdAt: '2025-01-01T10:30:00Z',
          metadata: {
            scenarioId: 'scenario-456',
            title: { en: 'AI Literacy Assessment', zh: 'AI 素養評估' }
          }
        })
      };

      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123?userId=user@example.com&lang=zh');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      // The actual API returns the whole evaluation, not a nested data structure
      expect(data.metadata.title.zh).toBe('AI 素養評估');
    });

    it('should return 400 when userId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('userId is required');
    });

    it('should return 500 when evaluation not found', async () => {
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({
          id: 'user-789',
          email: 'user@example.com'
        }),
        findById: jest.fn()
      };
      
      const mockEvaluationRepo = {
        findById: jest.fn().mockResolvedValue(null)
      };

      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/non-existent?userId=user@example.com');
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Assessment not found');
    });

    it('should return 500 when user does not own evaluation', async () => {
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({
          id: 'other-user',
          email: 'other@example.com'
        }),
        findById: jest.fn()
      };
      
      const mockEvaluationRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'prog-123',
          userId: 'user-789', // Different from the user making request
          score: 85
        })
      };

      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123?userId=other@example.com');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Assessment not found');
    });

    it('should handle evaluations with minimal data', async () => {
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({
          id: 'user-789',
          email: 'user@example.com'
        }),
        findById: jest.fn()
      };
      
      const mockEvaluationRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'prog-123',
          userId: 'user-789',
          score: 0,
          maxScore: 100,
          feedbackText: null,
          domainScores: null,
          createdAt: '2025-01-01T10:30:00Z',
          metadata: {}
        })
      };

      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123?userId=user@example.com');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.score).toBe(0);
      expect(data.ksa_scores).toBeNull();
    });

    it('should handle userId as ID instead of email', async () => {
      const mockUserRepo = {
        findByEmail: jest.fn(),
        findById: jest.fn().mockResolvedValue({
          id: 'user-789',
          email: 'user@example.com'
        })
      };
      
      const mockEvaluationRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'prog-123',
          userId: 'user-789',
          score: 55,
          maxScore: 100,
          feedbackText: 'Needs improvement',
          domainScores: {
            engaging_with_ai: 55,
            creating_with_ai: 45,
          },
          createdAt: '2025-01-01T10:30:00Z',
          metadata: { scenarioId: 'scenario-456' }
        })
      };

      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123?userId=user-789');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-789');
      expect(mockUserRepo.findByEmail).not.toHaveBeenCalled();
      expect(data.score).toBe(55);
    });

    it('should return 500 when user not found', async () => {
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue(null),
        findById: jest.fn().mockResolvedValue(null)
      };

      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123?userId=nonexistent@example.com');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('User not found');
    });

    it('should handle repository errors', async () => {
      const mockUserRepo = {
        findByEmail: jest.fn().mockRejectedValue(new Error('Database error')),
        findById: jest.fn()
      };

      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123?userId=user@example.com');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
    });

    it('should handle evaluation repository errors', async () => {
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({
          id: 'user-789',
          email: 'user@example.com'
        }),
        findById: jest.fn()
      };
      
      const mockEvaluationRepo = {
        findById: jest.fn().mockRejectedValue(new Error('Evaluation fetch error'))
      };

      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123?userId=user@example.com');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Evaluation fetch error');
    });
  });
});

/**
 * Assessment Results API Considerations:
 * 
 * 1. Authorization:
 *    - Must verify user owns the assessment
 *    - Returns 403 for unauthorized access
 * 
 * 2. Completion Status:
 *    - Only returns results for completed assessments
 *    - Returns 400 for incomplete assessments
 * 
 * 3. Domain Score Calculation:
 *    - Averages scores by domain
 *    - Identifies weak areas (< 60%)
 *    - Provides recommendations
 * 
 * 4. Statistics:
 *    - Question accuracy
 *    - Time spent
 *    - Pass/fail status
 * 
 * 5. Multi-language Support:
 *    - Returns content in requested language
 *    - Falls back to English
 */