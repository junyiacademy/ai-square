import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// Mock repositories
const mockFindByEmail = jest.fn();
const mockFindById = jest.fn();
const mockUpdate = jest.fn();
const mockFindByUser = jest.fn();
const mockCreateProgram = jest.fn();
const mockUpdateProgram = jest.fn();
const mockCreateEvaluation = jest.fn();
const mockFindByProgram = jest.fn();
const mockGetCompletedPrograms = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getUserRepository: () => ({
      findByEmail: mockFindByEmail,
      findById: mockFindById,
      update: mockUpdate,
    }),
    getProgramRepository: () => ({
      findByUser: mockFindByUser,
      create: mockCreateProgram,
      update: mockUpdateProgram,
      getCompletedPrograms: mockGetCompletedPrograms,
    }),
    getEvaluationRepository: () => ({
      create: mockCreateEvaluation,
      findByProgram: mockFindByProgram,
    }),
  },
}));

// Mock API optimization utils
jest.mock('@/lib/api/optimization-utils', () => ({
  cachedGET: jest.fn((request, handler, options) => handler()),
  getPaginationParams: jest.fn(() => ({ page: 1, limit: 10 })),
  createPaginatedResponse: jest.fn((data, total, params) => ({
    data,
    total,
    page: params.page,
    totalPages: Math.ceil(total / params.limit),
  })),
}));

describe.skip('Assessment Results API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      totalXp: 1000,
    };

    const mockRequestData = {
      userId: 'user123',
      userEmail: 'test@example.com',
      language: 'en',
      scenarioId: 'assessment-001',
      answers: [
        { questionId: 'q1', answer: 'a', isCorrect: true },
        { questionId: 'q2', answer: 'b', isCorrect: false },
      ],
      questions: [
        { id: 'q1', ksaCodes: ['K1', 'S2'] },
        { id: 'q2', ksaCodes: ['A3'] },
      ],
      result: {
        overallScore: 85,
        domainScores: {
          Engaging_with_AI: 90,
          Creating_with_AI: 80,
          Managing_with_AI: 85,
          Designing_with_AI: 85,
        },
        level: 'advanced',
        timeSpentSeconds: 1200,
        totalQuestions: 12,
        correctAnswers: 10,
        completedAt: new Date().toISOString(),
        recommendations: ['Focus on Creating with AI'],
      },
    };

    it('saves assessment results successfully', async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockFindByUser.mockResolvedValue([]);
      const mockProgram = { id: 'program123', metadata: {} };
      mockCreateProgram.mockResolvedValue(mockProgram);
      mockCreateEvaluation.mockResolvedValue({ id: 'eval123' });

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(mockRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        assessmentId: 'eval123',
        programId: 'program123',
        message: 'Assessment result saved successfully',
        xpEarned: 850, // 85 * 10
      });

      expect(mockCreateProgram).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          scenarioId: 'assessment-001',
          mode: 'assessment',
          status: 'active',
        })
      );

      expect(mockCreateEvaluation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          programId: 'program123',
          mode: 'assessment',
          evaluationType: 'assessment_complete',
          score: 85,
        })
      );

      expect(mockUpdate).toHaveBeenCalledWith('user123', {
        totalXp: 1850, // 1000 + 850
      });
    });

    it('uses existing active assessment program', async () => {
      const existingProgram = {
        id: 'existing-program',
        scenarioId: 'assessment-001',
        status: 'active',
        metadata: {},
      };

      mockFindByEmail.mockResolvedValue(mockUser);
      mockFindByUser.mockResolvedValue([existingProgram]);
      mockCreateEvaluation.mockResolvedValue({ id: 'eval123' });

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(mockRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockCreateProgram).not.toHaveBeenCalled();
      expect(data.programId).toBe('existing-program');
    });

    it('returns 400 when required fields are missing', async () => {
      const incompleteData = {
        userId: 'user123',
        // Missing answers and result
      };

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Missing required fields',
      });
    });

    it('returns 404 when user not found', async () => {
      mockFindByEmail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(mockRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        error: 'User not found',
      });
    });

    it('handles database errors gracefully', async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockFindByUser.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(mockRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to save assessment result',
      });
    });
  });

  describe('GET', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };

    const mockPrograms = [
      {
        id: 'prog1',
        scenarioId: 'assessment-001',
        metadata: { type: 'assessment' },
      },
    ];

    const mockEvaluations = [
      {
        id: 'eval1',
        evaluationType: 'assessment_complete',
        score: 85,
        timeTakenSeconds: 1200,
        createdAt: '2024-01-01T12:00:00Z',
        domainScores: {
          Engaging_with_AI: 90,
          Creating_with_AI: 80,
          Managing_with_AI: 85,
          Designing_with_AI: 85,
        },
        metadata: {
          language: 'en',
          totalQuestions: 12,
          correctAnswers: 10,
          level: 'advanced',
          answers: [],
        },
      },
    ];

    it('retrieves assessment results by userId', async () => {
      mockFindById.mockResolvedValue(mockUser);
      mockGetCompletedPrograms.mockResolvedValue(mockPrograms);
      mockFindByProgram.mockResolvedValue(mockEvaluations);

      const request = new NextRequest('http://localhost:3000/api/assessment/results?userId=user123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toMatchObject({
        assessment_id: 'eval1',
        user_id: 'user123',
        user_email: 'test@example.com',
        scores: {
          overall: 85,
          domains: {
            engaging_with_ai: 90,
            creating_with_ai: 80,
            managing_ai: 85,
            designing_ai: 85,
          },
        },
      });
    });

    it('retrieves assessment results by userEmail', async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockGetCompletedPrograms.mockResolvedValue(mockPrograms);
      mockFindByProgram.mockResolvedValue(mockEvaluations);

      const request = new NextRequest('http://localhost:3000/api/assessment/results?userEmail=test@example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it('returns 400 when neither userId nor userEmail provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/results');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'userId or userEmail is required',
      });
    });

    it('returns empty array when user not found', async () => {
      mockFindById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/results?userId=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        data: [],
        total: 0,
        page: 1,
        totalPages: 1,
        storage: 'postgresql',
      });
    });

    it('sorts results by timestamp (newest first)', async () => {
      const multipleEvaluations = [
        { ...mockEvaluations[0], id: 'eval1', createdAt: '2024-01-01T12:00:00Z' },
        { ...mockEvaluations[0], id: 'eval2', createdAt: '2024-01-02T12:00:00Z' },
      ];

      mockFindById.mockResolvedValue(mockUser);
      mockGetCompletedPrograms.mockResolvedValue(mockPrograms);
      mockFindByProgram.mockResolvedValue(multipleEvaluations);

      const request = new NextRequest('http://localhost:3000/api/assessment/results?userId=user123');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data[0].assessment_id).toBe('eval2');
      expect(data.data[1].assessment_id).toBe('eval1');
    });
  });
});

