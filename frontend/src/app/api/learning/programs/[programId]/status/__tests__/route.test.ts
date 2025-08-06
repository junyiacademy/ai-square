import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { postgresqlLearningService } from '@/lib/services/postgresql-learning-service';
import { createMockProgram, createMockScenario, createMockTask, createMockEvaluation } from '@/test-utils/mocks/repository-helpers';

// Mock auth session
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn()
}));

// Mock learning service
jest.mock('@/lib/services/postgresql-learning-service', () => ({
  postgresqlLearningService: {
    getProgramStatus: jest.fn(),
  },
}));

// Get mocked functions
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockGetProgramStatus = postgresqlLearningService.getProgramStatus as jest.MockedFunction<typeof postgresqlLearningService.getProgramStatus>;

describe('GET /api/learning/programs/[programId]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/learning/programs/prog123/status');
    const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('returns 401 when session has no email', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: undefined as any } });

    const request = new NextRequest('http://localhost:3000/api/learning/programs/prog123/status');
    const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('successfully returns program status', async () => {
    const mockStatus = {
      program: createMockProgram({
        id: 'prog123',
        status: 'active',
        currentTaskIndex: 3,
        totalTaskCount: 5,
      }),
      scenario: createMockScenario({
        id: 'scenario123',
        title: { en: 'Test Scenario' },
      }),
      tasks: [
        createMockTask({ id: 'task1', status: 'completed' }),
        createMockTask({ id: 'task2', status: 'completed' }),
        createMockTask({ id: 'task3', title: { en: 'Current Task' }, status: 'active' }),
        createMockTask({ id: 'task4', title: { en: 'Task 4' }, status: 'pending' }),
        createMockTask({ id: 'task5', title: { en: 'Task 5' }, status: 'pending' }),
      ],
      evaluations: [
        createMockEvaluation({ id: 'eval1', taskId: 'task1' }),
        createMockEvaluation({ id: 'eval2', taskId: 'task2' }),
      ],
      currentTask: createMockTask({
        id: 'task3',
        title: { en: 'Current Task' },
        status: 'active',
      }),
      completionRate: 65,
    };

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockGetProgramStatus.mockResolvedValue(mockStatus);

    const request = new NextRequest('http://localhost:3000/api/learning/programs/prog123/status');
    const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: mockStatus,
    });
    expect(mockGetProgramStatus).toHaveBeenCalledWith('prog123');
  });

  it('returns 404 when program not found', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockGetProgramStatus.mockRejectedValue(new Error('Program not found'));

    const request = new NextRequest('http://localhost:3000/api/learning/programs/nonexistent/status');
    const response = await GET(request, { params: Promise.resolve({ programId: 'nonexistent' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: 'Program not found',
    });
  });

  it('returns 500 for other errors', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockGetProgramStatus.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/learning/programs/prog123/status');
    const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Internal server error',
    });
  });

  it('handles empty program status', async () => {
    const emptyStatus = {
      program: createMockProgram({
        id: 'prog123',
        status: 'pending',
        currentTaskIndex: 0,
        totalTaskCount: 0,
      }),
      scenario: createMockScenario(),
      tasks: [],
      evaluations: [],
      currentTask: undefined,
      completionRate: 0,
    };

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockGetProgramStatus.mockResolvedValue(emptyStatus);

    const request = new NextRequest('http://localhost:3000/api/learning/programs/prog123/status');
    const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(emptyStatus);
  });

  it('handles completed program status', async () => {
    const completedStatus = {
      program: createMockProgram({
        id: 'prog123',
        status: 'completed',
        currentTaskIndex: 5,
        totalTaskCount: 5,
        completedAt: '2024-01-05',
      }),
      scenario: createMockScenario(),
      tasks: [
        createMockTask({ id: 'task1', title: { en: 'Task 1' }, status: 'completed' }),
        createMockTask({ id: 'task2', title: { en: 'Task 2' }, status: 'completed' }),
        createMockTask({ id: 'task3', title: { en: 'Task 3' }, status: 'completed' }),
        createMockTask({ id: 'task4', title: { en: 'Task 4' }, status: 'completed' }),
        createMockTask({ id: 'task5', title: { en: 'Task 5' }, status: 'completed' }),
      ],
      evaluations: [
        createMockEvaluation({ taskId: 'task1' }),
        createMockEvaluation({ taskId: 'task2' }),
        createMockEvaluation({ taskId: 'task3' }),
        createMockEvaluation({ taskId: 'task4' }),
        createMockEvaluation({ taskId: 'task5' }),
      ],
      currentTask: undefined,
      completionRate: 100,
    };

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockGetProgramStatus.mockResolvedValue(completedStatus);

    const request = new NextRequest('http://localhost:3000/api/learning/programs/prog123/status');
    const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.program.status).toBe('completed');
    expect(data.data.completionRate).toBe(100);
  });
});
