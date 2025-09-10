/**
 * 統一學習架構類型定義
 * Based on Content Source → Scenario → Program → Task → Evaluation hierarchy
 * Updated to match PostgreSQL schema v2
 */

import type { 
  LearningMode, 
  ScenarioStatus, 
  ProgramStatus, 
  TaskStatus, 
  TaskType, 
  DifficultyLevel,
  SourceType 
} from './database';

// ===== Core Interfaces =====

/**
 * Content Source - 內容來源 (now part of Scenario)
 */
export interface IContentSource {
  type: SourceType;
  path?: string;  // YAML檔案路徑
  id?: string;  // API或AI生成的來源ID
  metadata: Record<string, unknown>;
}

/**
 * Scenario - 學習情境（UUID檔案）
 */
export interface IScenario {
  id: string;  // UUID
  mode: LearningMode;  // 改用統一的 ENUM
  status: ScenarioStatus;
  version: string;
  
  // Source tracking (unified)
  sourceType: SourceType;
  sourcePath?: string;
  sourceId?: string;
  sourceMetadata: Record<string, unknown>;
  
  // Basic info (multi-language)
  title: Record<string, string>;  // {"en": "Title", "zh": "標題"}
  description: Record<string, string>;
  objectives: string[];
  
  // Common attributes
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  prerequisites: string[];
  
  // Task templates
  taskTemplates: ITaskTemplate[];
  taskCount?: number;  // computed field - optional
  
  // Rewards and progression
  xpRewards: Record<string, number>;
  unlockRequirements: Record<string, unknown>;
  
  // Mode-specific data
  pblData: Record<string, unknown>;
  discoveryData: Record<string, unknown>;
  assessmentData: Record<string, unknown>;
  
  // Resources and AI
  aiModules: Record<string, unknown>;
  resources: Array<Record<string, unknown>>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  
  // Extensible metadata
  metadata: Record<string, unknown>;
}

/**
 * Task Template - 任務模板
 */
export interface ITaskTemplate {
  id: string;
  title: Record<string, string>;  // Multilingual title
  type: TaskType;
  description?: Record<string, string>;  // Multilingual description
  [key: string]: unknown;  // Allow additional properties
}

/**
 * Program - 學習實例（每次開局）
 */
export interface IProgram {
  id: string;  // UUID
  userId: string;
  scenarioId: string;  // 關聯Scenario UUID
  mode: LearningMode;  // Mode propagated from scenario
  status: ProgramStatus;
  
  // Progress tracking
  currentTaskIndex: number;
  completedTaskCount: number;
  totalTaskCount: number;
  
  // Scoring (unified)
  totalScore: number;
  domainScores: Record<string, number>;     // {"ksa": {...}, "creativity": 8}
  
  // XP and rewards (mainly for Discovery)
  xpEarned: number;
  badgesEarned: Array<Record<string, unknown>>;
  
  // Timestamps (unified naming)
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  lastActivityAt: string;
  
  // Time tracking
  timeSpentSeconds: number;
  
  // Mode-specific data
  pblData: Record<string, unknown>;
  discoveryData: Record<string, unknown>;
  assessmentData: Record<string, unknown>;
  
  // Extensible metadata
  metadata: Record<string, unknown>;
}

/**
 * Task - 學習任務（UUID檔案）
 */
export interface ITask {
  id: string;  // UUID
  programId: string;  // 關聯Program UUID
  scenarioId?: string;  // 關聯Scenario UUID (database has it as required, but making optional for backward compatibility)
  mode: LearningMode;  // Mode propagated from program
  taskIndex: number;  // Order within program
  scenarioTaskIndex?: number;  // Reference to scenario template
  
  // Basic info (multilingual support)
  title?: Record<string, string>;  // {"en": "...", "zhTW": "..."}
  description?: Record<string, string>;  // {"en": "...", "zhTW": "..."}
  type: TaskType;
  status: TaskStatus;
  
  // Content (unified structure)
  content: Record<string, unknown>;  // Instructions, questions, etc.
  
  // Interaction tracking
  interactions: IInteraction[];  // Array of interactions
  interactionCount: number;  // computed field
  
  // Response/solution
  userResponse: Record<string, unknown>;  // User's answer/solution
  
  // Scoring
  score: number;
  maxScore: number;
  
  // Attempts and timing
  allowedAttempts: number;
  attemptCount: number;
  timeLimitSeconds?: number;  // Optional time limit
  timeSpentSeconds: number;
  
