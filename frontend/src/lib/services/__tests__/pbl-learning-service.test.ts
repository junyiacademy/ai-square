import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * PBL Learning Service Tests
 * 提升覆蓋率從 5.3% 到 100%
 */

import { PBLLearningService } from '../pbl-learning-service';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { IScenario, IProgram, ITask, IEvaluation, ITaskTemplate } from '@/types/unified-learning';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');

describe('PBLLearningService', () => {
  let service: PBLLearningService;
  let mockScenarioRepo: any;
  let mockProgramRepo: any;
  let mockTaskRepo: any;
  let mockEvaluationRepo: any;

  // Mock data
  const mockTaskTemplates: ITaskTemplate[] = [
    {
      id: 'task-template-1',
      title: { en: 'Understand the Problem', zh: '理解問題' },
      description: { en: 'Analyze the problem', zh: '分析問題' },
      type: 'chat',
      ksaCodes: ['K1', 'S1'],
      aiModules: ['tutor'],
      estimatedTime: 30,
      objectives: ['Understand context', 'Identify stakeholders'],
      metadata: {}
    },
    {
      id: 'task-template-2',
      title: { en: 'Explore Solutions', zh: '探索解決方案' },
      description: { en: 'Research solutions', zh: '研究解決方案' },
      type: 'creation',
      ksaCodes: ['K2', 'S2'],
      aiModules: ['tutor', 'evaluator'],
      estimatedTime: 45,
      objectives: ['Research options', 'Compare approaches'],
      metadata: {}
    },
    {
      id: 'task-template-3',
      title: { en: 'Create Solution', zh: '創建解決方案' },
      type: 'creation',
      ksaCodes: ['K3', 'S3', 'A1'],
      metadata: {}
    }
  ];

  const mockScenario: IScenario = {
    id: 'scenario-123',
    mode: 'pbl',
    status: 'active',
    sourceType: 'yaml',
    sourcePath: 'pbl/ai_ethics',
    sourceMetadata: { category: 'pbl' },
    title: { en: 'AI Ethics Challenge' },
    description: { en: 'Explore AI ethics' },
    objectives: ['Understand AI ethics', 'Create ethical guidelines'],
    taskTemplates: mockTaskTemplates,
    pblData: {
      taskTemplates: mockTaskTemplates,
      ksaMappings: [
        { code: 'K1', competency: 'Knowledge 1', domain: 'Engaging_with_AI' }
      ]
    },
    version: '1.0',
    difficulty: 'intermediate',
    estimatedMinutes: 120,
    prerequisites: [],
    taskCount: 3,
    xpRewards: { completion: 300 },
    unlockRequirements: {},
    discoveryData: {},
    assessmentData: {},
    aiModules: {},
    resources: [],
    metadata: {},
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  };

  const mockProgram: IProgram = {
    id: 'program-123',
    userId: 'user-123',
    scenarioId: 'scenario-123',
    mode: 'pbl',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 3,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: '2024-01-01',
    startedAt: '2024-01-01',
    updatedAt: '2024-01-01',
    lastActivityAt: '2024-01-01',
    timeSpentSeconds: 0,
    pblData: {
      language: 'en',
      currentPhase: 'understanding'
    },
    discoveryData: {},
    assessmentData: {},
    metadata: { language: 'en' }
  };

  const mockTask: ITask = {
    id: 'task-123',
    programId: 'program-123',
    mode: 'pbl',
    taskIndex: 0,
    type: 'chat',
    status: 'active',
    title: { en: 'Understand the Problem' },
    content: {
      instructions: 'Analyze the problem',
      objectives: ['Understand context'],
      ksaCodes: ['K1', 'S1'],
      aiModules: ['tutor']
    },
    interactions: [],
    interactionCount: 0,
    userResponse: {},
    score: 0,
    maxScore: 100,
    allowedAttempts: 3,
    attemptCount: 0,
    timeSpentSeconds: 300,
    aiConfig: { modules: ['tutor', 'evaluator'] },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    pblData: {
      phase: 'understanding',
      ksaCodes: ['K1', 'S1']
    },
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockScenarioRepo = {
      findById: jest.fn()
    };

    mockProgramRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      updateProgress: jest.fn(),
      complete: jest.fn()
    };

    mockTaskRepo = {
      findById: jest.fn(),
      findByProgram: jest.fn(),
      create: jest.fn(),
      updateInteractions: jest.fn(),
      updateStatus: jest.fn()
    };

    mockEvaluationRepo = {
      findById: jest.fn(),
      create: jest.fn()
    };

    // Return mocks from factory
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);

    // Create service instance
    service = new PBLLearningService();
  });

  describe('startLearning', () => {
    it('should start a PBL learning journey', async () => {
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockTaskRepo.create.mockImplementation((task: any) =>
        Promise.resolve({ ...task, id: `task-${Date.now()}` })
      );

      const result = await service.startLearning('user-123', 'scenario-123');

      expect(mockScenarioRepo.findById).toHaveBeenCalledWith('scenario-123');
      expect(mockProgramRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          scenarioId: 'scenario-123',
          mode: 'pbl',
          status: 'active',
          totalTaskCount: 3
        })
      );
      expect(mockTaskRepo.create).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockProgram);
    });

    it('should throw error if scenario not found', async () => {
      mockScenarioRepo.findById.mockResolvedValue(null);

      await expect(service.startLearning('user-123', 'scenario-123'))
        .rejects.toThrow('Scenario not found');
    });

    it('should throw error if scenario is not PBL type', async () => {
      mockScenarioRepo.findById.mockResolvedValue({ ...mockScenario, mode: 'discovery' });

      await expect(service.startLearning('user-123', 'scenario-123'))
        .rejects.toThrow('Scenario is not a PBL scenario');
    });

    it('should use specified language', async () => {
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockTaskRepo.create.mockImplementation((task: any) =>
        Promise.resolve({ ...task, id: `task-${Date.now()}` })
      );

      await service.startLearning('user-123', 'scenario-123', { language: 'zh' });

      expect(mockProgramRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pblData: expect.objectContaining({
            language: 'zh'
          }),
          metadata: { language: 'zh' }
        })
      );

      // Check first task uses Chinese description
      const firstTaskCall = mockTaskRepo.create.mock.calls[0][0];
      expect(firstTaskCall.content.instructions).toBe('分析問題');
    });

    it('should handle missing pblData', async () => {
      const scenarioWithoutPblData = { ...mockScenario, pblData: null };
      mockScenarioRepo.findById.mockResolvedValue(scenarioWithoutPblData);

      await expect(service.startLearning('user-123', 'scenario-123'))
        .rejects.toThrow('Scenario is not a PBL scenario');
    });

    it('should handle empty task templates', async () => {
      const scenarioWithoutTasks = { ...mockScenario, taskTemplates: [] };
      mockScenarioRepo.findById.mockResolvedValue(scenarioWithoutTasks);
      mockProgramRepo.create.mockResolvedValue({ ...mockProgram, totalTaskCount: 0 });

      const result = await service.startLearning('user-123', 'scenario-123');

      expect(mockTaskRepo.create).not.toHaveBeenCalled();
      expect(result.totalTaskCount).toBe(0);
    });

    it('should set correct phases for tasks', async () => {
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockTaskRepo.create.mockImplementation((task: any) =>
        Promise.resolve({ ...task, id: `task-${Date.now()}` })
      );

      await service.startLearning('user-123', 'scenario-123');

      expect(mockTaskRepo.create).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          pblData: expect.objectContaining({ phase: 'understanding' })
        })
      );
      expect(mockTaskRepo.create).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          pblData: expect.objectContaining({ phase: 'exploring' })
        })
      );
      expect(mockTaskRepo.create).toHaveBeenNthCalledWith(3,
        expect.objectContaining({
          pblData: expect.objectContaining({ phase: 'creating' })
        })
      );
    });

    it('should handle string format titles and descriptions', async () => {
      const templateWithStringFields = [
        {
          id: 'string-task-1',
          title: 'Resume Analysis',  // String format instead of multilingual
          description: 'Analyze your resume with AI',  // String format
          type: 'analysis' as const,
          metadata: {}
        },
        {
          id: 'string-task-2',
          title: 'Interview Preparation',  // String format
          type: 'chat' as const,
          metadata: {}
        }
      ];

      const scenarioWithStringTasks = {
        ...mockScenario,
        taskTemplates: templateWithStringFields
      };

      mockScenarioRepo.findById.mockResolvedValue(scenarioWithStringTasks);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockTaskRepo.create.mockImplementation((task: any) =>
        Promise.resolve({ ...task, id: `task-${Date.now()}` })
      );

      await service.startLearning('user-123', 'scenario-123');

      // Check that string titles are converted to multilingual format
      expect(mockTaskRepo.create).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          title: { en: 'Resume Analysis' },  // Converted to multilingual
          content: expect.objectContaining({
            instructions: 'Analyze your resume with AI'  // String description used as instructions
          })
        })
      );

      expect(mockTaskRepo.create).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          title: { en: 'Interview Preparation' },  // Converted to multilingual
          content: expect.objectContaining({
            instructions: ''  // No description provided
          })
        })
      );
    });

    it('should handle task templates without optional fields', async () => {
      const minimalTemplate = {
        id: 'minimal',
        title: { en: 'Minimal Task' },
        type: 'chat' as const,
        metadata: {}
      };
      const scenarioWithMinimalTasks = {
        ...mockScenario,
        taskTemplates: [minimalTemplate]
      };
      mockScenarioRepo.findById.mockResolvedValue(scenarioWithMinimalTasks);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockTaskRepo.create.mockResolvedValue({ id: 'task-minimal' } as ITask);

      await service.startLearning('user-123', 'scenario-123');

      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            instructions: '',
            objectives: [],
            ksaCodes: [],
            aiModules: []
          })
        })
      );
    });
  });

  describe('getProgress', () => {
    it('should get learning progress', async () => {
      const tasks = [
        { ...mockTask, status: 'completed', timeSpentSeconds: 300 },
        { ...mockTask, id: 'task-2', status: 'completed', timeSpentSeconds: 400 },
        { ...mockTask, id: 'task-3', status: 'active', timeSpentSeconds: 100 }
      ];

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(tasks);

      const result = await service.getProgress('program-123');

      expect(result).toMatchObject({
        programId: 'program-123',
        status: 'active',
        currentTaskIndex: 0,
        totalTasks: 3,
        completedTasks: 2,
        score: 0,
        timeSpent: 800,
        estimatedTimeRemaining: 1800, // 1 remaining task * 30 minutes
        metadata: {
          currentTaskId: 'task-3',
          currentPhase: 'understanding',
          ksaProgress: {
            K1: 2,
            S1: 2
          }
        }
      });
    });

    it('should handle program not found', async () => {
      mockProgramRepo.findById.mockResolvedValue(null);

      await expect(service.getProgress('program-123'))
        .rejects.toThrow('Program not found');
    });

    it('should handle abandoned status', async () => {
      mockProgramRepo.findById.mockResolvedValue({ ...mockProgram, status: 'abandoned' });
      mockTaskRepo.findByProgram.mockResolvedValue([]);

      const result = await service.getProgress('program-123');

      expect(result.status).toBe('expired');
    });

    it('should handle no active tasks', async () => {
      const completedTasks = [
        { ...mockTask, status: 'completed' },
        { ...mockTask, id: 'task-2', status: 'completed' }
      ];
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(completedTasks);

      const result = await service.getProgress('program-123');

      expect(result.metadata?.currentTaskId).toBeUndefined();
    });
  });

  describe('submitResponse', () => {
    it('should submit response and update interactions', async () => {
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.updateInteractions.mockResolvedValue(undefined);

      const response = { answer: 'My solution' };
      const result = await service.submitResponse('program-123', 'task-123', response);

      expect(mockTaskRepo.updateInteractions).toHaveBeenCalledTimes(2); // User + AI
      expect(result).toMatchObject({
        taskId: 'task-123',
        success: true,
        score: 0,
        nextTaskAvailable: false,
        metadata: {
          aiResponse: expect.objectContaining({
            message: expect.any(String),
            feedback: expect.any(String)
          }),
          isComplete: false
        }
      });
    });

    it('should complete task when response indicates completion', async () => {
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue([
        mockTask,
        { ...mockTask, id: 'task-2', status: 'pending' }
      ]);

      const response = { isComplete: true };
      const result = await service.submitResponse('program-123', 'task-123', response);

      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith('task-123', 'completed');
      expect(mockProgramRepo.updateProgress).toHaveBeenCalledWith('program-123', 1);
      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith('task-2', 'active');
      expect(result.score).toBe(100);
      expect(result.nextTaskAvailable).toBe(true);
    });

    it('should handle task not found', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(service.submitResponse('program-123', 'task-123', {}))
        .rejects.toThrow('Task not found');
    });

    it('should handle AI responses for different phases', async () => {
      // Test exploring phase
      const exploringTask = { ...mockTask, pblData: { phase: 'exploring' } };
      mockTaskRepo.findById.mockResolvedValue(exploringTask);

      const result = await service.submitResponse('program-123', 'task-123', {});

      expect(result.metadata?.aiResponse).toMatchObject({
        message: expect.stringContaining('Excellent research'),
        feedback: expect.stringContaining('exploration is thorough')
      });
    });

    it('should complete task after multiple interactions', async () => {
      const taskWithInteractions = {
        ...mockTask,
        interactions: [
          { type: 'user_input', content: {}, timestamp: '2024-01-01' },
          { type: 'ai_response', content: {}, timestamp: '2024-01-01' },
          { type: 'user_input', content: {}, timestamp: '2024-01-01' },
          { type: 'ai_response', content: {}, timestamp: '2024-01-01' },
          { type: 'user_input', content: {}, timestamp: '2024-01-01' },
          { type: 'ai_response', content: {}, timestamp: '2024-01-01' }
        ]
      };
      mockTaskRepo.findById.mockResolvedValue(taskWithInteractions);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue([
        taskWithInteractions,
        { ...mockTask, id: 'task-2', status: 'pending' }
      ]);

      const result = await service.submitResponse('program-123', 'task-123', {});

      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith('task-123', 'completed');
      expect(result.score).toBe(100);
    });

    it('should complete task with required elements', async () => {
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue([
        mockTask,
        { ...mockTask, id: 'task-2', status: 'pending' }
      ]);

      const response = {
        problem: 'The issue is...',
        solution: 'My solution is...',
        implementation: 'I will implement by...'
      };
      const result = await service.submitResponse('program-123', 'task-123', response);

      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith('task-123', 'completed');
      expect(result.score).toBe(100);
    });

    it('should handle last task completion', async () => {
      const lastProgram = { ...mockProgram, currentTaskIndex: 2, totalTaskCount: 3 };
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockProgramRepo.findById.mockResolvedValue(lastProgram);

      const result = await service.submitResponse('program-123', 'task-123', { isComplete: true });

      expect(mockProgramRepo.updateProgress).not.toHaveBeenCalled();
      expect(result.nextTaskAvailable).toBe(true);
    });

    it('should handle creating phase', async () => {
      const creatingTask = { ...mockTask, pblData: { phase: 'creating' } };
      mockTaskRepo.findById.mockResolvedValue(creatingTask);

      const result = await service.submitResponse('program-123', 'task-123', {});

      expect(result.metadata?.aiResponse).toMatchObject({
        message: expect.stringContaining('Your solution is innovative'),
        feedback: expect.stringContaining('Creative problem-solving')
      });
    });

    it('should handle unknown phase', async () => {
      const unknownPhaseTask = { ...mockTask, pblData: { phase: 'unknown' } };
      mockTaskRepo.findById.mockResolvedValue(unknownPhaseTask);

      const result = await service.submitResponse('program-123', 'task-123', {});

      // Should default to understanding phase
      expect(result.metadata?.aiResponse).toMatchObject({
        message: expect.stringContaining("That's a good observation"),
        feedback: expect.stringContaining("showing good understanding")
      });
    });
  });

  describe('completeLearning', () => {
    it('should complete learning journey', async () => {
      const completedTasks = [
        { ...mockTask, status: 'completed', score: 80, timeSpentSeconds: 300 },
        { ...mockTask, id: 'task-2', status: 'completed', score: 90, timeSpentSeconds: 400 },
        { ...mockTask, id: 'task-3', status: 'completed', score: 85, timeSpentSeconds: 500 }
      ];

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(completedTasks);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);
      mockProgramRepo.complete.mockResolvedValue(undefined);

      const result = await service.completeLearning('program-123');

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          evaluationType: 'summative',
          evaluationSubtype: 'program_complete',
          score: 85, // Average of 80, 90, 85
          feedbackData: expect.objectContaining({
            completedTasks: 3,
            totalTime: 1200
          })
        })
      );
      expect(mockProgramRepo.complete).toHaveBeenCalledWith('program-123');
      expect(result).toMatchObject({
        program: mockProgram,
        passed: true,
        finalScore: 85
      });
    });

    it('should handle program not found', async () => {
      mockProgramRepo.findById.mockResolvedValue(null);

      await expect(service.completeLearning('program-123'))
        .rejects.toThrow('Program not found');
    });

    it('should fail if score below 70', async () => {
      const lowScoreTasks = [
        { ...mockTask, status: 'completed', score: 50 },
        { ...mockTask, id: 'task-2', status: 'completed', score: 60 }
      ];

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(lowScoreTasks);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      const result = await service.completeLearning('program-123');

      expect(result.passed).toBe(false);
      expect(result.finalScore).toBe(55);
    });

    it('should calculate domain scores correctly', async () => {
      const tasksWithDomains = [
        {
          ...mockTask,
          status: 'completed',
          score: 80,
          content: { domain: 'Engaging_with_AI' }
        },
        {
          ...mockTask,
          id: 'task-2',
          status: 'completed',
          score: 90,
          content: { domain: 'Creating_with_AI' }
        }
      ];

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(tasksWithDomains);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      await service.completeLearning('program-123');

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          domainScores: expect.objectContaining({
            Engaging_with_AI: 80,
            Creating_with_AI: 90,
            Managing_AI: 0,
            Designing_AI: 0
          })
        })
      );
    });
  });

  describe('getNextTask', () => {
    it('should get active task', async () => {
      const tasks = [
        { ...mockTask, status: 'completed' },
        { ...mockTask, id: 'task-2', status: 'active' },
        { ...mockTask, id: 'task-3', status: 'pending' }
      ];
      mockTaskRepo.findByProgram.mockResolvedValue(tasks);

      const result = await service.getNextTask('program-123');

      expect(result?.id).toBe('task-2');
    });

    it('should return null if no active task', async () => {
      const tasks = [
        { ...mockTask, status: 'completed' },
        { ...mockTask, id: 'task-2', status: 'completed' }
      ];
      mockTaskRepo.findByProgram.mockResolvedValue(tasks);

      const result = await service.getNextTask('program-123');

      expect(result).toBeNull();
    });
  });

  describe('evaluateTask', () => {
    it('should evaluate task completion', async () => {
      const completedTask = {
        ...mockTask,
        status: 'completed',
        interactions: Array(6).fill({ type: 'user_input', content: {} }),
        timeSpentSeconds: 1200 // 20 minutes
      };
      mockTaskRepo.findById.mockResolvedValue(completedTask);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      const result = await service.evaluateTask('task-123');

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-123',
          evaluationType: 'formative',
          evaluationSubtype: 'task_complete',
          score: 100, // 40 (interactions) + 30 (time) + 30 (completed)
          feedbackText: 'Excellent work! You demonstrated deep understanding and creative problem-solving.'
        })
      );
      expect(result).toHaveProperty('id', 'eval-123');
    });

    it('should handle task not found', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(service.evaluateTask('task-123'))
        .rejects.toThrow('Task not found');
    });

    it('should give lower score for short time', async () => {
      const quickTask = {
        ...mockTask,
        status: 'completed',
        interactions: Array(2).fill({ type: 'user_input', content: {} }),
        timeSpentSeconds: 180 // 3 minutes
      };
      mockTaskRepo.findById.mockResolvedValue(quickTask);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      await service.evaluateTask('task-123');

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 60, // 20 (interactions) + 10 (short time) + 30 (completed)
          feedbackText: 'Good effort! You showed solid understanding of the concepts.'
        })
      );
    });

    it('should give lower score for very long time', async () => {
      const longTask = {
        ...mockTask,
        status: 'completed',
        interactions: Array(2).fill({ type: 'user_input', content: {} }),
        timeSpentSeconds: 4000 // 66+ minutes
      };
      mockTaskRepo.findById.mockResolvedValue(longTask);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      await service.evaluateTask('task-123');

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 70, // 20 (interactions) + 20 (long time) + 30 (completed)
          feedbackText: 'Good effort! You showed solid understanding of the concepts.'
        })
      );
    });

    it('should give low score for incomplete task', async () => {
      const incompleteTask = {
        ...mockTask,
        status: 'active',
        interactions: Array(2).fill({ type: 'user_input', content: {} }),
        timeSpentSeconds: 600
      };
      mockTaskRepo.findById.mockResolvedValue(incompleteTask);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      await service.evaluateTask('task-123');

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 50, // 20 (interactions) + 30 (good time) + 0 (not completed)
          feedbackText: 'Keep working on it! Consider exploring the problem from different angles.'
        })
      );
    });
  });

  describe('generateFeedback', () => {
    it('should generate feedback in requested language', async () => {
      const evaluation = {
        id: 'eval-123',
        score: 85,
        feedbackText: 'Well done!'
      } as IEvaluation;
      mockEvaluationRepo.findById.mockResolvedValue(evaluation);

      const result = await service.generateFeedback('eval-123', 'zh');

      expect(result).toBe('做得好！你在這個任務中獲得了 85% 的分數。Well done!');
    });

    it('should default to English for unknown language', async () => {
      const evaluation = {
        id: 'eval-123',
        score: 85,
        feedbackText: 'Well done!'
      } as IEvaluation;
      mockEvaluationRepo.findById.mockResolvedValue(evaluation);

      const result = await service.generateFeedback('eval-123', 'unknown');

      expect(result).toBe('Great job! You scored 85% on this task. Well done!');
    });

    it('should handle evaluation not found', async () => {
      mockEvaluationRepo.findById.mockResolvedValue(null);

      await expect(service.generateFeedback('eval-123', 'en'))
        .rejects.toThrow('Evaluation not found');
    });

    it('should generate Spanish feedback', async () => {
      const evaluation = {
        id: 'eval-123',
        score: 90,
        feedbackText: 'Excelente trabajo!'
      } as IEvaluation;
      mockEvaluationRepo.findById.mockResolvedValue(evaluation);

      const result = await service.generateFeedback('eval-123', 'es');

      expect(result).toBe('¡Buen trabajo! Obtuviste 90% en esta tarea. Excelente trabajo!');
    });
  });

  describe('edge cases and full coverage', () => {
    it('should handle program without pblData fields', async () => {
      const programWithoutPblData = {
        ...mockProgram,
        pblData: {}
      };
      mockProgramRepo.findById.mockResolvedValue(programWithoutPblData);
      mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);

      const result = await service.getProgress('program-123');

      expect(result.metadata?.currentPhase).toBeUndefined();
    });

    it('should handle task without pblData in AI response generation', async () => {
      const taskWithoutPhase = {
        ...mockTask,
        pblData: {}
      };
      mockTaskRepo.findById.mockResolvedValue(taskWithoutPhase);

      const result = await service.submitResponse('program-123', 'task-123', {});

      // Should default to understanding phase
      expect(result.metadata?.aiResponse).toMatchObject({
        message: expect.stringContaining("That's a good observation")
      });
    });

    it('should handle missing aiResponse feedback', async () => {
      // Mock AI response without feedback field
      const taskWithoutFeedback = { ...mockTask };
      mockTaskRepo.findById.mockResolvedValue(taskWithoutFeedback);

      const result = await service.submitResponse('program-123', 'task-123', {});

      expect(result.feedback).toBe("You're showing good understanding of the problem.");
    });

    it('should calculate completion feedback for high score', async () => {
      const highScoreTasks = [
        { ...mockTask, status: 'completed', score: 90, timeSpentSeconds: 300 },
        { ...mockTask, id: 'task-2', status: 'completed', score: 95, timeSpentSeconds: 400 }
      ];

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(highScoreTasks);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      const result = await service.completeLearning('program-123');

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          feedbackText: expect.stringContaining('Congratulations on completing the PBL scenario')
        })
      );
    });

    it('should calculate completion feedback for low score', async () => {
      const program = {
        ...mockProgram,
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T01:00:00Z'
      };
      const lowScoreTasks = [
        { ...mockTask, status: 'completed', score: 50, timeSpentSeconds: 300 },
        { ...mockTask, id: 'task-2', status: 'completed', score: 45, timeSpentSeconds: 400 }
      ];

      mockProgramRepo.findById.mockResolvedValue(program);
      mockTaskRepo.findByProgram.mockResolvedValue(lowScoreTasks);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      const result = await service.completeLearning('program-123');

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          feedbackText: expect.stringContaining('Congratulations on completing the PBL scenario')
        })
      );
    });

    it('should handle program without dates in completion', async () => {
      const programNoDates = {
        ...mockProgram,
        startedAt: undefined,
        completedAt: undefined
      };
      mockProgramRepo.findById.mockResolvedValue(programNoDates);
      mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      const result = await service.completeLearning('program-123');

      expect(result).toBeDefined();
    });
  });
});
