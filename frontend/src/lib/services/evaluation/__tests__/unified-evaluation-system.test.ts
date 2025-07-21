/**
 * UnifiedEvaluationSystem 測試
 * 確保 Phase 1 的評估系統功能正常
 */

import { UnifiedEvaluationSystem } from '../unified-evaluation-system';
import { BaseAIService } from '@/lib/abstractions/base-ai-service';
import { ITask, IProgram, IScenario, IEvaluationContext } from '@/types/unified-learning';

// Mock AI Service
class MockAIService extends BaseAIService {
  async generateContent(params: any): Promise<{ text: string }> {
    return { text: 'Mocked AI response' };
  }
  
  async generateContentStream(params: any): Promise<AsyncIterable<{ text: string }>> {
    async function* generator() {
      yield { text: 'Mocked stream response' };
    }
    return generator();
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
      templateId: 'template-1',
      title: 'Test Task',
      description: 'Test Description',
      type: 'interactive',
      order: 1,
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      interactions: [],
      content: { context: {} },
      metadata: {}
    };

    const baseContext: IEvaluationContext = {
      scenario: {
        id: 'scenario-1',
        sourceType: 'pbl',
        title: 'Test Scenario',
        description: 'Test',
        taskTemplates: [],
        metadata: {}
      },
      program: {
        id: 'program-1',
        scenarioId: 'scenario-1',
        userId: 'user-123',
        status: 'active',
        startedAt: new Date().toISOString(),
        taskIds: ['task-1'],
        currentTaskIndex: 0,
        metadata: {}
      },
      previousEvaluations: []
    };

    it('should evaluate PBL task', async () => {
      const pblTask = {
        ...baseTask,
        interactions: [
          { type: 'user_input', content: 'Test input' },
          { type: 'ai_response', content: 'Test response' }
        ],
        content: {
          context: {
            ksaCodes: ['K1', 'S2', 'A3']
          }
        }
      };

      const pblContext = {
        ...baseContext,
        scenario: { ...baseContext.scenario, sourceType: 'pbl' as const }
      };

      const evaluation = await evaluationSystem.evaluateTask(pblTask, pblContext);

      expect(evaluation.targetType).toBe('task');
      expect(evaluation.targetId).toBe('task-1');
      expect(evaluation.evaluationType).toBe('pbl_task');
      expect(evaluation.score).toBeDefined();
      expect(evaluation.dimensionScores).toHaveLength(3); // KSA dimensions
      expect(evaluation.metadata?.sourceType).toBe('pbl');
    });

    it('should evaluate Assessment task', async () => {
      const assessmentTask = {
        ...baseTask,
        interactions: [
          { type: 'user_input', content: 'Answer 1', metadata: { isCorrect: true } },
          { type: 'user_input', content: 'Answer 2', metadata: { isCorrect: false } }
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

      const assessmentContext = {
        ...baseContext,
        scenario: { ...baseContext.scenario, sourceType: 'assessment' as const }
      };

      const evaluation = await evaluationSystem.evaluateTask(assessmentTask, assessmentContext);

      expect(evaluation.targetType).toBe('task');
      expect(evaluation.evaluationType).toBe('assessment_task');
      expect(evaluation.score).toBe(50); // 1 correct out of 2
      expect(evaluation.feedbackText).toContain('1 out of 2');
      expect(evaluation.metadata?.correctAnswers).toBe(1);
    });

    it('should evaluate Discovery task', async () => {
      const discoveryTask = {
        ...baseTask,
        interactions: [
          { type: 'user_input', content: 'Explore action' },
          { type: 'system_event', content: 'Discovery made' }
        ],
        content: {
          context: {
            requiredSkills: ['problem-solving', 'critical-thinking']
          }
        }
      };

      const discoveryContext = {
        ...baseContext,
        scenario: { ...baseContext.scenario, sourceType: 'discovery' as const }
      };

      const evaluation = await evaluationSystem.evaluateTask(discoveryTask, discoveryContext);

      expect(evaluation.targetType).toBe('task');
      expect(evaluation.evaluationType).toBe('discovery_task');
      expect(evaluation.score).toBeDefined();
      expect(evaluation.feedbackText).toContain('XP');
      expect(evaluation.metadata?.xpEarned).toBeDefined();
    });
  });

  describe('evaluateProgram', () => {
    it('should aggregate task evaluations into program evaluation', async () => {
      const program: IProgram = {
        id: 'program-1',
        scenarioId: 'scenario-1',
        userId: 'user-123',
        status: 'completed',
        startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        completedAt: new Date().toISOString(),
        taskIds: ['task-1', 'task-2'],
        currentTaskIndex: 2,
        metadata: { sourceType: 'pbl' }
      };

      const taskEvaluations = [
        {
          id: 'eval-1',
          targetType: 'task' as const,
          targetId: 'task-1',
          programId: 'program-1',
          userId: 'user-123',
          type: 'task_completion',
          score: 80,
          dimensionScores: [
            { dimension: 'knowledge', score: 85, maxScore: 100 },
            { dimension: 'skills', score: 75, maxScore: 100 }
          ],
          createdAt: new Date().toISOString(),
          metadata: {}
        },
        {
          id: 'eval-2',
          targetType: 'task' as const,
          targetId: 'task-2',
          programId: 'program-1',
          userId: 'user-123',
          type: 'task_completion',
          score: 90,
          dimensionScores: [
            { dimension: 'knowledge', score: 95, maxScore: 100 },
            { dimension: 'skills', score: 85, maxScore: 100 }
          ],
          createdAt: new Date().toISOString(),
          metadata: {}
        }
      ];

      const evaluation = await evaluationSystem.evaluateProgram(program, taskEvaluations);

      expect(evaluation.targetType).toBe('program');
      expect(evaluation.targetId).toBe('program-1');
      expect(evaluation.evaluationType).toBe('program_completion');
      expect(evaluation.score).toBe(85); // Average of 80 and 90
      expect(evaluation.dimensionScores).toHaveLength(2); // Aggregated dimensions
      expect(evaluation.dimensionScores?.[0].dimension).toBe('knowledge');
      expect(evaluation.dimensionScores?.[0].score).toBe(90); // Average of 85 and 95
      expect(evaluation.metadata?.taskCount).toBe(2);
      expect(evaluation.metadata?.completionTime).toBeGreaterThan(0);
    });
  });

  describe('generateFeedback', () => {
    it('should generate multilingual feedback', async () => {
      const evaluation = {
        id: 'eval-1',
        targetType: 'task' as const,
        targetId: 'task-1',
        programId: 'program-1',
        userId: 'user-123',
        type: 'task_completion',
        score: 85,
        feedback: 'Original feedback',
        dimensionScores: [
          { dimension: 'knowledge', score: 85, maxScore: 100, feedback: 'Good understanding' }
        ],
        createdAt: new Date().toISOString(),
        metadata: {}
      };

      const feedback = await evaluationSystem.generateFeedback(evaluation, 'zh-TW');

      expect(feedback).toBeDefined();
      expect(feedback).toBe('Mocked AI response'); // Since we're using MockAIService
    });
  });
});