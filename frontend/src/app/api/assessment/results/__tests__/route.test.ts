import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock repositories
const mockFindByEmail = jest.fn();
const mockFindById = jest.fn();
const mockUpdate = jest.fn();
const mockFindByUser = jest.fn();
const mockCreateProgram = jest.fn();
const mockCreateEvaluation = jest.fn();
const mockGetCompletedPrograms = jest.fn();
const mockFindByProgram = jest.fn();

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
  cachedGET: jest.fn((request, handler) => handler()),
  getPaginationParams: jest.fn(() => ({ page: 1, limit: 10 })),
  createPaginatedResponse: jest.fn((data, total, params) => {
    const response = {
      data,
      total,
      page: params.page,
      totalPages: Math.ceil(total / params.limit),
      json: async () => ({ data, total, page: params.page }),
      status: 200,
    };
    return response;
  }),
}));

describe('/api/assessment/results', () => {
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

    it('saves assessment results successfully with new program', async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockFindByUser.mockResolvedValue([]);
      const mockProgram = { id: 'program123', metadata: {} };
      mockCreateProgram.mockResolvedValue(mockProgram);
      mockCreateEvaluation.mockResolvedValue({ id: 'eval123' });

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(mockRequestData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assessmentId).toBe('eval123');
      expect(data.programId).toBe('program123');
      expect(mockCreateProgram).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          scenarioId: 'assessment-001',
          mode: 'assessment',
          status: 'active',
        })
      );
    });

    it('returns 400 when required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user123' }), // Missing required fields
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('returns 404 when user not found', async () => {
      mockFindByEmail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(mockRequestData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('handles database errors gracefully', async () => {
      mockFindByEmail.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(mockRequestData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save assessment result');
    });
  });

  describe('GET', () => {
    it('returns 400 when neither userId nor userEmail provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/results');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('userId or userEmail is required');
    });
  });
});