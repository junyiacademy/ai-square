/**
 * Task 類型定義
 * Task 代表 Program 中的具體任務單元
 */

import { IEntity, ISoftDeletable } from '../../types/base.types';
import { ProgramType } from '../../program/types';

/**
 * Task 狀態
 */
export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED'
}

/**
 * Task 類型
 */
export enum TaskType {
  // PBL 任務類型
  ANALYSIS = 'ANALYSIS',          // 分析類
  DESIGN = 'DESIGN',              // 設計類
  IMPLEMENTATION = 'IMPLEMENTATION', // 實作類
  EVALUATION = 'EVALUATION',      // 評估類
  
  // Assessment 任務類型
  SINGLE_CHOICE = 'SINGLE_CHOICE',     // 單選題
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', // 多選題
  TRUE_FALSE = 'TRUE_FALSE',           // 是非題
  SHORT_ANSWER = 'SHORT_ANSWER',       // 簡答題
  ESSAY = 'ESSAY',                     // 論述題
  
  // Discovery 任務類型
  RESEARCH = 'RESEARCH',          // 研究探索
  EXPERIMENT = 'EXPERIMENT',      // 實驗嘗試
  CREATE = 'CREATE',              // 創作產出
  REFLECT = 'REFLECT',            // 反思總結
  
  // Chat 任務類型
  CONVERSATION = 'CONVERSATION',  // 對話交流
  QA = 'QA',                      // 問答
  BRAINSTORM = 'BRAINSTORM',      // 腦力激盪
  
  // 通用類型
  CUSTOM = 'CUSTOM'               // 自定義
}

/**
 * Task 基礎介面
 */
export interface ITask extends IEntity {
  programId: string;              // 所屬 Program ID
  userId: string;                 // 用戶 ID
  type: TaskType;                 // 任務類型
  status: TaskStatus;             // 任務狀態
  title: string;                  // 任務標題
  description?: string;           // 任務描述
  instructions?: string[];        // 任務指引
  order: number;                  // 任務順序
  metadata: TaskMetadata;         // 元資料
  config: TaskConfig;             // 配置
  progress: TaskProgress;         // 進度
  startedAt?: Date;              // 開始時間
  completedAt?: Date;            // 完成時間
}

/**
 * Task 元資料
 */
export interface TaskMetadata {
  difficulty?: 'easy' | 'medium' | 'hard';  // 難度
  estimatedTime?: number;                    // 預估時間（分鐘）
  tags?: string[];                          // 標籤
  resources?: string[];                     // 資源連結
  prerequisites?: string[];                 // 前置任務
  [key: string]: any;
}

/**
 * Task 配置
 */
export interface TaskConfig {
  maxAttempts?: number;           // 最大嘗試次數
  timeLimit?: number;             // 時間限制（秒）
  allowSkip?: boolean;            // 是否允許跳過
  autoProgress?: boolean;         // 是否自動進到下一題
  showHints?: boolean;            // 是否顯示提示
  [key: string]: any;
}

/**
 * Task 進度
 */
export interface TaskProgress {
  attempts: number;               // 嘗試次數
  timeSpent: number;              // 花費時間（秒）
  hintsUsed: number;              // 使用提示次數
  score?: number;                 // 分數
  completed: boolean;             // 是否完成
  lastActivityAt?: Date;          // 最後活動時間
  finalAnswer?: any;              // 最終答案
  evaluation?: TaskEvaluation;    // 評估結果
}

/**
 * Task 評估結果
 */
export interface TaskEvaluation {
  grade?: string;                 // 評級 (A, B, C, D, F)
  feedback?: string;              // 反饋
  rubric?: string;                // 評估標準
  strengths?: string[];           // 優勢
  improvements?: string[];        // 改進建議
  evaluatedAt?: Date;            // 評估時間
  evaluatedBy?: string;          // 評估者 (AI/Human)
}

/**
 * 軟刪除的 Task
 */
export interface ISoftDeletableTask extends ITask, ISoftDeletable {}

/**
 * PBL Task 特定介面
 */
export interface IPBLTask extends ITask {
  config: PBLTaskConfig;
  context: PBLTaskContext;
}

export interface PBLTaskConfig extends TaskConfig {
  expectedOutcome?: string;       // 預期成果
  assessmentCriteria?: string[];  // 評估標準
  aiGuidance?: boolean;          // 是否有 AI 引導
}

