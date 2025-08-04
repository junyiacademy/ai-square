/**
 * Assessment Program Route Tests
 * 提升覆蓋率從 0% 到 80%+
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';
import type { IProgram, ITask } from '@/types/unified-learning';
import type { User } from '@/lib/repositories/interfaces';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');

// Mock console
const mockConsoleError = createMockConsoleError();

describe('GET /api/assessment/programs/[programId]', () => {
  const mockProgramRepo = {
    findById: jest.fn()
  };
  const mockTaskRepo = {
    findByProgram: jest.fn()
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
    totalTaskCount: 2,
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
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Authentication', () => {
    it('should accept authenticated session', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.program).toBeDefined();
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should accept userEmail query parameter when no session', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123?userEmail=test@example.com');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.program).toBeDefined();
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return 401 when no authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Program Access', () => {
    beforeEach(() => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    });

    it('should return program when user owns it', async () => {
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.program.id).toBe('program-123');
      expect(data.currentTask.id).toBe('task-1');
      expect(data.totalTasks).toBe(2);
    });

    it('should return 404 when program not found', async () => {
      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/programs/invalid-id');
      const response = await GET(request, { params: Promise.resolve({ programId: 'invalid-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Program not found');
    });

    it('should return 403 when user does not own program', async () => {
      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        userId: 'other-user-id'
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Access denied:',
        expect.objectContaining({
          programUserId: 'other-user-id',
          currentUserId: 'user-123'
        })
      );
    });
  });

  describe('Task Handling', () => {
    beforeEach(() => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
    });

    it('should return 404 when no tasks found', async () => {
      mockTaskRepo.findByProgram.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No tasks found');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'No tasks found for program',
        'program-123',
        expect.any(Object)
      );
    });

    it('should handle null tasks', async () => {
      mockTaskRepo.findByProgram.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No tasks found');
    });

    it('should return single task for backward compatibility', async () => {
      mockTaskRepo.findByProgram.mockResolvedValue([mockTasks[0]]);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.program).toBeDefined();
      expect(data.currentTask).toBeDefined();
      expect(data.totalTasks).toBe(1);
      expect(data.tasks).toBeUndefined(); // Single task doesn't return task list
    });

    it('should return all tasks when includeAllTasks is true', async () => {
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123?includeAllTasks=true');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allTasks).toHaveLength(2);
      expect(data.allTasks[0]).toMatchObject(mockTasks[0]);
      expect(data.tasks).toHaveLength(2);
      expect(data.tasks[0]).toMatchObject({
        id: 'task-1',
        title: { en: 'Task 1' },
        status: 'active',
        questionsCount: 2
      });
    });

    it('should return task summary for multiple tasks', async () => {
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.currentTask.id).toBe('task-1');
      expect(data.currentTaskIndex).toBe(0);
      expect(data.tasks).toHaveLength(2);
      expect(data.tasks[0]).toMatchObject({
        id: 'task-1',
        title: { en: 'Task 1' },
        status: 'active',
        questionsCount: 2
      });
      expect(data.allTasks).toBeUndefined(); // Not included without flag
    });

    it('should handle currentTaskIndex correctly', async () => {
      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        currentTaskIndex: 1
      });
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.currentTask.id).toBe('task-2');
      expect(data.currentTaskIndex).toBe(1);
    });

    it('should fallback to first task when currentTaskIndex out of bounds', async () => {
      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        currentTaskIndex: 5 // Out of bounds
      });
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.currentTask.id).toBe('task-1'); // Falls back to first task
    });

    it('should handle tasks without questions', async () => {
      const tasksWithoutQuestions = [
        {
          ...mockTasks[0],
          content: { instructions: 'No questions here' }
        }
      ];
      mockTaskRepo.findByProgram.mockResolvedValue(tasksWithoutQuestions);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalTasks).toBe(1);
    });

    it('should process tasks correctly', async () => {
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(
        expect.objectContaining({
          program: expect.objectContaining({
            id: 'program-123'
          }),
          currentTask: expect.objectContaining({
            id: 'task-1'
          }),
          tasks: expect.arrayContaining([
            expect.objectContaining({
              id: 'task-1',
              questionsCount: 2
            })
          ])
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    });

    it('should handle repository errors gracefully', async () => {
      mockProgramRepo.findById.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to load program');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error getting program:',
        expect.any(Error)
      );
    });

    it('should handle user lookup failure gracefully', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null); // User not found
      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        userId: 'some-other-user' // Different user ID
      });
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });
  });
});