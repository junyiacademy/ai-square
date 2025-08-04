/**
 * Discovery Tasks API Route Tests
 * 測試 Discovery 任務管理 API
 */

import { GET, POST } from '../route';
import { PATCH } from '../[taskId]/route';
import { createMockNextRequest } from '@/test-utils/mock-next-request';
import type { ITask } from '@/types/unified-learning';
import type { IDiscoveryTask } from '@/types/discovery-types';

// Mock auth session
const mockGetServerSession = jest.fn();
jest.mock('@/lib/auth/session', () => ({
  getServerSession: () => mockGetServerSession()
}));

// Mock repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getTaskRepository: jest.fn(),
    getProgramRepository: jest.fn(),
    getUserRepository: jest.fn()
  }
}));

// Get mocked factory after mocking
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('Discovery Tasks API', () => {
  let mockTaskRepo: any;
  let mockProgramRepo: any;
  let mockUserRepo: any;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User'
  };

  const mockProgram = {
    id: 'prog123',
    scenarioId: 'scenario123',
    userId: 'user123',
    mode: 'discovery',
    status: 'active',
    currentTaskIndex: 0,
    totalTaskCount: 3,
    discoveryData: {
      careerPath: 'software-developer',
      skillGapAnalysis: [
        { skill: 'JavaScript', currentLevel: 60, requiredLevel: 75 }
      ]
    }
  };

  const mockTasks: ITask[] = [
    {
      id: 'task1',
      programId: 'prog123',
      mode: 'discovery',
      taskIndex: 0,
      type: 'exploration',
      title: { en: 'Introduction to Software Development' },
      description: { en: 'Learn about the basics' },
      status: 'completed',
      content: { instructions: { en: 'Learn about the basics' } },
      interactions: [],
      interactionCount: 0,
      userResponse: {},
      score: 100,
      maxScore: 100,
      allowedAttempts: 1,
      attemptCount: 1,
      timeSpentSeconds: 300,
      aiConfig: {},
      completedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    },
    {
      id: 'task2',
      programId: 'prog123',
      mode: 'discovery',
      taskIndex: 1,
      type: 'exploration',
      title: { en: 'Build Your First App' },
      description: { en: 'Create a simple web application' },
      status: 'active',
      content: { instructions: { en: 'Create a simple web application' } },
      interactions: [],
      interactionCount: 0,
      userResponse: {},
      score: 0,
      maxScore: 100,
      allowedAttempts: 1,
      attemptCount: 0,
      timeSpentSeconds: 0,
      aiConfig: {},
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    },
    {
      id: 'task3',
      programId: 'prog123',
      mode: 'discovery',
      taskIndex: 2,
      type: 'exploration',
      title: { en: 'Career Reflection' },
      description: { en: 'Reflect on your learning journey' },
      status: 'pending',
      content: { instructions: { en: 'Reflect on your learning journey' } },
      interactions: [],
      interactionCount: 0,
      userResponse: {},
      score: 0,
      maxScore: 100,
      allowedAttempts: 1,
      attemptCount: 0,
      timeSpentSeconds: 0,
      aiConfig: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock repositories
    mockTaskRepo = {
      findByProgram: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    };

    mockProgramRepo = {
      findById: jest.fn(),
      update: jest.fn()
    };

    mockUserRepo = {
      findByEmail: jest.fn()
    };

    // Setup mocks
    mockRepositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo);
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);

    // Default auth
    mockGetServerSession.mockResolvedValue({ user: mockUser });
  });

  describe('GET /api/discovery/programs/[programId]/tasks', () => {
    it('should return all tasks for a program', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks');

      // Act
      const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.tasks).toHaveLength(3);
      expect(data.data.tasks[0].title).toBe('Introduction to Software Development');
    });

    it('should process language parameter', async () => {
      // Arrange
      const tasksWithMultilang = mockTasks.map(task => ({
        ...task,
        title: { en: task.title!.en, zh: `${task.title!.en} (中文)` },
        description: { en: task.description!.en, zh: `${task.description!.en} (中文)` }
      }));

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(tasksWithMultilang);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks?lang=zh');

      // Act
      const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.tasks[0].title.zh || data.data.tasks[0].title).toContain('(中文)');
      expect(data.data.tasks[0].description.zh || data.data.tasks[0].description).toContain('(中文)');
    });

    it('should include task progress information', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks');

      // Act
      const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.progress).toBeDefined();
      expect(data.data.progress.completed).toBe(1);
      expect(data.data.progress.total).toBe(3);
      expect(data.data.progress.current).toBe(1); // index of active task
    });

    it('should require authentication', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks');

      // Act
      const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should verify program ownership', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        userId: 'different-user'
      });

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks');

      // Act
      const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });
  });

  describe('POST /api/discovery/programs/[programId]/tasks', () => {
    it('should create a new task', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
      
      const newTask = {
        ...mockTasks[0],
        id: 'task4',
        order: 3,
        title: { en: 'Advanced Topics' }
      };
      mockTaskRepo.create.mockResolvedValue(newTask);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'exploration',
          title: { en: 'Advanced Topics' },
          instructions: { en: 'Explore advanced concepts' }
        })
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ programId: 'prog123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.task.title.en).toBe('Advanced Topics');
    });

    it('should update program task count', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
      mockTaskRepo.create.mockResolvedValue({ id: 'task4' });

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'practice',
          title: { en: 'New Task' },
          instructions: { en: 'Do something' }
        })
      });

      // Act
      await POST(request, { params: Promise.resolve({ programId: 'prog123' }) });

      // Assert
      expect(mockProgramRepo.update).toHaveBeenCalledWith('prog123', expect.objectContaining({
        lastActivityAt: expect.any(String),
        metadata: expect.objectContaining({
          lastTaskCreatedAt: expect.any(String)
        })
      }));
    });
  });

  describe('PATCH /api/discovery/programs/[programId]/tasks/[taskId]', () => {
    it('should update task status', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findById.mockResolvedValue(mockTasks[1]);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks); // Add this mock
      mockTaskRepo.update.mockResolvedValue({
        ...mockTasks[1],
        status: 'completed',
        completedAt: new Date().toISOString(),
        score: 95,
        feedback: { en: 'Excellent work!' }
      });

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks/task2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          score: 95,
          feedback: { en: 'Excellent work!' }
        })
      });

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ programId: 'prog123', taskId: 'task2' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.task.status).toBe('completed');
      expect(data.data.task.score).toBe(95);
    });

    it('should update program progress on task completion', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findById.mockResolvedValue(mockTasks[1]);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks); // Add this mock
      mockTaskRepo.update.mockResolvedValue({
        ...mockTasks[1],
        status: 'completed'
      });

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks/task2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });

      // Act
      await PATCH(request, { params: Promise.resolve({ programId: 'prog123', taskId: 'task2' }) });

      // Assert
      expect(mockProgramRepo.update).toHaveBeenCalledWith('prog123', expect.objectContaining({
        completedTaskCount: 2,
        currentTaskIndex: 2,
        lastActivityAt: expect.any(String)
      }));
    });

    it('should track time spent', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findById.mockResolvedValue(mockTasks[1]);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks/task2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeSpentSeconds: 600,
          interactions: [
            { type: 'chat', content: 'Asked about arrays', timestamp: new Date().toISOString() }
          ]
        })
      });

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ programId: 'prog123', taskId: 'task2' }) });

      // Assert
      expect(response.status).toBe(200);
      expect(mockTaskRepo.update).toHaveBeenCalledWith('task2', expect.objectContaining({
        timeSpentSeconds: 600,
        interactions: expect.arrayContaining([
          expect.objectContaining({ type: 'chat' })
        ])
      }));
    });

    it('should validate task belongs to program', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findById.mockResolvedValue({
        ...mockTasks[0],
        programId: 'different-program'
      });

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks/task1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ programId: 'prog123', taskId: 'task1' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe('Task does not belong to this program');
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockRejectedValue(new Error('Database error'));

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks');

      // Act
      const response = await GET(request, { params: Promise.resolve({ programId: 'prog123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle invalid task type', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs/prog123/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invalid-type',
          title: { en: 'Test' },
          instructions: { en: 'Test' }
        })
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ programId: 'prog123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid task type');
    });
  });
});