export interface PBLTaskContext {
  userResponse?: string;          // 用戶回答
  aiInteractions: number;         // AI 互動次數
  revisions: number;              // 修改次數
  references: string[];           // 參考資料
}

/**
 * Assessment Task 特定介面
 */
export interface IAssessmentTask extends ITask {
  config: AssessmentTaskConfig;
  context: AssessmentTaskContext;
}

export interface AssessmentTaskConfig extends TaskConfig {
  question: string;               // 題目
  options?: string[];             // 選項（選擇題）
  correctAnswer?: any;            // 正確答案
  points?: number;                // 分值
  explanation?: string;           // 解釋
}

export interface AssessmentTaskContext {
  userAnswer?: any;               // 用戶答案
  isCorrect?: boolean;            // 是否正確
  confidence?: number;            // 信心度 (0-100)
  flagged?: boolean;              // 是否標記
}

/**
 * Discovery Task 特定介面
 */
export interface IDiscoveryTask extends ITask {
  config: DiscoveryTaskConfig;
  context: DiscoveryTaskContext;
}

export interface DiscoveryTaskConfig extends TaskConfig {
  explorationGoal?: string;       // 探索目標
  suggestedApproach?: string;     // 建議方法
  successCriteria?: string[];     // 成功標準
}

export interface DiscoveryTaskContext {
  explorationSteps: ExplorationStep[];  // 探索步驟
  discoveries: string[];                // 發現
  insights: string[];                   // 洞察
  artifacts: string[];                  // 產出物
}

export interface ExplorationStep {
  action: string;                 // 動作
  result: string;                 // 結果
  timestamp: Date;                // 時間
}

/**
 * Chat Task 特定介面
 */
export interface IChatTask extends ITask {
  config: ChatTaskConfig;
  context: ChatTaskContext;
}

export interface ChatTaskConfig extends TaskConfig {
  topic?: string;                 // 話題
  objective?: string;             // 目標
  conversationStyle?: string;     // 對話風格
}

export interface ChatTaskContext {
  messageCount: number;           // 訊息數量
  keyPoints: string[];            // 關鍵點
  sentiment?: string;             // 情緒分析
  summary?: string;               // 對話摘要
}

/**
 * 創建 Task 參數
 */
export interface CreateTaskParams {
  programId: string;
  userId: string;
  type: TaskType;
  title: string;
  description?: string;
  instructions?: string[];
  order: number;
  metadata?: TaskMetadata;
  config: TaskConfig;
}

/**
 * 更新 Task 參數
 */
export interface UpdateTaskParams {
  title?: string;
  description?: string;
  status?: TaskStatus;
  metadata?: Partial<TaskMetadata>;
  config?: Partial<TaskConfig>;
  progress?: Partial<TaskProgress>;
  context?: any;
}

/**
 * Task 查詢選項
 */
export interface TaskQueryOptions {
  userId?: string;
  programId?: string;
  type?: TaskType;
  status?: TaskStatus;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
}

/**
 * Task 統計
 */
export interface TaskStatistics {
  total: number;
  byType: Record<TaskType, number>;
  byStatus: Record<TaskStatus, number>;
  averageScore: number;
  averageTimeSpent: number;
  averageAttempts: number;
}

/**
 * Task 類型守衛
 */
export function isPBLTask(task: ITask): task is IPBLTask {
  return task.type === TaskType.ANALYSIS || 
         task.type === TaskType.DESIGN ||
         task.type === TaskType.IMPLEMENTATION ||
         task.type === TaskType.EVALUATION;
}

export function isAssessmentTask(task: ITask): task is IAssessmentTask {
  return task.type === TaskType.SINGLE_CHOICE ||
         task.type === TaskType.MULTIPLE_CHOICE ||
         task.type === TaskType.TRUE_FALSE ||
         task.type === TaskType.SHORT_ANSWER ||
         task.type === TaskType.ESSAY;
}

export function isDiscoveryTask(task: ITask): task is IDiscoveryTask {
  return task.type === TaskType.RESEARCH ||
         task.type === TaskType.EXPERIMENT ||
         task.type === TaskType.CREATE ||
         task.type === TaskType.REFLECT;
}

export function isChatTask(task: ITask): task is IChatTask {
  return task.type === TaskType.CONVERSATION ||
         task.type === TaskType.QA ||
         task.type === TaskType.BRAINSTORM;
}