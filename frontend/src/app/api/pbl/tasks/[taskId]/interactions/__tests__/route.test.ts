/**
 * Tests for PBL Task Interactions API
 * This API manages task interactions (user inputs, AI responses, system events)
 */

import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import type { ITask, IInteraction } from '@/types/unified-learning';
import type { Session } from 'next-auth';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/implementations/gcs-v2', () => ({
  getTaskRepository: jest.fn()
}));
jest.mock('@/lib/cache/cache-service', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined)
  }
}));
jest.mock('@/lib/cache/distributed-cache-service', () => ({
  distributedCacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    getWithRevalidation: jest.fn(async (key, handler) => handler())
  }
}));
jest.mock('@/lib/monitoring/performance-monitor', () => ({
  withPerformanceTracking: jest.fn((handler) => handler())
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

// Mock task repository
const mockTaskRepo = {
  findById: jest.fn(),
  addInteraction: jest.fn(),
  update: jest.fn()
};

// Mock getTaskRepository
const mockGetTaskRepository = jest.requireMock('@/lib/implementations/gcs-v2').getTaskRepository;
mockGetTaskRepository.mockReturnValue(mockTaskRepo);

describe('Task Interactions API', () => {
  const mockSession = {
    user: {
      email: 'test@example.com',
      name: 'Test User'
    }
  };

  const mockTaskId = 'task_123';
  const mockParams = Promise.resolve({ taskId: mockTaskId });

  const mockTask: Partial<ITask> = {
    id: mockTaskId,
    programId: 'prog_123',
    status: 'active',
    interactions: [
      {
        timestamp: '2024-01-15T10:00:00Z',
        type: 'user_input',
        content: 'Hello, I need help with my resume',
        metadata: { role: 'user' }
      },
      {
        timestamp: '2024-01-15T10:00:05Z',
        type: 'ai_response',
        content: 'I\'d be happy to help you improve your resume. What specific areas would you like to focus on?',
        metadata: { role: 'ai' }
      },
      {
        timestamp: '2024-01-15T10:01:00Z',
        type: 'system_event',
        content: { event: 'task_paused' },
        metadata: { role: 'system' }
      }
    ],
    evaluationId: 'eval_456'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession as unknown as Session);
  });

  const createRequest = (url: string, options: RequestInit = {}) => {
    return new NextRequest(url, options as ConstructorParameters<typeof NextRequest>[1]);
  };

  describe('POST /api/pbl/tasks/[taskId]/interactions', () => {
    describe('Authentication', () => {
      it('should return 401 when no session exists', async () => {
        mockGetServerSession.mockResolvedValueOnce(null);

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interaction: {} })
        });

        const response = await POST(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({
          success: false,
          error: 'Authentication required'
        });
      });

      it('should return 401 when session has no email', async () => {
        mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Test' } } as any);

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interaction: {} })
        });

        const response = await POST(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({
          success: false,
          error: 'Authentication required'
        });
      });
    });

    describe('Validation', () => {
      it('should return 400 when interaction data is missing', async () => {
        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        const response = await POST(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({
          success: false,
          error: 'Missing interaction data'
        });
      });
    });

    describe('Adding interactions', () => {
      it('should successfully add a user interaction', async () => {
        const userInteraction = {
          type: 'user',
          content: 'I want to highlight my technical skills',
          timestamp: '2024-01-15T10:05:00Z'
        };

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interaction: userInteraction })
        });

        const response = await POST(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
          success: true,
          message: 'Interaction saved successfully'
        });

        // Verify interaction was added with correct transformation
        expect(mockTaskRepo.addInteraction).toHaveBeenCalledWith(mockTaskId, {
          timestamp: userInteraction.timestamp,
          type: 'user_input',
          content: userInteraction.content,
          metadata: {
            role: 'user',
            originalType: 'user'
          }
        });
      });

      it('should successfully add an AI interaction', async () => {
        const aiInteraction = {
          type: 'ai',
          content: 'Here are some suggestions for highlighting your technical skills...',
          role: 'career_advisor'
        };

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interaction: aiInteraction })
        });

        const response = await POST(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
          success: true,
          message: 'Interaction saved successfully'
        });

        // Verify interaction was added with correct transformation
        expect(mockTaskRepo.addInteraction).toHaveBeenCalledWith(mockTaskId, {
          timestamp: expect.any(String), // Auto-generated timestamp
          type: 'ai_response',
          content: aiInteraction.content,
          metadata: {
            role: 'career_advisor',
            originalType: 'ai'
          }
        });
      });

      it('should handle system events', async () => {
        const systemInteraction = {
          type: 'system',
          content: { event: 'task_completed', score: 85 },
          metadata: { triggeredBy: 'auto_evaluation' }
        };

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interaction: systemInteraction })
        });

        const response = await POST(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
          success: true,
          message: 'Interaction saved successfully'
        });

        expect(mockTaskRepo.addInteraction).toHaveBeenCalledWith(mockTaskId, {
          timestamp: expect.any(String),
          type: 'system_event',
          content: systemInteraction.content,
          metadata: {
            role: 'system',
            originalType: 'system',
            triggeredBy: 'auto_evaluation'
          }
        });
      });

      it('should auto-generate timestamp when not provided', async () => {
        const interaction = {
          type: 'user',
          content: 'Test message'
        };

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interaction })
        });

        await POST(request, { params: mockParams });

        expect(mockTaskRepo.addInteraction).toHaveBeenCalledWith(mockTaskId, expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        }));
      });

      it('should preserve additional metadata', async () => {
        const interaction = {
          type: 'ai',
          content: 'Response with metadata',
          metadata: {
            model: 'gemini-2.5-flash',
            confidence: 0.95,
            tokens: 150
          }
        };

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interaction })
        });

        await POST(request, { params: mockParams });

        expect(mockTaskRepo.addInteraction).toHaveBeenCalledWith(mockTaskId, expect.objectContaining({
          metadata: {
            role: 'ai',
            originalType: 'ai',
            model: 'gemini-2.5-flash',
            confidence: 0.95,
            tokens: 150
          }
        }));
      });
    });

    describe('Error handling', () => {
      it('should handle repository errors', async () => {
        mockTaskRepo.addInteraction.mockRejectedValueOnce(new Error('Database error'));

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interaction: { type: 'user', content: 'Test' }
          })
        });

        const response = await POST(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({
          success: false,
          error: 'Failed to save interaction'
        });
      });
    });
  });

  describe('GET /api/pbl/tasks/[taskId]/interactions', () => {
    describe('Authentication', () => {
      it('should return 401 when no session exists', async () => {
        mockGetServerSession.mockResolvedValueOnce(null);

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`);

        const response = await GET(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({
          success: false,
          error: 'Authentication required'
        });
      });
    });

    describe('Fetching interactions', () => {
      it('should return task interactions with proper transformation', async () => {
        mockTaskRepo.findById.mockResolvedValueOnce(mockTask);

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`);

        const response = await GET(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.interactions).toHaveLength(3);

        // Verify transformation
        expect(data.data.interactions[0]).toEqual({
          id: `${mockTaskId}_2024-01-15T10:00:00Z`,
          type: 'user',
          content: 'Hello, I need help with my resume',
          timestamp: '2024-01-15T10:00:00Z',
          role: 'user'
        });

        expect(data.data.interactions[1]).toEqual({
          id: `${mockTaskId}_2024-01-15T10:00:05Z`,
          type: 'ai',
          content: 'I\'d be happy to help you improve your resume. What specific areas would you like to focus on?',
          timestamp: '2024-01-15T10:00:05Z',
          role: 'ai'
        });

        expect(data.data.interactions[2]).toEqual({
          id: `${mockTaskId}_2024-01-15T10:01:00Z`,
          type: 'system',
          content: { event: 'task_paused' },
          timestamp: '2024-01-15T10:01:00Z',
          role: 'system'
        });

        expect(data.data.taskStatus).toBe('active');
        expect(data.data.evaluationId).toBe('eval_456');
      });

      it('should return empty array when task not found', async () => {
        mockTaskRepo.findById.mockResolvedValueOnce(null);

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`);

        const response = await GET(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
          success: true,
          data: {
            interactions: []
          },
          cacheHit: false
        });
      });

      it('should handle task with no interactions', async () => {
        mockTaskRepo.findById.mockResolvedValueOnce({
          ...mockTask,
          interactions: undefined
        });

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`);

        const response = await GET(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.interactions).toEqual([]);
      });

      it('should handle interactions with missing metadata', async () => {
        const taskWithMinimalInteractions = {
          ...mockTask,
          interactions: [
            {
              timestamp: '2024-01-15T10:00:00Z',
              type: 'user_input' as const,
              content: 'Test message'
              // No metadata
            }
          ]
        };

        mockTaskRepo.findById.mockResolvedValueOnce(taskWithMinimalInteractions);

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`);

        const response = await GET(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.interactions[0]).toEqual({
          id: `${mockTaskId}_2024-01-15T10:00:00Z`,
          type: 'user',
          content: 'Test message',
          timestamp: '2024-01-15T10:00:00Z',
          role: 'user_input' // Falls back to type when metadata.role is missing
        });
      });
    });

    describe('Caching', () => {
      it('should include appropriate cache headers', async () => {
        mockTaskRepo.findById.mockResolvedValueOnce(mockTask);

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`);

        const response = await GET(request, { params: mockParams });

        expect(response.headers.get('Cache-Control')).toContain('max-age=120');
        expect(response.headers.get('Cache-Control')).toContain('stale-while-revalidate=600');
        expect(response.headers.get('X-Cache')).toBeDefined();
      });
    });

    describe('Error handling', () => {
      it('should handle repository errors', async () => {
        mockTaskRepo.findById.mockRejectedValueOnce(new Error('Database error'));

        const request = createRequest(`http://localhost:3000/api/pbl/tasks/${mockTaskId}/interactions`);

        const response = await GET(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Database error');
      });
    });
  });
});