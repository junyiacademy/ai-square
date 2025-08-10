import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { mockConsoleError, mockConsoleLog } from '@/test-utils/helpers/console';
import type { 
  IProgram, 
  ITask, 
  IEvaluation
} from '@/types/unified-learning';
import type {
  LearningMode,
  ProgramStatus,
  TaskStatus,
  TaskType
} from '@/types/database';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

// Mock console
mockConsoleError();
mockConsoleLog();


// Mock crypto with predictable hash
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'abcdef12abcdef12')
    }))
  }))
}));


describe('/api/pbl/programs/[programId]/complete', () => {
  // Mock repositories
  const mockProgramRepo = {
    findById: jest.fn(),
    update: jest.fn(),
  };
  const mockTaskRepo = {
    findByProgram: jest.fn(),
    getTaskWithInteractions: jest.fn(),
  };
  const mockEvalRepo = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const mockUserRepo = {
    findByEmail: jest.fn(),
  };

  // Mock data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    profilePicture: null,
    isEmailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    preferences: {},
    metadata: {}
  };

  const mockProgram: IProgram = {
    id: 'prog-123',
    userId: 'user-123',
    scenarioId: 'scenario-123',
    mode: 'pbl' as LearningMode,
    status: 'active' as ProgramStatus,
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 3,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    timeSpentSeconds: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastActivityAt: '2024-01-01T00:00:00Z',
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: undefined,
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  const mockTask: ITask = {
    id: 'task-123',
    programId: 'prog-123',
    mode: 'pbl' as LearningMode,
    taskIndex: 0,
    scenarioTaskIndex: 0,
    type: 'question' as TaskType,
    title: { en: 'Test Task' },
    description: { en: 'Test task description' },
    status: 'completed' as TaskStatus,
    content: { instructions: { en: 'Do this task' } },
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
    updatedAt: '2024-01-01T00:10:00Z',
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:10:00Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {
      evaluationId: 'task-eval-123'
    }
  };

  const mockTaskEvaluation: IEvaluation = {
    id: 'task-eval-123',
    userId: 'user-123',
    taskId: 'task-123',
    programId: 'prog-123',
    mode: 'pbl' as LearningMode,
    evaluationType: 'formative',
    evaluationSubtype: 'task_completion',
    score: 85,
    maxScore: 100,
    timeTakenSeconds: 300,
    domainScores: {
      engaging_with_ai: 85,
      creating_with_ai: 80,
      managing_ai: 90,
      designing_ai: 80
    },
    feedbackText: 'Good job',
    feedbackData: {},
    aiAnalysis: {},
    createdAt: '2024-01-01T00:00:00Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {
      ksaScores: {
        knowledge: 85,
        skills: 80,
        attitudes: 90
      }
    }
  };

  const mockProgramEvaluation: IEvaluation = {
    id: 'prog-eval-123',
    userId: 'user-123',
    programId: 'prog-123',
    mode: 'pbl' as LearningMode,
    evaluationType: 'summative',
    evaluationSubtype: 'pbl_completion',
    score: 85,
    maxScore: 100,
    timeTakenSeconds: 600,
    domainScores: {
      engaging_with_ai: 85,
      creating_with_ai: 80,
      managing_ai: 90,
      designing_ai: 80
    },
    feedbackText: '',
    feedbackData: {},
    aiAnalysis: {},
    createdAt: '2024-01-01T00:00:00Z',
    pblData: {
      taskEvaluationIds: ['task-eval-123'],
      ksaScores: {
        knowledge: 85,
        skills: 80,
        attitudes: 90
      },
      evaluatedTasks: 1,
      totalTasks: 1,
      conversationCount: 2
    },
    discoveryData: {},
    assessmentData: {},
    metadata: {
      overallScore: 85,
      totalTimeSeconds: 600,
      evaluatedTasks: 1,
      totalTasks: 1,
      domainScores: {
        engaging_with_ai: 85,
        creating_with_ai: 80,
        managing_ai: 90,
        designing_ai: 80
      },
      ksaScores: {
        knowledge: 85,
        skills: 80,
        attitudes: 90
      },
      isLatest: true,
      syncChecksum: 'abcdef12',
      evaluatedTaskCount: 1,
      lastSyncedAt: '2024-01-01T00:00:00Z',
      qualitativeFeedback: {},
      generatedLanguages: []
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepositoryFactory.getProgramRepository.mockReturnValue(
      mockProgramRepo as unknown as ReturnType<typeof repositoryFactory.getProgramRepository>
    );
    mockRepositoryFactory.getTaskRepository.mockReturnValue(
      mockTaskRepo as unknown as ReturnType<typeof repositoryFactory.getTaskRepository>
    );
    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(
      mockEvalRepo as unknown as ReturnType<typeof repositoryFactory.getEvaluationRepository>
    );
    mockRepositoryFactory.getUserRepository.mockReturnValue(
      mockUserRepo as unknown as ReturnType<typeof repositoryFactory.getUserRepository>
    );

    // Setup default successful auth
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    } as any);
  });

  describe('POST', () => {
    describe('Authentication and Authorization', () => {
      it('should return 401 for unauthenticated requests', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'Authentication required'
        });
      });

      it('should return 404 when user not found', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'User not found'
        });
      });

      it('should return 404 when program not found', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);
        mockProgramRepo.findById.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'Program not found'
        });
      });

      it('should return 403 when user does not own program', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);
        mockProgramRepo.findById.mockResolvedValue({
          ...mockProgram,
          userId: 'different-user-123'
        });

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'Access denied'
        });
      });
    });

    describe('New Program Evaluation Creation', () => {
      beforeEach(() => {
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
      });

      it('should create new evaluation with single completed task', async () => {
        const tasks = [mockTask];
        const taskEvaluations = [mockTaskEvaluation];
        
        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockEvalRepo.findById.mockResolvedValue(taskEvaluations[0]);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: [
            { type: 'user_input', timestamp: '2024-01-01T00:00:00Z', content: 'Hello' },
            { type: 'assistant', timestamp: '2024-01-01T00:05:00Z', content: 'Hi there!' },
            { type: 'user_input', timestamp: '2024-01-01T00:10:00Z', content: 'Thanks' }
          ]
        });
        mockEvalRepo.create.mockResolvedValue(mockProgramEvaluation);
        mockProgramRepo.update.mockResolvedValue({ ...mockProgram, status: 'completed' });

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'prog-123'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.evaluation).toEqual(mockProgramEvaluation);
        expect(data.debug.updateReason).toBe('new_evaluation');

        // Verify evaluation creation
        expect(mockEvalRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-123',
            programId: 'prog-123',
            mode: 'pbl',
            evaluationType: 'program',
            evaluationSubtype: 'pbl_completion',
            score: 85,
            maxScore: 100,
            domainScores: {
              engaging_with_ai: 85,
              creating_with_ai: 80,
              managing_ai: 90,
              designing_ai: 80
            },
            pblData: expect.objectContaining({
              taskEvaluationIds: ['task-eval-123'],
              ksaScores: {
                knowledge: 85,
                skills: 80,
                attitudes: 90
              },
              evaluatedTasks: 1,
              totalTasks: 1,
              conversationCount: 2
            }),
            metadata: expect.objectContaining({
              isLatest: true,
              syncChecksum: 'abcdef12'
            })
          })
        );

        // Verify program update
        expect(mockProgramRepo.update).toHaveBeenCalledWith('prog-123', {
          status: 'completed',
          completedAt: expect.any(String),
          metadata: expect.objectContaining({
            evaluationId: 'prog-eval-123'
          })
        });
      });

      it('should create evaluation with multiple tasks and mixed scores', async () => {
        const task2 = { ...mockTask, id: 'task-456', score: 90, metadata: { evaluationId: 'task-eval-456' } };
        const tasks = [mockTask, task2];
        
        const taskEval2 = { 
          ...mockTaskEvaluation, 
          id: 'task-eval-456',
          taskId: 'task-456',
          score: 90,
          domainScores: {
            engaging_with_ai: 90,
            creating_with_ai: 95,
            managing_ai: 85,
            designing_ai: 90
          },
          metadata: {
            ksaScores: {
              knowledge: 90,
              skills: 88,
              attitudes: 92
            }
          }
        };

        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockEvalRepo.findById.mockImplementation((id) => {
          if (id === 'task-eval-123') return Promise.resolve(mockTaskEvaluation);
          if (id === 'task-eval-456') return Promise.resolve(taskEval2);
          return Promise.resolve(null);
        });
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({ 
          ...mockTask, 
          interactions: [
            { type: 'user_input', timestamp: '2024-01-01T00:00:00Z', content: 'Hello' }
          ]
        });

        const expectedEvaluation = {
          ...mockProgramEvaluation,
          score: 88, // (85 + 90) / 2 = 87.5, rounded to 88
          domainScores: {
            engaging_with_ai: 88, // (85 + 90) / 2 = 87.5, rounded to 88
            creating_with_ai: 88, // (80 + 95) / 2 = 87.5, rounded to 88  
            managing_ai: 88, // (90 + 85) / 2 = 87.5, rounded to 88
            designing_ai: 85 // (80 + 90) / 2 = 85
          },
          pblData: {
            ...mockProgramEvaluation.pblData,
            taskEvaluationIds: ['task-eval-123', 'task-eval-456'],
            ksaScores: {
              knowledge: 88, // (85 + 90) / 2 = 87.5, rounded to 88
              skills: 84, // (80 + 88) / 2 = 84
              attitudes: 91 // (90 + 92) / 2 = 91
            },
            evaluatedTasks: 2,
            totalTasks: 2,
            conversationCount: 1
          }
        };

        mockEvalRepo.create.mockResolvedValue(expectedEvaluation);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.evaluation.score).toBe(88);
        
        expect(mockEvalRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            score: 88,
            domainScores: {
              engaging_with_ai: 88,
              creating_with_ai: 88,
              managing_ai: 88,
              designing_ai: 85
            },
            pblData: expect.objectContaining({
              evaluatedTasks: 2,
              totalTasks: 2
            })
          })
        );
      });

      it('should handle no completed tasks gracefully', async () => {
        const incompleteTasks = [
          { ...mockTask, id: 'task-pending', status: 'pending', metadata: {} },
          { ...mockTask, id: 'task-active', status: 'active', metadata: {} }
        ];

        mockTaskRepo.findByProgram.mockResolvedValue(incompleteTasks);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({ 
          ...mockTask, 
          interactions: []
        });

        const zeroScoreEvaluation = {
          ...mockProgramEvaluation,
          score: 0,
          domainScores: {},
          pblData: {
            ...mockProgramEvaluation.pblData,
            taskEvaluationIds: [],
            evaluatedTasks: 0,
            totalTasks: 2,
            conversationCount: 0
          }
        };

        mockEvalRepo.create.mockResolvedValue(zeroScoreEvaluation);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.evaluation.score).toBe(0);
        expect(data.evaluation.pblData.evaluatedTasks).toBe(0);
        expect(data.evaluation.pblData.totalTasks).toBe(2);
      });

      it('should handle tasks with invalid/missing scores', async () => {
        const taskWithStringScore = { ...mockTask, id: 'task-string', metadata: { evaluationId: 'eval-string' } };
        const taskWithNullScore = { ...mockTask, id: 'task-null', metadata: { evaluationId: 'eval-null' } };
        const tasks = [taskWithStringScore, taskWithNullScore];

        const stringEval = { ...mockTaskEvaluation, id: 'eval-string', score: '75.5' }; // String score
        const nullEval = { ...mockTaskEvaluation, id: 'eval-null', score: null }; // Null score

        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockEvalRepo.findById.mockImplementation((id) => {
          if (id === 'eval-string') return Promise.resolve(stringEval);
          if (id === 'eval-null') return Promise.resolve(nullEval);
          return Promise.resolve(null);
        });
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({ 
          ...mockTask, 
          interactions: []
        });

        const resultEvaluation = {
          ...mockProgramEvaluation,
          score: 76, // parseFloat('75.5') = 75.5, rounded to 76. null is filtered out
        };

        mockEvalRepo.create.mockResolvedValue(resultEvaluation);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.evaluation.score).toBe(76); // Only the valid parsed score
      });

      it('should calculate conversation count from user interactions', async () => {
        const tasks = [mockTask];
        
        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockEvalRepo.findById.mockResolvedValue(mockTaskEvaluation);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: [
            { type: 'user_input', timestamp: '2024-01-01T00:00:00Z', content: 'Question 1' },
            { type: 'assistant', timestamp: '2024-01-01T00:01:00Z', content: 'Answer 1' },
            { type: 'user_input', timestamp: '2024-01-01T00:02:00Z', content: 'Question 2' },
            { type: 'assistant', timestamp: '2024-01-01T00:03:00Z', content: 'Answer 2' },
            { type: 'user_input', timestamp: '2024-01-01T00:04:00Z', content: 'Question 3' },
            { type: 'system', timestamp: '2024-01-01T00:05:00Z', content: 'System message' }
          ]
        });

        const conversationEvaluation = {
          ...mockProgramEvaluation,
          pblData: {
            ...mockProgramEvaluation.pblData,
            conversationCount: 3 // Only count user_input interactions
          }
        };

        mockEvalRepo.create.mockResolvedValue(conversationEvaluation);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.evaluation.pblData.conversationCount).toBe(3);
      });
    });

    describe('Existing Evaluation Updates', () => {
      beforeEach(() => {
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);
        mockProgramRepo.findById.mockResolvedValue({
          ...mockProgram,
          metadata: { evaluationId: 'existing-eval-123' }
        });
      });

      it('should update existing evaluation when score changes', async () => {
        const existingEvaluation = {
          ...mockProgramEvaluation,
          id: 'existing-eval-123',
          score: 70, // Old score
          metadata: {
            ...mockProgramEvaluation.metadata,
            evaluatedTaskCount: 1,
            qualitativeFeedback: {
              en: { content: 'Old feedback', isValid: true }
            }
          }
        };

        const tasks = [mockTask];
        const updatedEvaluation = {
          ...existingEvaluation,
          score: 85, // New score
          metadata: {
            ...existingEvaluation.metadata,
            qualitativeFeedback: {
              en: { content: 'Old feedback', isValid: false } // Feedback flags cleared
            },
            lastSyncedAt: '2024-01-01T01:00:00Z'
          }
        };

        mockEvalRepo.findById.mockResolvedValue(existingEvaluation);
        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockEvalRepo.findById.mockImplementation((id) => {
          if (id === 'existing-eval-123') return Promise.resolve(existingEvaluation);
          if (id === 'task-eval-123') return Promise.resolve(mockTaskEvaluation);
          return Promise.resolve(null);
        });
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });
        mockEvalRepo.update.mockResolvedValue(updatedEvaluation);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.debug.updateReason).toBe('score_update');

        // Verify update was called with cleared feedback flags
        expect(mockEvalRepo.update).toHaveBeenCalledWith('existing-eval-123', {
          score: 85,
          domainScores: expect.any(Object),
          metadata: expect.objectContaining({
            isLatest: true,
            syncChecksum: 'abcdef12',
            qualitativeFeedback: {
              en: { content: 'Old feedback', isValid: false }
            }
          })
        });
      });

      it('should update when evaluated task count changes', async () => {
        const existingEvaluation = {
          ...mockProgramEvaluation,
          id: 'existing-eval-123',
          score: 85,
          metadata: {
            ...mockProgramEvaluation.metadata,
            evaluatedTaskCount: 1, // Old count
          }
        };

        // Add a second completed task
        const task2 = { ...mockTask, id: 'task-456', metadata: { evaluationId: 'task-eval-456' } };
        const tasks = [mockTask, task2];
        const taskEval2 = { ...mockTaskEvaluation, id: 'task-eval-456', taskId: 'task-456' };

        mockEvalRepo.findById.mockImplementation((id) => {
          if (id === 'existing-eval-123') return Promise.resolve(existingEvaluation);
          if (id === 'task-eval-123') return Promise.resolve(mockTaskEvaluation);
          if (id === 'task-eval-456') return Promise.resolve(taskEval2);
          return Promise.resolve(null);
        });
        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });

        const updatedEvaluation = {
          ...existingEvaluation,
          metadata: {
            ...existingEvaluation.metadata,
            evaluatedTaskCount: 2, // Updated count
          }
        };
        mockEvalRepo.update.mockResolvedValue(updatedEvaluation);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.debug.updateReason).toBe('score_update');
        
        expect(mockEvalRepo.update).toHaveBeenCalledWith('existing-eval-123', 
          expect.objectContaining({
            metadata: expect.objectContaining({
              evaluatedTaskCount: 2
            })
          })
        );
      });

      it('should not update when evaluation is current', async () => {
        const currentEvaluation = {
          ...mockProgramEvaluation,
          id: 'existing-eval-123',
          score: 85,
          metadata: {
            ...mockProgramEvaluation.metadata,
            evaluatedTaskCount: 1,
          }
        };

        const tasks = [mockTask];

        mockEvalRepo.findById.mockImplementation((id) => {
          if (id === 'existing-eval-123') return Promise.resolve(currentEvaluation);
          if (id === 'task-eval-123') return Promise.resolve(mockTaskEvaluation);
          return Promise.resolve(null);
        });
        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.evaluation).toEqual(currentEvaluation);

        // Should not call update
        expect(mockEvalRepo.update).not.toHaveBeenCalled();
        expect(mockEvalRepo.create).not.toHaveBeenCalled();
      });
    });

    describe('Domain Score Aggregation', () => {
      beforeEach(() => {
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
      });

      it('should aggregate domain scores from task evaluations', async () => {
        const task1 = { ...mockTask, id: 'task-1', metadata: { evaluationId: 'eval-1' } };
        const task2 = { ...mockTask, id: 'task-2', metadata: { evaluationId: 'eval-2' } };
        const tasks = [task1, task2];

        const eval1 = {
          ...mockTaskEvaluation,
          id: 'eval-1',
          domainScores: {
            engaging_with_ai: 80,
            creating_with_ai: 75
          }
        };

        const eval2 = {
          ...mockTaskEvaluation,
          id: 'eval-2',
          domainScores: {
            engaging_with_ai: 90,
            managing_ai: 85
          }
        };

        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockEvalRepo.findById.mockImplementation((id) => {
          if (id === 'eval-1') return Promise.resolve(eval1);
          if (id === 'eval-2') return Promise.resolve(eval2);
          return Promise.resolve(null);
        });
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });

        const aggregatedEvaluation = {
          ...mockProgramEvaluation,
          domainScores: {
            engaging_with_ai: 85, // (80 + 90) / 2
            creating_with_ai: 75, // Only from eval1
            managing_ai: 85       // Only from eval2
          }
        };

        mockEvalRepo.create.mockResolvedValue(aggregatedEvaluation);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        
        expect(mockEvalRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            domainScores: {
              engaging_with_ai: 85,
              creating_with_ai: 75,
              managing_ai: 85
            }
          })
        );
      });

      it('should handle domain scores in metadata', async () => {
        const tasks = [mockTask];
        const evalWithMetadataDomains = {
          ...mockTaskEvaluation,
          domainScores: undefined, // No direct domainScores
          metadata: {
            ...mockTaskEvaluation.metadata,
            domainScores: {
              engaging_with_ai: 95,
              designing_ai: 88
            }
          }
        };

        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockEvalRepo.findById.mockResolvedValue(evalWithMetadataDomains);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });

        const resultEvaluation = {
          ...mockProgramEvaluation,
          domainScores: {
            engaging_with_ai: 95,
            designing_ai: 88
          }
        };

        mockEvalRepo.create.mockResolvedValue(resultEvaluation);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        expect(mockEvalRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            domainScores: {
              engaging_with_ai: 95,
              designing_ai: 88
            }
          })
        );
      });

      it('should handle missing domain scores gracefully', async () => {
        const tasks = [mockTask];
        const evalWithoutDomains = {
          ...mockTaskEvaluation,
          domainScores: undefined,
          metadata: {
            ...mockTaskEvaluation.metadata,
            domainScores: undefined
          }
        };

        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockEvalRepo.findById.mockResolvedValue(evalWithoutDomains);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });

        const resultEvaluation = {
          ...mockProgramEvaluation,
          domainScores: {} // Empty object
        };

        mockEvalRepo.create.mockResolvedValue(resultEvaluation);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        expect(mockEvalRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            domainScores: {}
          })
        );
      });
    });

    describe('KSA Score Aggregation', () => {
      beforeEach(() => {
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
      });

      it('should aggregate KSA scores from task evaluations', async () => {
        const task1 = { ...mockTask, id: 'task-1', metadata: { evaluationId: 'eval-1' } };
        const task2 = { ...mockTask, id: 'task-2', metadata: { evaluationId: 'eval-2' } };
        const tasks = [task1, task2];

        const eval1 = {
          ...mockTaskEvaluation,
          id: 'eval-1',
          metadata: {
            ksaScores: {
              knowledge: 80,
              skills: 75,
              attitudes: 85
            }
          }
        };

        const eval2 = {
          ...mockTaskEvaluation,
          id: 'eval-2',
          metadata: {
            ksaScores: {
              knowledge: 90,
              skills: 85,
              attitudes: 80
            }
          }
        };

        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockEvalRepo.findById.mockImplementation((id) => {
          if (id === 'eval-1') return Promise.resolve(eval1);
          if (id === 'eval-2') return Promise.resolve(eval2);
          return Promise.resolve(null);
        });
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });

        const aggregatedEvaluation = {
          ...mockProgramEvaluation,
          pblData: {
            ...mockProgramEvaluation.pblData,
            ksaScores: {
              knowledge: 85, // (80 + 90) / 2
              skills: 80,    // (75 + 85) / 2  
              attitudes: 83  // (85 + 80) / 2 = 82.5, rounded to 83
            }
          }
        };

        mockEvalRepo.create.mockResolvedValue(aggregatedEvaluation);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        
        expect(mockEvalRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            pblData: expect.objectContaining({
              ksaScores: {
                knowledge: 85,
                skills: 80,
                attitudes: 83
              }
            })
          })
        );
      });

      it('should handle missing KSA scores', async () => {
        const tasks = [mockTask];
        const evalWithoutKSA = {
          ...mockTaskEvaluation,
          metadata: {} // No ksaScores
        };

        mockTaskRepo.findByProgram.mockResolvedValue(tasks);
        mockEvalRepo.findById.mockResolvedValue(evalWithoutKSA);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });

        const resultEvaluation = {
          ...mockProgramEvaluation,
          pblData: {
            ...mockProgramEvaluation.pblData,
            ksaScores: {
              knowledge: 0,
              skills: 0,
              attitudes: 0
            }
          }
        };

        mockEvalRepo.create.mockResolvedValue(resultEvaluation);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        expect(mockEvalRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            pblData: expect.objectContaining({
              ksaScores: {
                knowledge: 0,
                skills: 0,
                attitudes: 0
              }
            })
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should return 500 for repository errors', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'user-123', email: 'test@example.com' } } as any);
        mockUserRepo.findByEmail.mockRejectedValue(new Error('Database connection failed'));

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'Failed to complete program'
        });
      });

      it('should handle evaluation creation failure gracefully', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
        mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);
        mockEvalRepo.findById.mockResolvedValue(mockTaskEvaluation);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });
        mockEvalRepo.create.mockRejectedValue(new Error('Failed to create evaluation'));

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete', {
          method: 'POST'
        });

        const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'Failed to complete program'
        });
      });
    });
  });

  describe('GET', () => {
    beforeEach(() => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
    });

    describe('Authentication and Authorization', () => {
      it('should return 401 for unauthenticated requests', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete');

        const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'Authentication required'
        });
      });

      it('should return 404 when user not found', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete');

        const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'User not found'
        });
      });

      it('should return 404 when program not found', async () => {
        mockProgramRepo.findById.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete');

        const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'Program not found'
        });
      });

      it('should return 403 when user does not own program', async () => {
        mockProgramRepo.findById.mockResolvedValue({
          ...mockProgram,
          userId: 'different-user-123'
        });

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete');

        const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'Access denied'
        });
      });
    });

    describe('Evaluation Retrieval', () => {
      it('should return existing valid evaluation', async () => {
        const programWithEval = {
          ...mockProgram,
          metadata: { evaluationId: 'existing-eval-123' }
        };

        const validEvaluation = {
          ...mockProgramEvaluation,
          id: 'existing-eval-123',
          metadata: {
            ...mockProgramEvaluation.metadata,
            isLatest: true,
            evaluatedTaskCount: 1,
            qualitativeFeedback: {
              en: { content: 'Great work!', isValid: true }
            }
          }
        };

        mockProgramRepo.findById.mockResolvedValue(programWithEval);
        mockEvalRepo.findById.mockResolvedValue(validEvaluation);
        mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete?language=en');

        const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.evaluation).toEqual(validEvaluation);
        expect(data.needsFeedbackGeneration).toBe(false);
        expect(data.currentLanguage).toBe('en');
      });

      it('should trigger new evaluation when none exists', async () => {
        const programWithoutEval = {
          ...mockProgram,
          metadata: {} // No evaluationId
        };

        mockProgramRepo.findById.mockResolvedValue(programWithoutEval);
        mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);
        mockEvalRepo.findById.mockResolvedValue(mockTaskEvaluation);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });
        mockEvalRepo.create.mockResolvedValue(mockProgramEvaluation);
        mockProgramRepo.update.mockResolvedValue({ ...programWithoutEval, status: 'completed' });

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete');

        const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.evaluation).toEqual(mockProgramEvaluation);
      });

      it('should indicate when feedback generation is needed', async () => {
        const programWithEval = {
          ...mockProgram,
          metadata: { evaluationId: 'existing-eval-123' }
        };

        const evaluationNeedingFeedback = {
          ...mockProgramEvaluation,
          id: 'existing-eval-123',
          metadata: {
            ...mockProgramEvaluation.metadata,
            evaluatedTasks: 2,
            qualitativeFeedback: {} // No feedback for requested language
          }
        };

        mockProgramRepo.findById.mockResolvedValue(programWithEval);
        mockEvalRepo.findById.mockResolvedValue(evaluationNeedingFeedback);
        mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete?language=zh');

        const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.needsFeedbackGeneration).toBe(true);
        expect(data.currentLanguage).toBe('zh');
      });

      it('should default to english when no language specified', async () => {
        const programWithEval = {
          ...mockProgram,
          metadata: { evaluationId: 'existing-eval-123' }
        };

        mockProgramRepo.findById.mockResolvedValue(programWithEval);
        mockEvalRepo.findById.mockResolvedValue(mockProgramEvaluation);
        mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete');

        const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.currentLanguage).toBe('en');
      });
    });

    describe('Error Handling', () => {
      it('should return 500 when evaluation retrieval fails', async () => {
        const programWithEval = {
          ...mockProgram,
          metadata: { evaluationId: 'existing-eval-123' }
        };

        mockProgramRepo.findById.mockResolvedValue(programWithEval);
        mockEvalRepo.findById.mockRejectedValue(new Error('Database error'));

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete');

        const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'Failed to fetch evaluation'
        });
      });

      it('should return 500 when evaluation creation during GET fails', async () => {
        const programWithoutEval = {
          ...mockProgram,
          metadata: {}
        };

        mockProgramRepo.findById.mockResolvedValue(programWithoutEval);
        mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);
        mockEvalRepo.findById.mockResolvedValue(mockTaskEvaluation);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue({
          ...mockTask,
          interactions: []
        });
        mockEvalRepo.create.mockRejectedValue(new Error('Creation failed'));

        const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog-123/complete');

        const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data).toEqual({
          success: false,
          error: 'Failed to get or create evaluation'
        });
      });
    });
  });
});