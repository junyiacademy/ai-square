/**
 * 統一學習架構類型定義
 * Based on Content Source → Scenario → Program → Task → Evaluation hierarchy
 */

// ===== Core Interfaces =====

/**
 * Content Source - 內容來源
 */
export interface IContentSource {
  type: 'yaml' | 'api' | 'ai-generated';
  path?: string;  // YAML檔案路徑
  sourceId?: string;  // API或AI生成的來源ID
  metadata: Record<string, unknown>;
}

/**
 * Scenario - 學習情境（UUID檔案）
 */
export interface IScenario {
  id: string;  // UUID
  sourceType: 'pbl' | 'discovery' | 'assessment';
  sourceRef: IContentSource;
  title: string;
  description: string;
  objectives: string[];
  taskTemplates: ITaskTemplate[];  // 任務模板
  createdAt: string;
  updatedAt: string;
}

/**
 * Task Template - 任務模板
 */
export interface ITaskTemplate {
  id: string;
  title: string;
  type: 'question' | 'chat' | 'creation' | 'analysis';
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Program - 學習實例（每次開局）
 */
export interface IProgram {
  id: string;  // UUID
  scenarioId: string;  // 關聯Scenario UUID
  userId: string;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string;
  taskIds: string[];  // Task UUID列表
  currentTaskIndex: number;
  metadata: Record<string, unknown>;  // 特定類型的額外資料
}

/**
 * Task - 學習任務（UUID檔案）
 */
export interface ITask {
  id: string;  // UUID
  programId: string;  // 關聯Program UUID
  scenarioTaskIndex: number;  // 在Scenario中的任務索引
  title: string;
  type: 'question' | 'chat' | 'creation' | 'analysis';
  content: {
    instructions?: string;
    question?: string;
    options?: string[];
    context?: Record<string, unknown>;
  };
  interactions: IInteraction[];  // 答題歷程或AI對話log
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'active' | 'completed';
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
 * Evaluation - 評估結果
 */
export interface IEvaluation {
  id: string;  // UUID
  targetType: 'task' | 'program';
  targetId: string;  // Task UUID 或 Program UUID
  evaluationType: string;  // 評估類型標識
  score?: number;
  feedback?: string;
  dimensions?: IDimensionScore[];
  createdAt: string;
  metadata: Record<string, unknown>;
}

/**
 * Dimension Score - 維度分數
 */
export interface IDimensionScore {
  dimension: string;
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
  abstract findByTarget(targetType: string, targetId: string): Promise<T[]>;
  abstract findByProgram(programId: string): Promise<T[]>;
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