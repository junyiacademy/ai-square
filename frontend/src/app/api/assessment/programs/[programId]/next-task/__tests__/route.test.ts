import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Assessment Next Task Route Tests
 * 提升覆蓋率從 0% 到 80%+
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';
import type { IProgram, ITask } from '@/types/unified-learning';
import type { User } from '@/lib/repositories/interfaces';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');

// Mock console methods
const mockConsoleError = createMockConsoleError();
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation()
};

describe('POST /api/assessment/programs/[programId]/next-task', () => {
  const mockProgramRepo = {
    findById: jest.fn(),
    update: jest.fn()
  };
  const mockTaskRepo = {
    findByProgram: jest.fn(),
    updateStatus: jest.fn(),
    update: jest.fn(),
    findById: jest.fn()
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
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 3,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    timeSpentSeconds: 0,
    lastActivityAt: '2024-01-01T00:00:00Z',
    startedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  const mockTasks: ITask[] = [
    {
      id: 'task-1',
      programId: 'program-123',
      mode: 'assessment',
      taskIndex: 0,
      scenarioTaskIndex: 0,
      type: 'question',
      status: 'active',
      title: { en: 'Task 1' },
      description: { en: 'Task 1 Description' },
      content: {
        instructions: 'Do this task',
        questions: [
          { id: 'q1', text: 'Question 1' },
          { id: 'q2', text: 'Question 2' }
        ]
      },
      interactions: [],
      interactionCount: 0,
      userResponse: {},
      score: 0,
      maxScore: 100,
      allowedAttempts: 3,
      attemptCount: 0,
      timeSpentSeconds: 0,
      aiConfig: {},
      startedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    },
    {
      id: 'task-2',
      programId: 'program-123',
      mode: 'assessment',
      taskIndex: 1,
      scenarioTaskIndex: 1,
      type: 'question',
      status: 'pending',
      title: { en: 'Task 2' },
      description: { en: 'Task 2 Description' },
      content: {
        instructions: 'Do this second task',
        questions: [
          { id: 'q3', text: 'Question 3' }
        ]
      },
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
    },
    {
      id: 'task-3',
      programId: 'program-123',
      mode: 'assessment',
      taskIndex: 2,
      scenarioTaskIndex: 2,
      type: 'question',
      status: 'pending',
      title: { en: 'Task 3' },
      description: { en: 'Task 3 Description' },
      content: {
        instructions: 'Do this third task'
      },
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
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' }
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    consoleSpy.log.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    consoleSpy.log.mockRestore();
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({ currentTaskId: 'task-1' })
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should require user email in session', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({ user: {} }); // No email

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({ currentTaskId: 'task-1' })
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Program Validation', () => {
    it('should return 404 when program not found', async () => {
      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/programs/invalid-id/next-task', {
        method: 'POST',
        body: JSON.stringify({ currentTaskId: 'task-1' })
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Program not found');
    });

    it('should return 403 when user does not own program', async () => {
      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        userId: 'other-user-id'
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({ currentTaskId: 'task-1' })
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should return 403 when user not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({ currentTaskId: 'task-1' })
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });
  });

  describe('Task Progression', () => {
    beforeEach(() => {
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
    });

    it('should complete current task and move to next', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({ currentTaskId: 'task-1' })
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith('task-1', 'completed');
      expect(mockProgramRepo.update).toHaveBeenCalledWith('program-123', {
        currentTaskIndex: 1
      });
      expect(data.complete).toBe(false);
      expect(data.nextTask.id).toBe('task-2');
      expect(data.currentTaskIndex).toBe(1);
      expect(data.totalTasks).toBe(3);
    });

    it('should move to next task without completing current', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({}) // No currentTaskId
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockTaskRepo.updateStatus).not.toHaveBeenCalled();
      expect(data.nextTask.id).toBe('task-2');
    });

    it('should activate pending next task', async () => {
      mockTaskRepo.findById.mockResolvedValue({
        ...mockTasks[1],
        status: 'active',
        metadata: { startedAt: '2024-01-01T01:00:00Z' }
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({ currentTaskId: 'task-1' })
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockTaskRepo.update).toHaveBeenCalledWith('task-2', {
        status: 'active',
        metadata: expect.objectContaining({
          startedAt: expect.any(String)
        })
      });
      expect(data.nextTask.status).toBe('active');
    });

    it('should not update already active task', async () => {
      mockTaskRepo.findByProgram.mockResolvedValue([
        mockTasks[0],
        { ...mockTasks[1], status: 'active', startedAt: '2024-01-01T00:30:00Z' },
        mockTasks[2]
      ]);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({ currentTaskId: 'task-1' })
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockTaskRepo.update).not.toHaveBeenCalled(); // Task already active
      expect(data.nextTask.status).toBe('active');
    });

    it('should mark assessment complete when no more tasks', async () => {
      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        currentTaskIndex: 2 // Last task
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({ currentTaskId: 'task-3' })
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.complete).toBe(true);
      expect(data.nextTask).toBeNull();
    });

    it('should handle program without currentTaskIndex', async () => {
      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        currentTaskIndex: undefined
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.currentTaskIndex).toBe(1); // Defaults to 0, then increments to 1
      expect(data.nextTask.id).toBe('task-2');
    });

    it('should log task progression details', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({ currentTaskId: 'task-1' })
      });
      
      await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

      expect(consoleSpy.log).toHaveBeenCalledWith('Tasks loaded:', 3);
      expect(consoleSpy.log).toHaveBeenCalledWith('Moving from task', 0, 'to', 1);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Next task details:',
        expect.objectContaining({
          id: 'task-2',
          title: { en: 'Task 2' },
          hasContent: true,
          questionsInContext: 1,
          contentKeys: ['instructions', 'questions']
        })
      );
    });

    it('should handle tasks without content', async () => {
      const taskWithoutContent = {
        ...mockTasks[1],
        content: undefined
      };
      mockTaskRepo.findByProgram.mockResolvedValue([
        mockTasks[0],
        taskWithoutContent
      ]);
      // Need to return the same task when findById is called
      mockTaskRepo.findById.mockResolvedValue(taskWithoutContent);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.nextTask.id).toBe('task-2');
      // The task is returned from findById which still has content, so check the mock was called
      expect(mockTaskRepo.update).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
    });

    it('should handle repository errors gracefully', async () => {
      mockTaskRepo.findByProgram.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: JSON.stringify({ currentTaskId: 'task-1' })
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to move to next task');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error moving to next task:',
        expect.any(Error)
      );
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/next-task', {
        method: 'POST',
        body: 'invalid json'
      });
      
      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to move to next task');
    });
  });
});