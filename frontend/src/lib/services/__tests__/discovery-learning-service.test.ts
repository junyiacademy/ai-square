import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Discovery Learning Service Tests
 * 提升覆蓋率從 4.3% 到 80%+
 */

import { DiscoveryLearningService } from '../discovery-learning-service';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { IScenario, IProgram, ITask, IEvaluation } from '@/types/unified-learning';
import type { DiscoveryScenarioData, DiscoveryProgress } from '../discovery-learning-service';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');

describe('DiscoveryLearningService', () => {
  let service: DiscoveryLearningService;
  let mockScenarioRepo: any;
  let mockProgramRepo: any;
  let mockTaskRepo: any;
  let mockEvaluationRepo: any;

  // Mock data
  const mockDiscoveryData: DiscoveryScenarioData = {
    pathId: 'content_creator',
    category: 'creative',
    skillTree: {
      core_skills: [
        {
          id: 'writing',
          name: 'Writing',
          unlocks: ['editing'],
          max_level: 10,
          description: 'Master writing skills'
        },
        {
          id: 'design',
          name: 'Design',
          unlocks: ['advanced_design'],
          max_level: 10,
          description: 'Master design skills'
        }
      ],
      advanced_skills: [
        {
          id: 'marketing',
          name: 'Marketing',
          requires: ['writing'],
          max_level: 5,
          description: 'Advanced marketing'
        }
      ]
    },
    worldSetting: {
      name: { en: 'Digital Studio', zh: '數位工作室' },
      description: { en: 'A creative digital studio', zh: '創意數位工作室' }
    },
    startingScenario: {
      title: { en: 'Begin Your Journey', zh: '開始你的旅程' },
      description: { en: 'Start creating content', zh: '開始創作內容' }
    }
  };

  const mockScenario: IScenario = {
    id: 'scenario-123',
    mode: 'discovery',
    status: 'active',
    sourceType: 'yaml',
    sourcePath: 'discovery/content_creator',
    sourceMetadata: { category: 'discovery' },
    title: { en: 'Content Creator Path' },
    description: { en: 'Explore content creation' },
    objectives: ['Learn skills', 'Build portfolio'],
    taskTemplates: [],
    discoveryData: mockDiscoveryData as any,
    version: '1.0',
    difficulty: 'beginner',
    estimatedMinutes: 1200,
    prerequisites: [],
    taskCount: 0,
    xpRewards: { completion: 1000 },
    unlockRequirements: {},
    pblData: {},
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
    mode: 'discovery',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 0,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: '2024-01-01',
    startedAt: '2024-01-01',
    updatedAt: '2024-01-01',
    lastActivityAt: '2024-01-01',
    timeSpentSeconds: 0,
    pblData: {},
    discoveryData: {
      totalXP: 0,
      level: 1,
      achievements: [],
      unlockedSkills: [],
      completedChallenges: [],
      currentCareer: 'content_creator',
      worldSetting: 'Digital Studio'
    },
    assessmentData: {},
    metadata: { language: 'en' }
  };

  const mockTask: ITask = {
    id: 'task-123',
    programId: 'program-123',
    mode: 'discovery',
    taskIndex: 0,
    type: 'chat',
    status: 'active',
    title: { en: 'Welcome Task' },
    content: { instructions: 'Welcome!' },
    interactions: [],
    interactionCount: 0,
    userResponse: {},
    score: 0,
    maxScore: 50,
    allowedAttempts: 1,
    attemptCount: 0,
    timeSpentSeconds: 0,
    aiConfig: {},
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    pblData: {},
    discoveryData: {
      xpReward: 50,
      challengeType: 'introduction',
      skills: []
    },
    assessmentData: {},
    metadata: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockScenarioRepo = {
      findById: jest.fn(),
      findBySource: jest.fn()
    };

    mockProgramRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    service = new DiscoveryLearningService();
  });

  describe('startLearning', () => {
    it('should start a discovery learning journey', async () => {
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
          mode: 'discovery',
          status: 'active'
        })
      );
      expect(mockTaskRepo.create).toHaveBeenCalledTimes(3); // 1 welcome + 2 skill tasks
      expect(result).toEqual(mockProgram);
    });

    it('should throw error if scenario not found', async () => {
      mockScenarioRepo.findById.mockResolvedValue(null);

      await expect(service.startLearning('user-123', 'scenario-123'))
        .rejects.toThrow('Scenario not found');
    });

    it('should throw error if scenario is not discovery type', async () => {
      mockScenarioRepo.findById.mockResolvedValue({ ...mockScenario, mode: 'pbl' });

      await expect(service.startLearning('user-123', 'scenario-123'))
        .rejects.toThrow('Scenario is not a discovery scenario');
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
          discoveryData: expect.objectContaining({
            worldSetting: '數位工作室'
          }),
          metadata: { language: 'zh' }
        })
      );
    });
  });

  describe('getProgress', () => {
    it('should get learning progress', async () => {
      const programWithProgress = {
        ...mockProgram,
        discoveryData: {
          totalXP: 150,
          level: 2,
          achievements: ['First Challenge'],
          unlockedSkills: ['writing'],
          completedChallenges: ['task-1', 'task-2']
        }
      };

      const tasks = [
        { ...mockTask, status: 'completed', timeSpentSeconds: 300 },
        { ...mockTask, id: 'task-2', status: 'completed', timeSpentSeconds: 400 },
        { ...mockTask, id: 'task-3', status: 'active', timeSpentSeconds: 100 }
      ];

      mockProgramRepo.findById.mockResolvedValue(programWithProgress);
      mockTaskRepo.findByProgram.mockResolvedValue(tasks);

      const result = await service.getProgress('program-123');

      expect(result).toMatchObject({
        programId: 'program-123',
        status: 'active',
        currentTaskIndex: 0,
        totalTasks: 3,
        completedTasks: 2,
        score: 150,
        timeSpent: 800,
        metadata: {
          currentTaskId: 'task-3',
          level: 2,
          totalXP: 150,
          achievements: ['First Challenge'],
          unlockedSkills: ['writing'],
          nextLevelXP: 200
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
  });

  describe('submitResponse', () => {
    it('should submit response and complete task', async () => {
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.create.mockImplementation((task: any) =>
        Promise.resolve({ ...task, id: `task-new-${Date.now()}` })
      );

      const response = { completed: true, solution: 'My solution' };
      const result = await service.submitResponse('program-123', 'task-123', response);

      expect(mockTaskRepo.updateInteractions).toHaveBeenCalled();
      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith('task-123', 'completed');
      expect(mockProgramRepo.update).toHaveBeenCalledWith('program-123',
        expect.objectContaining({
          xpEarned: 50
        })
      );
      expect(result).toMatchObject({
        taskId: 'task-123',
        success: true,
        score: 50,
        nextTaskAvailable: true,
        metadata: {
          xpEarned: 50,
          completed: true
        }
      });
    });

    it('should handle level up', async () => {
      const highXPTask = { ...mockTask, discoveryData: { xpReward: 100 } };
      mockTaskRepo.findById.mockResolvedValue(highXPTask);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      await service.submitResponse('program-123', 'task-123', { completed: true });

      expect(mockProgramRepo.update).toHaveBeenCalledWith('program-123',
        expect.objectContaining({
          discoveryData: expect.objectContaining({
            level: 2,
            achievements: expect.arrayContaining(['Reached Level 2'])
          })
        })
      );
    });

    it('should handle task not found', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(service.submitResponse('program-123', 'task-123', {}))
        .rejects.toThrow('Task not found');
    });

    it('should handle incomplete response', async () => {
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const result = await service.submitResponse('program-123', 'task-123', {});

      expect(result).toMatchObject({
        success: true,
        score: 0,
        nextTaskAvailable: false,
        metadata: {
          xpEarned: 0,
          completed: false
        }
      });
    });
  });

  describe('completeLearning', () => {
    it('should complete learning journey', async () => {
      const completedProgram = {
        ...mockProgram,
        discoveryData: {
          totalXP: 500,
          level: 6,
          achievements: ['Master Level', 'All Skills'],
          unlockedSkills: ['writing', 'design', 'marketing'],
          completedChallenges: ['task-1', 'task-2', 'task-3']
        }
      };

      const tasks = [
        { ...mockTask, status: 'completed', timeSpentSeconds: 300 },
        { ...mockTask, id: 'task-2', status: 'completed', timeSpentSeconds: 400 },
        { ...mockTask, id: 'task-3', status: 'completed', timeSpentSeconds: 500 }
      ];

      mockProgramRepo.findById.mockResolvedValue(completedProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(tasks);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);
      mockProgramRepo.complete.mockResolvedValue(undefined);

      const result = await service.completeLearning('program-123');

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          evaluationType: 'summative',
          evaluationSubtype: 'career_journey_complete',
          score: 500,
          maxScore: 1000
        })
      );
      expect(mockProgramRepo.complete).toHaveBeenCalledWith('program-123');
      expect(result).toMatchObject({
        program: completedProgram,
        passed: true,
        finalScore: 500,
        metadata: {
          achievements: ['Master Level', 'All Skills'],
          skillsMastered: ['writing', 'design', 'marketing'],
          careerReadiness: expect.any(Number)
        }
      });
    });

    it('should handle program not found', async () => {
      mockProgramRepo.findById.mockResolvedValue(null);

      await expect(service.completeLearning('program-123'))
        .rejects.toThrow('Program not found');
    });

    it('should fail if level too low', async () => {
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue([]);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      const result = await service.completeLearning('program-123');

      expect(result.passed).toBe(false);
    });
  });

  describe('getNextTask', () => {
    it('should get active task first', async () => {
      const tasks = [
        { ...mockTask, status: 'completed' },
        { ...mockTask, id: 'task-2', status: 'active' },
        { ...mockTask, id: 'task-3', status: 'pending' }
      ];
      mockTaskRepo.findByProgram.mockResolvedValue(tasks);

      const result = await service.getNextTask('program-123');

      expect(result?.id).toBe('task-2');
    });

    it('should get pending task if no active', async () => {
      const tasks = [
        { ...mockTask, status: 'completed' },
        { ...mockTask, id: 'task-2', status: 'pending' }
      ];
      mockTaskRepo.findByProgram.mockResolvedValue(tasks);

      const result = await service.getNextTask('program-123');

      expect(result?.id).toBe('task-2');
    });

    it('should return null if all completed', async () => {
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
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      const result = await service.evaluateTask('task-123');

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-123',
          evaluationType: 'formative',
          evaluationSubtype: 'challenge_complete',
          score: 50
        })
      );
      expect(result).toHaveProperty('id', 'eval-123');
    });

    it('should handle task not found', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(service.evaluateTask('task-123'))
        .rejects.toThrow('Task not found');
    });
  });

  describe('generateFeedback', () => {
    it('should generate feedback in requested language', async () => {
      const evaluation = {
        id: 'eval-123',
        score: 100,
        feedbackText: 'Great work!'
      } as IEvaluation;
      mockEvaluationRepo.findById.mockResolvedValue(evaluation);

      const result = await service.generateFeedback('eval-123', 'zh');

      expect(result).toContain('100 XP');
      expect(result).toContain('你在職涯旅程中獲得了');
    });

    it('should default to English', async () => {
      const evaluation = {
        id: 'eval-123',
        score: 100,
        feedbackText: 'Great work!'
      } as IEvaluation;
      mockEvaluationRepo.findById.mockResolvedValue(evaluation);

      const result = await service.generateFeedback('eval-123', 'unknown');

      expect(result).toContain('Great exploration!');
    });

    it('should handle evaluation not found', async () => {
      mockEvaluationRepo.findById.mockResolvedValue(null);

      await expect(service.generateFeedback('eval-123', 'en'))
        .rejects.toThrow('Evaluation not found');
    });
  });

  describe('edge cases and coverage', () => {
    it('should handle task without user response type', async () => {
      const task = { ...mockTask };
      mockTaskRepo.findById.mockResolvedValue(task);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      // Test response without type field
      await service.submitResponse('program-123', 'task-123', { action: 'submit' });

      expect(mockTaskRepo.updateInteractions).toHaveBeenCalledWith(
        'task-123',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'user_input' // Should default to user_input
          })
        ])
      );
    });

    it('should award achievement for advanced creation tasks', async () => {
      const advancedTask = {
        ...mockTask,
        type: 'creation',
        discoveryData: {
          xpReward: 100,
          difficulty: 'advanced'
        }
      };
      mockTaskRepo.findById.mockResolvedValue(advancedTask);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const result = await service.submitResponse('program-123', 'task-123', { completed: true });

      expect(result.metadata?.newAchievements).toContain('Advanced Challenge Master');
    });

    it('should handle tasks with skills to unlock', async () => {
      const taskWithSkills = {
        ...mockTask,
        discoveryData: {
          xpReward: 50,
          skills: ['writing', 'design']
        }
      };
      mockTaskRepo.findById.mockResolvedValue(taskWithSkills);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const result = await service.submitResponse('program-123', 'task-123', { completed: true });

      expect(result.metadata?.skillsUnlocked).toEqual(['writing', 'design']);
    });

    it('should handle empty skill progress normalization', async () => {
      const tasksWithoutSkills = [
        { ...mockTask, status: 'completed', discoveryData: {} },
        { ...mockTask, id: 'task-2', status: 'completed', discoveryData: null }
      ];
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(tasksWithoutSkills);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      const result = await service.completeLearning('program-123');

      expect(result).toBeDefined();
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          domainScores: {} // Empty skills should result in empty domain scores
        })
      );
    });

    it('should normalize skill progress correctly', async () => {
      const tasksWithSkills = [
        { ...mockTask, status: 'completed', discoveryData: { skills: ['writing', 'design'] } },
        { ...mockTask, id: 'task-2', status: 'completed', discoveryData: { skills: ['writing'] } },
        { ...mockTask, id: 'task-3', status: 'completed', discoveryData: { skills: ['writing', 'marketing'] } }
      ];
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(tasksWithSkills);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-123' } as IEvaluation);

      const result = await service.completeLearning('program-123');

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          domainScores: {
            writing: 100,    // 3/3 * 100 = 100%
            design: 33.33333333333333,     // 1/3 * 100 = 33.33%
            marketing: 33.33333333333333   // 1/3 * 100 = 33.33%
          }
        })
      );
    });

    it('should handle program not found in submitResponse', async () => {
      const task = { ...mockTask };
      mockTaskRepo.findById.mockResolvedValue(task);
      mockProgramRepo.findById.mockResolvedValue(null); // Program not found

      await expect(service.submitResponse('program-123', 'task-123', {}))
        .rejects.toThrow('Program not found');
    });
  });

  describe('private methods', () => {
    it('should calculate level correctly', async () => {
      // Test through submitResponse which calls calculateLevel
      const highXPTask = { ...mockTask, discoveryData: { xpReward: 200 } };
      const highXPProgram = {
        ...mockProgram,
        discoveryData: {
          ...mockProgram.discoveryData,
          totalXP: 300 // Will become 500 after task
        }
      };

      mockTaskRepo.findById.mockResolvedValue(highXPTask);
      mockProgramRepo.findById.mockResolvedValue(highXPProgram);

      await service.submitResponse('program-123', 'task-123', { completed: true });

      expect(mockProgramRepo.update).toHaveBeenCalledWith('program-123',
        expect.objectContaining({
          discoveryData: expect.objectContaining({
            level: 6 // 500 XP = level 6
          })
        })
      );
    });

    it('should unlock skills for specific levels', async () => {
      // Create a fresh program at level 1
      const freshProgram = {
        ...mockProgram,
        discoveryData: {
          totalXP: 50, // Starting at 50 XP
          level: 1,
          achievements: [],
          unlockedSkills: [],
          completedChallenges: [],
          currentCareer: 'content_creator',
          worldSetting: 'Digital Studio'
        }
      };

      const task = { ...mockTask, discoveryData: { xpReward: 50 } }; // 50 XP will bring total to 100 = level 2
      mockTaskRepo.findById.mockResolvedValue(task);
      mockProgramRepo.findById.mockResolvedValue(freshProgram);

      await service.submitResponse('program-123', 'task-123', { completed: true });

      // Should update to level 2 with the right skills
      expect(mockProgramRepo.update).toHaveBeenCalledWith('program-123',
        expect.objectContaining({
          discoveryData: expect.objectContaining({
            level: 2,
            unlockedSkills: expect.arrayContaining(['Basic AI Understanding', 'Problem Identification'])
          })
        })
      );
    });

    it('should generate new tasks after completion', async () => {
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);
      mockTaskRepo.create.mockResolvedValue({ id: 'new-task' } as ITask);

      await service.submitResponse('program-123', 'task-123', { completed: true });

      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.objectContaining({ en: expect.stringContaining('Master') }),
          type: 'creation',
          status: 'pending'
        })
      );
    });

    it('should handle advanced skills', async () => {
      const advancedProgram = {
        ...mockProgram,
        discoveryData: {
          ...(mockProgram.discoveryData as unknown as DiscoveryProgress),
          level: 6,
          completedChallenges: ['writing', 'design']
        }
      };

      mockTaskRepo.findById.mockResolvedValue({ ...mockTask, taskIndex: 2 });
      mockProgramRepo.findById.mockResolvedValue(advancedProgram);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);

      await service.submitResponse('program-123', 'task-123', { completed: true });

      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            difficulty: 'advanced'
          })
        })
      );
    });
  });
});
