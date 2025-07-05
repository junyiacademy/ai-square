/**
 * PBL Program Repository
 * PBL 特定的 Program 儲存庫實作
 */

import { BaseProgramRepository } from './base-program.repository';
import { IPBLProgram, ProgramType, CreateProgramParams, PBLProgramConfig, PBLProgramContext } from '../types';
import { IStorageProvider } from '../../storage/interfaces/storage.interface';

export class PBLProgramRepository extends BaseProgramRepository<IPBLProgram> {
  
  constructor(storageProvider: IStorageProvider) {
    super(storageProvider);
  }

  /**
   * 創建 PBL Program
   */
  async createPBLProgram(
    params: CreateProgramParams & {
      config: PBLProgramConfig;
    }
  ): Promise<IPBLProgram> {
    const pblProgram = await this.create({
      ...params,
      type: ProgramType.PBL
    });

    // 初始化 PBL 特定的 context
    const context: PBLProgramContext = {
      completedTaskIds: [],
      taskScores: {}
    };

    return this.updateProgram(params.userId, pblProgram.id, {
      context,
      progress: {
        totalTasks: params.config.totalTasks,
        completedTasks: 0,
        timeSpent: 0,
        currentTaskIndex: 0,
        currentTaskId: params.config.tasksOrder?.[0]
      }
    }) as Promise<IPBLProgram>;
  }

  /**
   * 完成任務
   */
  async completeTask(
    userId: string,
    programId: string,
    taskId: string,
    score: number
  ): Promise<IPBLProgram | null> {
    const program = await this.getByUserAndId(userId, programId);
    if (!program) {
      return null;
    }

    const context = program.context as PBLProgramContext;
    const config = program.config as PBLProgramConfig;

    // 更新已完成任務
    if (!context.completedTaskIds.includes(taskId)) {
      context.completedTaskIds.push(taskId);
    }
    context.taskScores[taskId] = score;

    // 更新進度
    const currentIndex = config.tasksOrder.indexOf(taskId);
    const nextIndex = currentIndex + 1;
    const nextTaskId = nextIndex < config.tasksOrder.length ? config.tasksOrder[nextIndex] : undefined;

    const updatedProgram = await this.updateProgram(userId, programId, {
      context,
      progress: {
        ...program.progress,
        completedTasks: context.completedTaskIds.length,
        currentTaskIndex: nextIndex,
        currentTaskId: nextTaskId
      }
    });

    // 如果所有任務完成，自動完成 Program
    if (context.completedTaskIds.length >= config.totalTasks) {
      return this.complete(userId, programId) as Promise<IPBLProgram>;
    }

    return updatedProgram as IPBLProgram;
  }

  /**
   * 跳到特定任務
   */
  async jumpToTask(
    userId: string,
    programId: string,
    taskId: string
  ): Promise<IPBLProgram | null> {
    const program = await this.getByUserAndId(userId, programId);
    if (!program) {
      return null;
    }

    const config = program.config as PBLProgramConfig;
    const taskIndex = config.tasksOrder.indexOf(taskId);
    
    if (taskIndex === -1) {
      throw new Error('Task not found in program');
    }

    return this.updateProgram(userId, programId, {
      progress: {
        ...program.progress,
        currentTaskIndex: taskIndex,
        currentTaskId: taskId
      }
    }) as Promise<IPBLProgram>;
  }

  /**
   * 獲取平均分數
   */
  async getAverageScore(userId: string, programId: string): Promise<number> {
    const program = await this.getByUserAndId(userId, programId);
    if (!program) {
      return 0;
    }

    const context = program.context as PBLProgramContext;
    const scores = Object.values(context.taskScores);
    
    if (scores.length === 0) {
      return 0;
    }

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * 根據 Track ID 查詢
   */
  protected async queryByTrackId(trackId: string): Promise<IPBLProgram[]> {
    // 需要使用索引或掃描
    // 暫時返回空陣列
    console.warn('Query by trackId not implemented yet');
    return [];
  }
}