/*
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock the auth module
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn()
}));

// Mock the repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getEvaluationRepository: jest.fn(),
    getScenarioRepository: jest.fn()
  }
}));

import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

const mockGetServerSession = getServerSession as jest.Mock;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe.skip('Assessment Results API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/assessment/results', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/results');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return empty array when user has no results', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { email: 'test@example.com' }
      });

      const mockEvaluationRepo = {
        findByUser: jest.fn().mockResolvedValue([])
      };
      mockGetEvaluationRepository.mockReturnValue(mockEvaluationRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.results).toEqual([]);
    });

    it('should return assessment results with scenario details', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { email: 'test@example.com' }
      });

      const mockEvaluations = [
        {
          id: 'eval-1',
          userId: 'test@example.com',
          programId: 'prog-1',
          scenarioId: 'scenario-1',
          score: 85,
          moduleType: 'assessment',
          createdAt: new Date('2025-01-01')
        },
        {
          id: 'eval-2',
          userId: 'test@example.com',
          programId: 'prog-2',
          scenarioId: 'scenario-2',
          score: 92,
          moduleType: 'assessment',
          createdAt: new Date('2025-01-02')
        }
      ];

      const mockScenarios = {
        'scenario-1': {
          id: 'scenario-1',
          title: 'AI Fundamentals',
          description: 'Basic AI concepts'
        },
        'scenario-2': {
          id: 'scenario-2',
          title: 'Machine Learning',
          description: 'ML basics'
        }
      };

      const mockEvaluationRepo = {
        findByUser: jest.fn().mockResolvedValue(mockEvaluations)
      };
      const mockScenarioRepo = {
        findById: jest.fn((id) => Promise.resolve(mockScenarios[id]))
      };

      mockGetEvaluationRepository.mockReturnValue(mockEvaluationRepo);
      mockGetScenarioRepository.mockReturnValue(mockScenarioRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(2);
      expect(data.results[0]).toMatchObject({
        id: 'eval-1',
        score: 85,
        scenario: {
          title: 'AI Fundamentals'
        }
      });
    });

    it('should handle module type filter', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { email: 'test@example.com' }
      });

      const mockEvaluations = [
        {
          id: 'eval-1',
          userId: 'test@example.com',
          moduleType: 'assessment',
          score: 85
        },
        {
          id: 'eval-2',
          userId: 'test@example.com',
          moduleType: 'pbl',
          score: 90
        },
        {
          id: 'eval-3',
          userId: 'test@example.com',
          moduleType: 'assessment',
          score: 88
        }
      ];

      const mockEvaluationRepo = {
        findByUser: jest.fn().mockResolvedValue(mockEvaluations)
      };
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(null)
      };

      mockGetEvaluationRepository.mockReturnValue(mockEvaluationRepo);
      mockGetScenarioRepository.mockReturnValue(mockScenarioRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results?moduleType=assessment');
      const response = await GET(request);
      
      const data = await response.json();
      expect(data.results).toHaveLength(2);
      expect(data.results.every(r => r.moduleType === 'assessment')).toBe(true);
    });

    it('should sort results by creation date descending', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { email: 'test@example.com' }
      });

      const mockEvaluations = [
        {
          id: 'eval-1',
          userId: 'test@example.com',
          createdAt: new Date('2025-01-01'),
          score: 80
        },
        {
          id: 'eval-2',
          userId: 'test@example.com',
          createdAt: new Date('2025-01-03'),
          score: 85
        },
        {
          id: 'eval-3',
          userId: 'test@example.com',
          createdAt: new Date('2025-01-02'),
          score: 82
        }
      ];

      const mockEvaluationRepo = {
        findByUser: jest.fn().mockResolvedValue(mockEvaluations)
      };
      mockGetEvaluationRepository.mockReturnValue(mockEvaluationRepo);
      mockGetScenarioRepository.mockReturnValue({
        findById: jest.fn().mockResolvedValue(null)
      });

      const request = new NextRequest('http://localhost:3000/api/assessment/results');
      const response = await GET(request);
      
      const data = await response.json();
      expect(data.results[0].id).toBe('eval-2'); // Most recent
      expect(data.results[1].id).toBe('eval-3');
      expect(data.results[2].id).toBe('eval-1'); // Oldest
    });
  });

  describe('POST /api/assessment/results', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'prog-1',
          scenarioId: 'scenario-1',
          score: 85
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should create a new assessment result', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { email: 'test@example.com' }
      });

      const mockEvaluation = {
        id: 'eval-new',
        userId: 'test@example.com',
        programId: 'prog-1',
        scenarioId: 'scenario-1',
        score: 85,
        moduleType: 'assessment',
        createdAt: new Date()
      };

      const mockEvaluationRepo = {
        create: jest.fn().mockResolvedValue(mockEvaluation)
      };
      mockGetEvaluationRepository.mockReturnValue(mockEvaluationRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'prog-1',
          scenarioId: 'scenario-1',
          score: 85,
          moduleType: 'assessment',
          metadata: {
            timeSpent: 1200,
            questionsAnswered: 10
          }
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.evaluation).toMatchObject({
        id: 'eval-new',
        score: 85,
        moduleType: 'assessment'
      });
      
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith({
        userId: 'test@example.com',
        programId: 'prog-1',
        scenarioId: 'scenario-1',
        score: 85,
        moduleType: 'assessment',
        metadata: {
          timeSpent: 1200,
          questionsAnswered: 10
        }
      });
    });

    it('should validate required fields', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { email: 'test@example.com' }
      });

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'prog-1'
          // Missing required fields
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing required fields');
    });

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { email: 'test@example.com' }
      });

      const mockEvaluationRepo = {
        create: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      mockGetEvaluationRepository.mockReturnValue(mockEvaluationRepo);

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'prog-1',
          scenarioId: 'scenario-1',
          score: 85,
          moduleType: 'assessment'
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to save assessment result');
    });
  });
});
*/
