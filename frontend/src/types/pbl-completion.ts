/**
 * PBL Completion Types
 * Type definitions for PBL scenario completion and feedback
 */

// Qualitative feedback structure
export interface FeedbackStrength {
  area: string;
  description: string;
  example?: string;
}

export interface FeedbackImprovement {
  area: string;
  description: string;
  suggestion?: string;
}

export interface QualitativeFeedback {
  overallAssessment: string;
  strengths?: FeedbackStrength[];
  areasForImprovement?: FeedbackImprovement[];
  nextSteps?: string[];
  encouragement?: string;
}

// Multi-language feedback support
export interface LocalizedFeedback {
  [language: string]: QualitativeFeedback;
}

// Task evaluation details
export interface ConversationExample {
  quote: string;
  suggestion: string;
}

export interface ConversationInsights {
  effectiveExamples?: ConversationExample[];
  improvementAreas?: ConversationExample[];
}

export interface TaskEvaluation {
  score: number;
  domainScores?: Record<string, number>;
  ksaScores?: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
  conversationInsights?: ConversationInsights;
  strengths?: string[];
  improvements?: string[];
}

// Task interaction
export interface TaskInteraction {
  type: 'user' | 'assistant';
  message: string;
  timestamp: string;
}

// Task log
export interface TaskLog {
  interactions?: TaskInteraction[];
  startedAt?: string;
  completedAt?: string;
}

// Task progress
export interface TaskProgress {
  timeSpentSeconds?: number;
  status?: string;
}

// Task data in completion
export interface CompletionTask {
  taskId: string;
  evaluation?: TaskEvaluation;
  log?: TaskLog;
  progress?: TaskProgress;
}

// Main completion data structure
export interface CompletionData {
  programId: string;
  scenarioId: string;
  userEmail?: string;
  status?: string;
  startedAt?: string;
  overallScore?: number;
  evaluatedTasks: number;
  totalTasks: number;
  totalTimeSeconds?: number;
  domainScores?: Record<string, number>;
  ksaScores?: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
  tasks?: CompletionTask[];
  completedTasks?: number;
  qualitativeFeedback?: QualitativeFeedback | LocalizedFeedback;
  feedbackLanguage?: string;
  feedbackLanguages?: string[];
  feedbackGeneratedAt?: string;
  lastFeedbackLanguage?: string;
  completedAt?: string;
  updatedAt?: string;
  taskSummaries?: unknown[]; // Used in getUserProgramsForScenario fallback
}

// Scenario task definition (from scenario data)
export interface ScenarioTask {
  id: string;
  title: string;
  title_zh?: string;
  description: string;
  description_zh?: string;
  category?: string;
  instructions?: string[];
  instructions_zh?: string[];
  expectedOutcome?: string;
  expectedOutcome_zh?: string;
  timeLimit?: number;
}

// Scenario data structure
export interface ScenarioData {
  id: string;
  title: string;
  title_zh?: string;
  description: string;
  description_zh?: string;
  difficulty: string;
  estimatedDuration: number;
  targetDomain: string[];
  prerequisites?: string[];
  learningObjectives?: string[];
  ksaMapping?: {
    knowledge: Array<{
      code: string;
      name: string;
      description: string;
    }>;
    skills: Array<{
      code: string;
      name: string;
      description: string;
    }>;
    attitudes: Array<{
      code: string;
      name: string;
      description: string;
    }>;
  };
  tasks?: ScenarioTask[];
}