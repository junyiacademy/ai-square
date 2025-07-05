/**
 * Program 類型定義
 * Program 代表一次學習歷程（PBL 的一次學習、Assessment 的一次測驗、Discovery 的一次探索）
 */

import { IEntity, ISoftDeletable } from '../../types/base.types';

/**
 * Program 類型
 */
export enum ProgramType {
  PBL = 'PBL',
  ASSESSMENT = 'ASSESSMENT', 
  DISCOVERY = 'DISCOVERY',
  CHAT = 'CHAT'
}

/**
 * Program 狀態
 */
export enum ProgramStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED'
}

/**
 * Program 基礎介面
 */
export interface IProgram extends IEntity {
  trackId: string;                    // 關聯的 Track ID
  userId: string;                     // 用戶 ID
  type: ProgramType;                  // Program 類型
  status: ProgramStatus;              // 狀態
  title: string;                      // 標題
  description?: string;               // 描述
  startedAt?: Date;                   // 開始時間
  completedAt?: Date;                 // 完成時間
  metadata: ProgramMetadata;          // 元資料
  config: ProgramConfig;              // 配置
  progress: ProgramProgress;          // 進度資訊
}

/**
 * Program 元資料
 */
export interface ProgramMetadata {
  language?: string;                  // 語言
  tags?: string[];                    // 標籤
  source?: string;                    // 來源（scenario ID, assessment ID 等）
  version?: string;                   // 版本
  [key: string]: any;                 // 其他元資料
}

/**
 * Program 配置
 */
export interface ProgramConfig {
  timeLimit?: number;                 // 時間限制（秒）
  maxAttempts?: number;               // 最大嘗試次數
  allowPause?: boolean;               // 是否允許暫停
  randomOrder?: boolean;              // 是否隨機順序
  [key: string]: any;                 // 其他配置
}

/**
 * Program 進度
 */
export interface ProgramProgress {
  totalTasks: number;                 // 總任務數
  completedTasks: number;             // 已完成任務數
  currentTaskId?: string;             // 當前任務 ID
  currentTaskIndex?: number;          // 當前任務索引
  timeSpent: number;                  // 花費時間（秒）
  lastActivityAt?: Date;              // 最後活動時間
  averageScore?: number;              // 平均分數
  completion?: ProgramCompletion;     // 完成成果
}

/**
 * Program 完成成果
 */
export interface ProgramCompletion {
  status: 'completed' | 'partial' | 'abandoned';  // 完成狀態
  finalGrade?: string;                // 最終評級
  certificate?: string;               // 證書/證明
  summary?: string;                   // 總結
  achievements?: string[];            // 達成的成就
  insights?: string[];                // 獲得的洞察
  completedAt?: Date;                 // 完成時間
  evaluatedBy?: string;               // 評估者
}

/**
 * 軟刪除的 Program
 */
export interface ISoftDeletableProgram extends IProgram, ISoftDeletable {}

/**
 * PBL Program 特定介面
 */
export interface IPBLProgram extends IProgram {
  type: ProgramType.PBL;
  config: PBLProgramConfig;
  context: PBLProgramContext;
}

export interface PBLProgramConfig extends ProgramConfig {
  scenarioId: string;                 // 場景 ID
  scenarioTitle: string;              // 場景標題
  totalTasks: number;                 // 總任務數
  tasksOrder: string[];               // 任務順序
}

export interface PBLProgramContext {
  scenarioMetadata?: any;             // 場景元資料
  completedTaskIds: string[];         // 已完成的任務 ID
  taskScores: Record<string, number>; // 任務分數
}

/**
 * Assessment Program 特定介面
 */
export interface IAssessmentProgram extends IProgram {
  type: ProgramType.ASSESSMENT;
  config: AssessmentProgramConfig;
  context: AssessmentProgramContext;
}

export interface AssessmentProgramConfig extends ProgramConfig {
  assessmentId: string;               // 測驗 ID
  assessmentTitle: string;            // 測驗標題
  questionCount: number;              // 題目數量
  passingScore?: number;              // 及格分數
  showFeedback?: boolean;             // 是否顯示反饋
}

export interface AssessmentProgramContext {
  answers: Record<string, any>;       // 答案記錄
  scores: Record<string, number>;     // 題目分數
  startTime?: Date;                   // 開始時間
  endTime?: Date;                     // 結束時間
}

/**
 * Discovery Program 特定介面
 */
export interface IDiscoveryProgram extends IProgram {
  type: ProgramType.DISCOVERY;
  config: DiscoveryProgramConfig;
  context: DiscoveryProgramContext;
}

export interface DiscoveryProgramConfig extends ProgramConfig {
  pathId: string;                     // 職業路徑 ID
  pathTitle: string;                  // 職業路徑標題
  workspaceId: string;                // 工作空間 ID
  practiceGoal?: string;              // 練習目標
  suggestedTasks?: string[];          // 建議任務
}

export interface DiscoveryProgramContext {
  exploredPaths: string[];            // 已探索的路徑
  generatedTasks: string[];           // 已生成的任務 ID
  insights: any[];                    // 獲得的洞察
  skillsAcquired: string[];           // 獲得的技能
}

/**
 * Chat Program 特定介面
 */
export interface IChatProgram extends IProgram {
  type: ProgramType.CHAT;
  config: ChatProgramConfig;
  context: ChatProgramContext;
}

export interface ChatProgramConfig extends ProgramConfig {
  purpose?: string;                   // 對話目的
  model?: string;                     // AI 模型
  systemPrompt?: string;              // 系統提示
  maxMessages?: number;               // 最大訊息數
}

export interface ChatProgramContext {
  conversationId: string;             // 對話 ID
  messageCount: number;               // 訊息數量
  topics: string[];                   // 討論的主題
  summary?: string;                   // 對話摘要
}

/**
 * 創建 Program 參數
 */
export interface CreateProgramParams {
  trackId: string;
  userId: string;
  type: ProgramType;
  title: string;
  description?: string;
  metadata?: ProgramMetadata;
  config: ProgramConfig;
}

/**
 * 更新 Program 參數
 */
export interface UpdateProgramParams {
  title?: string;
  description?: string;
  status?: ProgramStatus;
  metadata?: Partial<ProgramMetadata>;
  config?: Partial<ProgramConfig>;
  progress?: Partial<ProgramProgress>;
  context?: any;
}

/**
 * Program 查詢選項
 */
export interface ProgramQueryOptions {
  userId?: string;
  trackId?: string;
  type?: ProgramType;
  status?: ProgramStatus;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
}

/**
 * Program 統計
 */
export interface ProgramStatistics {
  total: number;
  byType: Record<ProgramType, number>;
  byStatus: Record<ProgramStatus, number>;
  averageCompletionRate: number;
  averageTimeSpent: number;
}

/**
 * Program 類型守衛
 */
export function isPBLProgram(program: IProgram): program is IPBLProgram {
  return program.type === ProgramType.PBL;
}

export function isAssessmentProgram(program: IProgram): program is IAssessmentProgram {
  return program.type === ProgramType.ASSESSMENT;
}

export function isDiscoveryProgram(program: IProgram): program is IDiscoveryProgram {
  return program.type === ProgramType.DISCOVERY;
}

export function isChatProgram(program: IProgram): program is IChatProgram {
  return program.type === ProgramType.CHAT;
}