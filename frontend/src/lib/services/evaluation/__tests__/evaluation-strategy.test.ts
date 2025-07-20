/**
 * Evaluation Strategy Pattern Tests
 * Following TDD Red → Green → Refactor
 */

import {
  IEvaluationStrategy,
  EvaluationStrategyFactory,
  PBLEvaluationStrategy,
  AssessmentEvaluationStrategy,
  DiscoveryEvaluationStrategy
} from '../evaluation-strategies';
import { 
  ITask, 
  IProgram, 
  IEvaluation, 
  IEvaluationContext 
} from '@/types/unified-learning';
import {
  IPBLTask,
  IAssessmentTask,
  IDiscoveryTask
} from '@/types/module-specific-types';

describe('Evaluation Strategy Pattern', () => {
  const baseContext: IEvaluationContext = {
    scenario: {
      id: 'scenario-1',
      mode: 'pbl',
      status: 'active',
      version: '1.0.0',
      sourceType: 'yaml',
      sourceMetadata: {},
      title: { en: 'Test Scenario' },
      description: { en: 'Test' },
      objectives: [],
      difficulty: 'beginner',
      estimatedMinutes: 60,
      prerequisites: [],
      taskTemplates: [],
      taskCount: 0,
      xpRewards: {},
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {}
    },
    program: {
      id: 'program-1',
      scenarioId: 'scenario-1',
      userId: 'user-123',
      mode: 'pbl',
      status: 'active',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: 1,
      totalScore: 0,
      dimensionScores: {},
      xpEarned: 0,
      badgesEarned: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      timeSpentSeconds: 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    },
    previousEvaluations: []
  };

  describe('EvaluationStrategyFactory', () => {
    it('should create PBL strategy for pbl source type', () => {
      const strategy = EvaluationStrategyFactory.createStrategy('pbl');
      expect(strategy).toBeInstanceOf(PBLEvaluationStrategy);
    });

    it('should create Assessment strategy for assessment source type', () => {
      const strategy = EvaluationStrategyFactory.createStrategy('assessment');
      expect(strategy).toBeInstanceOf(AssessmentEvaluationStrategy);
    });

    it('should create Discovery strategy for discovery source type', () => {
      const strategy = EvaluationStrategyFactory.createStrategy('discovery');
      expect(strategy).toBeInstanceOf(DiscoveryEvaluationStrategy);
    });

    it('should throw error for unknown source type', () => {
      expect(() => {
        EvaluationStrategyFactory.createStrategy('unknown' as any);
      }).toThrow('Unknown evaluation strategy: unknown');
    });
  });

  describe('PBLEvaluationStrategy', () => {
    let strategy: PBLEvaluationStrategy;

    beforeEach(() => {
      strategy = new PBLEvaluationStrategy();
    });

    it('should evaluate PBL task', async () => {
      const pblTask: IPBLTask = {
        id: 'task-1',
        programId: 'program-1',
        templateId: 'template-1',
        title: 'PBL Task',
        description: 'Test',
        type: 'interactive',
        order: 1,
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        interactions: [
          { timestamp: new Date().toISOString(), type: 'user_input', content: 'I think the solution is...' },
          { timestamp: new Date().toISOString(), type: 'ai_response', content: 'Good thinking! Can you elaborate?' },
          { timestamp: new Date().toISOString(), type: 'user_input', content: 'Yes, because...' }
        ],
        content: {
          context: {
            scenario: 'Problem scenario',
            ksaCodes: ['K1', 'S2', 'A3']
          }
        },
        metadata: { sourceType: 'pbl' }
      };

      const evaluation = await strategy.evaluateTask(pblTask, baseContext);

      expect(evaluation.type).toBe('pbl_task');
      expect(evaluation.targetType).toBe('task');
      expect(evaluation.targetId).toBe('task-1');
      expect(evaluation.score).toBeGreaterThan(0);
      expect(evaluation.dimensions).toBeDefined();
      expect(evaluation.dimensions?.length).toBe(3); // KSA dimensions
      expect(evaluation.metadata?.interactionCount).toBe(3);
      expect(evaluation.metadata?.ksaCodes).toEqual(['K1', 'S2', 'A3']);
    });

    it('should evaluate program with aggregated KSA scores', async () => {
      const taskEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          targetType: 'task',
          targetId: 'task-1',
          programId: 'program-1',
          userId: 'user-123',
          type: 'pbl_task',
          score: 80,
          dimensions: [
            { dimension: 'knowledge', score: 85, maxScore: 100 },
            { dimension: 'skills', score: 75, maxScore: 100 },
            { dimension: 'attitudes', score: 80, maxScore: 100 }
          ],
          createdAt: new Date().toISOString(),
          metadata: { sourceType: 'pbl' }
        },
        {
          id: 'eval-2',
          targetType: 'task',
          targetId: 'task-2',
          programId: 'program-1',
          userId: 'user-123',
          type: 'pbl_task',
          score: 90,
          dimensions: [
            { dimension: 'knowledge', score: 90, maxScore: 100 },
            { dimension: 'skills', score: 90, maxScore: 100 },
            { dimension: 'attitudes', score: 90, maxScore: 100 }
          ],
          createdAt: new Date().toISOString(),
          metadata: { sourceType: 'pbl' }
        }
      ];

      const evaluation = await strategy.evaluateProgram(baseContext.program, taskEvaluations);

      expect(evaluation.type).toBe('pbl_completion');
      expect(evaluation.score).toBe(85); // Average of 80 and 90
      expect(evaluation.dimensions).toBeDefined();
      expect(evaluation.dimensions?.[0].dimension).toBe('knowledge');
      expect(evaluation.dimensions?.[0].score).toBe(87.5); // Average of 85 and 90
    });

    it('should calculate quality metrics', () => {
      const interactions = [
        { type: 'user_input', content: 'Short answer' },
        { type: 'ai_response', content: 'Can you explain more?' },
        { type: 'user_input', content: 'This is a much longer and more detailed explanation about the problem...' }
      ];

      const metrics = strategy['calculateQualityMetrics'](interactions);

      expect(metrics.interactionDepth).toBeGreaterThan(0);
      expect(metrics.responseQuality).toBeGreaterThan(0);
      expect(metrics.engagementLevel).toBeGreaterThan(0);
    });
  });

  describe('AssessmentEvaluationStrategy', () => {
    let strategy: AssessmentEvaluationStrategy;

    beforeEach(() => {
      strategy = new AssessmentEvaluationStrategy();
    });

    it('should evaluate assessment task with correct answers', async () => {
      const assessmentTask: IAssessmentTask = {
        id: 'task-1',
        programId: 'program-1',
        templateId: 'template-1',
        title: 'Assessment',
        description: 'Test',
        type: 'assessment',
        order: 1,
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        interactions: [
          { type: 'user_input', content: 'A', metadata: { questionId: 'q1', isCorrect: true } },
          { type: 'user_input', content: 'B', metadata: { questionId: 'q2', isCorrect: false } },
          { type: 'user_input', content: 'C', metadata: { questionId: 'q3', isCorrect: true } }
        ],
        content: {
          context: {
            questions: [
              { id: 'q1', type: 'multiple-choice', question: 'Q1', domain: 'Engaging_with_AI' },
              { id: 'q2', type: 'multiple-choice', question: 'Q2', domain: 'Creating_with_AI' },
              { id: 'q3', type: 'multiple-choice', question: 'Q3', domain: 'Engaging_with_AI' }
            ]
          }
        },
        metadata: { sourceType: 'assessment' }
      };

      const evaluation = await strategy.evaluateTask(assessmentTask, {
        ...baseContext,
        scenario: { ...baseContext.scenario, sourceType: 'assessment' }
      });

      expect(evaluation.type).toBe('assessment_task');
      expect(evaluation.score).toBe(66.67); // 2 out of 3 correct
      expect(evaluation.metadata?.totalQuestions).toBe(3);
      expect(evaluation.metadata?.correctAnswers).toBe(2);
      expect(evaluation.dimensions).toBeDefined();
      expect(evaluation.dimensions?.find(d => d.dimension === 'Engaging_with_AI')?.score).toBe(100); // 2/2 correct
      expect(evaluation.dimensions?.find(d => d.dimension === 'Creating_with_AI')?.score).toBe(0); // 0/1 correct
    });

    it('should calculate time-based bonus', () => {
      const timeSpent = 600; // 10 minutes
      const timeLimit = 1800; // 30 minutes
      const bonus = strategy['calculateTimeBonus'](timeSpent, timeLimit);

      expect(bonus).toBeGreaterThan(0);
      expect(bonus).toBeLessThanOrEqual(10); // Max 10% bonus
    });
  });

  describe('DiscoveryEvaluationStrategy', () => {
    let strategy: DiscoveryEvaluationStrategy;

    beforeEach(() => {
      strategy = new DiscoveryEvaluationStrategy();
    });

    it('should evaluate discovery task with XP rewards', async () => {
      const discoveryTask: IDiscoveryTask = {
        id: 'task-1',
        programId: 'program-1',
        templateId: 'template-1',
        title: 'Explore AI Tools',
        description: 'Test',
        type: 'exploration',
        order: 1,
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        interactions: [
          { type: 'user_input', content: 'Trying prompt 1' },
          { type: 'system_event', content: 'Tool response', metadata: { toolUsed: 'chatgpt' } },
          { type: 'user_input', content: 'Trying prompt 2' },
          { type: 'system_event', content: 'Challenge completed', metadata: { challengeId: 'c1' } }
        ],
        content: {
          context: {
            explorationGoals: ['Try different prompts', 'Complete challenge'],
            challenges: [
              { id: 'c1', description: 'Create a story', xpReward: 50 }
            ]
          }
        },
        metadata: { sourceType: 'discovery' }
      };

      const evaluation = await strategy.evaluateTask(discoveryTask, {
        ...baseContext,
        scenario: { ...baseContext.scenario, sourceType: 'discovery' }
      });

      expect(evaluation.type).toBe('discovery_task');
      expect(evaluation.score).toBeGreaterThan(0);
      expect(evaluation.metadata?.xpEarned).toBeGreaterThan(0);
      expect(evaluation.metadata?.toolsExplored).toContain('chatgpt');
      expect(evaluation.metadata?.challengesCompleted).toContain('c1');
    });

    it('should calculate exploration score', () => {
      const interactions = [
        { type: 'user_input', content: 'Test 1' },
        { type: 'user_input', content: 'Test 2' },
        { type: 'system_event', content: 'Achievement unlocked' }
      ];
      const goals = ['Goal 1', 'Goal 2'];

      const score = strategy['calculateExplorationScore'](interactions, goals);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should award milestone XP', async () => {
      const program: IProgram = {
        ...baseContext.program,
        metadata: { sourceType: 'discovery', totalXP: 450 }
      };

      const taskEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          targetType: 'task',
          targetId: 'task-1',
          programId: 'program-1',
          userId: 'user-123',
          type: 'discovery_task',
          score: 100,
          createdAt: new Date().toISOString(),
          metadata: { sourceType: 'discovery', xpEarned: 100 }
        }
      ];

      const evaluation = await strategy.evaluateProgram(program, taskEvaluations);

      expect(evaluation.metadata?.totalXP).toBe(550); // 450 + 100
      expect(evaluation.metadata?.milestonesAchieved).toContain('500_xp'); // Crossed 500 XP milestone
      expect(evaluation.metadata?.bonusXP).toBeGreaterThan(0); // Milestone bonus
    });
  });
});