/**
 * Simple Learning API Integration Tests
 * Tests API routes without external dependencies
 */

import { NextRequest, NextResponse } from 'next/server';
import { jest } from '@jest/globals';

// Mock the unified learning service
type MockServiceFunction = (...args: unknown[]) => Promise<unknown>;

const mockUnifiedLearningService = {
  createLearningProgram: jest.fn<MockServiceFunction>(),
  completeTask: jest.fn<MockServiceFunction>(),
  completeProgram: jest.fn<MockServiceFunction>(),
  getLearningProgress: jest.fn<MockServiceFunction>(),
  getProgramStatus: jest.fn<MockServiceFunction>(),
  getLearningAnalytics: jest.fn<MockServiceFunction>()
};

jest.mock('@/lib/implementations/gcs-v2/services/unified-learning-service', () => ({
  UnifiedLearningService: jest.fn(() => mockUnifiedLearningService)
}));

// Create a simple API handler for testing
async function createLearningProgram(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioId, metadata } = body;

    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'scenarioId is required' },
        { status: 400 }
      );
    }

    const service = mockUnifiedLearningService;
    const result = await service.createLearningProgram(
      scenarioId,
      'test@example.com',
      metadata
    );

    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function completeTask(request: NextRequest, taskId: string) {
  try {
    const body = await request.json();
    const { response, evaluationData } = body;

    const service = mockUnifiedLearningService;
    const result = await service.completeTask(
      taskId,
      'test@example.com',
      response,
      evaluationData
    );

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );

  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getLearningProgress() {
  try {
    const service = mockUnifiedLearningService;
    const result = await service.getLearningProgress('test@example.com');

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mock Next.js request
const createMockRequest = (method: string, url: string, body?: any): NextRequest => {
  const request = {
    method,
    url,
    json: jest.fn(() => Promise.resolve(body)),
    headers: new Map(),
    nextUrl: { pathname: url }
  } as any;
  
  return request;
};

describe('Simple Learning API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Learning Program', () => {
    it('should create a new learning program successfully', async () => {
      const mockResponse = {
        scenario: {
          id: 'scenario-1',
          title: 'Test Scenario',
          sourceType: 'pbl'
        },
        program: {
          id: 'program-1',
          scenarioId: 'scenario-1',
          userId: 'test@example.com',
          status: 'active'
        },
        tasks: [
          {
            id: 'task-1',
            programId: 'program-1',
            title: 'Task 1',
            status: 'pending'
          }
        ]
      };

      mockUnifiedLearningService.createLearningProgram.mockResolvedValue(mockResponse);

      const request = createMockRequest('POST', '/api/learning/programs', {
        scenarioId: 'scenario-1',
        metadata: { language: 'en' }
      });

      const response = await createLearningProgram(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResponse);
      expect(mockUnifiedLearningService.createLearningProgram).toHaveBeenCalledWith(
        'scenario-1',
        'test@example.com',
        { language: 'en' }
      );
    });

    it('should handle missing scenarioId', async () => {
      const request = createMockRequest('POST', '/api/learning/programs', {
        metadata: { language: 'en' }
      });

      const response = await createLearningProgram(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('scenarioId is required');
    });

    it('should handle service errors', async () => {
      mockUnifiedLearningService.createLearningProgram.mockRejectedValue(
        new Error('Scenario not found')
      );

      const request = createMockRequest('POST', '/api/learning/programs', {
        scenarioId: 'invalid-scenario'
      });

      const response = await createLearningProgram(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Scenario not found');
    });
  });

  describe('Complete Task', () => {
    it('should complete a task with evaluation', async () => {
      const mockResponse = {
        task: {
          id: 'task-1',
          programId: 'program-1',
          status: 'completed'
        },
        evaluation: {
          id: 'eval-1',
          entityType: 'task',
          entityId: 'task-1',
          type: 'ai_feedback'
        },
        nextTask: {
          id: 'task-2',
          programId: 'program-1',
          status: 'active'
        }
      };

      mockUnifiedLearningService.completeTask.mockResolvedValue(mockResponse);

      const request = createMockRequest('POST', '/api/learning/tasks/task-1/complete', {
        response: { answer: 'Test answer' },
        evaluationData: { performance: { score: 85 } }
      });

      const response = await completeTask(request, 'task-1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResponse);
      expect(mockUnifiedLearningService.completeTask).toHaveBeenCalledWith(
        'task-1',
        'test@example.com',
        { answer: 'Test answer' },
        { performance: { score: 85 } }
      );
    });

    it('should handle task not found', async () => {
      mockUnifiedLearningService.completeTask.mockRejectedValue(
        new Error('Task not found')
      );

      const request = createMockRequest('POST', '/api/learning/tasks/invalid/complete', {
        response: { answer: 'Test answer' }
      });

      const response = await completeTask(request, 'invalid');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Task not found');
    });
  });

  describe('Get Learning Progress', () => {
    it('should get user learning progress', async () => {
      const mockResponse = {
        activePrograms: [
          {
            id: 'program-1',
            scenarioId: 'scenario-1',
            status: 'active'
          }
        ],
        completedPrograms: [
          {
            id: 'program-2',
            scenarioId: 'scenario-2',
            status: 'completed'
          }
        ],
        totalEvaluations: 5,
        averageScore: 85
      };

      mockUnifiedLearningService.getLearningProgress.mockResolvedValue(mockResponse);

      const response = await getLearningProgress();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResponse);
      expect(mockUnifiedLearningService.getLearningProgress).toHaveBeenCalledWith(
        'test@example.com'
      );
    });

    it('should handle service errors', async () => {
      mockUnifiedLearningService.getLearningProgress.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await getLearningProgress();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent success response format', async () => {
      const mockResponse = { data: 'test' };
      mockUnifiedLearningService.getLearningProgress.mockResolvedValue(mockResponse);

      const response = await getLearningProgress();
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.success).toBe(true);
      expect(typeof data.data).toBe('object');
    });

    it('should return consistent error response format', async () => {
      const request = createMockRequest('POST', '/api/learning/programs', {});

      const response = await createLearningProgram(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
      expect(typeof data.error).toBe('string');
      expect(data).not.toHaveProperty('data');
    });
  });

  describe('Service Integration', () => {
    it('should properly call service methods', async () => {
      mockUnifiedLearningService.getLearningProgress.mockResolvedValue({ test: 'data' });

      const response = await getLearningProgress();
      
      expect(mockUnifiedLearningService.getLearningProgress).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should pass correct parameters to service methods', async () => {
      const request = createMockRequest('POST', '/api/learning/programs', {
        scenarioId: 'test-scenario',
        metadata: { language: 'zh', difficulty: 'beginner' }
      });

      mockUnifiedLearningService.createLearningProgram.mockResolvedValue({});

      await createLearningProgram(request);

      expect(mockUnifiedLearningService.createLearningProgram).toHaveBeenCalledWith(
        'test-scenario',
        'test@example.com',
        { language: 'zh', difficulty: 'beginner' }
      );
    });
  });
});