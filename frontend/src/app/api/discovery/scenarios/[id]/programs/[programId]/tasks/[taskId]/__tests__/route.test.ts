/**
 * Discovery Task API Route Tests
 * 測試 Discovery 模組任務操作 API
 */

import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';
import { createMockNextRequest, createMockPostRequest } from '@/test-utils/mock-next-request';
import { mockConsoleError } from '@/test-utils/helpers/console';
import type { IScenario, IProgram, ITask, IEvaluation } from '@/types/unified-learning';
import type { Interaction } from '@/lib/repositories/interfaces';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/ai/vertex-ai-service');
jest.mock('@/lib/services/discovery-yaml-loader');
jest.mock('@/lib/services/translation-service');
jest.mock('@/lib/db/get-pool');

// Import mocked dependencies
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { VertexAIService } from '@/lib/ai/vertex-ai-service';
import { DiscoveryYAMLLoader } from '@/lib/services/discovery-yaml-loader';
import { TranslationService } from '@/lib/services/translation-service';

// Mock console errors
const mockConsoleErrorFn = mockConsoleError();

// Type the mocked dependencies
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;
const MockVertexAIService = VertexAIService as jest.MockedClass<typeof VertexAIService>;
const MockDiscoveryYAMLLoader = DiscoveryYAMLLoader as jest.MockedClass<typeof DiscoveryYAMLLoader>;
const MockTranslationService = TranslationService as jest.MockedClass<typeof TranslationService>;

