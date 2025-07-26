/**
 * UnifiedEvaluationSystem 測試
 * 確保 Phase 1 的評估系統功能正常
 */

import { UnifiedEvaluationSystem } from '../unified-evaluation-system';
import { BaseAIService, IAIRequest, IAIResponse } from '@/lib/abstractions/base-ai-service';
import { ITask, IProgram, IScenario, IEvaluationContext, IEvaluation } from '@/types/unified-learning';

// Mock AI Service
class MockAIService extends BaseAIService {
  async generateContent(request: IAIRequest): Promise<IAIResponse> {
    return { content: 'Mocked AI response' };
  }
  
  async generateChat(messages: Array<{ role: string; content: string }>): Promise<IAIResponse> {
    return { content: 'Mocked chat response' };
  }
  
  async evaluateResponse(prompt: string, response: string, criteria: string[]): Promise<number> {
    return 85; // Mock score
  }
}

describe('UnifiedEvaluationSystem', () => {
  let evaluationSystem: UnifiedEvaluationSystem;
  let mockAIService: MockAIService;

  beforeEach(() => {
    mockAIService = new MockAIService();
    evaluationSystem = new UnifiedEvaluationSystem(mockAIService);
  });

  describe('evaluateTask', () => {
    const baseTask: ITask = {
      id: 'task-1',
      programId: 'program-1',
      mode: 'pbl' as const,
      taskIndex: 0,
      title: 'Test Task',
      description: 'Test Description',
      type: 'chat' as const,
      status: 'completed' as const,
      content: { context: {} },
      interactions: [],
      interactionCount: 0,
      userResponse: {},
      score: 0,
      maxScore: 100,
      allowedAttempts: 3,
      attemptCount: 1,
      timeSpentSeconds: 300,
      aiConfig: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      metadata: {}
    };

    const baseContext: IEvaluationContext = {
      scenario: {
        id: 'scenario-1',
        mode: 'pbl' as const,
        status: 'active' as const,
        version: '1.0.0',
        sourceType: 'yaml' as const,
        sourcePath: 'test_scenario.yaml',
        sourceId: 'test_scenario',
        sourceMetadata: {},
        difficulty: 'intermediate',
        estimatedMinutes: 30,
        prerequisites: [],
        title: { en: 'Test Scenario' },
        description: { en: 'Test' },
        objectives: [],
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
        publishedAt: new Date().toISOString(),
        // tags: [],
        metadata: {}
      },
      program: {
        id: 'program-1',
        userId: 'user-123',
        scenarioId: 'scenario-1',
        mode: 'pbl' as const,
        status: 'active' as const,
        currentTaskIndex: 0,
        completedTaskCount: 0,
        totalTaskCount: 1,
        totalScore: 0,
        domainScores: {},
        timeSpentSeconds: 0,
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        xpEarned: 0,
        badgesEarned: [],
        lastActivityAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        metadata: {}
      },
      previousEvaluations: []
    };

    it('should evaluate PBL task', async () => {
      const pblTask: ITask = {
        ...baseTask,
        interactions: [
          { 
            timestamp: new Date().toISOString(),
            type: 'user_input' as const,
            content: 'Test input',
            metadata: {}
          },
          { 
            timestamp: new Date().toISOString(),
            type: 'ai_response' as const,
            content: 'Test response',
            metadata: {}
          }
        ],
        content: {
          context: {
            ksaCodes: ['K1', 'S2', 'A3']
          }
        }
      };

      const pblContext: IEvaluationContext = {
        ...baseContext,
        scenario: { ...baseContext.scenario, mode: 'pbl' as const }
      };

      const evaluation = await evaluationSystem.evaluateTask(pblTask, pblContext);

      expect(evaluation.taskId).toBe('task-1');
      expect(evaluation.evaluationType).toBe('task');
      expect(evaluation.evaluationSubtype).toBe('pbl_task');
      expect(evaluation.score).toBeDefined();
      expect(evaluation.domainScores).toBeDefined();
      expect(evaluation.metadata?.sourceType).toBe('pbl');
    });

    it('should evaluate Assessment task', async () => {
      const assessmentTask = {
        ...baseTask,
        interactions: [
          { 
            timestamp: new Date().toISOString(),
            type: 'user_input' as const,
            content: 'Answer 1',
            metadata: { isCorrect: true }
          },
          { 
            timestamp: new Date().toISOString(),
            type: 'user_input' as const,
            content: 'Answer 2',
            metadata: { isCorrect: false }
          }
        ],
        content: {
          context: {
            questions: [
              { id: 'q1', domain: 'knowledge' },
              { id: 'q2', domain: 'skills' }
            ]
          }
        }
      };

      const assessmentContext: IEvaluationContext = {
        ...baseContext,
        scenario: { ...baseContext.scenario, mode: 'assessment' as const }
      };

      const evaluation = await evaluationSystem.evaluateTask(assessmentTask, assessmentContext);

      expect(evaluation.evaluationType).toBe('task');
      expect(evaluation.evaluationSubtype).toBe('assessment_task');
      expect(evaluation.score).toBe(50); // 1 correct out of 2
      expect(evaluation.feedbackText).toContain('1 out of 2');
      expect(evaluation.metadata?.correctAnswers).toBe(1);
    });

    it('should evaluate Discovery task', async () => {
      const discoveryTask = {
        ...baseTask,
        interactions: [
          { 
            timestamp: new Date().toISOString(),
            type: 'user_input' as const, 
            content: 'Explore action' 
          },
          { 
            timestamp: new Date().toISOString(),
            type: 'system_event' as const, 
            content: 'Discovery made' 
          }
        ],
        content: {
          context: {
            requiredSkills: ['problem-solving', 'critical-thinking']
          }
        }
      };

      const discoveryContext: IEvaluationContext = {
        ...baseContext,
        scenario: { ...baseContext.scenario, mode: 'discovery' as const }
      };

      const evaluation = await evaluationSystem.evaluateTask(discoveryTask, discoveryContext);

      expect(evaluation.evaluationType).toBe('task');
      expect(evaluation.evaluationSubtype).toBe('discovery_task');
      expect(evaluation.score).toBeDefined();
      expect(evaluation.feedbackText).toContain('XP');
      expect((evaluation.discoveryData as any)?.xpEarned).toBeDefined();
    });
  });

  describe('evaluateProgram', () => {
    it('should aggregate task evaluations into program evaluation', async () => {
      const program: IProgram = {
        id: 'program-1',
        scenarioId: 'scenario-1',
        userId: 'user-123',
        mode: 'pbl' as const,
        status: 'completed' as const,
        currentTaskIndex: 2,
        completedTaskCount: 2,
        totalTaskCount: 2,
        totalScore: 85,
        domainScores: { knowledge: 90, skills: 80 },
        xpEarned: 100,
        badgesEarned: [],
        timeSpentSeconds: 3600,
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        metadata: { sourceType: 'pbl' }
      };

      const taskEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          taskId: 'task-1',
          programId: 'program-1',
          userId: 'user-123',
          mode: 'pbl' as const,
          evaluationType: 'task',
          evaluationSubtype: 'task_completion',
          score: 80,
          maxScore: 100,
          domainScores: { knowledge: 85, skills: 75 },
          feedbackData: {},
          aiAnalysis: {},
          timeTakenSeconds: 300,
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          createdAt: new Date().toISOString(),
          metadata: {}
        },
        {
          id: 'eval-2',
          taskId: 'task-2',
          programId: 'program-1',
          userId: 'user-123',
          mode: 'pbl' as const,
          evaluationType: 'task',
          evaluationSubtype: 'task_completion',
          score: 90,
          maxScore: 100,
          domainScores: { knowledge: 95, skills: 85 },
          feedbackData: {},
          aiAnalysis: {},
          timeTakenSeconds: 300,
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          createdAt: new Date().toISOString(),
          metadata: {}
        }
      ];

      const evaluation = await evaluationSystem.evaluateProgram(program, taskEvaluations);

      expect(evaluation.evaluationType).toBe('program');
      expect(evaluation.programId).toBe('program-1');
      expect(evaluation.evaluationSubtype).toBe('program_completion');
      expect(evaluation.score).toBe(85); // Average of 80 and 90
      expect(Object.keys(evaluation.domainScores)).toHaveLength(2); // Aggregated dimensions
      expect(evaluation.domainScores?.knowledge).toBe(90); // Average of 85 and 95
      expect(evaluation.domainScores?.skills).toBe(80); // Average of 75 and 85
      expect(evaluation.metadata?.taskCount).toBe(2);
      expect(evaluation.metadata?.completionTime).toBeGreaterThan(0);
    });
  });

  describe('generateFeedback', () => {
    it('should generate multilingual feedback', async () => {
      const evaluation: IEvaluation = {
        id: 'eval-1',
        taskId: 'task-1',
        programId: 'program-1',
        userId: 'user-123',
        mode: 'pbl' as const,
        evaluationType: 'task',
        evaluationSubtype: 'task_completion',
        score: 85,
        maxScore: 100,
        feedbackText: 'Original feedback',
        domainScores: { knowledge: 85 },
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 300,
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        createdAt: new Date().toISOString(),
        metadata: {}
      };

      const feedback = await evaluationSystem.generateFeedback(evaluation, 'zh-TW');

      expect(feedback).toBeDefined();
      expect(feedback).toBe('Mocked AI response'); // Since we're using MockAIService
    });
  });
});