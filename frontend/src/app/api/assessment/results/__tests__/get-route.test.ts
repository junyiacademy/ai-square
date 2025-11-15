/**
 * Assessment Results GET API Tests
 * Testing the GET method for retrieving assessment results
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/api/optimization-utils', () => ({
  getPaginationParams: jest.fn(() => ({ page: 1, limit: 20, offset: 0 })),
  createPaginatedResponse: jest.fn((items, total, params) => ({
    data: items,
    pagination: {
      page: params.page || 1,
      limit: params.limit || 20,
      total,
      totalPages: Math.ceil(total / (params.limit || 20)),
      hasNext: false,
      hasPrev: false
    }
  })),
  cachedGET: jest.fn(async (request, handler) => {
    const result = await handler();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  })
}));

const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('GET /api/assessment/results', () => {
  let mockUserRepo: any;
  let mockProgramRepo: any;
  let mockEvaluationRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock repositories
    mockUserRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };

    mockProgramRepo = {
      getCompletedPrograms: jest.fn(),
    };

    mockEvaluationRepo = {
      findByProgramIds: jest.fn(),
    };

    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(mockEvaluationRepo);
  });

  it('should return 400 when neither userId nor userEmail is provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/assessment/results', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId or userEmail is required');
  });

  it('should return empty results when user not found by email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/assessment/results?userEmail=notfound@example.com', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('should return empty results when user not found by id', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/assessment/results?userId=notfound-id', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('should return assessment results for valid user with email', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockPrograms = [
      {
        id: 'prog-1',
        scenarioId: 'assessment-scenario',
        userId: 'user-123',
        metadata: { type: 'assessment' }
      },
      {
        id: 'prog-2',
        scenarioId: 'pbl-scenario',
        userId: 'user-123',
        metadata: { type: 'pbl' }
      }
    ];
    const mockEvaluations = [
      {
        id: 'eval-1',
        programId: 'prog-1',
        evaluationType: 'assessment_complete',
        score: 85,
        createdAt: '2024-01-01T00:00:00Z',
        timeTakenSeconds: 1800,
        domainScores: {
          'Engaging_with_AI': 80,
          'Creating_with_AI': 75,
          'Managing_with_AI': 90,
          'Designing_with_AI': 85
        },
        metadata: {
          language: 'en',
          totalQuestions: 10,
          correctAnswers: 8,
          level: 'Proficient',
          answers: [
            { question_id: 'q1', selected: 'a', correct: 'a', time_spent: 30 }
          ]
        }
      }
    ];

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.getCompletedPrograms.mockResolvedValue(mockPrograms);
    mockEvaluationRepo.findByProgramIds.mockResolvedValue(mockEvaluations);

    const request = new NextRequest('http://localhost:3000/api/assessment/results?userEmail=test@example.com', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(data.data[0]).toMatchObject({
      assessment_id: 'eval-1',
      user_id: 'user-123',
      user_email: 'test@example.com',
      timestamp: '2024-01-01T00:00:00Z',
      duration_seconds: 1800,
      language: 'en',
      scores: {
        overall: 85,
        domains: {
          engaging_with_ai: 80,
          creating_with_ai: 75,
          managing_with_ai: 90,
          designing_with_ai: 85
        }
      }
    });
  });

  it('should filter out non-assessment programs', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockPrograms = [
      {
        id: 'prog-1',
        scenarioId: 'pbl-scenario',
        metadata: { type: 'pbl' }
      },
      {
        id: 'prog-2',
        scenarioId: 'assessment-basic',
        metadata: { type: 'assessment' }
      },
      {
        id: 'prog-3',
        scenarioId: 'discovery-scenario',
        metadata: { type: 'discovery' }
      }
    ];
    const mockEvaluations = [
      {
        id: 'eval-2',
        programId: 'prog-2',
        evaluationType: 'assessment_complete',
        score: 75,
        createdAt: '2024-01-02T00:00:00Z',
        timeTakenSeconds: 1500,
        domainScores: {},
        metadata: { totalQuestions: 5, correctAnswers: 4, level: 'Basic' }
      }
    ];

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.getCompletedPrograms.mockResolvedValue(mockPrograms);
    mockEvaluationRepo.findByProgramIds.mockResolvedValue(mockEvaluations);

    const request = new NextRequest('http://localhost:3000/api/assessment/results?userEmail=test@example.com', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockEvaluationRepo.findByProgramIds).toHaveBeenCalledWith(['prog-2']);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].assessment_id).toBe('eval-2');
  });

  it('should handle programs without evaluations', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockPrograms = [
      {
        id: 'prog-1',
        scenarioId: 'assessment-scenario',
        metadata: { type: 'assessment' }
      }
    ];

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.getCompletedPrograms.mockResolvedValue(mockPrograms);
    mockEvaluationRepo.findByProgramIds.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/assessment/results?userEmail=test@example.com', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
  });

  it('should sort results by timestamp (newest first)', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockPrograms = [
      { id: 'prog-1', scenarioId: 'assessment-1', metadata: { type: 'assessment' } },
      { id: 'prog-2', scenarioId: 'assessment-2', metadata: { type: 'assessment' } }
    ];
    const mockEvaluations = [
      {
        id: 'eval-old',
        programId: 'prog-1',
        evaluationType: 'assessment_complete',
        score: 70,
        createdAt: '2024-01-01T00:00:00Z',
        timeTakenSeconds: 1000,
        domainScores: {},
        metadata: {}
      },
      {
        id: 'eval-new',
        programId: 'prog-2',
        evaluationType: 'assessment_complete',
        score: 90,
        createdAt: '2024-01-15T00:00:00Z',
        timeTakenSeconds: 2000,
        domainScores: {},
        metadata: {}
      }
    ];

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.getCompletedPrograms.mockResolvedValue(mockPrograms);
    mockEvaluationRepo.findByProgramIds.mockResolvedValue(mockEvaluations);

    const request = new NextRequest('http://localhost:3000/api/assessment/results?userEmail=test@example.com', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].assessment_id).toBe('eval-new');
    expect(data.data[1].assessment_id).toBe('eval-old');
  });

  it('should handle missing optional fields with defaults', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockPrograms = [
      { id: 'prog-1', scenarioId: 'assessment-scenario', metadata: { type: 'assessment' } }
    ];
    const mockEvaluations = [
      {
        id: 'eval-1',
        programId: 'prog-1',
        evaluationType: 'assessment_complete',
        score: 50,
        createdAt: '2024-01-01T00:00:00Z',
        timeTakenSeconds: 900,
        // No domainScores, no metadata
      }
    ];

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.getCompletedPrograms.mockResolvedValue(mockPrograms);
    mockEvaluationRepo.findByProgramIds.mockResolvedValue(mockEvaluations);

    const request = new NextRequest('http://localhost:3000/api/assessment/results?userEmail=test@example.com', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data[0]).toMatchObject({
      language: 'en',
      scores: {
        overall: 50,
        domains: {
          engaging_with_ai: 0,
          creating_with_ai: 0,
          managing_with_ai: 0,
          designing_with_ai: 0
        }
      },
      summary: {
        total_questions: 0,
        correct_answers: 0,
        level: 'beginner'
      },
      answers: []
    });
  });

  it('should handle missing getCompletedPrograms method gracefully', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.getCompletedPrograms = undefined; // Method doesn't exist

    const request = new NextRequest('http://localhost:3000/api/assessment/results?userEmail=test@example.com', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
  });
});
