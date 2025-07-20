/**
 * Module-specific type definitions
 * Extends base unified learning types with module-specific properties
 */

import { 
  IScenario, 
  IProgram, 
  ITask, 
  IEvaluation,
  IDimensionScore 
} from './unified-learning';

// ===========================
// PBL (Problem-Based Learning) Types
// ===========================

export interface IPBLScenario extends IScenario {
  sourceType: 'pbl';
  metadata: {
    learningObjectives?: string[];
    ksaCodes?: string[];
    estimatedDuration?: number; // in minutes
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    prerequisites?: string[];
    [key: string]: unknown;
  };
}

export interface IPBLProgram extends IProgram {
  metadata: {
    sourceType: 'pbl';
    learningPath?: string;
    adaptiveLevel?: number;
    [key: string]: unknown;
  };
}

export interface IPBLTask extends Omit<ITask, 'type'> {
  type: 'interactive' | 'reflection' | 'application' | 'question' | 'chat' | 'creation' | 'analysis';
  content: {
    context?: {
      scenario?: string;
      ksaCodes?: string[];
      aiMentorGuidelines?: string;
      reflectionPrompts?: string[];
      resources?: Array<{
        title: string;
        url: string;
        type: 'article' | 'video' | 'document';
      }>;
    };
    [key: string]: unknown;
  };
  metadata: {
    sourceType: 'pbl';
    expectedDuration?: number;
    allowedAttempts?: number;
    [key: string]: unknown;
  };
}

export interface IPBLEvaluation extends IEvaluation {
  type: 'pbl_task' | 'pbl_reflection' | 'pbl_completion';
  dimensions?: Array<{
    dimension: 'knowledge' | 'skills' | 'attitudes';
    score: number;
    maxScore: number;
    feedback?: string;
  }>;
  metadata: {
    sourceType: 'pbl';
    interactionQuality?: 'low' | 'medium' | 'high';
    ksaAchieved?: string[];
    reflectionDepth?: number;
    collaborationScore?: number;
    [key: string]: unknown;
  };
}

// ===========================
// Assessment Types
// ===========================

export interface IAssessmentScenario extends IScenario {
  sourceType: 'assessment';
  metadata: {
    assessmentType: 'diagnostic' | 'formative' | 'summative';
    domains?: string[];
    totalQuestions?: number;
    passingScore?: number;
    timeLimit?: number; // in seconds
    randomizeQuestions?: boolean;
    [key: string]: unknown;
  };
}

export interface IAssessmentProgram extends IProgram {
  metadata: {
    sourceType: 'assessment';
    assessmentMode?: 'practice' | 'test';
    allowReview?: boolean;
    showCorrectAnswers?: boolean;
    [key: string]: unknown;
  };
}

export interface IAssessmentTask extends Omit<ITask, 'type'> {
  type: 'assessment' | 'quiz' | 'exam' | 'question' | 'chat' | 'creation' | 'analysis';
  content: {
    context?: {
      questions?: Array<{
        id: string;
        type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
        question: string;
        options?: string[];
        correctAnswer?: string | string[];
        points?: number;
        domain?: string;
        competency?: string;
        explanation?: string;
      }>;
      instructions?: string;
      timeLimit?: number;
    };
    [key: string]: unknown;
  };
  metadata: {
    sourceType: 'assessment';
    questionBank?: string;
    adaptiveDifficulty?: boolean;
    [key: string]: unknown;
  };
}

export interface IAssessmentEvaluation extends IEvaluation {
  type: 'assessment_task' | 'assessment_complete';
  dimensions?: IDimensionScore[];
  metadata: {
    sourceType: 'assessment';
    totalQuestions?: number;
    correctAnswers?: number;
    timeSpent?: number;
    questionResults?: Array<{
      questionId: string;
      correct: boolean;
      timeSpent?: number;
      answer?: string;
    }>;
    domainScores?: Record<string, number>;
    competencyGaps?: string[];
    [key: string]: unknown;
  };
}

// ===========================
// Discovery Types
// ===========================

