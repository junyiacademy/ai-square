/**
 * Assessment Task API Tests
 * Tests for GET/PATCH /api/assessment/programs/[programId]/tasks/[taskId]
 */

import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { IProgram, ITask, IEvaluation } from '@/types/unified-learning';
import type { User } from '@/lib/repositories/interfaces';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/utils/language', () => ({
  getLanguageFromHeader: jest.fn().mockReturnValue('en')
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

// Mock console
const mockConsoleError = createMockConsoleError();

// Valid UUID for testing
const VALID_UUID = '12345678-1234-1234-1234-123456789012';
const INVALID_UUID = 'invalid-uuid';

describe('GET /api/assessment/programs/[programId]/tasks/[taskId]', () => {
  let mockTaskRepo: {
    findById: jest.Mock;
    update: jest.Mock;
  };
  let mockProgramRepo: {
    findById: jest.Mock;
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

  const mockProgram: IProgram = {
    id: VALID_UUID,
    userId: 'user-123',
    scenarioId: 'scenario-123',
    mode: 'assessment',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 3,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: '2024-01-01T00:00:00Z',
    startedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastActivityAt: '2024-01-01T00:00:00Z',
    timeSpentSeconds: 0,
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  const mockTask: ITask = {
    id: VALID_UUID,
    programId: VALID_UUID,
    mode: 'assessment',
    taskIndex: 0,
    scenarioTaskIndex: 0,
    title: { en: 'Assessment Task' },
    description: { en: 'Test assessment' },
    type: 'question',
    status: 'pending',
    content: {
      questions: [
        {
          id: 'q1',
          text: 'What is AI?',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          ksa_mapping: { K1: 1.0 }
        },
        {
          id: 'q2',
          text: 'How does ML work?',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'B',
          ksa_mapping: { K2: 1.0 }
        }
      ]
    },
    interactions: [],
    interactionCount: 0,
    userResponse: {},
    score: 0,
    maxScore: 100,
    allowedAttempts: 1,
    attemptCount: 0,
    timeSpentSeconds: 0,
    aiConfig: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  const mockContext = {
    params: Promise.resolve({'programId':'test-id','taskId':'test-id'})
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repository mocks
    mockTaskRepo = {
      findById: jest.fn().mockResolvedValue(mockTask),
      update: jest.fn().mockResolvedValue(mockTask)
    };

    mockProgramRepo = {
      findById: jest.fn().mockResolvedValue(mockProgram)
    };

    mockRepositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo as any);
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo as any);

    // Default session with user ID
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com', id: 'user-123' }
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Parameter validation', () => {
    it('should validate program ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/programs/invalid-id/tasks/' + VALID_UUID, {
        method: 'GET'
      });

      const response = await GET(request, {
        params: Promise.resolve({'programId':'test-id','taskId':'test-id'})
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid program ID format. UUID required.');
    });

    it('should validate task ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/invalid-id', {
        method: 'GET'
      });

      const response = await GET(request, {
        params: Promise.resolve({'programId':'test-id','taskId':'test-id'})
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid task ID format. UUID required.');
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'GET'
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Authorization', () => {
    it('should return 404 if program not found', async () => {
      mockProgramRepo.findById.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'GET'
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Program not found or access denied');
    });

    it('should return 404 if user does not own program', async () => {
      mockProgramRepo.findById.mockResolvedValueOnce({
        ...mockProgram,
        userId: 'other-user'
      });

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'GET'
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Program not found or access denied');
    });
  });

  describe('Task retrieval', () => {
    it('should get task successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'GET'
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.task).toMatchObject({
        id: VALID_UUID,
        programId: VALID_UUID,
        title: mockTask.title,
        type: 'question',
        context: mockTask.content,
        interactions: [],
        status: 'pending'
      });
    });

    it('should return 404 if task not found', async () => {
      mockTaskRepo.findById.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'GET'
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Task not found');
    });

    it('should return 403 if task does not belong to program', async () => {
      mockTaskRepo.findById.mockResolvedValueOnce({
        ...mockTask,
        programId: 'other-program'
      });

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'GET'
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Task does not belong to this program');
    });
  });

  describe('Error handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockProgramRepo.findById.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'GET'
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch task');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching assessment task:',
        expect.any(Error)
      );
    });
  });
});

