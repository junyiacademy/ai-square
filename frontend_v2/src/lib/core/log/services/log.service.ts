/**
 * Log Service
 * 統一管理所有 Log 記錄
 */

import {
  ILog,
  ISoftDeletableLog,
  LogType,
  LogSeverity,
  CreateLogParams,
  LogQueryOptions,
  LogStatistics,
  LogAggregation,
  IAILog,
  IInteractionLog,
  ISubmissionLog,
  isAILog,
  isInteractionLog,
  isSubmissionLog
} from '../types';
import { BaseLogRepository } from '../repositories/base-log.repository';

export class LogService {
  constructor(
    private logRepository: BaseLogRepository
  ) {}

  /**
   * 創建 Log
   */
  async createLog(params: CreateLogParams): Promise<ISoftDeletableLog> {
    return this.logRepository.create(params);
  }

  /**
   * 批量創建 Logs
   */
  async createLogs(paramsList: CreateLogParams[]): Promise<ISoftDeletableLog[]> {
    return this.logRepository.createBatch(paramsList);
  }

  /**
   * 查詢 Logs
   */
  async queryLogs(options: LogQueryOptions): Promise<ISoftDeletableLog[]> {
    return this.logRepository.query(options);
  }

  /**
   * 記錄用戶互動
   */
  async logInteraction(
    userId: string,
    programId: string,
    taskId: string,
    action: string,
    content?: string,
    data?: any
  ): Promise<IInteractionLog> {
    const params: CreateLogParams = {
      userId,
      programId,
      taskId,
      type: LogType.INTERACTION,
      severity: LogSeverity.INFO,
      message: content || `User interaction: ${action}`,
      data: {
        type: action,
        content: content,
        ...data
      },
      metadata: {
        timestamp: new Date(),
        type: action
      }
    };

    return this.createLog(params) as Promise<IInteractionLog>;
  }

  /**
   * 記錄 AI 請求
   */
  async logAIRequest(
    userId: string,
    programId: string,
    taskId: string,
    model: string,
    prompt: string,
    metadata?: any
  ): Promise<IAILog> {
    const params: CreateLogParams = {
      userId,
      programId,
      taskId,
      type: LogType.AI_REQUEST,
      severity: LogSeverity.INFO,
      message: `AI request to ${model}`,
      data: {
        model,
        prompt,
        tokens: {
          prompt: this.estimateTokens(prompt),
          completion: 0,
          total: this.estimateTokens(prompt)
        }
      },
      metadata: {
        ...metadata,
        timestamp: new Date()
      }
    };

    return this.createLog(params) as Promise<IAILog>;
  }

  /**
   * 記錄 AI 回應
   */
  async logAIResponse(
    userId: string,
    programId: string,
    taskId: string,
    model: string,
    response: string,
    promptTokens: number,
    completionTokens: number,
    latency: number,
    cost?: number
  ): Promise<IAILog> {
    const params: CreateLogParams = {
      userId,
      programId,
      taskId,
      type: LogType.AI_RESPONSE,
      severity: LogSeverity.INFO,
      message: `AI response from ${model}`,
      data: {
        model,
        response,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens
        },
        cost,
        latency
      },
      metadata: {
        timestamp: new Date()
      }
    };

    return this.createLog(params) as Promise<IAILog>;
  }

  /**
   * 記錄提交
   */
  async logSubmission(
    userId: string,
    programId: string,
    taskId: string,
    submissionType: string,
    content: any,
    version?: number,
    previousContent?: any
  ): Promise<ISubmissionLog> {
    const params: CreateLogParams = {
      userId,
      programId,
      taskId,
      type: LogType.SUBMISSION,
      severity: LogSeverity.INFO,
      message: `Submission: ${submissionType}`,
      data: {
        submissionType,
        content,
        version,
        previousContent
      },
      metadata: {
        timestamp: new Date()
      }
    };

    return this.createLog(params) as Promise<ISubmissionLog>;
  }

  /**
   * 記錄錯誤
   */
  async logError(
    userId: string,
    programId: string,
    taskId: string,
    error: Error | string,
    context?: any
  ): Promise<ISoftDeletableLog> {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    const params: CreateLogParams = {
      userId,
      programId,
      taskId,
      type: LogType.ERROR,
      severity: LogSeverity.ERROR,
      message: `Error: ${errorMessage}`,
      data: {
        error: errorMessage,
        stack,
        context
      },
      metadata: {
        timestamp: new Date()
      }
    };

    return this.createLog(params);
  }

  /**
   * 記錄系統事件
   */
  async logSystemEvent(
    userId: string,
    programId: string,
    taskId: string,
    event: string,
    data?: any,
    severity: LogSeverity = LogSeverity.INFO
  ): Promise<ISoftDeletableLog> {
    const params: CreateLogParams = {
      userId,
      programId,
      taskId,
      type: LogType.SYSTEM,
      severity,
      message: `System event: ${event}`,
      data,
      metadata: {
        timestamp: new Date()
      }
    };

    return this.createLog(params);
  }

  /**
   * 獲取統計資料
   */
  async getStatistics(
    userId?: string,
    programId?: string,
    taskId?: string
  ): Promise<LogStatistics> {
    return this.logRepository.getStatistics(userId, programId, taskId);
  }

  /**
   * 獲取聚合資料
   */
  async getAggregation(
    userId: string,
    programId?: string,
    taskId?: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<LogAggregation> {
    return this.logRepository.getAggregation(userId, programId, taskId, period);
  }

  /**
   * 獲取錯誤日誌
   */
  async getErrorLogs(
    userId?: string,
    programId?: string,
    taskId?: string,
    limit: number = 50
  ): Promise<ISoftDeletableLog[]> {
    return this.queryLogs({
      userId,
      programId,
      taskId,
      severity: LogSeverity.ERROR,
      limit,
      orderBy: 'timestamp:desc'
    });
  }

  /**
   * 獲取 AI 使用統計
   */
  async getAIUsageStats(
    userId?: string,
    programId?: string,
    taskId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageLatency: number;
    modelUsage: Record<string, number>;
  }> {
    const logs = await this.queryLogs({
      userId,
      programId,
      taskId,
      type: LogType.AI_RESPONSE,
      startTime: startDate,
      endTime: endDate
    });

    const aiLogs = logs.filter(isAILog);
    
    let totalRequests = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    const modelUsage: Record<string, number> = {};

    for (const log of aiLogs) {
      totalRequests++;
      
      if (log.data.tokens) {
        totalTokens += log.data.tokens.total;
      }
      
      if (log.data.cost) {
        totalCost += log.data.cost;
      }
      
      if (log.data.latency) {
        totalLatency += log.data.latency;
        latencyCount++;
      }
      
      if (log.data.model) {
        modelUsage[log.data.model] = (modelUsage[log.data.model] || 0) + 1;
      }
    }

    return {
      totalRequests,
      totalTokens,
      totalCost,
      averageLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
      modelUsage
    };
  }

  /**
   * 清理過期 Logs
   */
  async cleanupExpiredLogs(retentionDays: number = 90): Promise<number> {
    return this.logRepository.cleanupExpiredLogs(retentionDays);
  }

  /**
   * 刪除 Log（軟刪除）
   */
  async deleteLog(
    userId: string,
    programId: string,
    taskId: string,
    logId: string
  ): Promise<boolean> {
    return this.logRepository.softDelete(userId, programId, taskId, logId);
  }

  /**
   * Helper: 估算 Token 數量（簡單估算）
   */
  private estimateTokens(text: string): number {
    // 簡單估算：英文約 4 個字符 = 1 token，中文約 1.5 個字符 = 1 token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }
}