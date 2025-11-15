import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Assessment Task Interactions Route Tests
 * 提升覆蓋率從 0% 到 100%
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';
import type { IProgram, ITask, IInteraction } from '@/types/unified-learning';
import type { User } from '@/lib/repositories/interfaces';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() => ({
    json: () => Promise.resolve({ success: false, error: 'Authentication required' }),
    status: 401
  }))
}));

// Mock console
const mockConsoleError = createMockConsoleError();

describe('Assessment Task Interactions API', () => {
  const mockTaskRepo = {
    findById: jest.fn(),
    update: jest.fn(),
    getTaskWithInteractions: jest.fn()
  };
  const mockProgramRepo = {
    findById: jest.fn()
  };

  const validProgramId = '12345678-1234-1234-1234-123456789abc';
  const validTaskId = '87654321-4321-4321-4321-cba987654321';
  const validUserId = 'user-1234-5678-9abc-def012345678';

  const mockUser: User = {
    id: validUserId,
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
    id: validProgramId,
    scenarioId: 'scenario-123',
    userId: validUserId,
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

  const mockTask: ITask = {
    id: validTaskId,
    programId: validProgramId,
    mode: 'assessment',
    taskIndex: 0,
    scenarioTaskIndex: 0,
    type: 'question',
    status: 'active',
    title: { en: 'Assessment Task' },
    description: { en: 'Task Description' },
    content: {
      instructions: 'Answer these questions',
      questions: [
        { id: 'q1', text: 'Question 1' }
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
    metadata: {
      interactions: []
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (getUnifiedAuth as jest.Mock).mockResolvedValue({
      user: { id: validUserId, email: 'test@example.com' }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET /api/assessment/programs/[programId]/tasks/[taskId]/interactions', () => {
    describe('UUID Validation', () => {
      it('should return 400 for invalid program ID format', async () => {
        const request = new NextRequest(`http://localhost/api/assessment/programs/invalid-id/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': 'invalid-id','taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid program ID format. UUID required.');
      });

      it('should return 400 for invalid task ID format', async () => {
        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/invalid-task-id/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId':'invalid-task-id'})
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid task ID format. UUID required.');
      });

      it('should accept valid UUID formats', async () => {
        (getUnifiedAuth as jest.Mock).mockResolvedValue({
          user: { id: validUserId, email: 'test@example.com' }
        });
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
        mockTaskRepo.findById.mockResolvedValue(mockTask);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTask);

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });
    });

    describe('Authentication', () => {
      beforeEach(() => {
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
        mockTaskRepo.findById.mockResolvedValue(mockTask);
      });

      it('should return 401 when not authenticated', async () => {
        (getUnifiedAuth as jest.Mock).mockResolvedValue(null);

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Authentication required');
      });

      it('should return 401 when session has no email', async () => {
        (getUnifiedAuth as jest.Mock).mockResolvedValue({ user: {} });

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Authentication required');
      });
    });

    describe('Program Access', () => {
      it('should return 404 when program not found', async () => {
        mockProgramRepo.findById.mockResolvedValue(null);

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Program not found or access denied');
      });

      it('should return 404 when user does not own program', async () => {
        mockProgramRepo.findById.mockResolvedValue({
          ...mockProgram,
          userId: 'other-user-id'
        });

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Program not found or access denied');
      });
    });

    describe('Task Access', () => {
      beforeEach(() => {
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
      });

      it('should return 404 when task not found', async () => {
        mockTaskRepo.findById.mockResolvedValue(null);

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Task not found');
      });

      it('should return 403 when task does not belong to program', async () => {
        mockTaskRepo.findById.mockResolvedValue({
          ...mockTask,
          programId: 'other-program-id'
        });

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Task does not belong to this program');
      });
    });

    describe('Interactions Retrieval', () => {
      beforeEach(() => {
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
        mockTaskRepo.findById.mockResolvedValue(mockTask);
      });

      it('should return interactions when task has interactions', async () => {
        const mockInteractions: IInteraction[] = [
          {
            timestamp: '2024-01-01T00:10:00Z',
            type: 'user_input',
            content: 'Answer 1'
          },
          {
            timestamp: '2024-01-01T00:15:00Z',
            type: 'user_input',
            content: 'Answer 2'
          }
        ];

        const taskWithInteractions = {
          ...mockTask,
          interactions: mockInteractions
        };

        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(taskWithInteractions);

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.interactions).toHaveLength(2);
        expect(data.interactions[0]).toMatchObject({
          type: 'user_input',
          content: 'Answer 1'
        });
      });

      it('should return empty array when task has no interactions', async () => {
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.interactions).toEqual([]);
      });

      it('should return empty array when getTaskWithInteractions returns null', async () => {
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(null);

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.interactions).toEqual([]);
      });

      it('should handle repository method not available', async () => {
        const repoWithoutMethod = {
          ...mockTaskRepo,
          getTaskWithInteractions: undefined
        } as any;
        (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(repoWithoutMethod);

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.interactions).toEqual([]);
      });
    });

    describe('Error Handling', () => {
      it('should handle repository errors gracefully', async () => {
        mockProgramRepo.findById.mockRejectedValue(new Error('Database error'));

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`);

        const response = await GET(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Failed to fetch interactions');
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Error fetching assessment task interactions:',
          expect.any(Error)
        );
      });
    });
  });

  describe('POST /api/assessment/programs/[programId]/tasks/[taskId]/interactions', () => {
    describe('UUID Validation', () => {
      it('should return 400 for invalid program ID format', async () => {
        const request = new NextRequest(`http://localhost/api/assessment/programs/invalid-id/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': 'invalid-id','taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid program ID format. UUID required.');
      });

      it('should return 400 for invalid task ID format', async () => {
        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/invalid-task-id/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': 'invalid-task-id'})
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid task ID format. UUID required.');
      });
    });

    describe('Request Validation', () => {
      it('should return 400 when missing type', async () => {
        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid interaction data');
      });

      it('should return 400 when missing content', async () => {
        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid interaction data');
      });

      it('should return 400 when type is empty string', async () => {
        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: '', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid interaction data');
      });

      it('should return 400 when content is empty string', async () => {
        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: '' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid interaction data');
      });
    });

    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        (getUnifiedAuth as jest.Mock).mockResolvedValue(null);

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Authentication required');
      });

      it('should return 401 when session has no email', async () => {
        (getUnifiedAuth as jest.Mock).mockResolvedValue({ user: {} });

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Authentication required');
      });
    });

    describe('Program Access', () => {
      it('should return 404 when program not found', async () => {
        mockProgramRepo.findById.mockResolvedValue(null);

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Program not found or access denied');
      });

      it('should return 404 when user does not own program', async () => {
        mockProgramRepo.findById.mockResolvedValue({
          ...mockProgram,
          userId: 'other-user-id'
        });

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Program not found or access denied');
      });
    });

    describe('Task Access', () => {
      beforeEach(() => {
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
      });

      it('should return 404 when task not found', async () => {
        mockTaskRepo.findById.mockResolvedValue(null);

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Task not found');
      });

      it('should return 403 when task does not belong to program', async () => {
        mockTaskRepo.findById.mockResolvedValue({
          ...mockTask,
          programId: 'other-program-id'
        });

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Task does not belong to this program');
      });
    });

    describe('Interaction Creation', () => {
      beforeEach(() => {
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
        mockTaskRepo.findById.mockResolvedValue(mockTask);
      });

      it('should create new interaction successfully', async () => {
        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'My answer' }),
          headers: {
            'User-Agent': 'Mozilla/5.0 (test browser)'
          }
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.interaction).toMatchObject({
          type: 'user_input',
          content: 'My answer',
          timestamp: expect.any(String),
          metadata: {
            userId: validUserId,
            userAgent: 'Mozilla/5.0 (test browser)'
          }
        });

        // Verify task was updated with new interaction
        expect(mockTaskRepo.update).toHaveBeenCalledWith(validTaskId, {
          metadata: {
            ...mockTask.metadata,
            interactions: expect.arrayContaining([
              expect.objectContaining({
                type: 'user_input',
                content: 'My answer'
              })
            ])
          }
        });
      });

      it('should handle missing User-Agent header', async () => {
        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'My answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.interaction.metadata.userAgent).toBe('');
      });

      it('should merge with existing interactions', async () => {
        const existingInteractions = [
          {
            timestamp: '2024-01-01T00:00:00Z',
            type: 'system_event',
            content: 'Task started'
          }
        ];

        mockTaskRepo.findById.mockResolvedValue({
          ...mockTask,
          metadata: {
            ...mockTask.metadata,
            interactions: existingInteractions
          }
        });

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'New answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });

        expect(response.status).toBe(200);
        expect(mockTaskRepo.update).toHaveBeenCalledWith(validTaskId, {
          metadata: expect.objectContaining({
            interactions: expect.arrayContaining([
              existingInteractions[0],
              expect.objectContaining({
                type: 'user_input',
                content: 'New answer'
              })
            ])
          })
        });
      });

      it('should handle task with no existing metadata', async () => {
        mockTaskRepo.findById.mockResolvedValue({
          ...mockTask,
          metadata: undefined
        });

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });

        expect(response.status).toBe(200);
        expect(mockTaskRepo.update).toHaveBeenCalledWith(validTaskId, {
          metadata: {
            interactions: [
              expect.objectContaining({
                type: 'user_input',
                content: 'Answer'
              })
            ]
          }
        });
      });

      it('should handle task with non-array interactions metadata', async () => {
        mockTaskRepo.findById.mockResolvedValue({
          ...mockTask,
          metadata: {
            interactions: 'not-an-array'
          }
        });

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });

        expect(response.status).toBe(200);
        expect(mockTaskRepo.update).toHaveBeenCalledWith(validTaskId, {
          metadata: {
            interactions: [
              expect.objectContaining({
                type: 'user_input',
                content: 'Answer'
              })
            ]
          }
        });
      });

      it('should handle repository method not available', async () => {
        const repoWithoutUpdate = {
          ...mockTaskRepo,
          update: undefined
        } as any;
        (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(repoWithoutUpdate);

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });

        expect(response.status).toBe(200);
        expect(response.json()).resolves.toMatchObject({
          success: true,
          interaction: expect.objectContaining({
            type: 'user_input',
            content: 'Answer'
          })
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle repository errors gracefully', async () => {
        mockProgramRepo.findById.mockRejectedValue(new Error('Database error'));

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Failed to add interaction');
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Error adding assessment task interaction:',
          expect.any(Error)
        );
      });

      it('should handle update errors', async () => {
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
        mockTaskRepo.findById.mockResolvedValue(mockTask);
        mockTaskRepo.update.mockRejectedValue(new Error('Update failed'));

        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: JSON.stringify({ type: 'user_input', content: 'Answer' })
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Failed to add interaction');
      });

      it('should handle invalid JSON body', async () => {
        const request = new NextRequest(`http://localhost/api/assessment/programs/${validProgramId}/tasks/${validTaskId}/interactions`, {
          method: 'POST',
          body: 'invalid json'
        });

        const response = await POST(request, {
          params: Promise.resolve({'programId': validProgramId,'taskId': validTaskId})
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Failed to add interaction');
      });
    });
  });
});
