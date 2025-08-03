/**
 * PBL Task Evaluate API Tests
 * Tests for POST/GET /api/pbl/tasks/[taskId]/evaluate
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { ITask, IEvaluation } from '@/types/unified-learning';
import type { User } from '@/lib/repositories/interfaces';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');

// Mock dynamic import
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getUserRepository: jest.fn(),
    getTaskRepository: jest.fn(),
    getEvaluationRepository: jest.fn(),
    getProgramRepository: jest.fn()
  }
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation()
};

// Add setImmediate polyfill for Jest
if (typeof setImmediate === 'undefined') {
  // @ts-expect-error - polyfill for Jest environment
  global.setImmediate = (callback: (...args: unknown[]) => void, ...args: unknown[]) => {
    return setTimeout(callback, 0, ...args);
  };
}

describe('POST /api/pbl/tasks/[taskId]/evaluate', () => {
  let mockUserRepo: {
    findByEmail: jest.Mock;
  };
  let mockTaskRepo: {
    findById: jest.Mock;
    update: jest.Mock;
  };
  let mockEvaluationRepo: {
    create: jest.Mock;
    findById: jest.Mock;
    findByTask: jest.Mock;
  };
  let mockProgramRepo: {
    findById: jest.Mock;
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

  const mockTask: ITask = {
    id: 'task-123',
    programId: 'program-123',
    mode: 'pbl',
    taskIndex: 0,
    scenarioTaskIndex: 0,
    title: { en: 'Test Task' },
    description: { en: 'Test Description' },
    type: 'chat',
    status: 'active',
    content: { instructions: 'Test instructions' },
    interactions: [],
    interactionCount: 0,
    userResponse: {},
    score: 0,
    maxScore: 100,
    allowedAttempts: 3,
    attemptCount: 1,
    timeSpentSeconds: 300,
    aiConfig: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  const mockEvaluation: IEvaluation = {
    id: 'eval-123',
    userId: 'user-123',
    programId: 'program-123',
    taskId: 'task-123',
    mode: 'pbl',
    evaluationType: 'task',
    evaluationSubtype: 'pbl_task',
    score: 85,
    maxScore: 100,
    domainScores: { 'engaging_with_ai': 90, 'creating_with_ai': 80 },
    feedbackData: {
      strengths: ['Good understanding'],
      improvements: ['Need more practice'],
      nextSteps: ['Try advanced features']
    },
    aiAnalysis: { insights: 'Good performance' },
    timeTakenSeconds: 300,
    createdAt: '2024-01-01T00:00:00Z',
    pblData: {
      ksaScores: { K1: 85, S2: 90 },
      rubricsScores: { clarity: 85, accuracy: 90 },
      conversationCount: 5
    },
    discoveryData: {},
    assessmentData: {},
    metadata: {
      evaluatedAt: '2024-01-01T00:00:00Z'
    }
  };

  const mockContext = {
    params: Promise.resolve({ taskId: 'task-123' })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset timer
    jest.useFakeTimers();

    // Setup repository mocks
    mockUserRepo = {
      findByEmail: jest.fn().mockResolvedValue(mockUser)
    };

    mockTaskRepo = {
      findById: jest.fn().mockResolvedValue(mockTask),
      update: jest.fn().mockResolvedValue(mockTask)
    };

    mockEvaluationRepo = {
      create: jest.fn().mockResolvedValue(mockEvaluation),
      findById: jest.fn().mockResolvedValue(mockEvaluation),
      findByTask: jest.fn().mockResolvedValue([mockEvaluation])
    };

    mockProgramRepo = {
      findById: jest.fn().mockResolvedValue({
        id: 'program-123',
        metadata: { evaluationId: 'program-eval-123' }
      }),
      update: jest.fn()
    };

    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo as any);
    mockRepositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo as any);
    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(mockEvaluationRepo as any);
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo as any);

    // Default session
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' }
    } as any);
  });

  afterEach(() => {
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
    jest.useRealTimers();
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
        method: 'POST',
        body: JSON.stringify({ evaluation: {} })
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 if user not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
        method: 'POST',
        body: JSON.stringify({ evaluation: {} })
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  describe('Input validation', () => {
    it('should return 400 if evaluation data is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing evaluation data');
    });
  });

  describe('Creating new evaluation', () => {
    it('should create evaluation for task without existing evaluation', async () => {
      const evaluationData = {
        score: 85,
        domainScores: { 'engaging_with_ai': 90 },
        feedback: 'Great job!',
        strengths: ['Good understanding'],
        improvements: ['Practice more'],
        nextSteps: ['Advanced features'],
        conversationInsights: { quality: 'high' },
        timeTakenSeconds: 300
      };

      const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          evaluation: evaluationData,
          programId: 'program-123'
        })
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Evaluation created successfully');
      expect(data.data.evaluationId).toBe('eval-123');
      expect(data.data.isUpdate).toBe(false);

      // Verify evaluation creation
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        programId: 'program-123',
        taskId: 'task-123',
        mode: 'pbl',
        score: 85,
        domainScores: { 'engaging_with_ai': 90 },
        feedbackText: 'Great job!',
        feedbackData: {
          strengths: ['Good understanding'],
          improvements: ['Practice more'],
          nextSteps: ['Advanced features']
        }
      }));

      // Verify task update
      expect(mockTaskRepo.update).toHaveBeenCalledWith('task-123', expect.objectContaining({
        status: 'completed',
        metadata: expect.objectContaining({
          evaluationId: 'eval-123'
        })
      }));
    });

    it('should handle evaluation with minimal data', async () => {
      const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          evaluation: { score: 50 }
        })
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        score: 50,
        domainScores: {},
        feedbackData: {
          strengths: [],
          improvements: [],
          nextSteps: []
        }
      }));
    });
  });

  describe('Updating existing evaluation', () => {
    it('should create new evaluation record when task has existing evaluationId', async () => {
      mockTaskRepo.findById.mockResolvedValueOnce({
        ...mockTask,
        metadata: { evaluationId: 'old-eval-123' }
      });

      const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          evaluation: { score: 95 },
          programId: 'program-123'
        })
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Evaluation updated successfully');
      expect(data.data.isUpdate).toBe(true);

      // Should try to find existing evaluation
      expect(mockEvaluationRepo.findById).toHaveBeenCalledWith('old-eval-123');
      
      // Should create new evaluation (not update)
      expect(mockEvaluationRepo.create).toHaveBeenCalled();
      
      // Should NOT update task (it already has evaluationId)
      expect(mockTaskRepo.update).not.toHaveBeenCalled();
    });

    it('should handle case where evaluationId exists but evaluation not found', async () => {
      mockTaskRepo.findById.mockResolvedValueOnce({
        ...mockTask,
        metadata: { evaluationId: 'missing-eval-123' }
      });
      mockEvaluationRepo.findById.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          evaluation: { score: 75 },
          programId: 'program-123'
        })
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Evaluation updated successfully');
      
      // Should create new evaluation
      expect(mockEvaluationRepo.create).toHaveBeenCalled();
    });
  });

  describe('Program evaluation outdating', () => {
    it('should create evaluation successfully even with async program update', async () => {
      const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          evaluation: { score: 85 },
          programId: 'program-123'
        })
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.evaluationId).toBe('eval-123');
      
      // The async program update happens in the background
      // We can't easily test it due to dynamic import in setImmediate
    });

    it('should create evaluation successfully even if async program update fails', async () => {
      mockProgramRepo.update.mockRejectedValueOnce(new Error('Update failed'));

      const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          evaluation: { score: 85 },
          programId: 'program-123'
        })
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.evaluationId).toBe('eval-123');
      
      // The error in async update should not affect the main response
    });
  });

  describe('Response transformation', () => {
    it('should transform evaluation data to match frontend expectations', async () => {
      const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          evaluation: { score: 85 },
          programId: 'program-123'
        })
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(data.data.evaluation).toMatchObject({
        score: 85,
        ksaScores: { K1: 85, S2: 90 },
        domainScores: { 'engaging_with_ai': 90, 'creating_with_ai': 80 },
        rubricsScores: { clarity: 85, accuracy: 90 },
        strengths: ['Good understanding'],
        improvements: ['Need more practice'],
        nextSteps: ['Try advanced features'],
        conversationInsights: { insights: 'Good performance' },
        conversationCount: 5,
        evaluatedAt: '2024-01-01T00:00:00Z'
      });
    });
  });

  describe('Error handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockEvaluationRepo.create.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          evaluation: { score: 85 }
        })
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to create evaluation');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error creating evaluation:',
        expect.any(Error)
      );
    });
  });
});

describe('GET /api/pbl/tasks/[taskId]/evaluate', () => {
  let mockTaskRepo: {
    findById: jest.Mock;
  };
  let mockEvaluationRepo: {
    findById: jest.Mock;
    findByTask: jest.Mock;
  };

  const mockTask: ITask = {
    id: 'task-123',
    programId: 'program-123',
    mode: 'pbl',
    taskIndex: 0,
    scenarioTaskIndex: 0,
    title: { en: 'Test Task' },
    description: { en: 'Test Description' },
    type: 'chat',
    status: 'completed',
    content: { instructions: 'Test instructions' },
    interactions: [],
    interactionCount: 0,
    userResponse: {},
    score: 85,
    maxScore: 100,
    allowedAttempts: 3,
    attemptCount: 1,
    timeSpentSeconds: 300,
    aiConfig: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: { evaluationId: 'eval-123' }
  };

  const mockEvaluation: IEvaluation = {
    id: 'eval-123',
    userId: 'user-123',
    programId: 'program-123',
    taskId: 'task-123',
    mode: 'pbl',
    evaluationType: 'task',
    evaluationSubtype: 'pbl_task',
    score: 85,
    maxScore: 100,
    domainScores: { 'engaging_with_ai': 90 },
    feedbackData: {
      strengths: ['Good work'],
      improvements: ['Practice more'],
      nextSteps: ['Next level']
    },
    aiAnalysis: { quality: 'high' },
    timeTakenSeconds: 300,
    createdAt: '2024-01-01T00:00:00Z',
    pblData: {
      ksaScores: { K1: 85 },
      rubricsScores: { clarity: 90 },
      conversationCount: 5
    },
    discoveryData: {},
    assessmentData: {},
    metadata: {
      evaluatedAt: '2024-01-01T00:00:00Z'
    }
  };

  const mockContext = {
    params: Promise.resolve({ taskId: 'task-123' })
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repository mocks
    mockTaskRepo = {
      findById: jest.fn().mockResolvedValue(mockTask)
    };

    mockEvaluationRepo = {
      findById: jest.fn().mockResolvedValue(mockEvaluation),
      findByTask: jest.fn().mockResolvedValue([mockEvaluation])
    };

    mockRepositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo as any);
    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(mockEvaluationRepo as any);

    // Default session
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' }
    } as any);
  });

  it('should require authentication', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
      method: 'GET'
    });

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Authentication required');
  });

  it('should get evaluation by evaluationId from task metadata', async () => {
    const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
      method: 'GET'
    });

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.hasEvaluation).toBe(true);
    expect(data.data.evaluation).toMatchObject({
      id: 'eval-123',
      score: 85,
      ksaScores: { K1: 85 },
      domainScores: { 'engaging_with_ai': 90 },
      strengths: ['Good work'],
      improvements: ['Practice more'],
      nextSteps: ['Next level']
    });

    // Should use direct lookup
    expect(mockEvaluationRepo.findById).toHaveBeenCalledWith('eval-123');
    expect(mockEvaluationRepo.findByTask).not.toHaveBeenCalled();
  });

  it('should fallback to findByTask if no evaluationId in metadata', async () => {
    mockTaskRepo.findById.mockResolvedValueOnce({
      ...mockTask,
      metadata: {}
    });

    const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
      method: 'GET'
    });

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.hasEvaluation).toBe(true);

    // Should use findByTask fallback
    expect(mockEvaluationRepo.findById).not.toHaveBeenCalled();
    expect(mockEvaluationRepo.findByTask).toHaveBeenCalledWith('task-123');
  });

  it('should handle no evaluation found', async () => {
    mockTaskRepo.findById.mockResolvedValueOnce({
      ...mockTask,
      metadata: {}
    });
    mockEvaluationRepo.findByTask.mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
      method: 'GET'
    });

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.hasEvaluation).toBe(false);
    expect(data.data.evaluation).toBe(null);
  });

  it('should handle repository errors gracefully', async () => {
    mockTaskRepo.findById.mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/pbl/tasks/task-123/evaluate', {
      method: 'GET'
    });

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to fetch evaluation');
    expect(consoleSpy.error).toHaveBeenCalledWith(
      'Error fetching evaluation:',
      expect.any(Error)
    );
  });
});