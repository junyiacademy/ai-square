import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from '@/lib/auth/session';
import type { IProgram, ITask, IEvaluation } from '@/types/unified-learning';
import type { AssessmentQuestion, AssessmentInteraction } from '@/types/assessment-types';
import { mockConsoleError, mockConsoleLog, mockConsoleWarn } from '@/test-utils/helpers/console';

// Mock console methods for testing
const mockError = mockConsoleError();
const mockLog = mockConsoleLog();
const mockWarn = mockConsoleWarn();

// Mock auth session
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn()
}));

// Get mocked function
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

// Mock repositories with proper typing
const mockFindById = jest.fn();
const mockFindByEmail = jest.fn();
const mockUpdate = jest.fn();
const mockFindByProgram = jest.fn();
const mockUpdateStatus = jest.fn();
const mockCreate = jest.fn();
const mockFindByIdEval = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: () => ({
      findById: mockFindById,
      update: mockUpdate,
    }),
    getTaskRepository: () => ({
      findByProgram: mockFindByProgram,
      updateStatus: mockUpdateStatus,
    }),
    getEvaluationRepository: () => ({
      create: mockCreate,
      findById: mockFindByIdEval,
      findByProgram: mockFindByProgram,
    }),
    getUserRepository: () => ({
      findByEmail: mockFindByEmail,
    }),
  },
}));