export interface IDiscoveryScenario extends IScenario {
  sourceType: 'discovery';
  metadata: {
    explorationPath?: string;
    skillProgression?: string[];
    xpRewards?: {
      completion: number;
      bonus?: number;
      milestones?: Record<string, number>;
    };
    unlockRequirements?: {
      level?: number;
      completedScenarios?: string[];
      skills?: string[];
    };
    [key: string]: unknown;
  };
}

export interface IDiscoveryProgram extends IProgram {
  metadata: {
    sourceType: 'discovery';
    currentLevel?: number;
    totalXP?: number;
    unlockedFeatures?: string[];
    [key: string]: unknown;
  };
}

export interface IDiscoveryTask extends Omit<ITask, 'type'> {
  type: 'exploration' | 'experiment' | 'creation' | 'question' | 'chat' | 'analysis';
  content: {
    context?: {
      explorationGoals?: string[];
      requiredSkills?: string[];
      hints?: string[];
      challenges?: Array<{
        id: string;
        description: string;
        xpReward: number;
        completed?: boolean;
      }>;
      sandbox?: {
        tools: string[];
        constraints?: string[];
      };
    };
    [key: string]: unknown;
  };
  metadata: {
    sourceType: 'discovery';
    discoveryType?: 'guided' | 'free-form';
    collaborationEnabled?: boolean;
    [key: string]: unknown;
  };
}

export interface IDiscoveryEvaluation extends IEvaluation {
  type: 'discovery_task' | 'discovery_milestone' | 'discovery_complete';
  metadata: {
    sourceType: 'discovery';
    xpEarned?: number;
    skillsImproved?: string[];
    discoveryLevel?: 'novice' | 'intermediate' | 'advanced' | 'expert';
    creativityScore?: number;
    innovationScore?: number;
    milestonesAchieved?: string[];
    badgesEarned?: Array<{
      id: string;
      name: string;
      description: string;
      iconUrl?: string;
    }>;
    [key: string]: unknown;
  };
}

// ===========================
// Type Guards
// ===========================

export function isPBLScenario(scenario: IScenario): scenario is IPBLScenario {
  return scenario.sourceType === 'pbl';
}

export function isAssessmentScenario(scenario: IScenario): scenario is IAssessmentScenario {
  return scenario.sourceType === 'assessment';
}

export function isDiscoveryScenario(scenario: IScenario): scenario is IDiscoveryScenario {
  return scenario.sourceType === 'discovery';
}

export function isPBLTask(task: ITask): task is IPBLTask {
  return (task.metadata as Record<string, unknown>)?.sourceType === 'pbl';
}

export function isAssessmentTask(task: ITask): task is IAssessmentTask {
  return (task.metadata as Record<string, unknown>)?.sourceType === 'assessment';
}

export function isDiscoveryTask(task: ITask): task is IDiscoveryTask {
  return (task.metadata as Record<string, unknown>)?.sourceType === 'discovery';
}

export function isPBLEvaluation(evaluation: IEvaluation): evaluation is IPBLEvaluation {
  return (evaluation.metadata as Record<string, unknown>)?.sourceType === 'pbl';
}

export function isAssessmentEvaluation(evaluation: IEvaluation): evaluation is IAssessmentEvaluation {
  return (evaluation.metadata as Record<string, unknown>)?.sourceType === 'assessment';
}

export function isDiscoveryEvaluation(evaluation: IEvaluation): evaluation is IDiscoveryEvaluation {
  return (evaluation.metadata as Record<string, unknown>)?.sourceType === 'discovery';
}

// ===========================
// Utility Types
// ===========================

export type ModuleType = 'pbl' | 'assessment' | 'discovery';

export type ModuleScenario = IPBLScenario | IAssessmentScenario | IDiscoveryScenario;
export type ModuleProgram = IPBLProgram | IAssessmentProgram | IDiscoveryProgram;
export type ModuleTask = IPBLTask | IAssessmentTask | IDiscoveryTask;
export type ModuleEvaluation = IPBLEvaluation | IAssessmentEvaluation | IDiscoveryEvaluation;