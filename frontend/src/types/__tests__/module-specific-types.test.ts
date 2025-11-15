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
import type { SourceType } from '../database';

describe('Module-specific Types', () => {
  describe('PBL Types', () => {
    it('should create valid PBL scenario', () => {
      const pblScenario: IPBLScenario = {
        id: 'pbl-1',
        mode: 'pbl',
        status: 'active',
        version: '1.0.0',
        sourceType: 'yaml' as SourceType,
        sourcePath: 'pbl_data/test_scenario.yaml',
        sourceMetadata: {},
        title: { en: 'PBL Scenario' },
        description: { en: 'Test PBL' },
        objectives: ['Objective 1', 'Objective 2'],
        difficulty: 'intermediate',
        estimatedMinutes: 60,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {
          ksaMapping: {
            knowledge: ['K1'],
            skills: ['S2'],
            attitudes: ['A3']
          }
        },
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          learningObjectives: ['Objective 1', 'Objective 2'],
          ksaCodes: ['K1', 'S2', 'A3'],
          estimatedDuration: 60
        }
      };

      expect(pblScenario.mode).toBe('pbl');
      expect(pblScenario.objectives).toHaveLength(2);
      expect(pblScenario.pblData.ksaMapping?.knowledge).toHaveLength(1);
      expect(isPBLScenario(pblScenario)).toBe(true);
    });

    it('should create valid PBL task', () => {
      const pblTask: IPBLTask = {
        id: 'task-1',
        programId: 'program-1',
        mode: 'pbl',
        taskIndex: 0,
        title: { en: 'PBL Task' },
        description: { en: 'Test' },
        type: 'interactive',
        status: 'active',
        content: {
          context: {
            scenario: 'Problem scenario description',
            ksaCodes: ['K1', 'S2'],
            aiMentorGuidelines: 'Be supportive and guide learning'
          }
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
        pblData: {
          ksaFocus: {
            primary: ['K1'],
            secondary: ['S2']
          },
          aiMentorGuidelines: 'Be supportive and guide learning'
        },
        discoveryData: {},
        assessmentData: {},
        metadata: {
          sourceType: 'pbl'
        }
      };

      expect(pblTask.content.context).toBeDefined();
      expect(pblTask.pblData.aiMentorGuidelines).toBeDefined();
    });

    it('should create valid PBL evaluation', () => {
      const pblEval: IPBLEvaluation = {
        id: 'eval-1',
        userId: 'user-123',
        programId: 'program-1',
        taskId: 'task-1',
        mode: 'pbl',
        evaluationType: 'task',
        evaluationSubtype: 'pbl_task',
        score: 85,
        maxScore: 100,
        domainScores: {
          knowledge: 85,
          skills: 80,
          attitudes: 90
        },
        feedbackText: 'Good problem-solving approach',
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 120,
        createdAt: new Date().toISOString(),
        pblData: {
          ksaBreakdown: {
            knowledge: { K1: 85 },
            skills: { S2: 80 },
            attitudes: { A3: 90 }
          },
          interactionQuality: 'high',
          ksaAchieved: ['K1', 'S2']
        },
        discoveryData: {},
        assessmentData: {},
        metadata: {
          sourceType: 'pbl'
        }
      };

      expect(Object.keys(pblEval.domainScores)).toHaveLength(3);
      expect(pblEval.pblData.interactionQuality).toBe('high');
    });
  });

  describe('Assessment Types', () => {
    it('should create valid Assessment scenario', () => {
      const assessmentScenario: IAssessmentScenario = {
        id: 'assessment-1',
        mode: 'assessment',
        status: 'active',
        version: '1.0.0',
        sourceType: 'yaml' as SourceType,
        sourcePath: 'assessment_data/test_assessment.yaml',
        sourceMetadata: {},
        title: { en: 'AI Literacy Assessment' },
        description: { en: 'Test your knowledge' },
        objectives: [],
        difficulty: 'intermediate',
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 20,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {
          assessmentType: 'diagnostic',
          questionBank: {
            total: 20,
            byDomain: {
              'Engaging_with_AI': 10,
              'Creating_with_AI': 10
            }
          },
          scoringRubric: {
            passingScore: 70,
            excellentScore: 90
          }
        },
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          assessmentType: 'diagnostic',
          domains: ['Engaging_with_AI', 'Creating_with_AI'],
          totalQuestions: 20,
          passingScore: 70
        }
      };

      expect(assessmentScenario.mode).toBe('assessment');
      expect(assessmentScenario.assessmentData.assessmentType).toBe('diagnostic');
      expect(isAssessmentScenario(assessmentScenario)).toBe(true);
    });

    it('should create valid Assessment task', () => {
      const assessmentTask: IAssessmentTask = {
        id: 'task-1',
        programId: 'program-1',
        mode: 'assessment',
        taskIndex: 0,
        title: { en: 'Assessment Task' },
        description: { en: 'Answer questions' },
        type: 'quiz',
        status: 'active',
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
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 1,
        attemptCount: 0,
        timeLimitSeconds: 1800,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {
          correctAnswer: 'A',
          domain: 'Engaging_with_AI',
          competency: 'Understanding AI',
          questionType: 'multiple-choice'
        },
        metadata: {
          sourceType: 'assessment'
        }
      };

      expect((assessmentTask.content.context as Record<string, unknown>).questions).toHaveLength(1);
      expect((assessmentTask.content.context as Record<string, unknown>).timeLimit).toBe(1800);
    });

    it('should create valid Assessment evaluation', () => {
      const assessmentEval: IAssessmentEvaluation = {
        id: 'eval-1',
        userId: 'user-123',
        programId: 'program-1',
        taskId: 'task-1',
        mode: 'assessment',
        evaluationType: 'task',
        evaluationSubtype: 'assessment_task',
        score: 75,
        maxScore: 100,
        domainScores: {
          'Engaging_with_AI': 80,
          'Creating_with_AI': 70
        },
        feedbackText: 'You scored 15/20 correct',
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 1200,
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {
          totalQuestions: 20,
          correctAnswers: 15,
          questionResults: [
            { questionId: 'q1', correct: true, timeSpent: 60 }
          ],
          domainScores: {
            'Engaging_with_AI': 80,
            'Creating_with_AI': 70
          }
        },
        metadata: {
          sourceType: 'assessment',
          totalQuestions: 20,
          correctAnswers: 15,
          timeSpent: 1200
        }
      };

      expect(assessmentEval.assessmentData.totalQuestions).toBe(20);
      expect(assessmentEval.assessmentData.correctAnswers).toBe(15);
      expect(assessmentEval.score).toBe(75);
    });
  });

  describe('Discovery Types', () => {
    it('should create valid Discovery scenario', () => {
      const discoveryScenario: IDiscoveryScenario = {
        id: 'discovery-1',
        mode: 'discovery',
        status: 'active',
        version: '1.0.0',
        sourceType: 'yaml' as SourceType,
        sourcePath: 'discovery_data/test_discovery.yaml',
        sourceMetadata: {},
        title: { en: 'AI Tools Exploration' },
        description: { en: 'Discover AI capabilities' },
        objectives: [],
        difficulty: 'beginner',
        estimatedMinutes: 45,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {
          completion: 100,
          bonus: 50
        },
        unlockRequirements: {},
        pblData: {},
        discoveryData: {
          explorationPath: ['ai-tools'],
          careerPaths: [],
          skillProgression: ['beginner', 'intermediate', 'advanced']
        },
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          explorationPath: 'ai-tools',
          skillProgression: ['beginner', 'intermediate', 'advanced'],
          xpRewards: {
            completion: 100,
            bonus: 50
          }
        }
      };

      expect(discoveryScenario.mode).toBe('discovery');
      expect(discoveryScenario.xpRewards.completion).toBe(100);
      expect(isDiscoveryScenario(discoveryScenario)).toBe(true);
    });

    it('should create valid Discovery task', () => {
      const discoveryTask: IDiscoveryTask = {
        id: 'task-1',
        programId: 'program-1',
        mode: 'discovery',
        taskIndex: 0,
        title: { en: 'Explore ChatGPT' },
        description: { en: 'Learn about ChatGPT' },
        type: 'exploration',
        status: 'active',
        content: {
          context: {
            explorationGoals: ['Understand capabilities', 'Try different prompts'],
            requiredSkills: ['critical-thinking', 'experimentation'],
            hints: ['Try asking it to explain concepts', 'Test its limits']
          }
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
        pblData: {},
        discoveryData: {
          explorationGoals: ['Understand capabilities', 'Try different prompts'],
          milestones: [],
          discoveredConcepts: []
        },
        assessmentData: {},
        metadata: {
          sourceType: 'discovery'
        }
      };

      expect(discoveryTask.type).toBe('exploration');
      expect(discoveryTask.discoveryData.explorationGoals).toHaveLength(2);
    });

    it('should create valid Discovery evaluation', () => {
      const discoveryEval: IDiscoveryEvaluation = {
        id: 'eval-1',
        userId: 'user-123',
        programId: 'program-1',
        taskId: 'task-1',
        mode: 'discovery',
        evaluationType: 'task',
        evaluationSubtype: 'discovery_task',
        score: 100,
        maxScore: 100,
        domainScores: {
          exploration: 100,
          creativity: 90,
          problemSolving: 95
        },
        feedbackText: 'Excellent exploration!',
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 300,
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {
          xpEarned: 150,
          skillsImproved: ['critical-thinking', 'experimentation'],
          discoveryLevel: 'advanced',
          milestonesAchieved: ['first-prompt', 'creative-use'],
          badgesEarned: []
        },
        assessmentData: {},
        metadata: {
          sourceType: 'discovery',
          xpEarned: 150,
          skillsImproved: ['critical-thinking', 'experimentation'],
          discoveryLevel: 'advanced',
          milestonesAchieved: ['first-prompt', 'creative-use']
        }
      };

      expect(discoveryEval.discoveryData.xpEarned).toBe(150);
      expect(discoveryEval.discoveryData.skillsImproved).toHaveLength(2);
      expect(discoveryEval.discoveryData.discoveryLevel).toBe('advanced');
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify PBL scenarios', () => {
      const baseScenario = {
        id: '1',
        status: 'active' as const,
        version: '1.0.0',
        sourceType: 'yaml' as SourceType,
        sourceMetadata: {},
        title: { en: 'Test' },
        description: { en: 'Test' },
        objectives: [],
        difficulty: 'intermediate' as const,
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
      };

      const pbl = { ...baseScenario, mode: 'pbl' as const };
      const assessment = { ...baseScenario, mode: 'assessment' as const };
      const discovery = { ...baseScenario, mode: 'discovery' as const };

      expect(isPBLScenario(pbl)).toBe(true);
      expect(isPBLScenario(assessment)).toBe(false);
      expect(isPBLScenario(discovery)).toBe(false);
    });

    it('should correctly identify Assessment scenarios', () => {
      const baseScenario = {
        id: '2',
        status: 'active' as const,
        version: '1.0.0',
        sourceType: 'yaml' as SourceType,
        sourceMetadata: {},
        title: { en: 'Test' },
        description: { en: 'Test' },
        objectives: [],
        difficulty: 'intermediate' as const,
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
      };

      const pbl = { ...baseScenario, mode: 'pbl' as const };
      const assessment = { ...baseScenario, mode: 'assessment' as const };
      const discovery = { ...baseScenario, mode: 'discovery' as const };

      expect(isAssessmentScenario(pbl)).toBe(false);
      expect(isAssessmentScenario(assessment)).toBe(true);
      expect(isAssessmentScenario(discovery)).toBe(false);
    });

    it('should correctly identify Discovery scenarios', () => {
      const baseScenario = {
        id: '3',
        status: 'active' as const,
        version: '1.0.0',
        sourceType: 'yaml' as SourceType,
        sourceMetadata: {},
        title: { en: 'Test' },
        description: { en: 'Test' },
        objectives: [],
        difficulty: 'intermediate' as const,
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
      };

      const pbl = { ...baseScenario, mode: 'pbl' as const };
      const assessment = { ...baseScenario, mode: 'assessment' as const };
      const discovery = { ...baseScenario, mode: 'discovery' as const };

      expect(isDiscoveryScenario(pbl)).toBe(false);
      expect(isDiscoveryScenario(assessment)).toBe(false);
      expect(isDiscoveryScenario(discovery)).toBe(true);
    });
  });
});
