/**
 * GCS Task Repository 實作
 */

import { GCSRepositoryBase } from '../base/gcs-repository-base';
import { BaseTaskRepository, ITask, IInteraction } from '@/types/unified-learning';
import { GCS_CONFIG } from '@/lib/config/gcs.config';

export class GCSTaskRepository<T extends ITask = ITask> 
  extends GCSRepositoryBase<T> 
  implements BaseTaskRepository<T> {
  
  constructor() {
    super(GCS_CONFIG.paths.tasks);
  }

  async create(task: Omit<T, 'id'>): Promise<T> {
    const newTask = {
      ...task,
      id: this.generateId(),
      startedAt: new Date().toISOString(),
      status: 'pending' as const,
      interactions: [],
    } as T;
    
    return this.saveEntity(newTask);
  }

  async createBatch(tasks: Omit<T, 'id'>[]): Promise<T[]> {
    const createdTasks: T[] = [];
    
    for (const task of tasks) {
      const created = await this.create(task);
      createdTasks.push(created);
    }
    
    return createdTasks;
  }

  async findById(id: string): Promise<T | null> {
    return this.loadEntity(id);
  }

  async findByProgram(programId: string): Promise<T[]> {
    const allTasks = await this.listAllEntities();
    return allTasks.filter(task => task.programId === programId)
      .sort((a, b) => a.scenarioTaskIndex - b.scenarioTaskIndex);
  }

  async updateInteractions(id: string, interactions: IInteraction[]): Promise<T> {
    const updated = await this.updateEntity(id, {
      interactions,
      status: 'active' as const,
    });
    
    if (!updated) {
      throw new Error(`Task not found: ${id}`);
    }
    
    return updated;
  }

  async complete(id: string): Promise<T> {
    const updated = await this.updateEntity(id, {
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
    });
    
    if (!updated) {
      throw new Error(`Task not found: ${id}`);
    }
    
    return updated;
  }

  async updateStatus(id: string, status: 'pending' | 'active' | 'completed'): Promise<T> {
    const updates: Partial<T> = { status } as Partial<T>;
    
    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
    }
    
    const updated = await this.updateEntity(id, updates);
    
    if (!updated) {
      throw new Error(`Task not found: ${id}`);
    }
    
    return updated;
  }

  /**
   * 新增單一互動記錄
   */
  async addInteraction(id: string, interaction: IInteraction): Promise<T> {
    const task = await this.findById(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    
    const updatedInteractions = [...task.interactions, interaction];
    return this.updateInteractions(id, updatedInteractions);
  }

  /**
   * 更新任務狀態
   */
  async updateStatus(id: string, status: 'pending' | 'active' | 'completed'): Promise<T> {
    const updates: Partial<T> = { status } as Partial<T>;
    
    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
    }
    
    const updated = await this.updateEntity(id, updates);
    
    if (!updated) {
      throw new Error(`Task not found: ${id}`);
    }
    
    return updated;
  }

  /**
   * 取得 Program 中的活躍任務
   */
  async findActiveByProgram(programId: string): Promise<T | null> {
    const tasks = await this.findByProgram(programId);
    return tasks.find(task => task.status === 'active') || null;
  }

  /**
   * 取得 Program 中已完成的任務
   */
  async findCompletedByProgram(programId: string): Promise<T[]> {
    const tasks = await this.findByProgram(programId);
    return tasks.filter(task => task.status === 'completed');
  }

  /**
   * 批次取得任務
   */
  async findByIds(ids: string[]): Promise<T[]> {
    return this.loadEntities(ids);
  }

  /**
   * 列出所有 Tasks
   */
  async listAll(): Promise<T[]> {
    return this.listAllEntities();
  }
}