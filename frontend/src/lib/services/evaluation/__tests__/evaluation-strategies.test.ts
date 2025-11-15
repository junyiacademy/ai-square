/**
 * Unit tests for evaluation strategies
 * Tests the core evaluation logic for each learning module
 */

import {
  PBLEvaluationStrategy,
  AssessmentEvaluationStrategy,
  DiscoveryEvaluationStrategy,
  EvaluationStrategyFactory
} from '../evaluation-strategies';
import {
  ITask,
  IProgram,
  IEvaluation,
  IInteraction,
  IEvaluationContext
} from '@/types/unified-learning';
import { v4 as uuidv4 } from 'uuid';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

describe('EvaluationStrategies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEvaluationContext: IEvaluationContext = {
    scenario: {
      id: 'scenario-1',
      mode: 'pbl',
      status: 'active',
      version: '1.0.0',
      sourceType: 'yaml',
      sourcePath: '/test/scenario.yaml',
      sourceMetadata: {},
      title: { en: 'Test Scenario' },
      description: { en: 'Test Description' },
      objectives: ['Learn AI concepts'],
      difficulty: 'beginner',
      estimatedMinutes: 60,
      prerequisites: [],
      taskTemplates: [],
      taskCount: 5,
      xpRewards: {},
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      metadata: {}
    },
    program: {
      id: 'program-1',
      scenarioId: 'scenario-1',
      userId: 'user-1',
      mode: 'pbl',
      status: 'active',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: 5,
      totalScore: 0,
      domainScores: {},
      xpEarned: 0,
      badgesEarned: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      lastActivityAt: '2024-01-01T00:00:00.000Z',
      timeSpentSeconds: 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    }
  };

  const mockTask: ITask = {
    id: 'task-1',
    programId: 'program-1',
    mode: 'pbl',
    taskIndex: 0,
    type: 'chat',
    status: 'completed',
    title: { en: 'Test Task' },
    content: { instructions: 'Test instructions' },
    interactions: [
      {
        type: 'user_input',
        content: 'This is my detailed solution to the problem with comprehensive analysis',
        timestamp: new Date().toISOString()
      },
      {
        type: 'ai_response',
        content: 'Good job! Your analysis shows deep understanding.',
        timestamp: new Date().toISOString()
      }
    ],
    interactionCount: 2,
    userResponse: { answer: 'detailed solution' },
    score: 85,
    maxScore: 100,
    allowedAttempts: 1,
    attemptCount: 1,
    timeLimitSeconds: undefined,
    timeSpentSeconds: 300,
    aiConfig: {},
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    completedAt: '2024-01-01T00:00:00.000Z',
    metadata: {}
  };

  const mockProgram: IProgram = {
    id: 'program-1',
    scenarioId: 'scenario-1',
    userId: 'user-1',
    mode: 'pbl',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 5,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    timeSpentSeconds: 1800,
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    completedAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    lastActivityAt: '2024-01-01T00:00:00.000Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  describe('PBLEvaluationStrategy', () => {
    let strategy: PBLEvaluationStrategy;

    beforeEach(() => {
      strategy = new PBLEvaluationStrategy();
    });

    it('should evaluate PBL task with quality metrics', async () => {
      const result = await strategy.evaluateTask(mockTask, mockEvaluationContext);

      expect(result.id).toBe('mock-uuid-123');
      expect(result.taskId).toBe('task-1');
      expect(result.userId).toBe('user-1');
      expect(result.mode).toBe('pbl');
      expect(result.evaluationType).toBe('task');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should provide contextual feedback based on interactions', async () => {
      const result = await strategy.evaluateTask(mockTask, mockEvaluationContext);

      expect(result.feedbackText).toBeDefined();
      expect(typeof result.feedbackText).toBe('string');
      if (result.feedbackText) {
        expect(result.feedbackText.length).toBeGreaterThan(0);
      }
    });

    it('should calculate quality metrics correctly', async () => {
      const result = await strategy.evaluateTask(mockTask, mockEvaluationContext);

      expect(result.pblData).toHaveProperty('qualityMetrics');
      const qualityMetrics = (result.pblData as Record<string, unknown>).qualityMetrics as Record<string, unknown>;
      expect(qualityMetrics).toHaveProperty('interactionDepth');
      expect(qualityMetrics).toHaveProperty('responseQuality');
      expect(qualityMetrics).toHaveProperty('engagementLevel');
      expect(qualityMetrics.interactionDepth).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty interactions', async () => {
      const taskWithNoInteractions = {
        ...mockTask,
        interactions: []
      };

      const result = await strategy.evaluateTask(taskWithNoInteractions, mockEvaluationContext);

      expect(result.score).toBe(0);
      expect(result.feedbackText).toContain('practicing');
    });

    it('should evaluate program with task evaluations', async () => {
      const taskEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          userId: 'user-1',
          mode: 'pbl',
          evaluationType: 'task',
          score: 85,
          maxScore: 100,
          domainScores: { knowledge: 80, skills: 85, attitudes: 90 },
          feedbackData: {},
          aiAnalysis: {},
          timeTakenSeconds: 300,
          createdAt: '2024-01-01T00:00:00.000Z',
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          metadata: { ksaCodes: ['K1', 'S1'] }
        },
        {
          id: 'eval-2',
          userId: 'user-1',
          mode: 'pbl',
          evaluationType: 'task',
          score: 75,
          maxScore: 100,
          domainScores: { knowledge: 70, skills: 75, attitudes: 80 },
          feedbackData: {},
          aiAnalysis: {},
          timeTakenSeconds: 300,
          createdAt: '2024-01-01T00:00:00.000Z',
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          metadata: { ksaCodes: ['K2', 'S2'] }
        }
      ];

      const result = await strategy.evaluateProgram(mockProgram, taskEvaluations);

      expect(result.programId).toBe('program-1');
      expect(result.score).toBeCloseTo(80, 0); // Average of 85 and 75
      expect(result.evaluationType).toBe('program');
      expect(result.metadata?.taskCount).toBe(2);
      expect(result.metadata?.ksaAchieved).toEqual(['K1', 'S1', 'K2', 'S2']);
    });

    it('should calculate domain scores correctly', async () => {
      const result = await strategy.evaluateTask(mockTask, mockEvaluationContext);

      expect(result.domainScores).toBeDefined();
      expect(typeof result.domainScores).toBe('object');
      expect(Object.keys(result.domainScores)).toContain('knowledge');
      expect(Object.keys(result.domainScores)).toContain('skills');
      expect(Object.keys(result.domainScores)).toContain('attitudes');
    });
  });

  describe('AssessmentEvaluationStrategy', () => {
    let strategy: AssessmentEvaluationStrategy;

    beforeEach(() => {
      strategy = new AssessmentEvaluationStrategy();
    });

    const mockAssessmentTask: ITask = {
      id: 'task-2',
      programId: 'program-2',
      mode: 'assessment',
      taskIndex: 0,
      type: 'question',
      status: 'completed',
      title: { en: 'Assessment Task' },
      content: {
        instructions: 'Answer the questions',
        context: {
          questions: [
            {
              id: 'q1',
              type: 'multiple-choice',
              question: 'What is AI?',
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 'B',
              points: 10,
              domain: 'AI_Basics'
            },
            {
              id: 'q2',
              type: 'true-false',
              question: 'AI can think like humans',
              correctAnswer: 'false',
              points: 5,
              domain: 'AI_Basics'
            }
          ]
        }
      },
      interactions: [
        {
          type: 'user_input',
          content: 'B',
          timestamp: new Date().toISOString(),
          metadata: { questionId: 'q1', isCorrect: true }
        },
        {
          type: 'user_input',
          content: 'false',
          timestamp: new Date().toISOString(),
          metadata: { questionId: 'q2', isCorrect: true }
        }
      ],
      interactionCount: 2,
      userResponse: { q1: 'B', q2: 'false' },
      score: 100,
      maxScore: 100,
      allowedAttempts: 1,
      attemptCount: 1,
      timeSpentSeconds: 600,
      aiConfig: {},
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-01T00:00:00.000Z',
      startedAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    };

    const mockAssessmentContext: IEvaluationContext = {
      scenario: {
        id: 'scenario-2',
        mode: 'assessment',
        status: 'active',
        version: '1.0.0',
        sourceType: 'yaml',
        sourceMetadata: {},
        title: { en: 'Assessment Scenario' },
        description: { en: 'Test Assessment' },
        objectives: ['Assess AI knowledge'],
        difficulty: 'intermediate',
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 3,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {}
      },
      program: {
        id: 'program-2',
        scenarioId: 'scenario-2',
        userId: 'user-2',
        mode: 'assessment',
        status: 'active',
        currentTaskIndex: 0,
        completedTaskCount: 0,
        totalTaskCount: 3,
        totalScore: 0,
        domainScores: {},
        xpEarned: 0,
        badgesEarned: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastActivityAt: '2024-01-01T00:00:00.000Z',
        timeSpentSeconds: 0,
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      }
    };

    it('should evaluate assessment answers correctly', async () => {
      const result = await strategy.evaluateTask(mockAssessmentTask, mockAssessmentContext);

      expect(result.mode).toBe('assessment');
      expect(result.evaluationType).toBe('task');
      expect(result.score).toBeCloseTo(100, 0); // Both answers correct
      expect(result.assessmentData).toHaveProperty('questionResults');
      expect(result.assessmentData.questionResults).toHaveLength(2);
    });

    it('should calculate partial scores', async () => {
      const taskWithWrongAnswer = {
        ...mockAssessmentTask,
        interactions: [
          {
            type: 'user_input' as const,
            content: 'A',
            timestamp: new Date().toISOString(),
            metadata: { questionId: 'q1', isCorrect: false }
          },
          {
            type: 'user_input' as const,
            content: 'false',
            timestamp: new Date().toISOString(),
            metadata: { questionId: 'q2', isCorrect: true }
          }
        ]
      };

      const result = await strategy.evaluateTask(taskWithWrongAnswer, mockAssessmentContext);

      expect(result.score).toBeCloseTo(50, 0); // 1 correct out of 2 questions
      expect(result.metadata?.correctAnswers).toBe(1);
    });

    it('should handle missing answers', async () => {
      const taskWithMissingAnswer = {
        ...mockAssessmentTask,
        interactions: [
          {
            type: 'user_input' as const,
            content: 'B',
            timestamp: new Date().toISOString(),
            metadata: { questionId: 'q1', isCorrect: true }
          }
        ]
      };

      const result = await strategy.evaluateTask(taskWithMissingAnswer, mockAssessmentContext);

      expect(result.score).toBeCloseTo(50, 0); // 1 correct out of 2 questions
      expect(result.metadata?.correctAnswers).toBe(1);
      expect(result.metadata?.totalQuestions).toBe(2);
    });

    it('should provide domain-specific scores', async () => {
      const result = await strategy.evaluateTask(mockAssessmentTask, mockAssessmentContext);

      expect(result.assessmentData).toHaveProperty('domainScores');
      const domainScores = (result.assessmentData as Record<string, unknown>).domainScores as Record<string, unknown>;
      expect(domainScores).toHaveProperty('AI_Basics');
      expect(domainScores.AI_Basics).toEqual({
        correct: 2,
        total: 2
      });
    });

    it('should evaluate program with assessment evaluations', async () => {
      const taskEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          userId: 'user-2',
          mode: 'assessment',
          evaluationType: 'task',
          score: 100,
          maxScore: 100,
          domainScores: {},
          feedbackData: {},
          aiAnalysis: {},
          timeTakenSeconds: 300,
          createdAt: '2024-01-01T00:00:00.000Z',
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          metadata: { totalQuestions: 2 }
        },
        {
          id: 'eval-2',
          userId: 'user-2',
          mode: 'assessment',
          evaluationType: 'task',
          score: 80,
          maxScore: 100,
          domainScores: {},
          feedbackData: {},
          aiAnalysis: {},
          timeTakenSeconds: 300,
          createdAt: '2024-01-01T00:00:00.000Z',
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          metadata: { totalQuestions: 3 }
        }
      ];

      const result = await strategy.evaluateProgram(mockProgram, taskEvaluations);

      expect(result.score).toBeCloseTo(90, 0); // Average of 100 and 80
      expect(result.evaluationType).toBe('program');
      expect(result.assessmentData?.totalQuestions).toBe(5);
    });
  });

  describe('DiscoveryEvaluationStrategy', () => {
    let strategy: DiscoveryEvaluationStrategy;

    beforeEach(() => {
      strategy = new DiscoveryEvaluationStrategy();
    });

    const mockDiscoveryTask: ITask = {
      id: 'task-3',
      programId: 'program-3',
      mode: 'discovery',
      taskIndex: 0,
      type: 'creation',
      status: 'completed',
      title: { en: 'Discovery Task' },
      content: {
        instructions: 'Explore and create',
        context: {
          explorationGoals: ['learn-basics', 'build-project'],
          requiredSkills: ['html', 'css'],
          challenges: [
            { id: 'challenge-1', description: 'Create homepage', xpReward: 50 },
            { id: 'challenge-2', description: 'Add styling', xpReward: 75 }
          ]
        }
      },
      interactions: [
        {
          type: 'user_input',
          content: 'Explored HTML basics',
          timestamp: new Date().toISOString(),
          metadata: { toolUsed: 'html-editor' }
        },
        {
          type: 'system_event',
          content: 'Challenge completed',
          timestamp: new Date().toISOString(),
          metadata: { challengeId: 'challenge-1' }
        }
      ],
      interactionCount: 2,
      userResponse: { exploration: 'html-basics', tools: ['html-editor'] },
      score: 75,
      maxScore: 100,
      allowedAttempts: 1,
      attemptCount: 1,
      timeSpentSeconds: 1800,
      aiConfig: {},
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-01T00:00:00.000Z',
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {
        explorationTime: 1800 // 30 minutes
      }
    };

    const mockDiscoveryContext: IEvaluationContext = {
      scenario: {
        id: 'scenario-3',
        mode: 'discovery',
        status: 'active',
        version: '1.0.0',
        sourceType: 'yaml',
        sourceMetadata: {},
        title: { en: 'Discovery Scenario' },
        description: { en: 'Explore AI through hands-on activities' },
        objectives: ['Build practical skills', 'Create projects'],
        difficulty: 'beginner',
        estimatedMinutes: 90,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 4,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {}
      },
      program: {
        id: 'program-3',
        scenarioId: 'scenario-3',
        userId: 'user-3',
        mode: 'discovery',
        status: 'active',
        currentTaskIndex: 0,
        completedTaskCount: 0,
        totalTaskCount: 4,
        totalScore: 0,
        domainScores: {},
        xpEarned: 0,
        badgesEarned: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastActivityAt: '2024-01-01T00:00:00.000Z',
        timeSpentSeconds: 0,
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {
          explorationPath: ['skill-1', 'skill-2'],
          totalXP: 150
        }
      }
    };

    it('should evaluate discovery task with exploration metrics', async () => {
      const result = await strategy.evaluateTask(mockDiscoveryTask, mockDiscoveryContext);

      expect(result.mode).toBe('discovery');
      expect(result.evaluationType).toBe('task');
      expect(result.score).toBeGreaterThan(0);
      expect(result.discoveryData).toHaveProperty('xpEarned');
      expect(result.discoveryData).toHaveProperty('toolsExplored');
      expect(result.discoveryData.toolsExplored).toContain('html-editor');
    });

    it('should track skill progression', async () => {
      const result = await strategy.evaluateTask(mockDiscoveryTask, mockDiscoveryContext);

      expect(result.discoveryData).toHaveProperty('skillsImproved');
      expect(result.discoveryData.skillsImproved).toContain('html');
      expect(result.discoveryData.skillsImproved).toContain('css');
    });

    it('should calculate exploration score based on interactions', async () => {
      const result = await strategy.evaluateTask(mockDiscoveryTask, mockDiscoveryContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.discoveryData.explorationDepth).toBeGreaterThan(0);
    });

    it('should handle challenges completion', async () => {
      const result = await strategy.evaluateTask(mockDiscoveryTask, mockDiscoveryContext);

      expect(result.discoveryData).toHaveProperty('challengesCompleted');
      expect(result.discoveryData.challengesCompleted).toContain('challenge-1');
      expect(result.discoveryData.challengeXP).toBeGreaterThan(0);
    });

    it('should evaluate program with milestones', async () => {
      const taskEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          userId: 'user-3',
          mode: 'discovery',
          evaluationType: 'task',
          score: 85,
          maxScore: 100,
          domainScores: {},
          feedbackData: {},
          aiAnalysis: {},
          timeTakenSeconds: 1800,
          createdAt: '2024-01-01T00:00:00.000Z',
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          metadata: { xpEarned: 125 }
        },
        {
          id: 'eval-2',
          userId: 'user-3',
          mode: 'discovery',
          evaluationType: 'task',
          score: 90,
          maxScore: 100,
          domainScores: {},
          feedbackData: {},
          aiAnalysis: {},
          timeTakenSeconds: 2100,
          createdAt: '2024-01-01T00:00:00.000Z',
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          metadata: { xpEarned: 200 }
        }
      ];

      const result = await strategy.evaluateProgram(mockDiscoveryContext.program, taskEvaluations);

      expect(result.score).toBe(100);
      expect(result.discoveryData).toHaveProperty('totalXP');
      expect(result.discoveryData).toHaveProperty('discoveryLevel');
      expect(result.discoveryData.discoveryLevel).toBe('novice'); // 475 XP < 500 threshold
    });

    it('should handle no exploration gracefully', async () => {
      const taskWithNoExploration = {
        ...mockDiscoveryTask,
        interactions: [],
        content: {
          context: { explorationGoals: [] }
        }
      };

      const result = await strategy.evaluateTask(taskWithNoExploration, mockDiscoveryContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.discoveryData.toolsExplored).toHaveLength(0);
    });
  });

  describe('EvaluationStrategyFactory', () => {
    it('should return PBL strategy for pbl mode', () => {
      const strategy = EvaluationStrategyFactory.createStrategy('pbl');
      expect(strategy).toBeInstanceOf(PBLEvaluationStrategy);
    });

    it('should return Assessment strategy for assessment mode', () => {
      const strategy = EvaluationStrategyFactory.createStrategy('assessment');
      expect(strategy).toBeInstanceOf(AssessmentEvaluationStrategy);
    });

    it('should return Discovery strategy for discovery mode', () => {
      const strategy = EvaluationStrategyFactory.createStrategy('discovery');
      expect(strategy).toBeInstanceOf(DiscoveryEvaluationStrategy);
    });

    it('should throw error for invalid mode', () => {
      expect(() => {
        EvaluationStrategyFactory.createStrategy('invalid');
      }).toThrow('Unknown evaluation strategy: invalid');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    const pblStrategy = new PBLEvaluationStrategy();

    it('should handle null interactions gracefully', async () => {
      const task = {
        ...mockTask,
        interactions: null as any
      };

      const result = await pblStrategy.evaluateTask(task, mockEvaluationContext);
      expect(result.score).toBe(0);
    });

    it('should handle very long interactions', async () => {
      const longContent = 'a'.repeat(10000);
      const task = {
        ...mockTask,
        interactions: [
          {
            type: 'user_input' as const,
            content: longContent,
            timestamp: new Date().toISOString()
          }
        ]
      };

      const result = await pblStrategy.evaluateTask(task, mockEvaluationContext);
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      const qualityMetrics = (result.pblData as Record<string, unknown>).qualityMetrics as Record<string, unknown>;
      expect(qualityMetrics.interactionDepth).toBeLessThanOrEqual(100);
    });

    it('should handle missing program context', async () => {
      const contextWithoutProgram = {} as IEvaluationContext;

      await expect(pblStrategy.evaluateTask(mockTask, contextWithoutProgram))
        .rejects.toThrow();
    });
  });
});