describe('POST /api/assessment/programs/[programId]/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
  };

  const mockProgram = {
    id: 'program123',
    userId: 'user123',
    status: 'active',
    metadata: {},
    createdAt: new Date('2024-01-01').toISOString(),
  };

  const mockTasks = [
    {
      id: 'task1',
      title: { en: 'Domain Knowledge' },
      status: 'active',
      content: {
        questions: [
          {
            id: 'q1',
            domain: 'engaging_with_ai',
            ksa_mapping: {
              knowledge: ['K1', 'K2'],
              skills: ['S1'],
              attitudes: ['A1'],
            },
          },
          {
            id: 'q2',
            domain: 'creating_with_ai',
            ksa_mapping: {
              knowledge: ['K3'],
              skills: ['S2'],
              attitudes: ['A2'],
            },
          },
        ],
      },
      interactions: [
        {
          type: 'system_event',
          timestamp: new Date().toISOString(),
          content: {
            eventType: 'assessment_answer',
            questionId: 'q1',
            selectedAnswer: 'a',
            isCorrect: true,
          },
        },
        {
          type: 'system_event',
          timestamp: new Date().toISOString(),
          content: {
            eventType: 'assessment_answer',
            questionId: 'q2',
            selectedAnswer: 'b',
            isCorrect: false,
          },
        },
      ],
    },
  ];

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Authentication required' });
  });

  it('returns 404 when program not found', async () => {
    mockGetServerSession.mockResolvedValue({ user: mockUser });
    mockFindById.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Program not found' });
  });

  it('returns 403 when user does not own program', async () => {
    mockGetServerSession.mockResolvedValue({ user: mockUser });
    mockFindById.mockResolvedValue({ ...mockProgram, userId: 'other-user' });
    mockFindByEmail.mockResolvedValue({ id: 'user123', email: 'test@example.com' });

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Access denied' });
  });

  it('returns existing evaluation if already completed', async () => {
    const completedProgram = {
      ...mockProgram,
      status: 'completed',
      metadata: { evaluationId: 'eval123' },
    };

    mockGetServerSession.mockResolvedValue({ user: mockUser });
    mockFindById.mockResolvedValue(completedProgram);
    mockFindByEmail.mockResolvedValue(mockUser);
    mockFindByIdEval.mockResolvedValue({ id: 'eval123', score: 85 });

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      evaluationId: 'eval123',
      score: 85,
      alreadyCompleted: true,
    });
  });

  it('returns error if assessment is incomplete', async () => {
    const incompleteTask = {
      ...mockTasks[0],
      title: { en: 'Domain Knowledge' },
      interactions: [
        {
          type: 'system_event',
          timestamp: new Date().toISOString(),
          content: {
            eventType: 'assessment_answer',
            questionId: 'q1',
            selectedAnswer: 'a',
            isCorrect: true,
          },
        },
        // Missing answer for q2
      ],
    };

    mockGetServerSession.mockResolvedValue({ user: mockUser });
    mockFindById.mockResolvedValue(mockProgram);
    mockFindByEmail.mockResolvedValue(mockUser);
    mockFindByProgram
      .mockResolvedValueOnce([incompleteTask]) // For tasks
      .mockResolvedValueOnce([]); // For existing evaluations

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Assessment incomplete',
      details: {
        totalQuestions: 2,
        answeredQuestions: 1,
        missingQuestions: 1,
      },
    });
  });

  it('successfully completes assessment and creates evaluation', async () => {
    mockGetServerSession.mockResolvedValue({ user: mockUser });
    mockFindById.mockResolvedValue(mockProgram);
    mockFindByEmail.mockResolvedValue(mockUser);
    mockFindByProgram
      .mockResolvedValueOnce(mockTasks) // For tasks
      .mockResolvedValueOnce([]); // For existing evaluations
    mockCreate.mockResolvedValue({ id: 'eval-new' });
    

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      evaluationId: 'eval-new',
      score: 50, // 1 correct out of 2 questions
    });

    // Verify evaluation creation
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user123',
        programId: 'program123',
        mode: 'assessment',
        evaluationType: 'program',
        evaluationSubtype: 'assessment_complete',
        score: 50,
        maxScore: 100,
        assessmentData: {
          totalQuestions: 2,
          correctAnswers: 1,
          domainScores: expect.any(Array),
        },
        metadata: expect.objectContaining({
          totalQuestions: 2,
          correctAnswers: 1,
          level: 'intermediate',
          certificateEligible: false,
          ksaAnalysis: expect.objectContaining({
            knowledge: expect.objectContaining({ score: 50 }),
            skills: expect.objectContaining({ score: 50 }),
            attitudes: expect.objectContaining({ score: 50 }),
          }),
        }),
      })
    );

    // Verify program updates
    expect(mockUpdate).toHaveBeenCalledWith('program123', {
      metadata: expect.objectContaining({
        score: 50,
        evaluationId: 'eval-new',
      }),
    });

    expect(mockUpdate).toHaveBeenCalledWith('program123', { status: 'completed' });
  });

  it('calculates domain scores correctly', async () => {
    const multiDomainTasks = [
      {
        id: 'task1',
        title: { en: 'Multi-domain Assessment' },
        status: 'active',
        content: {
          questions: [
            {
              id: 'q1',
              domain: 'engaging_with_ai',
              ksa_mapping: { knowledge: ['K1'] },
            },
            {
              id: 'q2',
              domain: 'engaging_with_ai',
              ksa_mapping: { skills: ['S1'] },
            },
            {
              id: 'q3',
              domain: 'creating_with_ai',
              ksa_mapping: { attitudes: ['A1'] },
            },
          ],
        },
        interactions: [
          {
            type: 'system_event',
            timestamp: new Date().toISOString(),
            content: {
              eventType: 'assessment_answer',
              questionId: 'q1',
              selectedAnswer: 'a',
              isCorrect: true,
            },
          },
          {
            type: 'system_event',
            timestamp: new Date().toISOString(),
            content: {
              eventType: 'assessment_answer',
              questionId: 'q2',
              selectedAnswer: 'b',
              isCorrect: false,
            },
          },
          {
            type: 'system_event',
            timestamp: new Date().toISOString(),
            content: {
              eventType: 'assessment_answer',
              questionId: 'q3',
              selectedAnswer: 'c',
              isCorrect: true,
            },
          },
        ],
      },
    ];

    mockGetServerSession.mockResolvedValue({ user: mockUser });
    mockFindById.mockResolvedValue(mockProgram);
    mockFindByEmail.mockResolvedValue(mockUser);
    mockFindByProgram
      .mockResolvedValueOnce(multiDomainTasks)
      .mockResolvedValueOnce([]);
    mockCreate.mockResolvedValue({ id: 'eval-new' });

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        domainScores: {
          engaging_with_ai: 50, // 1 out of 2 correct
          creating_with_ai: 100, // 1 out of 1 correct
        },
      })
    );
  });

  it('allows completion with userEmail in query params when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockFindByEmail.mockResolvedValue(mockUser);
    mockFindById.mockResolvedValue(mockProgram);
    mockFindByProgram
      .mockResolvedValueOnce(mockTasks)
      .mockResolvedValueOnce([]);
    mockCreate.mockResolvedValue({ id: 'eval-new' });

    const request = new NextRequest(
      'http://localhost:3000/api/assessment/programs/program123/complete?userEmail=test@example.com',
      { method: 'POST' }
    );

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('handles database errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({ user: mockUser });
    mockFindById.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to complete assessment' });
  });
});