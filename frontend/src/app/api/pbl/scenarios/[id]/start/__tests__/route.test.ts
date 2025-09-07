
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
  })),
  scaleLinear: jest.fn(() => {
    const scale = (value: unknown) => value;
    scale.domain = jest.fn().mockReturnThis();
    scale.range = jest.fn().mockReturnThis();
    return scale;
  }),
  scaleOrdinal: jest.fn(() => {
    const scale = (value: unknown) => value;
    scale.domain = jest.fn().mockReturnThis();
    scale.range = jest.fn().mockReturnThis();
    return scale;
  }),
  arc: jest.fn(() => {
    const arcFn = jest.fn();
    Object.assign(arcFn, {
      innerRadius: jest.fn().mockReturnThis(),
      outerRadius: jest.fn().mockReturnThis()
    });
    return arcFn;
  }),
  pie: jest.fn(() => {
    const pieFn = jest.fn((data: unknown[]) => data.map((d: unknown, i: number) => ({ data: d, index: i })));
    Object.assign(pieFn, {
      value: jest.fn().mockReturnThis()
    });
    return pieFn;
  }),
}));

import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Tests for PBL start route with service layer integration
 * Following TDD approach - write tests first
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { learningServiceFactory } from '@/lib/services/learning-service-factory';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';

// Mock the dependencies
jest.mock('@/lib/services/learning-service-factory');
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() => ({
    status: 401,
    json: jest.fn().mockResolvedValue({ error: 'Authentication required', success: false }),
    text: jest.fn().mockResolvedValue('{"error":"Authentication required","success":false}')
  }))
}));

