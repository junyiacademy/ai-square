/**
 * GCS Program Repository 實作
 */

import { GCSRepositoryBase } from '../base/gcs-repository-base';
import { BaseProgramRepository, IProgram } from '@/types/unified-learning';
import { GCS_CONFIG } from '@/lib/config/gcs.config';

export class GCSProgramRepository<T extends IProgram = IProgram> 
  extends GCSRepositoryBase<T> 
  implements BaseProgramRepository<T> {
  
  constructor() {
    super(GCS_CONFIG.paths.programs);
  }

  async create(program: Omit<T, 'id'>): Promise<T> {
    const newProgram = {
      ...program,
      id: this.generateId(),
      startedAt: new Date().toISOString(),
      status: 'active' as const,
      currentTaskIndex: 0,
      taskIds: [],
    } as T;
    
    return this.saveEntity(newProgram);
  }

  async findById(id: string): Promise<T | null> {
    return this.loadEntity(id);
  }

  async findByUser(userId: string): Promise<T[]> {
    const allPrograms = await this.listAllEntities();
    return allPrograms.filter(program => program.userId === userId);
  }

  async findByScenario(scenarioId: string): Promise<T[]> {
    const allPrograms = await this.listAllEntities();
    return allPrograms.filter(program => program.scenarioId === scenarioId);
  }

  async updateProgress(id: string, taskIndex: number): Promise<T> {
    const updated = await this.updateEntity(id, {
      currentTaskIndex: taskIndex,
    });
    
    if (!updated) {
      throw new Error(`Program not found: ${id}`);
    }
    
    return updated;
  }

  async complete(id: string): Promise<T> {
    const updated = await this.updateEntity(id, {
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
    });
    
    if (!updated) {
      throw new Error(`Program not found: ${id}`);
    }
    
    return updated;
  }

  /**
   * 更新 Program 的 task IDs
   */
  async updateTaskIds(id: string, taskIds: string[]): Promise<T> {
    const updated = await this.updateEntity(id, {
      taskIds,
    });
    
    if (!updated) {
      throw new Error(`Program not found: ${id}`);
    }
    
    return updated;
  }

  /**
   * 放棄 Program
   */
  async abandon(id: string): Promise<T> {
    const updated = await this.updateEntity(id, {
      status: 'abandoned' as const,
      completedAt: new Date().toISOString(),
    });
    
    if (!updated) {
      throw new Error(`Program not found: ${id}`);
    }
    
    return updated;
  }

  /**
   * 取得使用者的活躍 Programs
   */
  async findActiveByUser(userId: string): Promise<T[]> {
    const userPrograms = await this.findByUser(userId);
    return userPrograms.filter(program => program.status === 'active');
  }

  /**
   * 取得使用者特定 Scenario 的最新 Program
   */
  async findLatestByUserAndScenario(userId: string, scenarioId: string): Promise<T | null> {
    const programs = await this.listAllEntities();
    
    const userScenarioPrograms = programs
      .filter(p => p.userId === userId && p.scenarioId === scenarioId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    return userScenarioPrograms[0] || null;
  }
}