describe('PATCH /api/assessment/programs/[programId]/tasks/[taskId]', () => {
  let mockTaskRepo: {
    findById: jest.Mock;
    update: jest.Mock;
  };
  let mockProgramRepo: {
    findById: jest.Mock;
  };
  let mockEvaluationRepo: {
    create: jest.Mock;
  };

  const mockProgram: IProgram = {
    id: VALID_UUID,
    userId: 'user-123',
    scenarioId: 'scenario-123',
    mode: 'assessment',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 3,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: '2024-01-01T00:00:00Z',
    startedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastActivityAt: '2024-01-01T00:00:00Z',
    timeSpentSeconds: 0,
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  const mockTask: ITask = {
    id: VALID_UUID,
    programId: VALID_UUID,
    mode: 'assessment',
    taskIndex: 0,
    scenarioTaskIndex: 0,
    title: { en: 'Assessment Task' },
    description: { en: 'Test assessment' },
    type: 'question',
    status: 'pending',
    content: {
      questions: [
        {
          id: 'q1',
          text: 'What is AI?',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          ksa_mapping: { K1: 1.0 }
        },
        {
          id: 'q2',
          text: 'How does ML work?',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'B',
          ksa_mapping: { K2: 1.0 }
        }
      ]
    },
    interactions: [],
    interactionCount: 0,
    userResponse: {},
    score: 0,
    maxScore: 100,
    allowedAttempts: 1,
    attemptCount: 0,
    timeSpentSeconds: 0,
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
    programId: VALID_UUID,
    taskId: VALID_UUID,
    mode: 'assessment',
    evaluationType: 'task',
    evaluationSubtype: 'assessment_task',
    score: 50,
    maxScore: 100,
    domainScores: {},
    feedbackText: 'Assessment task completed with 1/2 correct answers',
    feedbackData: {},
    aiAnalysis: {},
    timeTakenSeconds: 0,
    createdAt: '2024-01-01T00:00:00Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {
      totalQuestions: 2,
      correctAnswers: 1,
      language: 'en'
    },
    metadata: {
      evaluatedAt: '2024-01-01T00:00:00Z'
    }
  };

  const mockContext = {
    params: Promise.resolve({'programId':'test-id','taskId':'test-id'})
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repository mocks
    mockTaskRepo = {
      findById: jest.fn().mockResolvedValue(mockTask),
      update: jest.fn().mockResolvedValue(mockTask)
    };

    mockProgramRepo = {
      findById: jest.fn().mockResolvedValue(mockProgram)
    };

    mockEvaluationRepo = {
      create: jest.fn().mockResolvedValue(mockEvaluation)
    };

    mockRepositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo as any);
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo as any);
    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(mockEvaluationRepo as any);

    // Default session with user ID
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com', id: 'user-123' }
    } as any);
  });

  describe('Start action', () => {
    it('should start task successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'start' })
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTaskRepo.update).toHaveBeenCalledWith(VALID_UUID, expect.objectContaining({
        status: 'active',
        metadata: expect.objectContaining({
          startedAt: expect.any(String)
        })
      }));
    });
  });

  describe('Submit action', () => {
    it('should submit answers and create evaluation', async () => {
      const answers = [
        { questionId: 'q1', answer: 'A', timeSpent: 30 },
        { questionId: 'q2', answer: 'C', timeSpent: 45 } // Wrong answer
      ];

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'submit', answers })
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.evaluation).toMatchObject({
        id: 'eval-123',
        score: 50,
        totalQuestions: 2,
        correctAnswers: 1,
        feedback: 'Assessment task completed with 1/2 correct answers'
      });

      // Verify interactions were saved
      expect(mockTaskRepo.update).toHaveBeenCalledWith(VALID_UUID, expect.objectContaining({
        interactions: expect.arrayContaining([
          expect.objectContaining({
            type: 'system_event',
            content: expect.objectContaining({
              eventType: 'assessment_answer',
              questionId: 'q1',
              selectedAnswer: 'A',
              isCorrect: true
            })
          })
        ])
      }));

      // Verify evaluation was created
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        programId: VALID_UUID,
        taskId: VALID_UUID,
        mode: 'assessment',
        evaluationType: 'task',
        evaluationSubtype: 'assessment_task',
        score: 50,
        assessmentData: expect.objectContaining({
          totalQuestions: 2,
          correctAnswers: 1
        })
      }));

      // Verify task was marked completed
      expect(mockTaskRepo.update).toHaveBeenCalledWith(VALID_UUID, expect.objectContaining({
        status: 'completed',
        metadata: expect.objectContaining({
          completedAt: expect.any(String),
          evaluationId: 'eval-123'
        })
      }));
    });

    it('should validate answers format', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'submit', answers: 'invalid' })
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid answers format');
    });

    it('should handle questions without correct answers', async () => {
      mockTaskRepo.findById.mockResolvedValueOnce({
        ...mockTask,
        content: {
          questions: [
            { id: 'q1', text: 'Open question', options: [] }
          ]
        }
      });

      // Mock evaluation with 0 score
      mockEvaluationRepo.create.mockResolvedValueOnce({
        ...mockEvaluation,
        score: 0,
        feedbackText: 'Assessment task completed with 0/1 correct answers',
        assessmentData: {
          totalQuestions: 1,
          correctAnswers: 0,
          language: 'en'
        }
      });

      const answers = [
        { questionId: 'q1', answer: 'My answer' }
      ];

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'submit', answers })
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.evaluation.score).toBe(0); // No correct answers possible
    });

    it('should handle empty questions array', async () => {
      mockTaskRepo.findById.mockResolvedValueOnce({
        ...mockTask,
        content: {}
      });

      // Mock evaluation with 0 score and no questions
      mockEvaluationRepo.create.mockResolvedValueOnce({
        ...mockEvaluation,
        score: 0,
        feedbackText: 'Assessment task completed with 0/0 correct answers',
        assessmentData: {
          totalQuestions: 0,
          correctAnswers: 0,
          language: 'en'
        }
      });

      const answers: any[] = [];

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'submit', answers })
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.evaluation.score).toBe(0);
    });
  });

  describe('Complete action', () => {
    it('should complete task without evaluation', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'complete' })
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTaskRepo.update).toHaveBeenCalledWith(VALID_UUID, expect.objectContaining({
        status: 'completed',
        metadata: expect.objectContaining({
          completedAt: expect.any(String)
        })
      }));
    });
  });

  describe('Invalid action', () => {
    it('should reject invalid action', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'invalid' })
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid action');
    });
  });

  describe('Error handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockTaskRepo.update.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/' + VALID_UUID + '/tasks/' + VALID_UUID, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'start' })
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update task');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error updating assessment task:',
        expect.any(Error)
      );
    });
  });
});