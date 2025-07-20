/**
 * Module-specific type definitions tests
 * Following TDD Red → Green → Refactor
 */

import { 
  IPBLScenario,
  IPBLProgram,
  IPBLTask,
  IPBLEvaluation,
  IAssessmentScenario,
  IAssessmentProgram,
  IAssessmentTask,
  IAssessmentEvaluation,
  IDiscoveryScenario,
  IDiscoveryProgram,
  IDiscoveryTask,
  IDiscoveryEvaluation,
  isPBLScenario,
  isAssessmentScenario,
  isDiscoveryScenario
} from '../module-specific-types';

describe('Module-specific Types', () => {
  describe('PBL Types', () => {
    it('should create valid PBL scenario', () => {
      const pblScenario: IPBLScenario = {
        id: 'pbl-1',
        sourceType: 'pbl',
        title: 'PBL Scenario',
        description: 'Test PBL',
        taskTemplates: [],
        metadata: {
          learningObjectives: ['Objective 1', 'Objective 2'],
          ksaCodes: ['K1', 'S2', 'A3'],
          estimatedDuration: 60
        }
      };

      expect(pblScenario.sourceType).toBe('pbl');
      expect(pblScenario.metadata.learningObjectives).toHaveLength(2);
      expect(isPBLScenario(pblScenario)).toBe(true);
    });

    it('should create valid PBL task', () => {
      const pblTask: IPBLTask = {
        id: 'task-1',
        programId: 'program-1',
        templateId: 'template-1',
        title: 'PBL Task',
        description: 'Test',
        type: 'interactive',
        order: 1,
        status: 'active',
        createdAt: new Date().toISOString(),
        content: {
          context: {
            scenario: 'Problem scenario description',
            ksaCodes: ['K1', 'S2'],
            aiMentorGuidelines: 'Be supportive and guide learning'
          }
        },
        interactions: [],
        metadata: {
          sourceType: 'pbl'
        }
      };

      expect(pblTask.content.context?.scenario).toBeDefined();
      expect(pblTask.content.context?.aiMentorGuidelines).toBeDefined();
    });

    it('should create valid PBL evaluation', () => {
      const pblEval: IPBLEvaluation = {
        id: 'eval-1',
        targetType: 'task',
        targetId: 'task-1',
        programId: 'program-1',
        userId: 'user-123',
        type: 'pbl_task',
        score: 85,
        feedback: 'Good problem-solving approach',
        dimensionScores: [
          { dimension: 'knowledge', score: 85, maxScore: 100 },
          { dimension: 'skills', score: 80, maxScore: 100 },
          { dimension: 'attitudes', score: 90, maxScore: 100 }
        ],
        createdAt: new Date().toISOString(),
        metadata: {
          sourceType: 'pbl',
          interactionQuality: 'high',
          ksaAchieved: ['K1', 'S2']
        }
      };

      expect(pblEval.dimensionScores).toHaveLength(3);
      expect(pblEval.metadata?.interactionQuality).toBe('high');
    });
  });

  describe('Assessment Types', () => {
    it('should create valid Assessment scenario', () => {
      const assessmentScenario: IAssessmentScenario = {
        id: 'assessment-1',
        sourceType: 'assessment',
        title: 'AI Literacy Assessment',
        description: 'Test your knowledge',
        taskTemplates: [],
        metadata: {
          assessmentType: 'diagnostic',
          domains: ['Engaging_with_AI', 'Creating_with_AI'],
          totalQuestions: 20,
          passingScore: 70
        }
      };

      expect(assessmentScenario.sourceType).toBe('assessment');
      expect(assessmentScenario.metadata.assessmentType).toBe('diagnostic');
      expect(isAssessmentScenario(assessmentScenario)).toBe(true);
    });

    it('should create valid Assessment task', () => {
      const assessmentTask: IAssessmentTask = {
        id: 'task-1',
        programId: 'program-1',
        templateId: 'template-1',
        title: 'Assessment Task',
        description: 'Answer questions',
        type: 'assessment',
        order: 1,
        status: 'active',
        createdAt: new Date().toISOString(),
        content: {
          context: {
            questions: [
              {
                id: 'q1',
                type: 'multiple-choice',
                question: 'What is AI?',
                options: ['A', 'B', 'C', 'D'],
                correctAnswer: 'A',
                domain: 'Engaging_with_AI',
                competency: 'Understanding AI'
              }
            ],
            timeLimit: 1800
          }
        },
        interactions: [],
        metadata: {
          sourceType: 'assessment'
        }
      };

      expect(assessmentTask.content.context?.questions).toHaveLength(1);
      expect(assessmentTask.content.context?.timeLimit).toBe(1800);
    });

    it('should create valid Assessment evaluation', () => {
      const assessmentEval: IAssessmentEvaluation = {
        id: 'eval-1',
        targetType: 'task',
        targetId: 'task-1',
        programId: 'program-1',
        userId: 'user-123',
        type: 'assessment_task',
        score: 75,
        feedback: 'You scored 15/20 correct',
        dimensionScores: [
          { dimension: 'Engaging_with_AI', score: 80, maxScore: 100 },
          { dimension: 'Creating_with_AI', score: 70, maxScore: 100 }
        ],
        createdAt: new Date().toISOString(),
        metadata: {
          sourceType: 'assessment',
          totalQuestions: 20,
          correctAnswers: 15,
          timeSpent: 1200,
          questionResults: [
            { questionId: 'q1', correct: true, timeSpent: 60 }
          ]
        }
      };

      expect(assessmentEval.metadata?.totalQuestions).toBe(20);
      expect(assessmentEval.metadata?.correctAnswers).toBe(15);
      expect(assessmentEval.score).toBe(75);
    });
  });

  describe('Discovery Types', () => {
    it('should create valid Discovery scenario', () => {
      const discoveryScenario: IDiscoveryScenario = {
        id: 'discovery-1',
        sourceType: 'discovery',
        title: 'AI Tools Exploration',
        description: 'Discover AI capabilities',
        taskTemplates: [],
        metadata: {
          explorationPath: 'ai-tools',
          skillProgression: ['beginner', 'intermediate', 'advanced'],
          xpRewards: {
            completion: 100,
            bonus: 50
          }
        }
      };

      expect(discoveryScenario.sourceType).toBe('discovery');
      expect(discoveryScenario.metadata.xpRewards?.completion).toBe(100);
      expect(isDiscoveryScenario(discoveryScenario)).toBe(true);
    });

    it('should create valid Discovery task', () => {
      const discoveryTask: IDiscoveryTask = {
        id: 'task-1',
        programId: 'program-1',
        templateId: 'template-1',
        title: 'Explore ChatGPT',
        description: 'Learn about ChatGPT',
        type: 'exploration',
        order: 1,
        status: 'active',
        createdAt: new Date().toISOString(),
        content: {
          context: {
            explorationGoals: ['Understand capabilities', 'Try different prompts'],
            requiredSkills: ['critical-thinking', 'experimentation'],
            hints: ['Try asking it to explain concepts', 'Test its limits']
          }
        },
        interactions: [],
        metadata: {
          sourceType: 'discovery'
        }
      };

      expect(discoveryTask.type).toBe('exploration');
      expect(discoveryTask.content.context?.explorationGoals).toHaveLength(2);
    });

    it('should create valid Discovery evaluation', () => {
      const discoveryEval: IDiscoveryEvaluation = {
        id: 'eval-1',
        targetType: 'task',
        targetId: 'task-1',
        programId: 'program-1',
        userId: 'user-123',
        type: 'discovery_task',
        score: 100,
        feedback: 'Excellent exploration!',
        createdAt: new Date().toISOString(),
        metadata: {
          sourceType: 'discovery',
          xpEarned: 150,
          skillsImproved: ['critical-thinking', 'experimentation'],
          discoveryLevel: 'advanced',
          milestonesAchieved: ['first-prompt', 'creative-use']
        }
      };

      expect(discoveryEval.metadata?.xpEarned).toBe(150);
      expect(discoveryEval.metadata?.skillsImproved).toHaveLength(2);
      expect(discoveryEval.metadata?.discoveryLevel).toBe('advanced');
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify PBL scenarios', () => {
      const pbl = { sourceType: 'pbl', id: '1', title: 'PBL', description: '', taskTemplates: [], metadata: {} };
      const assessment = { sourceType: 'assessment', id: '2', title: 'Assessment', description: '', taskTemplates: [], metadata: {} };
      const discovery = { sourceType: 'discovery', id: '3', title: 'Discovery', description: '', taskTemplates: [], metadata: {} };

      expect(isPBLScenario(pbl)).toBe(true);
      expect(isPBLScenario(assessment)).toBe(false);
      expect(isPBLScenario(discovery)).toBe(false);
    });

    it('should correctly identify Assessment scenarios', () => {
      const pbl = { sourceType: 'pbl', id: '1', title: 'PBL', description: '', taskTemplates: [], metadata: {} };
      const assessment = { sourceType: 'assessment', id: '2', title: 'Assessment', description: '', taskTemplates: [], metadata: {} };
      const discovery = { sourceType: 'discovery', id: '3', title: 'Discovery', description: '', taskTemplates: [], metadata: {} };

      expect(isAssessmentScenario(pbl)).toBe(false);
      expect(isAssessmentScenario(assessment)).toBe(true);
      expect(isAssessmentScenario(discovery)).toBe(false);
    });

    it('should correctly identify Discovery scenarios', () => {
      const pbl = { sourceType: 'pbl', id: '1', title: 'PBL', description: '', taskTemplates: [], metadata: {} };
      const assessment = { sourceType: 'assessment', id: '2', title: 'Assessment', description: '', taskTemplates: [], metadata: {} };
      const discovery = { sourceType: 'discovery', id: '3', title: 'Discovery', description: '', taskTemplates: [], metadata: {} };

      expect(isDiscoveryScenario(pbl)).toBe(false);
      expect(isDiscoveryScenario(assessment)).toBe(false);
      expect(isDiscoveryScenario(discovery)).toBe(true);
    });
  });
});