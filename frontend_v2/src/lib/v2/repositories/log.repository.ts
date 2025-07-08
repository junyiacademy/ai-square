/**
 * Log Repository for V2 Architecture
 */

import { BaseRepository } from './base.repository';
import { Log } from '@/lib/v2/interfaces/base';

export class LogRepository extends BaseRepository<Log> {
  constructor(storageService: any) {
    super('logs', storageService);
  }

  async findByScenario(scenarioId: string, options?: {
    logType?: string;
    limit?: number;
    offset?: number;
  }): Promise<Log[]> {
    const logs = await this.findMany({
      where: {
        scenario_id: scenarioId,
        ...(options?.logType && { log_type: options.logType })
      },
      limit: options?.limit,
      offset: options?.offset
    });

    return logs.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async findByTask(taskId: string): Promise<Log[]> {
    const logs = await this.findMany({
      where: { task_id: taskId }
    });

    return logs.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  async getRecentActivity(userId: string, limit: number = 10): Promise<Log[]> {
    const logs = await this.findMany({
      where: { user_id: userId },
      limit: limit
    });

    return logs.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  protected mapToEntity(data: any): Log {
    return {
      id: data.id,
      scenario_id: data.scenario_id,
      program_id: data.program_id,
      task_id: data.task_id,
      user_id: data.user_id,
      log_type: data.log_type,
      activity: data.activity,
      data: data.data || {},
      metadata: data.metadata,
      duration_seconds: data.duration_seconds,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}