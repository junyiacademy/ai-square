/**
 * Module-specific type definitions
 * Extends base unified learning types with module-specific properties
 */

import {
  IScenario,
  IProgram,
  ITask,
  IEvaluation
} from './unified-learning';

import type { TaskType } from './database';

// ===========================
// PBL (Problem-Based Learning) Types
// ===========================

export interface IPBLScenario extends IScenario {
  mode: 'pbl';
  pblData: {
    ksaMapping?: {
      knowledge: string[];
      skills: string[];
      attitudes: string[];
    };
    aiMentorGuidelines?: string;
    reflectionPrompts?: string[];
    [key: string]: unknown;
  };
}

export interface IPBLProgram extends IProgram {
  pblData: {
    reflectionNotes?: Array<Record<string, unknown>>;
    learningPath?: string;
    adaptiveLevel?: number;
    [key: string]: unknown;
  };
}

export interface IPBLTask extends ITask {
  type: TaskType;  // Will be constrained by actual task type
  pblData: {
    ksaFocus?: {
      primary: string[];
      secondary: string[];
    };
    aiMentorGuidelines?: string;
    reflectionPrompts?: string[];
    resources?: Array<{
      title: string;
      url: string;
      type: 'article' | 'video' | 'document';
    }>;
    [key: string]: unknown;
  };
}

export interface IPBLEvaluation extends IEvaluation {
  evaluationType: 'task' | 'program' | 'skill';
  evaluationSubtype: 'pbl_task' | 'pbl_reflection' | 'pbl_completion';
  pblData: {
    ksaBreakdown?: {
      knowledge: Record<string, number>;
      skills: Record<string, number>;
      attitudes: Record<string, number>;
    };
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
  mode: 'assessment';
  assessmentData: {
    assessmentType?: 'diagnostic' | 'formative' | 'summative';
    questionBank?: {
      total?: number;
      byDomain?: Record<string, number>;
    };
    scoringRubric?: {
      passingScore?: number;
      excellentScore?: number;
    };
    timeLimits?: {
      perQuestion?: number;
      total?: number;
    };
    [key: string]: unknown;
  };
}

export interface IAssessmentProgram extends IProgram {
  assessmentData: {
    answerSheet?: Record<string, unknown>;
    startTime?: string;
    assessmentMode?: 'practice' | 'test';
    allowReview?: boolean;
    showCorrectAnswers?: boolean;
    [key: string]: unknown;
  };
}

export interface IAssessmentTask extends ITask {
  type: TaskType;  // Will be constrained by actual task type
  assessmentData: {
    correctAnswer?: string | number;
    domain?: string;
    competency?: string;
    explanation?: string;
    questionType?: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
    adaptiveDifficulty?: boolean;
    [key: string]: unknown;
  };
}

export interface IAssessmentEvaluation extends IEvaluation {
  evaluationType: 'task' | 'program' | 'skill';
  evaluationSubtype: 'assessment_task' | 'assessment_complete';
  assessmentData: {
    totalQuestions?: number;
    correctAnswers?: number;
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
  mode: 'discovery';
  discoveryData: {
    careerType?: string;
    careerInfo?: {
      avgSalary?: string;
      demandLevel?: string;
      requiredSkills?: string[];
    };
    skillTree?: {
      core?: string[];
      advanced?: string[];
    };
    xpRewards?: {
      completion?: number;
      challenge?: number;
      innovation?: number;
    };
    explorationPath?: string[];
    [key: string]: unknown;
  };
}

export interface IDiscoveryProgram extends IProgram {
  discoveryData: {
    explorationPath?: Array<Record<string, unknown>>;
    currentLevel?: number;
    unlockedFeatures?: string[];
    [key: string]: unknown;
  };
}

export interface IDiscoveryTask extends ITask {
  type: TaskType;  // Will be constrained by actual task type
  discoveryData: {
    skillRequirements?: Record<string, number>;
    explorationGoals?: string[];
    hints?: string[];
    challenges?: Array<{
      id: string;
      description: string;
      xpReward: number;
      completed?: boolean;
    }>;
    discoveryType?: 'guided' | 'free-form';
    collaborationEnabled?: boolean;
    [key: string]: unknown;
  };
}

export interface IDiscoveryEvaluation extends IEvaluation {
  evaluationType: 'task' | 'program' | 'skill';
  evaluationSubtype: 'discovery_task' | 'discovery_milestone' | 'discovery_complete';
  discoveryData: {
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
  return scenario.mode === 'pbl';
}

export function isAssessmentScenario(scenario: IScenario): scenario is IAssessmentScenario {
  return scenario.mode === 'assessment';
}

export function isDiscoveryScenario(scenario: IScenario): scenario is IDiscoveryScenario {
  return scenario.mode === 'discovery';
}

export function isPBLTask(task: ITask): task is IPBLTask {
  return Object.keys(task.pblData || {}).length > 0 &&
         Object.keys(task.discoveryData || {}).length === 0 &&
         Object.keys(task.assessmentData || {}).length === 0;
}

export function isAssessmentTask(task: ITask): task is IAssessmentTask {
  return Object.keys(task.assessmentData || {}).length > 0 &&
         Object.keys(task.pblData || {}).length === 0 &&
         Object.keys(task.discoveryData || {}).length === 0;
}

export function isDiscoveryTask(task: ITask): task is IDiscoveryTask {
  return Object.keys(task.discoveryData || {}).length > 0 &&
         Object.keys(task.pblData || {}).length === 0 &&
         Object.keys(task.assessmentData || {}).length === 0;
}

export function isPBLEvaluation(evaluation: IEvaluation): evaluation is IPBLEvaluation {
  return evaluation.evaluationSubtype?.startsWith('pbl_') || false;
}

export function isAssessmentEvaluation(evaluation: IEvaluation): evaluation is IAssessmentEvaluation {
  return evaluation.evaluationSubtype?.startsWith('assessment_') || false;
}

export function isDiscoveryEvaluation(evaluation: IEvaluation): evaluation is IDiscoveryEvaluation {
  return evaluation.evaluationSubtype?.startsWith('discovery_') || false;
}

// ===========================
// Utility Types
// ===========================

export type ModuleType = 'pbl' | 'assessment' | 'discovery';

export type ModuleScenario = IPBLScenario | IAssessmentScenario | IDiscoveryScenario;
export type ModuleProgram = IPBLProgram | IAssessmentProgram | IDiscoveryProgram;
export type ModuleTask = IPBLTask | IAssessmentTask | IDiscoveryTask;
export type ModuleEvaluation = IPBLEvaluation | IAssessmentEvaluation | IDiscoveryEvaluation;
