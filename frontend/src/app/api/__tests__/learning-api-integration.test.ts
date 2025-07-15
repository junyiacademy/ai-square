/**
 * Integration Test: Learning API Routes
 * Tests the complete API integration for unified learning architecture
 */

import { NextRequest } from 'next/server';
import { jest } from '@jest/globals';

// Mock authentication (simulating session without next-auth dependency)
const mockGetServerSession = jest.fn(() => Promise.resolve({
  user: { email: 'test@example.com' }
}));

// Mock auth helper if it exists
jest.mock('@/lib/auth', () => ({
  getServerSession: mockGetServerSession
}), { virtual: true });

// Mock the unified learning service
const mockUnifiedLearningService = {
  createLearningProgram: jest.fn(),
  completeTask: jest.fn(),
  completeProgram: jest.fn(),
  getLearningProgress: jest.fn(),
  getProgramStatus: jest.fn(),
  getLearningAnalytics: jest.fn()
};

jest.mock('@/lib/implementations/gcs-v2/services/unified-learning-service', () => ({
  UnifiedLearningService: jest.fn(() => mockUnifiedLearningService)
}));

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

describe('Learning API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/learning/programs', () => {
    it('should create a new learning program', async () => {
      const { POST } = await import('@/app/api/learning/programs/route');
      
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

      const response = await POST(request);
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

    it('should handle service errors', async () => {
      const { POST } = await import('@/app/api/learning/programs/route');
      
      mockUnifiedLearningService.createLearningProgram.mockRejectedValue(
        new Error('Scenario not found')
      );

      const request = createMockRequest('POST', '/api/learning/programs', {
        scenarioId: 'invalid-scenario'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Scenario not found');
    });
  });

  describe('POST /api/learning/tasks/[taskId]/complete', () => {
    it('should complete a task with evaluation', async () => {
      const { POST } = await import('@/app/api/learning/tasks/[taskId]/complete/route');
      
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

      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });
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
  });

  describe('GET /api/learning/progress', () => {
    it('should get user learning progress', async () => {
      const { GET } = await import('@/app/api/learning/progress/route');
      
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

      const request = createMockRequest('GET', '/api/learning/progress');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResponse);
      expect(mockUnifiedLearningService.getLearningProgress).toHaveBeenCalledWith(
        'test@example.com'
      );
    });
  });

  describe('GET /api/learning/programs/[programId]/status', () => {
    it('should get detailed program status', async () => {
      const { GET } = await import('@/app/api/learning/programs/[programId]/status/route');
      
      const mockResponse = {
        program: {
          id: 'program-1',
          scenarioId: 'scenario-1',
          status: 'active'
        },
        scenario: {
          id: 'scenario-1',
          title: 'Test Scenario',
          sourceType: 'pbl'
        },
        tasks: [
          {
            id: 'task-1',
            programId: 'program-1',
            status: 'completed'
          },
          {
            id: 'task-2',
            programId: 'program-1',
            status: 'active'
          }
        ],
        evaluations: [
          {
            id: 'eval-1',
            entityType: 'task',
            entityId: 'task-1'
          }
        ],
        currentTask: {
          id: 'task-2',
          programId: 'program-1',
          status: 'active'
        },
        completionRate: 50
      };

      mockUnifiedLearningService.getProgramStatus.mockResolvedValue(mockResponse);

      const request = createMockRequest('GET', '/api/learning/programs/program-1/status');

      const response = await GET(request, { params: Promise.resolve({ programId: 'program-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResponse);
      expect(mockUnifiedLearningService.getProgramStatus).toHaveBeenCalledWith('program-1');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for protected routes', async () => {
      const { getServerSession } = await import('next-auth');
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const { GET } = await import('@/app/api/learning/progress/route');
      const request = createMockRequest('GET', '/api/learning/progress');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const { GET } = await import('@/app/api/learning/progress/route');
      
      mockUnifiedLearningService.getLearningProgress.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockRequest('GET', '/api/learning/progress');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should validate request parameters', async () => {
      const { POST } = await import('@/app/api/learning/programs/route');
      
      const request = createMockRequest('POST', '/api/learning/programs', {
        // Missing required scenarioId
        metadata: { language: 'en' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('scenarioId');
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format', async () => {
      const { GET } = await import('@/app/api/learning/progress/route');
      
      const mockResponse = {
        activePrograms: [],
        completedPrograms: [],
        totalEvaluations: 0,
        averageScore: undefined
      };

      mockUnifiedLearningService.getLearningProgress.mockResolvedValue(mockResponse);

      const request = createMockRequest('GET', '/api/learning/progress');

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.success).toBe(true);
      expect(typeof data.data).toBe('object');
    });
  });
});