describe('/api/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]', () => {
  let mockProgramRepo: any;
  let mockTaskRepo: any;
  let mockScenarioRepo: any;
  let mockEvaluationRepo: any;
  let mockVertexAIInstance: any;
  let mockDiscoveryLoaderInstance: any;
  let mockTranslationServiceInstance: any;
  let mockPool: any;

  // Mock data
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    }
  };

  const mockScenario: IScenario = {
    id: 'scenario-123',
    mode: 'discovery',
    status: 'active',
    version: '1.0.0',
    sourceType: 'yaml',
    sourcePath: 'test-scenario.yaml',
    sourceMetadata: {},
    title: { 
      en: 'Software Developer Career',
      zh: '軟體開發工程師職涯'
    },
    description: { 
      en: 'Explore software development career',
      zh: '探索軟體開發職涯'
    },
    objectives: ['Learn programming', 'Build projects'],
    difficulty: 'intermediate',
    estimatedMinutes: 180,
    prerequisites: [],
    taskTemplates: [],
    taskCount: 3,
    xpRewards: {},
    unlockRequirements: {},
    aiModules: {},
    resources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      careerType: 'software-developer'
    },
    pblData: {},
    discoveryData: {},
    assessmentData: {}
  };

  const mockProgram: IProgram = {
    id: 'program-123',
    userId: 'user-123',
    scenarioId: 'scenario-123',
    mode: 'discovery',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 3,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    timeSpentSeconds: 0,
    metadata: {
      language: 'en',
      taskIds: ['task-123', 'task-456', 'task-789'],
      currentTaskId: 'task-123',
      totalXP: 150
    },
    pblData: {},
    discoveryData: {},
    assessmentData: {}
  };

  const mockTask: ITask = {
    id: 'task-123',
    programId: 'program-123',
    mode: 'discovery',
    taskIndex: 0,
    scenarioTaskIndex: 0,
    title: { 
      en: 'Introduction to Programming',
      zh: '程式設計入門'
    },
    description: { 
      en: 'Learn basic programming concepts',
      zh: '學習基本程式設計概念'
    },
    type: 'question',
    status: 'active',
    content: { 
      instructions: { 
        en: 'Complete the programming task',
        zh: '完成程式設計任務'
      },
      xp: 100
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      instructions: 'Complete the programming task'
    },
    pblData: {},
    discoveryData: {},
    assessmentData: {}
  };

  const mockEvaluation: IEvaluation = {
    id: 'eval-123',
    userId: 'user-123',
    programId: 'program-123',
    taskId: 'task-123',
    mode: 'discovery',
    evaluationType: 'task',
    evaluationSubtype: 'discovery_task',
    score: 85,
    maxScore: 100,
    domainScores: {},
    feedbackText: 'Good work!',
    feedbackData: {
      en: 'Good work!',
      zh: '做得好！'
    },
    aiAnalysis: {},
    timeTakenSeconds: 300,
    createdAt: new Date().toISOString(),
    pblData: {},
    discoveryData: {
      xpEarned: 85,
      totalAttempts: 1,
      passedAttempts: 1,
      skillsImproved: ['programming', 'problem-solving']
    },
    assessmentData: {},
    metadata: {
      feedbackVersions: {
        en: 'Good work!',
        zh: '做得好！'
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repository mocks
    mockProgramRepo = {
      findById: jest.fn(),
      update: jest.fn()
    };

    mockTaskRepo = {
      getTaskWithInteractions: jest.fn(),
      update: jest.fn(),
      updateInteractions: jest.fn(),
      recordAttempt: jest.fn(),
      updateStatus: jest.fn(),
      findByProgram: jest.fn()
    };

    mockScenarioRepo = {
      findById: jest.fn()
    };

    mockEvaluationRepo = {
      findById: jest.fn(),
      create: jest.fn()
    };

    // Setup service mocks
    mockVertexAIInstance = {
      sendMessage: jest.fn()
    };

    mockDiscoveryLoaderInstance = {
      loadPath: jest.fn()
    };

    mockTranslationServiceInstance = {
      translateFeedback: jest.fn()
    };

    mockPool = {
      query: jest.fn()
    };

    // Mock factory returns
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
    mockRepositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo);
    mockRepositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(mockEvaluationRepo);

    // Mock service constructors
    MockVertexAIService.mockImplementation(() => mockVertexAIInstance);
    MockDiscoveryYAMLLoader.mockImplementation(() => mockDiscoveryLoaderInstance);
    MockTranslationService.mockImplementation(() => mockTranslationServiceInstance);

    // Mock static methods
    MockTranslationService.getFeedbackByLanguage = jest.fn();

    // Mock database pool
    const { getPool } = require('@/lib/db/get-pool');
    getPool.mockReturnValue(mockPool);
  });

  describe('GET - Retrieve Task', () => {
    describe('Authentication', () => {
      it('should return 401 if user is not authenticated', async () => {
        // Arrange
        mockGetServerSession.mockResolvedValue(null);
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });

      it('should return 401 if session has no user email', async () => {
        // Arrange
        mockGetServerSession.mockResolvedValue({ user: { id: 'user-without-email', email: '' } });
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Authorization', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(mockSession);
      });

      it('should return 403 if program not found', async () => {
        // Arrange
        mockProgramRepo.findById.mockResolvedValue(null);
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(403);
        expect(data.error).toBe('Forbidden');
      });

      it('should return 403 if program belongs to different user', async () => {
        // Arrange
        const otherUserProgram = { ...mockProgram, userId: 'other-user' };
        mockProgramRepo.findById.mockResolvedValue(otherUserProgram);
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(403);
        expect(data.error).toBe('Forbidden');
      });
    });

    describe('Task Retrieval', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(mockSession);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
      });

      it('should return 404 if task not found', async () => {
        // Arrange
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(null);
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(404);
        expect(data.error).toBe('Task not found');
      });

      it('should return 404 if task belongs to different program', async () => {
        // Arrange
        const differentProgramTask = { ...mockTask, programId: 'different-program' };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(differentProgramTask);
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(404);
        expect(data.error).toBe('Task not found');
      });

      it('should return task data successfully', async () => {
        // Arrange
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTask);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.id).toBe('task-123');
        expect(data.title).toBe('Introduction to Programming');
        expect(data.type).toBe('question');
        expect(data.status).toBe('active');
        expect(data.careerType).toBe('software-developer');
        expect(data.scenarioTitle).toBe('Software Developer Career');
      });

      it('should process language parameter for task content', async () => {
        // Arrange
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTask);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123?lang=zh');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.title).toBe('程式設計入門');
        expect(data.scenarioTitle).toBe('軟體開發工程師職涯');
        expect(data.content.instructions).toBe('完成程式設計任務');
      });

      it('should handle JSON string titles', async () => {
        // Arrange
        const taskWithJsonTitle = {
          ...mockTask,
          title: '{"en": "JSON Title", "zh": "JSON 標題"}'
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(taskWithJsonTitle);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123?lang=zh');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.title).toBe('JSON 標題');
      });

      it('should include completed evaluation with multilingual feedback', async () => {
        // Arrange
        const completedTask = {
          ...mockTask,
          status: 'completed',
          metadata: {
            ...mockTask.metadata,
            evaluationId: 'eval-123'
          }
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(completedTask);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        mockEvaluationRepo.findById.mockResolvedValue(mockEvaluation);
        MockTranslationService.getFeedbackByLanguage = jest.fn().mockReturnValue('Good work!');
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123?lang=en');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.evaluation).toBeDefined();
        expect(data.evaluation.id).toBe('eval-123');
        expect(data.evaluation.score).toBe(85);
        expect(data.evaluation.feedback).toBe('Good work!');
      });

      it('should translate evaluation feedback when language not available', async () => {
        // Arrange
        const completedTask = {
          ...mockTask,
          status: 'completed',
          metadata: {
            ...mockTask.metadata,
            evaluationId: 'eval-123'
          }
        };
        const evaluationWithoutZh = {
          ...mockEvaluation,
          feedbackData: { en: 'Good work!' } // No zh translation
        };
        
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(completedTask);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        mockEvaluationRepo.findById.mockResolvedValue(evaluationWithoutZh);
        mockTranslationServiceInstance.translateFeedback.mockResolvedValue('做得好！');
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123?lang=zh');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.evaluation.feedback).toBe('做得好！');
        expect(mockTranslationServiceInstance.translateFeedback).toHaveBeenCalledWith(
          'Good work!',
          'zh',
          'software-developer'
        );
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(mockSession);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
      });

      it('should handle repository errors gracefully', async () => {
        // Arrange
        mockTaskRepo.getTaskWithInteractions.mockRejectedValue(new Error('Database connection failed'));
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
        expect(mockConsoleErrorFn).toHaveBeenCalledWith(
          'Error in GET task:',
          expect.any(Error)
        );
      });

      it('should handle missing scenario gracefully', async () => {
        // Arrange
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTask);
        mockScenarioRepo.findById.mockResolvedValue(null);
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.careerType).toBe('unknown');
        expect(data.scenarioTitle).toBe('Discovery Scenario');
      });

      it('should handle string scenario title', async () => {
        // Arrange
        const scenarioWithStringTitle = {
          ...mockScenario,
          title: 'Simple String Title'
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTask);
        mockScenarioRepo.findById.mockResolvedValue(scenarioWithStringTitle);
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.scenarioTitle).toBe('Simple String Title');
      });

      it('should process content with nested multilingual objects', async () => {
        // Arrange
        const taskWithNestedContent = {
          ...mockTask,
          content: {
            ...mockTask.content,
            description: {
              en: 'English description',
              zh: '中文描述'
            }
          }
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(taskWithNestedContent);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123?lang=zh');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.content.description).toBe('中文描述');
      });

      it('should handle evaluation with nested evaluation structure', async () => {
        // Arrange
        const completedTask = {
          ...mockTask,
          status: 'completed',
          metadata: {
            ...mockTask.metadata,
            evaluation: { id: 'eval-123' }
          }
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(completedTask);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        mockEvaluationRepo.findById.mockResolvedValue(mockEvaluation);
        MockTranslationService.getFeedbackByLanguage = jest.fn().mockReturnValue('Good work!');
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123?lang=en');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.evaluation).toBeDefined();
        expect(data.evaluation.id).toBe('eval-123');
      });

      it('should handle translation service errors gracefully', async () => {
        // Arrange
        const completedTask = {
          ...mockTask,
          status: 'completed',
          metadata: {
            ...mockTask.metadata,
            evaluationId: 'eval-123'
          }
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(completedTask);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        mockEvaluationRepo.findById.mockResolvedValue(mockEvaluation);
        mockTranslationServiceInstance.translateFeedback.mockRejectedValue(new Error('Translation failed'));
        MockTranslationService.getFeedbackByLanguage = jest.fn().mockReturnValue('Good work!');
        
        const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123?lang=fr');

        // Act
        const response = await GET(request, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.evaluation.feedback).toBe('Good work!'); // Falls back to available version
      });
    });
  });

  describe('PATCH - Update Task', () => {
    describe('Authentication', () => {
      it('should return 401 if user is not authenticated', async () => {
        // Arrange
        mockGetServerSession.mockResolvedValue(null);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'submit', content: { response: 'My answer' } }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Authorization', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(mockSession);
      });

      it('should return 403 if program not found', async () => {
        // Arrange
        mockProgramRepo.findById.mockResolvedValue(null);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'submit', content: { response: 'My answer' } }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(403);
        expect(data.error).toBe('Forbidden');
      });

      it('should return 403 if program belongs to different user', async () => {
        // Arrange
        const otherUserProgram = { ...mockProgram, userId: 'other-user' };
        mockProgramRepo.findById.mockResolvedValue(otherUserProgram);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'submit', content: { response: 'My answer' } }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(403);
        expect(data.error).toBe('Forbidden');
      });

      it('should return 404 if task not found', async () => {
        // Arrange
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(null);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'submit', content: { response: 'My answer' } }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(404);
        expect(data.error).toBe('Task not found');
      });
    });

    describe('Submit Action', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(mockSession);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTask);
      });

      it('should submit task response and get AI evaluation', async () => {
        // Arrange
        const aiEvaluation = {
          feedback: 'Good answer!',
          strengths: ['Clear thinking'],
          improvements: ['More detail needed'],
          completed: true,
          xpEarned: 85,
          skillsImproved: ['problem-solving']
        };
        mockVertexAIInstance.sendMessage.mockResolvedValue({
          content: JSON.stringify(aiEvaluation)
        });
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { 
            action: 'submit', 
            content: { 
              response: 'I learned that programming requires logical thinking...',
              timeSpent: 300
            } 
          }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.completed).toBe(true);
        expect(data.feedback).toBe('Good answer!');
        expect(data.strengths).toEqual(['Clear thinking']);
        expect(data.improvements).toEqual(['More detail needed']);
        expect(data.xpEarned).toBe(85);
        expect(data.canComplete).toBe(true);

        expect(mockTaskRepo.updateInteractions).toHaveBeenCalledWith(
          'task-123',
          expect.arrayContaining([
            expect.objectContaining({
              type: 'user_input',
              content: 'I learned that programming requires logical thinking...',
              metadata: { timeSpent: 300 }
            })
          ])
        );

        expect(mockTaskRepo.recordAttempt).toHaveBeenCalledWith('task-123', {
          response: 'I learned that programming requires logical thinking...',
          timeSpent: 300
        });
      });

      it('should handle AI evaluation parsing errors gracefully', async () => {
        // Arrange
        mockVertexAIInstance.sendMessage.mockResolvedValue({
          content: 'Invalid JSON response'
        });
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { 
            action: 'submit', 
            content: { 
              response: 'My answer',
              timeSpent: 300
            } 
          }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.completed).toBe(true); // Falls back to true
        expect(data.feedback).toBe('Invalid JSON response');
        expect(data.xpEarned).toBe(100); // Default XP
      });

      it('should handle AI service errors', async () => {
        // Arrange
        mockVertexAIInstance.sendMessage.mockRejectedValue(new Error('AI service unavailable'));
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { 
            action: 'submit', 
            content: { 
              response: 'My answer',
              timeSpent: 300
            } 
          }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(false);
        expect(data.error).toBe('AI evaluation failed');
        expect(data.canComplete).toBe(false);
      });

      it('should use Chinese prompts for zhTW language', async () => {
        // Arrange
        const programWithZhLanguage = {
          ...mockProgram,
          metadata: { ...mockProgram.metadata, language: 'zhTW' }
        };
        mockProgramRepo.findById.mockResolvedValue(programWithZhLanguage);
        
        const aiEvaluation = {
          feedback: '回答不錯！',
          completed: true,
          xpEarned: 85
        };
        mockVertexAIInstance.sendMessage.mockResolvedValue({
          content: JSON.stringify(aiEvaluation)
        });
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { 
            action: 'submit', 
            content: { 
              response: '我認為程式設計需要邏輯思考...',
              timeSpent: 300
            } 
          }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });

        // Assert
        expect(mockVertexAIInstance.sendMessage).toHaveBeenCalledWith(
          expect.stringContaining('嚴格評估學習者是否完成了指定任務')
        );
      });

      it('should handle empty response content', async () => {
        // Arrange
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { 
            action: 'submit', 
            content: { 
              response: '',
              timeSpent: 0
            } 
          }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        mockVertexAIInstance.sendMessage.mockResolvedValue({
          content: JSON.stringify({
            feedback: 'Please provide an answer',
            completed: false,
            xpEarned: 0
          })
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.completed).toBe(false);
        expect(data.canComplete).toBe(false);
      });

      it('should handle submit action with accept-language header', async () => {
        // Arrange
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { 
            action: 'submit', 
            content: { 
              response: 'My answer',
              timeSpent: 300
            } 
          }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });
        // Mock accept-language header
        Object.defineProperty(request, 'headers', {
          value: new Map([
            ['accept-language', 'zh-TW,zh;q=0.9,en;q=0.8']
          ])
        });

        mockVertexAIInstance.sendMessage.mockResolvedValue({
          content: JSON.stringify({
            feedback: 'Answer received',
            completed: true,
            xpEarned: 85
          })
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert  
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.feedback).toBe('Answer received');
        expect(mockVertexAIInstance.sendMessage).toHaveBeenCalled();
      });

      it('should handle task with complex multilingual content', async () => {
        // Arrange
        const taskWithComplexContent = {
          ...mockTask,
          title: '{"en": "Complex Task", "zh": "複雜任務"}',
          content: {
            instructions: '{"en": "Complex instructions", "zh": "複雜指令"}',
            description: { en: 'Complex description', zh: '複雜描述' },
            xp: 100
          },
          metadata: {
            instructions: '{"en": "Complex instructions", "zh": "複雜指令"}'
          }
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(taskWithComplexContent);

        mockVertexAIInstance.sendMessage.mockResolvedValue({
          content: JSON.stringify({
            feedback: 'Good work on complex task!',
            completed: true,
            xpEarned: 85
          })
        });

        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { 
            action: 'submit', 
            content: { 
              response: 'My detailed answer for complex task',
              timeSpent: 600
            } 
          }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.feedback).toBe('Good work on complex task!');
      });
    });

    describe('Confirm Complete Action', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(mockSession);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
      });

      it('should complete task when AI has approved it', async () => {
        // Arrange
        const taskWithApprovedInteractions = {
          ...mockTask,
          interactions: [
            {
              timestamp: new Date().toISOString(),
              type: 'user_input',
              content: 'My answer',
              metadata: {}
            },
            {
              timestamp: new Date().toISOString(),
              type: 'ai_response',
              content: { completed: true, xpEarned: 85, feedback: 'Good work!' },
              metadata: { completed: true, xpEarned: 85 }
            }
          ]
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(taskWithApprovedInteractions);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);
        
        // Mock comprehensive feedback generation
        mockVertexAIInstance.sendMessage.mockResolvedValue({
          content: '**Excellent Work!**\n\nYou demonstrated strong problem-solving skills...\n\n- Dr. Turing'
        });
        
        // Mock task ordering
        mockTaskRepo.findByProgram.mockResolvedValue([
          { id: 'task-123', status: 'completed' },
          { id: 'task-456', status: 'pending' },
          { id: 'task-789', status: 'pending' }
        ]);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'confirm-complete' }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.taskCompleted).toBe(true);
        expect(data.evaluation.id).toBe('eval-123');
        expect(data.nextTaskId).toBe('task-456');
        expect(data.programCompleted).toBe(false);

        expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-123',
            programId: 'program-123',
            taskId: 'task-123',
            mode: 'discovery',
            evaluationType: 'task',
            evaluationSubtype: 'discovery_task'
          })
        );

        expect(mockTaskRepo.update).toHaveBeenCalledWith(
          'task-123',
          expect.objectContaining({
            status: 'completed',
            completedAt: expect.any(String)
          })
        );
      });

      it('should return 400 if task has not been passed yet', async () => {
        // Arrange
        const taskWithoutPassedInteractions = {
          ...mockTask,
          interactions: [
            {
              timestamp: new Date().toISOString(),
              type: 'user_input',
              content: 'My answer',
              metadata: {}
            },
            {
              timestamp: new Date().toISOString(),
              type: 'ai_response',
              content: { completed: false, xpEarned: 0, feedback: 'Not complete' },
              metadata: { completed: false }
            }
          ]
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(taskWithoutPassedInteractions);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'confirm-complete' }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe('Task has not been passed yet');
      });

      it('should complete program when all tasks are finished', async () => {
        // Arrange
        const taskWithApprovedInteractions = {
          ...mockTask,
          interactions: [
            {
              timestamp: new Date().toISOString(),
              type: 'ai_response',
              content: { completed: true, xpEarned: 85 },
              metadata: { completed: true }
            }
          ]
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(taskWithApprovedInteractions);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);
        mockVertexAIInstance.sendMessage.mockResolvedValue({
          content: 'Comprehensive feedback...'
        });
        
        // Mock all tasks completed
        mockTaskRepo.findByProgram.mockResolvedValue([
          { id: 'task-123', status: 'completed' },
          { id: 'task-456', status: 'completed' },
          { id: 'task-789', status: 'completed' }
        ]);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'confirm-complete' }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.programCompleted).toBe(true);
        expect(data.nextTaskId).toBeNull();

        expect(mockProgramRepo.update).toHaveBeenCalledWith(
          'program-123',
          { status: 'completed' }
        );

        // Should create program completion evaluation
        expect(mockEvaluationRepo.create).toHaveBeenCalledTimes(2); // Task + Program
      });

      it('should handle comprehensive feedback generation errors gracefully', async () => {
        // Arrange
        const taskWithApprovedInteractions = {
          ...mockTask,
          interactions: [
            {
              timestamp: new Date().toISOString(),
              type: 'ai_response',
              content: { completed: true, xpEarned: 85, feedback: 'Good work!' },
              metadata: { completed: true }
            }
          ]
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(taskWithApprovedInteractions);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);
        
        // Mock AI service to fail
        mockVertexAIInstance.sendMessage.mockRejectedValue(new Error('AI service failed'));
        
        // Mock task ordering
        mockTaskRepo.findByProgram.mockResolvedValue([
          { id: 'task-123', status: 'completed' },
          { id: 'task-456', status: 'pending' }
        ]);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'confirm-complete' }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.taskCompleted).toBe(true);
        // Should use fallback feedback when comprehensive feedback generation fails
        expect(data.evaluation.feedback).toBeDefined();
      });

      it('should handle task with multiple attempts and mixed results', async () => {
        // Arrange
        const taskWithMultipleAttempts = {
          ...mockTask,
          interactions: [
            {
              timestamp: new Date().toISOString(),
              type: 'user_input',
              content: 'First attempt',
              metadata: { timeSpent: 300 }
            },
            {
              timestamp: new Date().toISOString(),
              type: 'ai_response',
              content: { completed: false, xpEarned: 30, feedback: 'Need more detail' },
              metadata: { completed: false }
            },
            {
              timestamp: new Date().toISOString(),
              type: 'user_input',
              content: 'Second attempt with more detail',
              metadata: { timeSpent: 450 }
            },
            {
              timestamp: new Date().toISOString(),
              type: 'ai_response',
              content: { completed: true, xpEarned: 85, feedback: 'Much better!' },
              metadata: { completed: true }
            }
          ]
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(taskWithMultipleAttempts);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);
        
        mockVertexAIInstance.sendMessage.mockResolvedValue({
          content: 'Comprehensive feedback for multiple attempts...'
        });
        
        mockTaskRepo.findByProgram.mockResolvedValue([
          { id: 'task-123', status: 'completed' },
          { id: 'task-456', status: 'pending' }
        ]);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'confirm-complete' }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.taskCompleted).toBe(true);
        
        expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            discoveryData: expect.objectContaining({
              totalAttempts: 2,
              passedAttempts: expect.any(Number),
              xpEarned: expect.any(Number)
            })
          })
        );
      });

      it('should handle unknown career type for YAML loading', async () => {
        // Arrange
        const scenarioWithUnknownCareer = {
          ...mockScenario,
          metadata: { careerType: 'unknown' }
        };
        
        const taskWithApprovedInteractions = {
          ...mockTask,
          interactions: [
            {
              timestamp: new Date().toISOString(),
              type: 'ai_response',
              content: { completed: true, xpEarned: 85 },
              metadata: { completed: true }
            }
          ]
        };
        
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(taskWithApprovedInteractions);
        mockScenarioRepo.findById.mockResolvedValue(scenarioWithUnknownCareer);
        mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);
        
        mockVertexAIInstance.sendMessage.mockResolvedValue({
          content: 'Generic feedback for unknown career...'
        });
        
        mockTaskRepo.findByProgram.mockResolvedValue([
          { id: 'task-123', status: 'completed' }
        ]);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'confirm-complete' }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        // Should not try to load YAML for unknown career
        expect(mockDiscoveryLoaderInstance.loadPath).not.toHaveBeenCalled();
      });
    });

    describe('Regenerate Evaluation Action', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(mockSession);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
      });

      it('should return 403 in production environment', async () => {
        // Arrange
        const originalEnv = process.env.NODE_ENV;
        Object.defineProperty(process.env, 'NODE_ENV', { 
          value: 'production', 
          writable: true, 
          configurable: true 
        });
        
        // Mock the task to pass the initial checks
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTask);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'regenerate-evaluation' }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(403);
        expect(data.error).toBe('Not allowed in production');

        // Restore
        Object.defineProperty(process.env, 'NODE_ENV', { 
          value: originalEnv, 
          writable: true, 
          configurable: true 
        });
      });

      it('should return 400 if task is not completed', async () => {
        // Arrange
        Object.defineProperty(process.env, 'NODE_ENV', { 
          value: 'development', 
          writable: true, 
          configurable: true 
        });
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTask);
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'regenerate-evaluation' }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe('Task must be completed to regenerate evaluation');
      });

      it('should regenerate evaluation for completed task in development', async () => {
        // Arrange
        Object.defineProperty(process.env, 'NODE_ENV', { 
          value: 'development', 
          writable: true, 
          configurable: true 
        });
        const completedTask = {
          ...mockTask,
          status: 'completed',
          interactions: [
            {
              type: 'ai_response',
              content: { completed: true, xpEarned: 85, skillsImproved: ['programming'] },
              timestamp: new Date().toISOString(),
              metadata: {}
            }
          ],
          metadata: {
            ...mockTask.metadata,
            evaluationId: 'eval-123'
          }
        };
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(completedTask);
        mockScenarioRepo.findById.mockResolvedValue(mockScenario);
        mockVertexAIInstance.sendMessage.mockResolvedValue({
          content: 'Regenerated comprehensive feedback...'
        });
        mockPool.query.mockResolvedValue({ rows: [] });
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'regenerate-evaluation' }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.evaluation.regenerated).toBe(true);
        expect(data.evaluation.feedback).toBe('Regenerated comprehensive feedback...');

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE evaluations'),
          expect.any(Array)
        );
      });
    });

    describe('Start Action', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(mockSession);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTask);
      });

      it('should mark task as active', async () => {
        // Arrange
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'start' }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.status).toBe('active');

        expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith('task-123', 'active');
      });
    });

    describe('Invalid Actions', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(mockSession);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTask);
      });

      it('should return 400 for invalid action', async () => {
        // Arrange
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { action: 'invalid-action' }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid action');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(mockSession);
        mockProgramRepo.findById.mockResolvedValue(mockProgram);
        mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTask);
      });

      it('should handle repository errors gracefully', async () => {
        // Arrange
        mockTaskRepo.updateInteractions.mockRejectedValue(new Error('Database connection failed'));
        
        const request = createMockPostRequest(
          'http://localhost:3000/api/discovery/scenarios/scenario-123/programs/program-123/tasks/task-123',
          { 
            action: 'submit', 
            content: { response: 'My answer' }
          }
        );
        const patchRequest = new NextRequest(request.url, {
          method: 'PATCH',
          body: request.body,
          headers: request.headers
        });

        // Act
        const response = await PATCH(patchRequest, { 
          params: Promise.resolve({ 
            id: 'scenario-123', 
            programId: 'program-123', 
            taskId: 'task-123' 
          }) 
        });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
        expect(mockConsoleErrorFn).toHaveBeenCalledWith(
          'Error in PATCH task:',
          expect.any(Error)
        );
      });
    });
  });
});