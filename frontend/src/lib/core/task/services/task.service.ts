/**
 * Task Service
 * 統一管理所有類型的 Task
 */

import {
  ITask,
  ISoftDeletableTask,
  TaskType,
  TaskStatus,
  CreateTaskParams,
  UpdateTaskParams,
  TaskQueryOptions,
  TaskStatistics,
  TaskProgress,
  IPBLTask,
  IAssessmentTask,
  IDiscoveryTask,
  IChatTask,
  isPBLTask,
  isAssessmentTask,
  isDiscoveryTask,
  isChatTask
} from '../types';
import { BaseTaskRepository } from '../repositories/base-task.repository';

export class TaskService {
  constructor(
    private taskRepository: BaseTaskRepository
  ) {}

  /**
   * 創建單一 Task
   */
  async createTask(params: CreateTaskParams): Promise<ISoftDeletableTask> {
    return this.taskRepository.create(params);
  }

  /**
   * 批量創建 Tasks
   */
  async createTasks(paramsList: CreateTaskParams[]): Promise<ISoftDeletableTask[]> {
    return this.taskRepository.createBatch(paramsList);
  }

  /**
   * 獲取 Task
   */
  async getTask(userId: string, programId: string, taskId: string): Promise<ISoftDeletableTask | null> {
    return this.taskRepository.getByIds(userId, programId, taskId);
  }

  /**
   * 更新 Task
   */
  async updateTask(
    userId: string,
    programId: string,
    taskId: string,
    updates: UpdateTaskParams
  ): Promise<ISoftDeletableTask | null> {
    return this.taskRepository.updateTask(userId, programId, taskId, updates);
  }

  /**
   * 查詢 Tasks
   */
  async queryTasks(options: TaskQueryOptions): Promise<ISoftDeletableTask[]> {
    return this.taskRepository.query(options);
  }

  /**
   * 開始 Task
   */
  async startTask(userId: string, programId: string, taskId: string): Promise<ISoftDeletableTask | null> {
    return this.taskRepository.start(userId, programId, taskId);
  }

  /**
   * 完成 Task
   */
  async completeTask(
    userId: string,
    programId: string,
    taskId: string,
    score?: number
  ): Promise<ISoftDeletableTask | null> {
    return this.taskRepository.complete(userId, programId, taskId, score);
  }

  /**
   * 跳過 Task
   */
  async skipTask(userId: string, programId: string, taskId: string): Promise<ISoftDeletableTask | null> {
    return this.taskRepository.skip(userId, programId, taskId);
  }

  /**
   * 更新進度
   */
  async updateProgress(
    userId: string,
    programId: string,
    taskId: string,
    progress: Partial<TaskProgress>
  ): Promise<ISoftDeletableTask | null> {
    return this.taskRepository.updateProgress(userId, programId, taskId, progress);
  }

  /**
   * 使用提示
   */
  async useHint(userId: string, programId: string, taskId: string): Promise<ISoftDeletableTask | null> {
    return this.taskRepository.useHint(userId, programId, taskId);
  }

  /**
   * 刪除 Task（軟刪除）
   */
  async deleteTask(userId: string, programId: string, taskId: string): Promise<boolean> {
    return this.taskRepository.softDelete(userId, programId, taskId);
  }

  /**
   * 獲取統計資料
   */
  async getStatistics(userId?: string, programId?: string): Promise<TaskStatistics> {
    return this.taskRepository.getStatistics(userId, programId);
  }

  /**
   * PBL 特定方法：提交回答
   */
  async submitPBLResponse(
    userId: string,
    programId: string,
    taskId: string,
    response: string
  ): Promise<IPBLTask | null> {
    const task = await this.getTask(userId, programId, taskId);
    if (!task || !isPBLTask(task)) {
      return null;
    }

    const context = {
      ...task.context,
      userResponse: response,
      revisions: (task.context.revisions || 0) + 1
    };

    return this.updateTask(userId, programId, taskId, {
      context,
      progress: {
        ...task.progress,
        attempts: task.progress.attempts + 1
      }
    }) as Promise<IPBLTask>;
  }

  /**
   * Assessment 特定方法：提交答案
   */
  async submitAssessmentAnswer(
    userId: string,
    programId: string,
    taskId: string,
    answer: any,
    confidence?: number
  ): Promise<IAssessmentTask | null> {
    const task = await this.getTask(userId, programId, taskId);
    if (!task || !isAssessmentTask(task)) {
      return null;
    }

    const config = task.config as any;
    const isCorrect = this.checkAnswer(answer, config.correctAnswer);
    const score = isCorrect ? (config.points || 10) : 0;

    const context = {
      ...task.context,
      userAnswer: answer,
      isCorrect,
      confidence
    };

    return this.updateTask(userId, programId, taskId, {
      context,
      progress: {
        ...task.progress,
        score,
        attempts: task.progress.attempts + 1
      }
    }) as Promise<IAssessmentTask>;
  }

  /**
   * Discovery 特定方法：記錄探索步驟
   */
  async recordExplorationStep(
    userId: string,
    programId: string,
    taskId: string,
    action: string,
    result: string
  ): Promise<IDiscoveryTask | null> {
    const task = await this.getTask(userId, programId, taskId);
    if (!task || !isDiscoveryTask(task)) {
      return null;
    }

    const context = task.context as any;
    const step = {
      action,
      result,
      timestamp: new Date()
    };

    context.explorationSteps = [...(context.explorationSteps || []), step];

    return this.updateTask(userId, programId, taskId, {
      context,
      progress: {
        ...task.progress,
        timeSpent: task.progress.timeSpent + 60 // 假設每步驟 1 分鐘
      }
    }) as Promise<IDiscoveryTask>;
  }

  /**
   * Chat 特定方法：更新對話統計
   */
  async updateChatStats(
    userId: string,
    programId: string,
    taskId: string,
    messageCount: number,
    keyPoints?: string[]
  ): Promise<IChatTask | null> {
    const task = await this.getTask(userId, programId, taskId);
    if (!task || !isChatTask(task)) {
      return null;
    }

    const context = {
      ...task.context,
      messageCount,
      keyPoints: keyPoints || task.context.keyPoints || []
    };

    return this.updateTask(userId, programId, taskId, {
      context
    }) as Promise<IChatTask>;
  }

  /**
   * 獲取下一個 Task
   */
  async getNextTask(
    userId: string,
    programId: string,
    currentTaskId: string
  ): Promise<ISoftDeletableTask | null> {
    const tasks = await this.queryTasks({
      userId,
      programId,
      orderBy: 'order:asc'
    });

    const currentIndex = tasks.findIndex(t => t.id === currentTaskId);
    if (currentIndex === -1 || currentIndex === tasks.length - 1) {
      return null;
    }

    return tasks[currentIndex + 1];
  }

  /**
   * 獲取 Program 的進度
   */
  async getProgramProgress(userId: string, programId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    percentage: number;
  }> {
    const tasks = await this.queryTasks({ userId, programId });
    
    const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const notStarted = tasks.filter(t => t.status === TaskStatus.NOT_STARTED).length;
    
    return {
      total: tasks.length,
      completed,
      inProgress,
      notStarted,
      percentage: tasks.length > 0 ? (completed / tasks.length) * 100 : 0
    };
  }

  /**
   * Helper: 檢查答案是否正確
   */
  private checkAnswer(userAnswer: any, correctAnswer: any): boolean {
    if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
      return userAnswer.sort().join(',') === correctAnswer.sort().join(',');
    }
    return userAnswer === correctAnswer;
  }
}