/**
 * Base Learning Service Interface
 * 
 * 定義所有學習服務的共同介面
 * 符合統一學習架構設計
 */

import type { 
  IScenario, 
  IProgram, 
  ITask, 
  IEvaluation 
} from '@/types/unified-learning';

/**
 * 基礎學習服務介面
 * 所有學習模式（Assessment, PBL, Discovery）都應實作此介面
 */
export interface BaseLearningService {
  /**
   * 開始學習會話
   * @param userId 使用者 ID
   * @param scenarioId 情境 ID
   * @param options 選項（如語言、難度等）
   */
  startLearning(
    userId: string,
    scenarioId: string,
    options?: LearningOptions
  ): Promise<IProgram>;

  /**
   * 取得學習進度
   * @param programId 學習實例 ID
   */
  getProgress(programId: string): Promise<LearningProgress>;

  /**
   * 提交任務回應
   * @param programId 學習實例 ID
   * @param taskId 任務 ID
   * @param response 使用者回應
   */
  submitResponse(
    programId: string,
    taskId: string,
    response: any
  ): Promise<TaskResult>;

  /**
   * 完成學習會話
   * @param programId 學習實例 ID
   */
  completeLearning(programId: string): Promise<CompletionResult>;

  /**
   * 取得下一個任務
   * @param programId 學習實例 ID
   */
  getNextTask(programId: string): Promise<ITask | null>;

  /**
   * 評估任務表現
   * @param taskId 任務 ID
   */
  evaluateTask(taskId: string): Promise<IEvaluation>;

  /**
   * 產生學習回饋
   * @param evaluationId 評估 ID
   * @param language 語言
   */
  generateFeedback(
    evaluationId: string,
    language: string
  ): Promise<string>;
}

/**
 * 學習選項
 */
export interface LearningOptions {
  language?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  timeLimit?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 學習進度
 */
export interface LearningProgress {
  programId: string;
  status: 'pending' | 'active' | 'completed' | 'expired';
  currentTaskIndex: number;
  totalTasks: number;
  completedTasks: number;
  score?: number;
  timeSpent: number;
  estimatedTimeRemaining?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 任務結果
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  score?: number;
  feedback?: string;
  nextTaskAvailable: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * 完成結果
 */
export interface CompletionResult {
  program: IProgram;
  evaluation: IEvaluation;
  passed: boolean;
  finalScore: number;
  certificate?: string;
  recommendations?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * 學習服務工廠介面
 */
export interface ILearningServiceFactory {
  getService(mode: 'assessment' | 'pbl' | 'discovery'): BaseLearningService;
}