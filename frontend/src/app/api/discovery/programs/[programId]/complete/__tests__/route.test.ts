import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock auth session
const mockGetServerSession = jest.fn();
jest.mock('@/lib/auth/session', () => ({
  getServerSession: mockGetServerSession
}));

// Mock repositories
const mockFindById = jest.fn();
const mockUpdate = jest.fn();
const mockFindByProgram = jest.fn();
const mockCreate = jest.fn();
const mockFindByIdEval = jest.fn();
const mockFindByIdScenario = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: () => ({
      findById: mockFindById,
      update: mockUpdate,
    }),
    getTaskRepository: () => ({
      findByProgram: mockFindByProgram,
    }),
    getEvaluationRepository: () => ({
      create: mockCreate,
      findById: mockFindByIdEval,
    }),
    getScenarioRepository: () => ({
      findById: mockFindByIdScenario,
    }),
  },
}));

describe('POST /api/discovery/programs/[programId]/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProgram = {
    id: 'program123',
    userId: 'user123',
    scenarioId: 'scenario123',
    status: 'active',
    metadata: {
      careerType: 'software-engineer',
    },
  };

  const mockTasks = [
    {
      id: 'task1',
      status: 'completed',
      title: { en: 'Task 1', zhTW: '任務 1' },
      metadata: { taskType: 'question' },
      interactions: [
        {
          type: 'user_input',
          content: 'user answer',
        },
        {
          type: 'ai_response',
          content: JSON.stringify({
            completed: true,
            xpEarned: 100,
            score: 85,
            skillsImproved: ['problem-solving'],
          }),
          context: { completed: true },
        },
      ],
    },
    {
      id: 'task2',
      status: 'completed',
      title: 'Task 2',
      interactions: [
        {
          type: 'user_input',
          content: 'user answer 2',
        },
        {
          type: 'ai_response',
          content: JSON.stringify({
            completed: true,
            xpEarned: 150,
            score: 90,
          }),
          context: { completed: true },
          metadata: { timeSpent: 120 },
        },
      ],
    },
  ];

  const mockScenario = {
    id: 'scenario123',
    title: { en: 'Software Engineer Path' },
    metadata: { careerType: 'software-engineer' },
  };

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Authentication required' });
  });

  it('returns 404 when program not found', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindById.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Program not found or access denied' });
  });

  it('returns 404 when user does not own the program', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'otheruser', email: 'other@example.com' } });
    mockFindById.mockResolvedValue(mockProgram);

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Program not found or access denied' });
  });

  it('returns existing evaluation if program already completed', async () => {
    const completedProgram = {
      ...mockProgram,
      status: 'completed',
      metadata: {
        ...mockProgram.metadata,
        evaluationId: 'eval123',
      },
    };

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindById.mockResolvedValue(completedProgram);
    mockFindByIdEval.mockResolvedValue({ id: 'eval123' });

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      evaluationId: 'eval123',
      alreadyCompleted: true,
    });
  });

  it('successfully completes program and creates evaluation', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindById.mockResolvedValue(mockProgram);
    mockFindByProgram.mockResolvedValue(mockTasks);
    mockFindByIdScenario.mockResolvedValue(mockScenario);
    mockCreate.mockResolvedValue({ id: 'eval-new' });

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/complete', {
      method: 'POST',
      headers: { 'accept-language': 'zhTW' },
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      evaluationId: 'eval-new',
      score: 88, // Average of 85 and 90
      totalXP: 250, // 100 + 150
    });

    // Verify evaluation was created with correct data
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user123',
        programId: 'program123',
        mode: 'discovery',
        evaluationType: 'program',
        evaluationSubtype: 'discovery_complete',
        score: 88,
        maxScore: 100,
        discoveryData: {
          careerType: 'software-engineer',
          totalXP: 250,
          totalTasks: 2,
          completedTasks: 2,
        },
        metadata: expect.objectContaining({
          scenarioId: 'scenario123',
          overallScore: 88,
          taskEvaluations: expect.arrayContaining([
            expect.objectContaining({
              taskId: 'task1',
              taskTitle: '任務 1', // Should use zhTW based on accept-language
              taskType: 'question',
              score: 85,
              xpEarned: 100,
              attempts: 1,
              passCount: 1,
              skillsImproved: ['problem-solving'],
            }),
            expect.objectContaining({
              taskId: 'task2',
              taskTitle: 'Task 2',
              score: 90,
              xpEarned: 150,
            }),
          ]),
        }),
      })
    );

    // Verify program was updated
    expect(mockUpdate).toHaveBeenCalledWith('program123', 
      expect.objectContaining({
        status: 'completed',
        metadata: expect.objectContaining({
          evaluationId: 'eval-new',
          totalXP: 250,
          finalScore: 88,
        }),
      })
    );
  });

  it('handles tasks without successful completions', async () => {
    const tasksWithoutSuccess = [
      {
        id: 'task1',
        status: 'completed',
        title: 'Task 1',
        interactions: [
          {
            type: 'user_input',
            content: 'user answer',
          },
          {
            type: 'ai_response',
            content: JSON.stringify({ completed: false }),
            context: { completed: false },
          },
        ],
      },
    ];

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindById.mockResolvedValue(mockProgram);
    mockFindByProgram.mockResolvedValue(tasksWithoutSuccess);
    mockFindByIdScenario.mockResolvedValue(mockScenario);
    mockCreate.mockResolvedValue({ id: 'eval-new' });

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      evaluationId: 'eval-new',
      score: 0,
      totalXP: 0,
    });
  });

  it('handles database errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindById.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to complete program' });
  });
});