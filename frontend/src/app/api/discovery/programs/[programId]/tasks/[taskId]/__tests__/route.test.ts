/**
 * Discovery Task Detail API Tests
 * Tests for PATCH /api/discovery/programs/[programId]/tasks/[taskId]
 */

import { NextRequest } from 'next/server';
import { PATCH } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { IProgram, ITask } from '@/types/unified-learning';
import type { User } from '@/lib/repositories/interfaces';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

// Mock console.error to reduce noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

describe('PATCH /api/discovery/programs/[programId]/tasks/[taskId]', () => {
  let mockUserRepo: {
    findByEmail: jest.Mock;
  };
  let mockProgramRepo: {
    findById: jest.Mock;
    update: jest.Mock;
  };
  let mockTaskRepo: {
    findById: jest.Mock;
    findByProgram: jest.Mock;
    update: jest.Mock;
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    preferredLanguage: 'en',
    level: 1,
    totalXp: 0,
    learningPreferences: {},
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date()
  };

  const mockProgram: IProgram = {
    id: 'program-123',
    userId: 'user-123',
    scenarioId: 'scenario-123',
    mode: 'discovery',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 3,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: '2024-01-01T00:00:00Z',
    startedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastActivityAt: '2024-01-01T00:00:00Z',
    timeSpentSeconds: 0,
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  const mockTask: ITask = {
    id: 'task-123',
    programId: 'program-123',
    mode: 'discovery',
    taskIndex: 0,
    scenarioTaskIndex: 0,
    title: { en: 'Task 1' },
    description: { en: 'First task' },
    type: 'question',
    status: 'pending',
    content: { instructions: 'Complete this' },
    interactions: [],
    interactionCount: 0,
    userResponse: {},
    score: 0,
    maxScore: 100,
    allowedAttempts: 3,
    attemptCount: 0,
    timeSpentSeconds: 0,
    aiConfig: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  const mockContext = {
    params: Promise.resolve({ programId: 'program-123', taskId: 'task-123' })
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repository mocks
    mockUserRepo = {
      findByEmail: jest.fn().mockResolvedValue(mockUser)
    };

    mockProgramRepo = {
      findById: jest.fn().mockResolvedValue(mockProgram),
      update: jest.fn().mockResolvedValue(mockProgram)
    };

    mockTaskRepo = {
      findById: jest.fn().mockResolvedValue(mockTask),
      findByProgram: jest.fn().mockResolvedValue([
        mockTask,
        { ...mockTask, id: 'task-2', taskIndex: 1, status: 'pending' },
        { ...mockTask, id: 'task-3', taskIndex: 2, status: 'pending' }
      ]),
      update: jest.fn().mockResolvedValue(mockTask)
    };

    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo as any);
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo as any);
    mockRepositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo as any);

    // Default session
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' }
    } as any);
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  it('should require authentication', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Authentication required');
  });

  it('should return 404 if user not found', async () => {
    mockUserRepo.findByEmail.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('User not found');
  });

  it('should return 404 if program not found', async () => {
    mockProgramRepo.findById.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Program not found');
  });

  it('should return 403 if user does not own program', async () => {
    mockProgramRepo.findById.mockResolvedValueOnce({
      ...mockProgram,
      userId: 'other-user'
    });

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Access denied');
  });

  it('should return 404 if task not found', async () => {
    mockTaskRepo.findById.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Task not found');
  });

  it('should return 403 if task does not belong to program', async () => {
    mockTaskRepo.findById.mockResolvedValueOnce({
      ...mockTask,
      programId: 'other-program'
    });

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Task does not belong to this program');
  });

  it('should update task status from pending to active', async () => {
    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTaskRepo.update).toHaveBeenCalledWith('task-123', expect.objectContaining({
      status: 'active',
      startedAt: expect.any(String),
      updatedAt: expect.any(String)
    }));
  });

  it('should update task status from active to completed', async () => {
    mockTaskRepo.findById.mockResolvedValueOnce({
      ...mockTask,
      status: 'active'
    });

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTaskRepo.update).toHaveBeenCalledWith('task-123', expect.objectContaining({
      status: 'completed',
      completedAt: expect.any(String),
      updatedAt: expect.any(String)
    }));

    // Should update program progress
    expect(mockProgramRepo.update).toHaveBeenCalledWith('program-123', expect.objectContaining({
      completedTaskCount: 1,
      currentTaskIndex: 1,
      lastActivityAt: expect.any(String)
    }));
  });

  it('should update task score', async () => {
    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ score: 85 })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTaskRepo.update).toHaveBeenCalledWith('task-123', expect.objectContaining({
      score: 85,
      updatedAt: expect.any(String)
    }));
  });

  it('should update task feedback', async () => {
    const feedback = { text: 'Great job!', rating: 5 };
    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ feedback })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTaskRepo.update).toHaveBeenCalledWith('task-123', expect.objectContaining({
      feedback,
      updatedAt: expect.any(String)
    }));
  });

  it('should update task time spent', async () => {
    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ timeSpentSeconds: 300 })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTaskRepo.update).toHaveBeenCalledWith('task-123', expect.objectContaining({
      timeSpentSeconds: 300,
      updatedAt: expect.any(String)
    }));
  });

  it('should update task interactions', async () => {
    const interactions = [
      { type: 'user_input', content: 'My answer', timestamp: '2024-01-01T00:00:00Z' }
    ];
    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ interactions })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTaskRepo.update).toHaveBeenCalledWith('task-123', expect.objectContaining({
      interactions,
      updatedAt: expect.any(String)
    }));
  });

  it('should merge metadata when updating', async () => {
    mockTaskRepo.findById.mockResolvedValueOnce({
      ...mockTask,
      metadata: { existing: 'value' }
    });

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ metadata: { new: 'data' } })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTaskRepo.update).toHaveBeenCalledWith('task-123', expect.objectContaining({
      metadata: { existing: 'value', new: 'data' },
      updatedAt: expect.any(String)
    }));
  });

  it('should update multiple fields at once', async () => {
    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'completed',
        score: 95,
        feedback: { text: 'Excellent!' },
        timeSpentSeconds: 600
      })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTaskRepo.update).toHaveBeenCalledWith('task-123', expect.objectContaining({
      status: 'completed',
      completedAt: expect.any(String),
      score: 95,
      feedback: { text: 'Excellent!' },
      timeSpentSeconds: 600,
      updatedAt: expect.any(String)
    }));
  });

  it('should handle when all tasks are completed', async () => {
    mockTaskRepo.findByProgram.mockResolvedValueOnce([
      { ...mockTask, id: 'task-1', status: 'completed' },
      { ...mockTask, id: 'task-2', status: 'completed' },
      { ...mockTask, id: 'task-123', status: 'active' }
    ]);

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockProgramRepo.update).toHaveBeenCalledWith('program-123', expect.objectContaining({
      completedTaskCount: 3,
      currentTaskIndex: 3, // No more pending tasks
      lastActivityAt: expect.any(String)
    }));
  });

  it('should handle repository update method not available', async () => {
    // @ts-expect-error - testing when update method is not available
    mockTaskRepo.update = undefined;

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    mockTaskRepo.update.mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Internal server error');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error in PATCH /api/discovery/programs/[programId]/tasks/[taskId]:'),
      expect.any(Error)
    );
  });

  it('should include metadata in response', async () => {
    const request = new NextRequest('http://localhost:3000/api/discovery/programs/program-123/tasks/task-123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meta).toBeDefined();
    expect(data.meta.timestamp).toBeDefined();
  });
});