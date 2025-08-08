import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { postgresqlLearningService } from '@/lib/services/postgresql-learning-service';
import type { ITask, IEvaluation } from '@/types/unified-learning';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/services/postgresql-learning-service');

const mockGetServerSession = getServerSession as jest.Mock;
const mockPostgresqlLearningService = postgresqlLearningService as jest.Mocked<typeof postgresqlLearningService>;

describe('/api/learning/tasks/[taskId]/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    const mockSession = {
      user: {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    const mockTask: ITask = {
      id: 'task123',
      programId: 'program123',
      mode: 'pbl',
      taskIndex: 0,
      status: 'completed',
      type: 'question',
      title: { en: 'Test Task' },
      description: { en: 'Test Description' },
      content: { instructions: 'Complete this task' },
      interactions: [],
      interactionCount: 0,
      userResponse: {},
      score: 85,
      maxScore: 100,
      allowedAttempts: 3,
      attemptCount: 1,
      timeSpentSeconds: 300,
      aiConfig: {},
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    };

    const mockEvaluation: IEvaluation = {
      id: 'eval123',
      taskId: 'task123',
      userId: 'test@example.com',
      mode: 'pbl',
      evaluationType: 'formative',
      score: 85,
      maxScore: 100,
      domainScores: { problem_solving: 85, creativity: 90 },
      feedbackText: 'Great job!',
      feedbackData: { detailed: { en: 'Great job!' } },
      timeTakenSeconds: 120,
      aiAnalysis: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {},
      createdAt: new Date().toISOString()
    };

    const mockTaskResult = {
      task: mockTask,
      evaluation: mockEvaluation,
      programProgress: {
        tasksCompleted: 3,
        totalTasks: 5,
        overallScore: 80
      }
    };

    it('successfully completes a task with evaluation', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPostgresqlLearningService.completeTask.mockResolvedValue(mockTaskResult);

      const requestBody = {
        response: 'My task response',
        evaluationData: {
          timeSpent: 300,
          attempts: 1
        }
      };

      const request = new NextRequest('http://localhost:3000/api/learning/tasks/task123/complete', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request, { params: Promise.resolve({'taskId':'task123'}) });
      const data = await response.json();

      expect(mockPostgresqlLearningService.completeTask).toHaveBeenCalledWith(
        'task123',
        'test@example.com',
        'My task response',
        { timeSpent: 300, attempts: 1 }
      );
      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockTaskResult
      });
    });

    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/learning/tasks/task123/complete', {
        method: 'POST',
        body: JSON.stringify({ response: 'test' })
      });

      const response = await POST(request, { params: Promise.resolve({'taskId':'task123'}) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized'
      });
      expect(mockPostgresqlLearningService.completeTask).not.toHaveBeenCalled();
    });

    it('returns 401 when session missing email', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user123' } });

      const request = new NextRequest('http://localhost:3000/api/learning/tasks/task123/complete', {
        method: 'POST',
        body: JSON.stringify({ response: 'test' })
      });

      const response = await POST(request, { params: Promise.resolve({'taskId':'task123'}) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('returns 404 when task not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPostgresqlLearningService.completeTask.mockRejectedValue(
        new Error('Task not found')
      );

      const request = new NextRequest('http://localhost:3000/api/learning/tasks/nonexistent/complete', {
        method: 'POST',
        body: JSON.stringify({ response: 'test' })
      });

      const response = await POST(request, { params: Promise.resolve({'taskId':'task123'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        success: false,
        error: 'Task not found'
      });
    });

    it('handles missing request body', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPostgresqlLearningService.completeTask.mockResolvedValue(mockTaskResult);

      const request = new NextRequest('http://localhost:3000/api/learning/tasks/task123/complete', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request, { params: Promise.resolve({'taskId':'task123'}) });
      const data = await response.json();

      expect(mockPostgresqlLearningService.completeTask).toHaveBeenCalledWith(
        'task123',
        'test@example.com',
        undefined,
        undefined
      );
      expect(response.status).toBe(200);
    });

    it('handles general errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPostgresqlLearningService.completeTask.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/learning/tasks/task123/complete', {
        method: 'POST',
        body: JSON.stringify({ response: 'test' })
      });

      const response = await POST(request, { params: Promise.resolve({'taskId':'task123'}) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Internal server error'
      });
    });
  });
});