describe('POST /api/pbl/scenarios/[id]/start', () => {
  const mockScenarioId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = 'user-123';
  const mockProgramId = 'prog-123';
  
  // Helper function to create request with cookie
  const createRequestWithUser = (email: string, body: Record<string, unknown> = { language: 'en' }) => {
    const request = new NextRequest('http://localhost/api/pbl/scenarios/123/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    // Mock the cookie getter
    Object.defineProperty(request, 'cookies', {
      value: {
        get: jest.fn().mockReturnValue({ value: JSON.stringify({ email }) })
      }
    });
    
    return request;
  };
  
  const mockScenario = {
    id: mockScenarioId,
    mode: 'pbl',
    status: 'active', // Required by TDD validator
    title: { en: 'Test PBL Scenario' },
    description: { en: 'Test description' },
    taskTemplates: [
      {
        id: 'task-1',
        title: { en: 'Task 1' },
        type: 'chat',
        description: { en: 'First task' }
      }
    ],
    pblData: {
      ksaMappings: []
    }
  };

  const mockProgram = {
    id: mockProgramId,
    scenarioId: mockScenarioId,
    userId: mockUserId,
    mode: 'pbl',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 1,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString()
  };

  const mockTasks = [
    {
      id: 'task-123',
      programId: mockProgramId,
      mode: 'pbl',
      taskIndex: 0,
      type: 'chat',
      status: 'active',
      title: { en: 'Task 1' },
      content: {
        instructions: 'First task instructions'
      }
    },
    {
      id: 'task-456',
      programId: mockProgramId,
      mode: 'pbl',
      taskIndex: 1,
      type: 'creation',
      status: 'pending',
      title: { en: 'Task 2' },
      content: {
        instructions: 'Second task instructions'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Using new service layer', () => {
    it('should use PBLLearningService to start learning and return tasks', async () => {
      // Arrange
      const mockPBLService = {
        startLearning: jest.fn().mockResolvedValue(mockProgram)
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({ id: mockUserId, email: 'test@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(mockScenario)
      };
      
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue(mockTasks)
      };

      // Mock authentication
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { id: mockUserId, email: 'test@example.com', role: 'student' }
      });

      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockPBLService);
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);

      const request = new NextRequest('http://localhost/api/pbl/scenarios/123/start', {
        method: 'POST',
        body: JSON.stringify({ language: 'en' })
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174000'}) });
      const data = await response.json();

      // Assert
      expect(learningServiceFactory.getService).toHaveBeenCalledWith('pbl');
      expect(mockPBLService.startLearning).toHaveBeenCalledWith(
        mockUserId,
        '123e4567-e89b-12d3-a456-426614174000',
        { language: 'en' }
      );
      expect(mockTaskRepo.findByProgram).toHaveBeenCalledWith(mockProgramId);
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.id).toBe(mockProgramId); // Frontend expects id at root level
      expect(data.program).toEqual(mockProgram);
      expect(data.tasks).toEqual(mockTasks);
      expect(data.taskIds).toEqual(['task-123', 'task-456']);
      expect(data.language).toBe('en');
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockPBLService = {
        startLearning: jest.fn().mockRejectedValue(new Error('Service error'))
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({ id: mockUserId, email: 'test@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(mockScenario)
      };

      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockPBLService);
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);

      const request = createRequestWithUser('test@example.com');

      // Act
      const response = await POST(request, { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174000'}) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Service error');
    });

    it('should validate scenario UUID format', async () => {
      // Arrange
      const request = createRequestWithUser('test@example.com');

      // Act
      const response = await POST(request, { params: Promise.resolve({'id':'invalid-uuid'}) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid scenario ID format');
    });

    it('should require user authentication', async () => {
      // Arrange
      // Mock getUnifiedAuth to return null for unauthenticated user
      (getUnifiedAuth as jest.Mock).mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost/api/pbl/scenarios/123/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No user cookie
        },
        body: JSON.stringify({ language: 'en' })
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174000'}) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('should create user if not exists', async () => {
      // Arrange
      const mockPBLService = {
        startLearning: jest.fn().mockResolvedValue(mockProgram)
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: mockUserId, email: 'new@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(mockScenario)
      };
      
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue(mockTasks)
      };

      // Mock authentication to return new@example.com
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { id: 'new-user-id', email: 'new@example.com', role: 'student' }
      });

      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockPBLService);
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);

      const request = createRequestWithUser('new@example.com');

      // Act
      const response = await POST(request, { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174000'}) });
      const data = await response.json();

      // Assert
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'new',
        preferredLanguage: 'en'
      });
      expect(data.success).toBe(true);
    });

    it('should return tasks and taskIds for frontend navigation', async () => {
      // Arrange
      const mockPBLService = {
        startLearning: jest.fn().mockResolvedValue(mockProgram)
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({ id: mockUserId, email: 'test@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(mockScenario)
      };
      
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue(mockTasks)
      };

      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockPBLService);
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);

      const request = createRequestWithUser('test@example.com', { language: 'zh' });

      // Act
      const response = await POST(request, { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174000'}) });
      const data = await response.json();

      // Assert
      expect(data.id).toBe(mockProgramId); // ID at root level for frontend
      expect(data.tasks).toHaveLength(2);
      expect(data.taskIds).toEqual(['task-123', 'task-456']);
      expect(data.language).toBe('zh');
    });

    it('should handle string format task titles in templates', async () => {
      // Arrange
      const scenarioWithStringTitles = {
        ...mockScenario,
        status: 'active', // Required by TDD validator
        taskTemplates: [
          {
            id: 'task-1',
            title: 'Resume Analysis', // String format instead of multilingual
            type: 'analysis',
            description: 'Analyze your resume with AI'
          },
          {
            id: 'task-2',
            title: 'Interview Preparation', // String format
            type: 'chat',
            description: 'Prepare for your interview'
          }
        ]
      };

      const mockPBLService = {
        startLearning: jest.fn().mockResolvedValue(mockProgram)
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({ id: mockUserId, email: 'test@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(scenarioWithStringTitles)
      };
      
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue([
          {
            id: 'task-789',
            programId: mockProgramId,
            title: { en: 'Resume Analysis' }, // Converted to multilingual
            type: 'analysis'
          },
          {
            id: 'task-890',
            programId: mockProgramId,
            title: { en: 'Interview Preparation' }, // Converted to multilingual
            type: 'chat'
          }
        ])
      };

      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockPBLService);
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);

      const request = createRequestWithUser('test@example.com');

      // Act
      const response = await POST(request, { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174000'}) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tasks[0].title).toEqual({ en: 'Resume Analysis' });
      expect(data.tasks[1].title).toEqual({ en: 'Interview Preparation' });
    });

    it('should verify scenario is PBL type', async () => {
      // Arrange
      const nonPBLScenario = {
        ...mockScenario,
        mode: 'discovery' // Not a PBL scenario
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({ id: mockUserId, email: 'test@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(nonPBLScenario)
      };

      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);

      const request = createRequestWithUser('test@example.com');

      // Act
      const response = await POST(request, { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174000'}) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not a PBL scenario');
    });

    it('should handle scenario not found', async () => {
      // Arrange
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({ id: mockUserId, email: 'test@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(null)
      };

      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);

      const request = createRequestWithUser('test@example.com');

      // Act
      const response = await POST(request, { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174000'}) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Scenario not found');
    });
  });
});