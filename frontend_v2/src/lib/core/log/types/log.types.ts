/**
 * Log 類型定義
 * Log 記錄 Task 執行過程中的詳細互動資料
 */

import { IEntity, ISoftDeletable } from '../../types/base.types';
import { TaskType } from '../../task/types';

/**
 * Log 類型
 */
export enum LogType {
  // 通用日誌類型
  ACTION = 'ACTION',              // 動作記錄
  INTERACTION = 'INTERACTION',    // 互動記錄
  SUBMISSION = 'SUBMISSION',      // 提交記錄
  EVALUATION = 'EVALUATION',      // 評估記錄
  
  // AI 相關
  AI_REQUEST = 'AI_REQUEST',      // AI 請求
  AI_RESPONSE = 'AI_RESPONSE',    // AI 回應
  
  // 系統相關
  SYSTEM = 'SYSTEM',              // 系統事件
  ERROR = 'ERROR',                // 錯誤記錄
  
  // 自定義
  CUSTOM = 'CUSTOM'               // 自定義類型
}

/**
 * Log 嚴重程度
 */
export enum LogSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Log 基礎介面
 */
export interface ILog extends IEntity {
  userId: string;                 // 用戶 ID
  programId: string;              // 所屬 Program ID
  taskId: string;                 // 所屬 Task ID
  type: LogType;                  // 日誌類型
  severity: LogSeverity;          // 嚴重程度
  message: string;                // 日誌訊息
  data?: any;                     // 附加資料
  metadata: LogMetadata;          // 元資料
  timestamp: Date;                // 時間戳記
}

/**
 * Log 元資料
 */
export interface LogMetadata {
  sessionId?: string;             // 會話 ID
  userAgent?: string;             // 用戶代理
  ipAddress?: string;             // IP 地址
  duration?: number;              // 持續時間（毫秒）
  tags?: string[];                // 標籤
  [key: string]: any;
}

/**
 * 軟刪除的 Log
 */
export interface ISoftDeletableLog extends ILog, ISoftDeletable {}

/**
 * AI Log 特定介面
 */
export interface IAILog extends ILog {
  type: LogType.AI_REQUEST | LogType.AI_RESPONSE;
  data: AILogData;
}

export interface AILogData {
  model?: string;                 // 模型名稱
  prompt?: string;                // 提示詞（請求）
  response?: string;              // 回應內容
  tokens?: {                      // Token 使用
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;                  // 成本（美元）
  latency?: number;               // 延遲（毫秒）
}

/**
 * Interaction Log 特定介面
 */
export interface IInteractionLog extends ILog {
  type: LogType.INTERACTION;
  data: InteractionLogData;
}

export interface InteractionLogData {
  action: string;                 // 動作類型
  element?: string;               // 互動元素
  value?: any;                    // 互動值
  context?: any;                  // 上下文
}

/**
 * Submission Log 特定介面
 */
export interface ISubmissionLog extends ILog {
  type: LogType.SUBMISSION;
  data: SubmissionLogData;
}

export interface SubmissionLogData {
  submissionType: string;         // 提交類型
  content: any;                   // 提交內容
  version?: number;               // 版本號
  previousContent?: any;          // 上一版內容
}

/**
 * 創建 Log 參數
 */
export interface CreateLogParams {
  userId: string;
  programId: string;
  taskId: string;
  type: LogType;
  severity?: LogSeverity;
  message: string;
  data?: any;
  metadata?: LogMetadata;
}

/**
 * 查詢 Log 參數
 */
export interface LogQueryOptions {
  userId?: string;
  programId?: string;
  taskId?: string;
  type?: LogType;
  severity?: LogSeverity;
  startTime?: Date;
  endTime?: Date;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
}

/**
 * Log 統計
 */
export interface LogStatistics {
  total: number;
  byType: Record<LogType, number>;
  bySeverity: Record<LogSeverity, number>;
  errorRate: number;
  averageResponseTime: number;
}

/**
 * Log 聚合資料
 */
export interface LogAggregation {
  userId: string;
  programId?: string;
  taskId?: string;
  period: 'hour' | 'day' | 'week' | 'month';
  metrics: {
    totalLogs: number;
    totalErrors: number;
    uniqueUsers?: number;
    averageSessionDuration?: number;
    topActions: Array<{ action: string; count: number }>;
    errorTrends: Array<{ time: Date; count: number }>;
  };
}

/**
 * 類型守衛
 */
export function isAILog(log: ILog): log is IAILog {
  return log.type === LogType.AI_REQUEST || log.type === LogType.AI_RESPONSE;
}

export function isInteractionLog(log: ILog): log is IInteractionLog {
  return log.type === LogType.INTERACTION;
}

export function isSubmissionLog(log: ILog): log is ISubmissionLog {
  return log.type === LogType.SUBMISSION;
}