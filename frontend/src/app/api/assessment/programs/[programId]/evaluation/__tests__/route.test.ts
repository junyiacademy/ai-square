import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Assessment Evaluation Route Tests
 * 提升覆蓋率從 0% 到 80%+
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';
import type { IProgram, IEvaluation } from '@/types/unified-learning';
import type { User } from '@/lib/repositories/interfaces';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() => ({
    json: () => Promise.resolve({ success: false, error: 'Authentication required' }),
    status: 401
  }))
}));

// Mock console
const mockConsoleError = createMockConsoleError();

describe('GET /api/assessment/programs/[programId]/evaluation', () => {
  const mockProgramRepo = {
    findById: jest.fn()
  };
  const mockEvaluationRepo = {
    findByProgram: jest.fn()
  };
  const mockUserRepo = {
    findByEmail: jest.fn()
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    preferredLanguage: 'en',
    level: 1,
    totalXp: 0,
    learningPreferences: {},
    onboardingCompleted: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastActiveAt: new Date('2024-01-01T00:00:00Z'),
    metadata: {}
  };

  const mockProgram: IProgram = {
    id: 'program-123',
    scenarioId: 'scenario-123',
    userId: 'user-123',
    mode: 'assessment',
    status: 'completed',
    currentTaskIndex: 3,
    completedTaskCount: 3,
    totalTaskCount: 3,
    totalScore: 85,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    timeSpentSeconds: 3600,
    lastActivityAt: '2024-01-01T01:00:00Z',
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T01:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T01:00:00Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  const mockEvaluations: IEvaluation[] = [
    {
      id: 'eval-1',
      taskId: 'task-1',
      userId: 'user-123',
      mode: 'assessment',
      evaluationType: 'task',
      evaluationSubtype: 'question',
      score: 90,
      maxScore: 100,
      domainScores: {},
      feedbackData: { answers: { q1: 'a', q2: 'b' } },
      aiAnalysis: {},
      timeTakenSeconds: 600,
      createdAt: '2024-01-01T00:10:00Z',
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    },
    {
      id: 'eval-2',
      taskId: undefined,
      userId: 'user-123',
      mode: 'assessment',
      evaluationType: 'assessment_complete',
      evaluationSubtype: undefined,
      score: 85,
      maxScore: 100,
      domainScores: {},
      feedbackData: {
        techScore: 88,
        creativeScore: 82,
        businessScore: 85,
        strengths: ['Technical skills', 'Problem solving'],
        areasForImprovement: ['Creative thinking'],
        recommendedPaths: ['Software Engineering', 'Data Science']
      },
      aiAnalysis: {},
      timeTakenSeconds: 3600,
      createdAt: '2024-01-01T01:00:00Z',
      pblData: {},
      discoveryData: {},
      assessmentData: {
        domains: ['technical', 'creative', 'business'],
        totalQuestions: 30,
        correctAnswers: 25,
        timeSpentMinutes: 60
      },
      metadata: {}
    },
    {
      id: 'eval-3',
      taskId: 'task-2',
      userId: 'user-123',
      mode: 'assessment',
      evaluationType: 'task',
      evaluationSubtype: 'question',
      score: 80,
      maxScore: 100,
      domainScores: {},
      feedbackData: { answers: { q3: 'c' } },
      aiAnalysis: {},
      timeTakenSeconds: 1200,
      createdAt: '2024-01-01T00:20:00Z',
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Authentication', () => {
    it('should accept authenticated session', async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.evaluation).toBeDefined();
      expect(data.program).toBeDefined();
    });

    it('should accept userEmail query parameter when no session', async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation?userEmail=test@example.com');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.evaluation).toBeDefined();
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return 401 when no authentication', async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle session without email', async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({ user: {} }); // No email

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Program Access', () => {
    beforeEach(() => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    });

    it('should return 404 when program not found', async () => {
      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/programs/invalid-id/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Program not found');
    });

    it('should return 403 when user does not own program', async () => {
      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        userId: 'other-user-id'
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should return 403 when user not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });
  });

  describe('Evaluation Retrieval', () => {
    beforeEach(() => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
    });

    it('should return assessment_complete evaluation', async () => {
      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.evaluation.id).toBe('eval-2');
      expect(data.evaluation.evaluationType).toBe('assessment_complete');
      expect(data.evaluation.evaluationSubtype).toBeUndefined();
      expect(data.evaluation.feedbackData.techScore).toBe(88);
      expect(data.program.id).toBe('program-123');
    });

    it('should return 404 when no evaluations found', async () => {
      mockEvaluationRepo.findByProgram.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Evaluation not found');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'No assessment_complete evaluation found for program',
        'program-123',
        expect.objectContaining({
          evaluationCount: 0,
          evaluationTypes: []
        })
      );
    });

    it('should return 404 when no assessment_complete evaluation found', async () => {
      const evaluationsWithoutComplete = mockEvaluations.filter(e =>
        e.evaluationType !== 'assessment_complete'
      );
      mockEvaluationRepo.findByProgram.mockResolvedValue(evaluationsWithoutComplete);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Evaluation not found');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should process multiple evaluations correctly', async () => {
      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(
        expect.objectContaining({
          program: expect.objectContaining({
            id: 'program-123'
          }),
          evaluation: expect.objectContaining({
            id: 'eval-2',
            evaluationType: 'assessment_complete',
            evaluationSubtype: undefined
          })
        })
      );
    });

    it('should handle evaluations without assessment_complete type', async () => {
      const evaluationsWithoutAssessmentComplete = [
        {
          ...mockEvaluations[0],
          evaluationType: 'task'
        }
      ];
      mockEvaluationRepo.findByProgram.mockResolvedValue(evaluationsWithoutAssessmentComplete);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Evaluation not found');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });
    });

    it('should handle repository errors gracefully', async () => {
      mockProgramRepo.findById.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to load evaluation');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error getting evaluation:',
        expect.any(Error)
      );
    });

    it('should handle evaluation repository errors', async () => {
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockRejectedValue(new Error('Query failed'));

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program-123'}) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to load evaluation');
    });
  });
});
