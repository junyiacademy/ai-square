import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock auth session
const mockGetServerSession = jest.fn();
jest.mock('@/lib/auth/session', () => ({
  getServerSession: mockGetServerSession
}));

// Mock repositories
const mockFindById = jest.fn();
const mockFindByEmail = jest.fn();
const mockFindByProgram = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: () => ({
      findById: mockFindById,
    }),
    getEvaluationRepository: () => ({
      findByProgram: mockFindByProgram,
    }),
    getUserRepository: () => ({
      findByEmail: mockFindByEmail,
    }),
  },
}));

describe('GET /api/assessment/programs/[programId]/evaluation', () => {
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
    status: 'completed',
    metadata: {},
  };

  const mockEvaluations = [
    {
      id: 'eval1',
      programId: 'program123',
      evaluationType: 'task',
      evaluationSubtype: 'task_complete',
      score: 75,
    },
    {
      id: 'eval2',
      programId: 'program123',
      evaluationType: 'program',
      evaluationSubtype: 'assessment_complete',
      score: 85,
      metadata: {
        totalQuestions: 20,
        correctAnswers: 17,
        level: 'advanced',
      },
    },
  ];

  it('returns 401 when not authenticated and no userEmail provided', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/evaluation');
    const response = await GET(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Authentication required' });
  });

  it('returns 404 when program not found', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockFindById.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/evaluation');
    const response = await GET(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Program not found' });
  });

  it('returns 403 when user does not own program', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockFindByEmail.mockResolvedValue(mockUser);
    mockFindById.mockResolvedValue({ ...mockProgram, userId: 'other-user' });

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/evaluation');
    const response = await GET(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Access denied' });
  });

  it('returns 404 when no assessment evaluation found', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockFindByEmail.mockResolvedValue(mockUser);
    mockFindById.mockResolvedValue(mockProgram);
    mockFindByProgram.mockResolvedValue([
      {
        id: 'eval1',
        evaluationType: 'task',
        evaluationSubtype: 'task_complete',
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/evaluation');
    const response = await GET(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Evaluation not found' });
  });

  it('successfully returns evaluation and program', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockFindByEmail.mockResolvedValue(mockUser);
    mockFindById.mockResolvedValue(mockProgram);
    mockFindByProgram.mockResolvedValue(mockEvaluations);

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/evaluation');
    const response = await GET(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      evaluation: mockEvaluations[1], // The assessment_complete evaluation
      program: mockProgram,
    });
  });

  it('allows access with userEmail query parameter', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockFindByEmail.mockResolvedValue(mockUser);
    mockFindById.mockResolvedValue(mockProgram);
    mockFindByProgram.mockResolvedValue(mockEvaluations);

    const request = new NextRequest(
      'http://localhost:3000/api/assessment/programs/program123/evaluation?userEmail=test@example.com'
    );
    const response = await GET(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.evaluation).toBeDefined();
    expect(data.program).toBeDefined();
  });

  it('handles multiple evaluations correctly', async () => {
    const multipleEvaluations = [
      {
        id: 'eval1',
        evaluationType: 'task',
        evaluationSubtype: 'task_complete',
      },
      {
        id: 'eval2',
        evaluationType: 'program',
        evaluationSubtype: 'midterm',
      },
      {
        id: 'eval3',
        evaluationType: 'program',
        evaluationSubtype: 'assessment_complete',
        score: 90,
      },
      {
        id: 'eval4',
        evaluationType: 'task',
        evaluationSubtype: 'task_feedback',
      },
    ];

    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockFindByEmail.mockResolvedValue(mockUser);
    mockFindById.mockResolvedValue(mockProgram);
    mockFindByProgram.mockResolvedValue(multipleEvaluations);

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/evaluation');
    const response = await GET(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.evaluation.id).toBe('eval3');
    expect(data.evaluation.evaluationType).toBe('program');
    expect(data.evaluation.evaluationSubtype).toBe('assessment_complete');
  });

  it('handles database errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockFindByEmail.mockResolvedValue(mockUser);
    mockFindById.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/assessment/programs/program123/evaluation');
    const response = await GET(request, { params: Promise.resolve({ programId: 'program123' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to load evaluation' });
  });
});