  // AI configuration
  aiConfig: Record<string, unknown>;  // AI module settings
  
  // Timestamps
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  
  // Mode-specific data
  pblData: Record<string, unknown>;
  discoveryData: Record<string, unknown>;
  assessmentData: Record<string, unknown>;
  
  // Extensible metadata
  metadata: Record<string, unknown>;
}

/**
 * Interaction - 互動記錄（存在Task內）
 */
export interface IInteraction {
  timestamp: string;
  type: 'user_input' | 'ai_response' | 'system_event';
  content: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Evaluation - 評估結果（多語言支援）
 */
export interface IEvaluation {
  id: string;  // UUID
  userId: string;
  programId?: string;
  taskId?: string;
  mode: LearningMode;  // Mode for easy filtering
  
  // Evaluation scope
  evaluationType: string;  // 'task', 'program', 'skill'
  evaluationSubtype?: string;  // Mode-specific subtypes
  
  // Scoring (unified 0-100 scale)
  score: number;
  maxScore: number;
  
  // Multi-dimensional scoring
  domainScores: Record<string, number>;
  
  // Feedback
  feedbackText?: string;
  feedbackData: Record<string, unknown>;  // Structured feedback
  
  // AI analysis
  aiProvider?: string;  // 'vertex', 'openai', etc.
  aiModel?: string;
  aiAnalysis: Record<string, unknown>;
  
  // Time tracking
  timeTakenSeconds: number;
  
  // Timestamps
  createdAt: string;
  
  // Mode-specific data
  pblData: Record<string, unknown>;
  discoveryData: Record<string, unknown>;
  assessmentData: Record<string, unknown>;
  
  // Extensible metadata
  metadata: Record<string, unknown>;
}

/**
 * Domain Score - 領域分數
 */
export interface IDomainScore {
  domain: string;
  score: number;
  maxScore: number;
  feedback?: string;
}

// ===== Repository Interfaces =====

/**
 * Base Scenario Repository
 */
export abstract class BaseScenarioRepository<T extends IScenario> {
  abstract create(scenario: Omit<T, 'id'>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findBySource(sourceType: string, sourceId?: string): Promise<T[]>;
  abstract update(id: string, updates: Partial<T>): Promise<T>;
}

/**
 * Base Program Repository
 */
export abstract class BaseProgramRepository<T extends IProgram> {
  abstract create(program: Omit<T, 'id'>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findByUser(userId: string): Promise<T[]>;
  abstract findByScenario(scenarioId: string): Promise<T[]>;
  abstract updateProgress(id: string, taskIndex: number): Promise<T>;
  abstract complete(id: string): Promise<T>;
}

/**
 * Base Task Repository
 */
export abstract class BaseTaskRepository<T extends ITask> {
  abstract create(task: Omit<T, 'id'>): Promise<T>;
  abstract createBatch(tasks: Omit<T, 'id'>[]): Promise<T[]>;
  abstract findById(id: string): Promise<T | null>;
  abstract findByProgram(programId: string): Promise<T[]>;
  abstract updateInteractions(id: string, interactions: IInteraction[]): Promise<T>;
  abstract complete(id: string): Promise<T>;
}

/**
 * Base Evaluation Repository
 */
export abstract class BaseEvaluationRepository<T extends IEvaluation> {
  abstract create(evaluation: Omit<T, 'id'>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findByProgram(programId: string): Promise<T[]>;
  abstract findByTask(taskId: string): Promise<T[]>;
  abstract findByUser(userId: string): Promise<T[]>;
  abstract findByType(evaluationType: string, evaluationSubtype?: string): Promise<T[]>;
}

// ===== Service Interfaces =====

/**
 * Evaluation System Interface
 */
export interface IEvaluationSystem {
  // Task級別評估
  evaluateTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation>;
  
  // Program級別總結評估
  evaluateProgram(program: IProgram, taskEvaluations: IEvaluation[]): Promise<IEvaluation>;
  
  // 產生回饋
  generateFeedback(evaluation: IEvaluation, language: string): Promise<string>;
}

/**
 * Evaluation Context
 */
export interface IEvaluationContext {
  scenario: IScenario;
  program: IProgram;
  previousEvaluations?: IEvaluation[];
  rubric?: IRubric;
  aiModel?: string;
}

/**
 * Rubric Interface
 */
export interface IRubric {
  criteria: Record<string, unknown>;
  [key: string]: unknown;
}