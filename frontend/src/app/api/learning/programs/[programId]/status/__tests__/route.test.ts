import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { postgresqlLearningService } from '@/lib/services/postgresql-learning-service';

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
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123' } as { id: string; email?: string } });

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
      program: {
        id: 'prog123',
        status: 'active',
        progress: 65,
        currentTaskIndex: 3,
        totalTasks: 5,
      },
      currentTask: {
        id: 'task3',
        title: 'Current Task',
        status: 'active',
      },
      completedTasks: [
        { id: 'task1', title: 'Task 1', completedAt: '2024-01-01' },
        { id: 'task2', title: 'Task 2', completedAt: '2024-01-02' },
      ],
      upcomingTasks: [
        { id: 'task4', title: 'Task 4' },
        { id: 'task5', title: 'Task 5' },
      ],
      achievements: [
        { type: 'first_task', earnedAt: '2024-01-01' },
      ],
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
      program: {
        id: 'prog123',
        status: 'pending',
        progress: 0,
        currentTaskIndex: 0,
        totalTasks: 0,
      },
      currentTask: null,
      completedTasks: [],
      upcomingTasks: [],
      achievements: [],
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
      program: {
        id: 'prog123',
        status: 'completed',
        progress: 100,
        currentTaskIndex: 5,
        totalTasks: 5,
        completedAt: '2024-01-05',
      },
      currentTask: null,
      completedTasks: [
        { id: 'task1', title: 'Task 1' },
        { id: 'task2', title: 'Task 2' },
        { id: 'task3', title: 'Task 3' },
        { id: 'task4', title: 'Task 4' },
        { id: 'task5', title: 'Task 5' },
      ],
      upcomingTasks: [],
      achievements: [
        { type: 'program_complete', earnedAt: '2024-01-05' },
        { type: 'perfect_score', earnedAt: '2024-01-05' },
      ],
    };

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockGetProgramStatus.mockResolvedValue(completedStatus);

    const request = new NextRequest('http://localhost:3000/api/learning/programs/prog123/status');
    const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.program.status).toBe('completed');
    expect(data.data.program.progress).toBe(100);
  });
});
