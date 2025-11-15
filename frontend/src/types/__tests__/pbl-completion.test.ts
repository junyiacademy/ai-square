/**
 * Unit tests for PBL Completion types
 * Tests all completion-related interfaces and type structures
 */

import type {
  FeedbackStrength,
  FeedbackImprovement,
  QualitativeFeedback,
  LocalizedFeedback,
  ConversationExample,
  ConversationInsights,
  TaskEvaluation,
  TaskInteraction,
  TaskLog,
  TaskProgress,
  CompletionTask,
  CompletionData,
  ScenarioTask,
  ScenarioData
} from '../pbl-completion';

describe('PBL Completion Types', () => {
  describe('FeedbackStrength interface', () => {
    it('should define feedback strength structure', () => {
      const strength: FeedbackStrength = {
        area: 'Critical Thinking',
        description: 'Demonstrated excellent analytical skills',
        example: 'Your analysis of stakeholder perspectives was thorough'
      };

      expect(strength.area).toBe('Critical Thinking');
      expect(strength.description).toContain('analytical');
      expect(strength.example).toContain('stakeholder');
    });

    it('should allow strength without example', () => {
      const strengthWithoutExample: FeedbackStrength = {
        area: 'Communication',
        description: 'Clear and concise explanations'
      };

      expect(strengthWithoutExample.area).toBe('Communication');
      expect(strengthWithoutExample.example).toBeUndefined();
    });
  });

  describe('FeedbackImprovement interface', () => {
    it('should define feedback improvement structure', () => {
      const improvement: FeedbackImprovement = {
        area: 'Ethical Reasoning',
        description: 'Could explore more ethical frameworks',
        suggestion: 'Consider deontological and consequentialist perspectives'
      };

      expect(improvement.area).toBe('Ethical Reasoning');
      expect(improvement.description).toContain('frameworks');
      expect(improvement.suggestion).toContain('deontological');
    });

    it('should allow improvement without suggestion', () => {
      const improvementWithoutSuggestion: FeedbackImprovement = {
        area: 'Research Skills',
        description: 'Need more comprehensive source analysis'
      };

      expect(improvementWithoutSuggestion.area).toBe('Research Skills');
      expect(improvementWithoutSuggestion.suggestion).toBeUndefined();
    });
  });

  describe('QualitativeFeedback interface', () => {
    it('should define complete qualitative feedback structure', () => {
      const feedback: QualitativeFeedback = {
        overallAssessment: 'You demonstrated strong analytical skills throughout this scenario.',
        strengths: [
          {
            area: 'Critical Thinking',
            description: 'Excellent problem decomposition',
            example: 'Your stakeholder analysis was comprehensive'
          }
        ],
        areasForImprovement: [
          {
            area: 'Ethics',
            description: 'Could consider more frameworks',
            suggestion: 'Try applying utilitarian principles'
          }
        ],
        nextSteps: [
          'Practice with more complex ethical scenarios',
          'Study additional decision-making frameworks'
        ],
        encouragement: 'Your progress in AI literacy is remarkable. Keep exploring!'
      };

      expect(feedback.overallAssessment).toContain('analytical');
      expect(feedback.strengths).toHaveLength(1);
      expect(feedback.areasForImprovement).toHaveLength(1);
      expect(feedback.nextSteps).toHaveLength(2);
      expect(feedback.encouragement).toContain('remarkable');
    });

    it('should allow minimal feedback with only assessment', () => {
      const minimalFeedback: QualitativeFeedback = {
        overallAssessment: 'Good work on this scenario.'
      };

      expect(minimalFeedback.overallAssessment).toBe('Good work on this scenario.');
      expect(minimalFeedback.strengths).toBeUndefined();
      expect(minimalFeedback.areasForImprovement).toBeUndefined();
    });
  });

  describe('LocalizedFeedback interface', () => {
    it('should define multi-language feedback structure', () => {
      const localizedFeedback: LocalizedFeedback = {
        en: {
          overallAssessment: 'Excellent analytical thinking demonstrated.',
          strengths: [{ area: 'Analysis', description: 'Thorough evaluation' }],
          nextSteps: ['Continue practicing']
        },
        zh: {
          overallAssessment: '展現了優秀的分析思維。',
          strengths: [{ area: '分析', description: '徹底的評估' }],
          nextSteps: ['繼續練習']
        },
        es: {
          overallAssessment: 'Excelente pensamiento analítico demostrado.',
          strengths: [{ area: 'Análisis', description: 'Evaluación exhaustiva' }],
          nextSteps: ['Continuar practicando']
        }
      };

      expect(localizedFeedback.en.overallAssessment).toContain('analytical');
      expect(localizedFeedback.zh.overallAssessment).toContain('分析');
      expect(localizedFeedback.es.overallAssessment).toContain('analítico');
      expect(Object.keys(localizedFeedback)).toHaveLength(3);
    });
  });

  describe('ConversationExample interface', () => {
    it('should define conversation example structure', () => {
      const example: ConversationExample = {
        quote: 'I think AI should prioritize fairness over efficiency.',
        suggestion: 'This shows good ethical reasoning. Consider also discussing specific scenarios where this might apply.'
      };

      expect(example.quote).toContain('fairness');
      expect(example.suggestion).toContain('ethical reasoning');
    });
  });

  describe('ConversationInsights interface', () => {
    it('should define conversation insights structure', () => {
      const insights: ConversationInsights = {
        effectiveExamples: [
          {
            quote: 'The stakeholders include users, developers, and society.',
            suggestion: 'Excellent comprehensive thinking about impact.'
          }
        ],
        improvementAreas: [
          {
            quote: 'AI is always good.',
            suggestion: 'Consider potential negative impacts and trade-offs.'
          }
        ]
      };

      expect(insights.effectiveExamples).toHaveLength(1);
      expect(insights.improvementAreas).toHaveLength(1);
      expect(insights.effectiveExamples?.[0].quote).toContain('stakeholders');
      expect(insights.improvementAreas?.[0].suggestion).toContain('negative');
    });

    it('should allow insights without examples', () => {
      const minimalInsights: ConversationInsights = {};

      expect(minimalInsights.effectiveExamples).toBeUndefined();
      expect(minimalInsights.improvementAreas).toBeUndefined();
    });
  });

  describe('TaskEvaluation interface', () => {
    it('should define complete task evaluation structure', () => {
      const evaluation: TaskEvaluation = {
        score: 85,
        domainScores: {
          'engaging_with_ai': 90,
          'creating_with_ai': 80,
          'managing_ai': 85,
          'designing_ai': 80
        },
        ksaScores: {
          knowledge: 88,
          skills: 82,
          attitudes: 90
        },
        conversationInsights: {
          effectiveExamples: [
            { quote: 'Great insight', suggestion: 'Keep this approach' }
          ]
        },
        strengths: ['Strong ethical reasoning', 'Clear communication'],
        improvements: ['Consider more perspectives', 'Provide examples']
      };

      expect(evaluation.score).toBe(85);
      expect(evaluation.domainScores?.['engaging_with_ai']).toBe(90);
      expect(evaluation.ksaScores?.knowledge).toBe(88);
      expect(evaluation.strengths).toHaveLength(2);
      expect(evaluation.improvements).toHaveLength(2);
    });

    it('should allow minimal evaluation with just score', () => {
      const minimalEvaluation: TaskEvaluation = {
        score: 75
      };

      expect(minimalEvaluation.score).toBe(75);
      expect(minimalEvaluation.domainScores).toBeUndefined();
      expect(minimalEvaluation.ksaScores).toBeUndefined();
    });
  });

  describe('TaskInteraction interface', () => {
    it('should define task interaction structure', () => {
      const userInteraction: TaskInteraction = {
        type: 'user',
        message: 'I believe we should consider the ethical implications.',
        timestamp: '2024-01-01T12:00:00Z'
      };

      const assistantInteraction: TaskInteraction = {
        type: 'assistant',
        message: 'That\'s an excellent point. Can you elaborate on which stakeholders?',
        timestamp: '2024-01-01T12:00:30Z'
      };

      expect(userInteraction.type).toBe('user');
      expect(userInteraction.message).toContain('ethical');
      expect(assistantInteraction.type).toBe('assistant');
      expect(assistantInteraction.message).toContain('stakeholders');
    });
  });

  describe('TaskLog interface', () => {
    it('should define task log structure', () => {
      const taskLog: TaskLog = {
        interactions: [
          { type: 'user', message: 'Hello', timestamp: '2024-01-01T12:00:00Z' },
          { type: 'assistant', message: 'Hi there!', timestamp: '2024-01-01T12:00:05Z' }
        ],
        startedAt: '2024-01-01T11:59:00Z',
        completedAt: '2024-01-01T12:30:00Z'
      };

      expect(taskLog.interactions).toHaveLength(2);
      expect(taskLog.startedAt).toBe('2024-01-01T11:59:00Z');
      expect(taskLog.completedAt).toBe('2024-01-01T12:30:00Z');
    });

    it('should allow empty task log', () => {
      const emptyLog: TaskLog = {};

      expect(emptyLog.interactions).toBeUndefined();
      expect(emptyLog.startedAt).toBeUndefined();
      expect(emptyLog.completedAt).toBeUndefined();
    });
  });

  describe('TaskProgress interface', () => {
    it('should define task progress structure', () => {
      const progress: TaskProgress = {
        timeSpentSeconds: 1800, // 30 minutes
        status: 'completed'
      };

      expect(progress.timeSpentSeconds).toBe(1800);
      expect(progress.status).toBe('completed');
    });

    it('should allow minimal progress', () => {
      const minimalProgress: TaskProgress = {};

      expect(minimalProgress.timeSpentSeconds).toBeUndefined();
      expect(minimalProgress.status).toBeUndefined();
    });
  });

  describe('CompletionTask interface', () => {
    it('should define completion task structure', () => {
      const completionTask: CompletionTask = {
        taskId: 'task-123',
        taskTitle: 'Ethical Analysis Task',
        taskIndex: 0,
        evaluation: {
          score: 85,
          strengths: ['Good analysis'],
          improvements: ['More depth needed']
        },
        log: {
          interactions: [
            { type: 'user', message: 'My analysis...', timestamp: '2024-01-01T12:00:00Z' }
          ],
          startedAt: '2024-01-01T11:30:00Z',
          completedAt: '2024-01-01T12:30:00Z'
        },
        progress: {
          timeSpentSeconds: 3600,
          status: 'completed'
        }
      };

      expect(completionTask.taskId).toBe('task-123');
      expect(completionTask.taskTitle).toBe('Ethical Analysis Task');
      expect(completionTask.evaluation?.score).toBe(85);
      expect(completionTask.log?.interactions).toHaveLength(1);
      expect(completionTask.progress?.status).toBe('completed');
    });

    it('should allow minimal completion task', () => {
      const minimalTask: CompletionTask = {
        taskId: 'task-456'
      };

      expect(minimalTask.taskId).toBe('task-456');
      expect(minimalTask.taskTitle).toBeUndefined();
      expect(minimalTask.evaluation).toBeUndefined();
    });
  });

  describe('CompletionData interface', () => {
    it('should define complete completion data structure', () => {
      const completionData: CompletionData = {
        programId: 'program-123',
        scenarioId: 'scenario-456',
        userEmail: 'user@example.com',
        status: 'completed',
        startedAt: '2024-01-01T10:00:00Z',
        overallScore: 85,
        evaluatedTasks: 3,
        totalTasks: 3,
        totalTimeSeconds: 5400, // 90 minutes
        domainScores: {
          'engaging_with_ai': 88,
          'creating_with_ai': 82,
          'managing_ai': 85,
          'designing_ai': 85
        },
        ksaScores: {
          knowledge: 86,
          skills: 84,
          attitudes: 88
        },
        tasks: [
          {
            taskId: 'task-1',
            taskTitle: 'Analysis',
            evaluation: { score: 85, strengths: [], improvements: [] }
          }
        ],
        completedTasks: 3,
        qualitativeFeedback: {
          overallAssessment: 'Excellent work overall.',
          strengths: [{ area: 'Analysis', description: 'Thorough' }],
          nextSteps: ['Continue practicing']
        },
        feedbackLanguage: 'en',
        feedbackLanguages: ['en', 'zh', 'es'],
        feedbackGeneratedAt: '2024-01-01T15:00:00Z',
        lastFeedbackLanguage: 'en',
        completedAt: '2024-01-01T14:30:00Z',
        updatedAt: '2024-01-01T15:00:00Z',
        taskSummaries: []
      };

      expect(completionData.programId).toBe('program-123');
      expect(completionData.scenarioId).toBe('scenario-456');
      expect(completionData.overallScore).toBe(85);
      expect(completionData.evaluatedTasks).toBe(3);
      expect(completionData.totalTasks).toBe(3);
      expect(completionData.domainScores?.['engaging_with_ai']).toBe(88);
      expect(completionData.ksaScores?.knowledge).toBe(86);
      expect(completionData.tasks).toHaveLength(1);
      expect(completionData.feedbackLanguages).toContain('zh');
    });

    it('should allow minimal completion data', () => {
      const minimalData: CompletionData = {
        programId: 'program-123',
        scenarioId: 'scenario-456',
        evaluatedTasks: 0,
        totalTasks: 3
      };

      expect(minimalData.programId).toBe('program-123');
      expect(minimalData.scenarioId).toBe('scenario-456');
      expect(minimalData.evaluatedTasks).toBe(0);
      expect(minimalData.overallScore).toBeUndefined();
    });
  });

  describe('ScenarioTask interface', () => {
    it('should define scenario task with multi-language support', () => {
      const scenarioTask: ScenarioTask = {
        id: 'task-123',
        title: 'Ethical Analysis',
        title_zhTW: '道德分析',
        title_zhCN: '道德分析',
        title_pt: 'Análise Ética',
        title_ar: 'التحليل الأخلاقي',
        title_id: 'Analisis Etis',
        title_th: 'การวิเคราะห์จริยธรรม',
        description: 'Analyze the ethical implications of AI decisions.',
        description_zhTW: '分析AI決策的道德影響。',
        description_pt: 'Analisar as implicações éticas das decisões de IA.',
        category: 'analysis',
        instructions: ['Read the scenario', 'Identify stakeholders', 'Analyze impacts'],
        instructions_zhTW: ['閱讀情境', '識別利害關係人', '分析影響'],
        expectedOutcome: 'A comprehensive ethical analysis',
        expectedOutcome_zhTW: '全面的道德分析',
        timeLimit: 30
      };

      expect(scenarioTask.id).toBe('task-123');
      expect(scenarioTask.title).toBe('Ethical Analysis');
      expect(scenarioTask.title_zhTW).toBe('道德分析');
      expect(scenarioTask.description).toContain('ethical');
      expect(scenarioTask.instructions).toHaveLength(3);
      expect(scenarioTask.timeLimit).toBe(30);
    });

    it('should allow scenario task with minimal fields', () => {
      const minimalTask: ScenarioTask = {
        id: 'task-456',
        title: 'Simple Task',
        description: 'A basic task'
      };

      expect(minimalTask.id).toBe('task-456');
      expect(minimalTask.title).toBe('Simple Task');
      expect(minimalTask.description).toBe('A basic task');
      expect(minimalTask.category).toBeUndefined();
      expect(minimalTask.timeLimit).toBeUndefined();
    });
  });

  describe('ScenarioData interface', () => {
    it('should define complete scenario data structure', () => {
      const scenarioData: ScenarioData = {
        id: 'scenario-123',
        title: 'AI Ethics Scenario',
        title_zhTW: 'AI道德情境',
        title_pt: 'Cenário de Ética de IA',
        description: 'A comprehensive scenario about AI ethics.',
        description_zhTW: '關於AI道德的綜合情境。',
        difficulty: 'intermediate',
        estimatedDuration: 90,
        targetDomain: ['engaging_with_ai', 'designing_ai'],
        prerequisites: ['Basic AI knowledge'],
        learningObjectives: ['Understand ethical frameworks', 'Apply ethical reasoning'],
        ksaMapping: {
          knowledge: [
            { code: 'K1.1', name: 'AI Fundamentals', description: 'Understanding AI basics' }
          ],
          skills: [
            { code: 'S1.1', name: 'Critical Thinking', description: 'Analytical reasoning' }
          ],
          attitudes: [
            { code: 'A1.1', name: 'Ethical Awareness', description: 'Sensitivity to ethics' }
          ]
        },
        tasks: [
          {
            id: 'task-1',
            title: 'Analysis Task',
            description: 'Analyze the scenario'
          }
        ]
      };

      expect(scenarioData.id).toBe('scenario-123');
      expect(scenarioData.title).toBe('AI Ethics Scenario');
      expect(scenarioData.difficulty).toBe('intermediate');
      expect(scenarioData.estimatedDuration).toBe(90);
      expect(scenarioData.targetDomain).toContain('engaging_with_ai');
      expect(scenarioData.ksaMapping?.knowledge).toHaveLength(1);
      expect(scenarioData.tasks).toHaveLength(1);
    });

    it('should allow minimal scenario data', () => {
      const minimalScenario: ScenarioData = {
        id: 'scenario-456',
        title: 'Simple Scenario',
        description: 'A basic scenario',
        difficulty: 'beginner',
        estimatedDuration: 30,
        targetDomain: ['engaging_with_ai']
      };

      expect(minimalScenario.id).toBe('scenario-456');
      expect(minimalScenario.title).toBe('Simple Scenario');
      expect(minimalScenario.difficulty).toBe('beginner');
      expect(minimalScenario.prerequisites).toBeUndefined();
      expect(minimalScenario.ksaMapping).toBeUndefined();
    });
  });

  describe('Type exports validation', () => {
    it('should export all completion types', () => {
      // Type assertion tests to ensure all types are properly exported
      const feedbackStrength = {} as FeedbackStrength;
      const feedbackImprovement = {} as FeedbackImprovement;
      const qualitativeFeedback = {} as QualitativeFeedback;
      const localizedFeedback = {} as LocalizedFeedback;
      const conversationExample = {} as ConversationExample;
      const conversationInsights = {} as ConversationInsights;
      const taskEvaluation = {} as TaskEvaluation;
      const taskInteraction = {} as TaskInteraction;
      const taskLog = {} as TaskLog;
      const taskProgress = {} as TaskProgress;
      const completionTask = {} as CompletionTask;
      const completionData = {} as CompletionData;
      const scenarioTask = {} as ScenarioTask;
      const scenarioData = {} as ScenarioData;

      // If types are properly defined, these should not throw
      expect(feedbackStrength).toBeDefined();
      expect(feedbackImprovement).toBeDefined();
      expect(qualitativeFeedback).toBeDefined();
      expect(localizedFeedback).toBeDefined();
      expect(conversationExample).toBeDefined();
      expect(conversationInsights).toBeDefined();
      expect(taskEvaluation).toBeDefined();
      expect(taskInteraction).toBeDefined();
      expect(taskLog).toBeDefined();
      expect(taskProgress).toBeDefined();
      expect(completionTask).toBeDefined();
      expect(completionData).toBeDefined();
      expect(scenarioTask).toBeDefined();
      expect(scenarioData).toBeDefined();
    });
  });
});
