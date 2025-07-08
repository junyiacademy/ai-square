/**
 * Base Log Repository
 * Log 的基礎儲存庫實作
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from '../../repository/base/base.repository';
import { IStorageProvider } from '../../storage/interfaces/storage.interface';
import {
  ILog,
  ISoftDeletableLog,
  LogType,
  LogSeverity,
  LogQueryOptions,
  LogStatistics,
  LogAggregation,
  CreateLogParams
} from '../types';

export abstract class BaseLogRepository<T extends ISoftDeletableLog = ISoftDeletableLog> 
  extends BaseRepository<T> {
  
  protected entityName = 'log';

  constructor(protected storageProvider: IStorageProvider) {
    super(storageProvider, 'logs');
  }

  /**
   * 創建 Log
   */
  async create(params: CreateLogParams): Promise<T> {
    const now = new Date();
    const log = {
      id: uuidv4(),
      ...params,
      severity: params.severity || LogSeverity.INFO,
      metadata: params.metadata || {},
      timestamp: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    } as T;

    const key = this.getLogKey(params.userId, params.programId, params.taskId, log.id);
    await this.storageProvider.set(key, log);

    // 更新索引
    await this.updateLogIndex(params.userId, params.programId, params.taskId, log.id);

    return log;
  }

  /**
   * 批量創建 Logs
   */
  async createBatch(paramsList: CreateLogParams[]): Promise<T[]> {
    const logs = await Promise.all(
      paramsList.map(params => this.create(params))
    );
    return logs;
  }

  /**
   * 查詢 Logs
   */
  async query(options: LogQueryOptions): Promise<T[]> {
    let logs: T[] = [];

    if (options.taskId && options.programId && options.userId) {
      // 查詢特定 Task 的 Logs
      const prefix = `log:${options.userId}:${options.programId}:${options.taskId}:`;
      logs = await this.storageProvider.list<T>(prefix);
    } else if (options.programId && options.userId) {
      // 查詢特定 Program 的 Logs
      logs = await this.queryProgramLogs(options.userId, options.programId);
    } else if (options.userId) {
      // 查詢用戶的所有 Logs
      logs = await this.queryUserLogs(options.userId);
    } else {
      throw new Error('userId is required');
    }

    // 應用篩選
    if (options.type) {
      logs = logs.filter(l => l.type === options.type);
    }
    if (options.severity) {
      logs = logs.filter(l => l.severity === options.severity);
    }
    if (options.startTime) {
      logs = logs.filter(l => l.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      logs = logs.filter(l => l.timestamp <= options.endTime!);
    }
    if (!options.includeDeleted) {
      logs = logs.filter(l => !l.deletedAt);
    }

    // 排序（預設按時間倒序）
    const [sortField, sortOrder] = (options.orderBy || 'timestamp:desc').split(':');
    logs.sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      let compare = 0;
      
      if (aVal instanceof Date && bVal instanceof Date) {
        compare = aVal.getTime() - bVal.getTime();
      } else {
        compare = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
      
      return sortOrder === 'desc' ? -compare : compare;
    });

    // 分頁
    if (options.offset) {
      logs = logs.slice(options.offset);
    }
    if (options.limit) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  }

  /**
   * 獲取統計資料
   */
  async getStatistics(
    userId?: string,
    programId?: string,
    taskId?: string
  ): Promise<LogStatistics> {
    const logs = await this.query({ userId, programId, taskId, includeDeleted: false });
    
    const stats: LogStatistics = {
      total: logs.length,
      byType: {} as Record<LogType, number>,
      bySeverity: {} as Record<LogSeverity, number>,
      errorRate: 0,
      averageResponseTime: 0
    };

    // 初始化計數器
    Object.values(LogType).forEach(type => {
      stats.byType[type as LogType] = 0;
    });
    Object.values(LogSeverity).forEach(severity => {
      stats.bySeverity[severity as LogSeverity] = 0;
    });

    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let errorCount = 0;

    for (const log of logs) {
      // 類型統計
      stats.byType[log.type]++;
      
      // 嚴重程度統計
      stats.bySeverity[log.severity]++;
      
      // 錯誤率統計
      if (log.severity === LogSeverity.ERROR || log.severity === LogSeverity.CRITICAL) {
        errorCount++;
      }
      
      // 回應時間統計
      if (log.metadata.duration) {
        totalResponseTime += log.metadata.duration;
        responseTimeCount++;
      }
    }

    stats.errorRate = logs.length > 0 ? errorCount / logs.length : 0;
    stats.averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

    return stats;
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
    const logs = await this.query({ userId, programId, taskId, includeDeleted: false });
    
    const aggregation: LogAggregation = {
      userId,
      programId,
      taskId,
      period,
      metrics: {
        totalLogs: logs.length,
        totalErrors: 0,
        topActions: [],
        errorTrends: []
      }
    };

    // 統計錯誤數
    aggregation.metrics.totalErrors = logs.filter(l => 
      l.severity === LogSeverity.ERROR || l.severity === LogSeverity.CRITICAL
    ).length;

    // 統計熱門動作
    const actionCounts = new Map<string, number>();
    logs.forEach(log => {
      if (log.data && log.data.action) {
        const action = log.data.action;
        actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
      }
    });

    aggregation.metrics.topActions = Array.from(actionCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    // 錯誤趨勢（按時間分組）
    const errorTrends = new Map<string, number>();
    logs.filter(l => l.severity === LogSeverity.ERROR || l.severity === LogSeverity.CRITICAL)
      .forEach(log => {
        const timeKey = this.getTimeKey(log.timestamp, period);
        errorTrends.set(timeKey, (errorTrends.get(timeKey) || 0) + 1);
      });

    aggregation.metrics.errorTrends = Array.from(errorTrends.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({ time: new Date(time), count }));

    return aggregation;
  }

  /**
   * 軟刪除
   */
  async softDelete(
    userId: string,
    programId: string,
    taskId: string,
    logId: string
  ): Promise<boolean> {
    const log = await this.getByIds(userId, programId, taskId, logId);
    if (!log) {
      return false;
    }

    log.deletedAt = new Date();
    const key = this.getLogKey(userId, programId, taskId, logId);
    await this.storageProvider.set(key, log);

    return true;
  }

  /**
   * 清理過期 Logs
   */
  async cleanupExpiredLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const allLogs = await this.query({ includeDeleted: false });
    const expiredLogs = allLogs.filter(log => log.timestamp < cutoffDate);

    for (const log of expiredLogs) {
      await this.softDelete(log.userId, log.programId, log.taskId, log.id);
    }

    return expiredLogs.length;
  }

  /**
   * Helper: 生成儲存 key
   */
  protected getLogKey(
    userId: string,
    programId: string,
    taskId: string,
    logId: string
  ): string {
    return `log:${userId}:${programId}:${taskId}:${logId}`;
  }

  /**
   * Helper: 根據 IDs 獲取 Log
   */
  protected async getByIds(
    userId: string,
    programId: string,
    taskId: string,
    logId: string
  ): Promise<T | null> {
    const key = this.getLogKey(userId, programId, taskId, logId);
    return this.storageProvider.get<T>(key);
  }

  /**
   * Helper: 時間分組 key
   */
  private getTimeKey(date: Date, period: 'hour' | 'day' | 'week' | 'month'): string {
    const d = new Date(date);
    switch (period) {
      case 'hour':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}`;
      case 'day':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return `${weekStart.getFullYear()}-W${String(Math.ceil(weekStart.getDate() / 7)).padStart(2, '0')}`;
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  /**
   * Helper: 查詢用戶的所有 Logs（需要子類實作）
   */
  protected abstract queryUserLogs(userId: string): Promise<T[]>;

  /**
   * Helper: 查詢 Program 的所有 Logs（需要子類實作）
   */
  protected abstract queryProgramLogs(userId: string, programId: string): Promise<T[]>;

  /**
   * Helper: 更新 Log 索引（需要子類實作）
   */
  protected abstract updateLogIndex(
    userId: string,
    programId: string,
    taskId: string,
    logId: string
  ): Promise<void>;
}