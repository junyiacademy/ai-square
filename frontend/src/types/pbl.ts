// PBL (Problem-Based Learning) Type Definitions

export type DomainType = 'engaging_with_ai' | 'creating_with_ai' | 'managing_with_ai' | 'designing_with_ai';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type StageType = 'research' | 'analysis' | 'creation' | 'interaction';
export type ModalityFocus = 'reading' | 'writing' | 'listening' | 'speaking' | 'mixed';
export type AIRole = 'assistant' | 'evaluator' | 'actor';
export type SessionStatus = 'not_started' | 'in_progress' | 'paused' | 'completed';
export type ActionType = 'search' | 'write' | 'speak' | 'revise' | 'submit' | 'interaction';

// KSA Mapping
export interface KSAMapping {
  knowledge: string[]; // K1.1, K2.3 etc
  skills: string[];    // S1.2, S3.1 etc
  attitudes: string[]; // A1.1, A2.2 etc
}

// Rubrics Level
export interface RubricLevel {
  level: 1 | 2 | 3 | 4;
  description: string;
  criteria: string[];
}

// Rubrics Criteria
export interface RubricsCriteria {
  criterion: string;
  weight: number;
  levels: RubricLevel[];
}

// AI Module Configuration
export interface AIModule {
  role: AIRole;
  model: string;
  persona?: string; // e.g., interviewer, customer, mentor
}

// Logging Configuration
export interface LoggingConfig {
  trackInteractions: boolean;
  trackThinkingTime: boolean;
  trackRevisions: boolean;
  trackResourceUsage: boolean;
}

// Task Definition
export interface Task {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  expectedOutcome: string;
  timeLimit?: number; // minutes
  resources?: string[];
}

// Stage Definition
export interface Stage {
  id: string;
  name: string;
  description: string;
  stageType: StageType;
  modalityFocus: ModalityFocus;
  assessmentFocus: {
    primary: string[];   // Primary KSA codes to assess
    secondary: string[]; // Secondary KSA codes
  };
  rubricsCriteria: RubricsCriteria[];
  aiModules: AIModule[];
  tasks: Task[];
  timeLimit?: number;
  loggingConfig: LoggingConfig;
}

// Scenario Program Definition
export interface ScenarioProgram {
  id: string;
  title: string;
  description: string;
  targetDomain: DomainType[];
  ksaMapping: KSAMapping;
  stages: Stage[];
  estimatedDuration: number; // minutes
  difficulty: DifficultyLevel;
  prerequisites?: string[];
  learningObjectives: string[];
}

// Process Log
export interface ProcessLog {
  id: string;
  timestamp: Date;
  sessionId: string;
  stageId: string;
  actionType: ActionType;
  detail: {
    userInput?: string;
    aiInteraction?: {
      model: string;
      prompt: string;
      response: string;
      tokensUsed: number;
    };
    resourceAccessed?: string[];
    timeSpent: number; // seconds
    taskId?: string; // Optional task ID
  };
  evaluation?: {
    ksaCode: string;
    score: number;
    feedback: string;
  };
}

// Evidence
export interface Evidence {
  type: 'text' | 'audio' | 'writing' | 'interaction';
  content: string;
  metadata: {
    timestamp: Date;
    stageId: string;
    taskId: string;
    [key: string]: Date | string | number | boolean;
  };
  analysis?: {
    keywords: string[];
    sentiment: number;
    quality: number;
  };
}

// Stage Result
export interface StageResult {
  stageId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  performanceMetrics: {
    completionTime: number; // seconds
    interactionCount: number;
    revisionCount: number;
    resourceUsage: number;
  };
  ksaAchievement: {
    [ksaCode: string]: {
      score: number; // 0-100
      evidence: ProcessLog[];
    };
  };
  domainScores?: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
  rubricsScore: {
    [criterion: string]: {
      level: number;
      justification: string;
    };
  };
  feedback: {
    strengths: string[];
    improvements: string[];
    nextSteps: string[];
  };
}

// Session Data
export interface SessionData {
  id: string;
  userId: string;
  userEmail?: string;
  scenarioId: string;
  scenarioTitle?: string;
  scenario?: ScenarioProgram; // Optional full scenario data
  status: SessionStatus;
  currentStage: number;
  currentTaskIndex: number; // Track current task within the stage
  progress: {
    percentage: number;
    completedStages: number[];
    timeSpent: number; // seconds
  };
  startedAt: string;
  lastActiveAt: string;
  stageResults: StageResult[];
  processLogs: ProcessLog[];
  evaluations?: Array<{
    score: number;
    feedback?: string;
  }>;
}

// Session Metadata (for GCS storage)
export interface SessionMetadata {
  session_id: string;
  user_id: string;
  activity_type: 'pbl_practice';
  activity_id: string;
  status: SessionStatus;
  created_at: string;
  last_active_at: string;
  version: number;
}

// Progress Data (for GCS storage)
export interface ProgressData {
  current_stage: number;
  current_task: number;
  completed_stages: number[];
  stage_results: { [stageId: string]: StageResult };
  total_time_spent: number; // seconds
  progress_percentage: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

// Scenario List Item (for display)
export interface ScenarioListItem {
  id: string;
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  estimatedDuration: number;
  domains: DomainType[];
  isAvailable: boolean;
  thumbnailEmoji?: string;
}

// WebSocket Message Types
export interface WSMessage {
  type: 'user_input' | 'ai_response' | 'evaluation' | 'progress_update';
  payload: Record<string, unknown>;
  timestamp: string;
}

// Conversation Turn
export interface ConversationTurn {
  id: string;
  timestamp: Date;
  role: 'user' | 'ai' | 'system';
  content: string;
  metadata?: {
    audioUrl?: string;
    duration?: number;
    corrections?: string[];
    processingTime?: number;
    tokensUsed?: number;
  };
}

// Evaluation Result
export interface EvaluationResult {
  overallScore: number;
  ksaScores: { [ksaCode: string]: number };
  rubricScores: { [criterion: string]: number };
  feedback: string;
  suggestions: string[];
}