/**
 * Task Repository for V2 Architecture
 */

import { BaseRepository } from './base.repository';
import { Task } from '@/lib/v2/interfaces/base';

export class TaskRepository extends BaseRepository<Task> {
  constructor(storageService: any) {
    super('tasks', storageService);
  }

  async findByProgram(programId: string): Promise<Task[]> {
    const tasks = await this.findMany({
      where: { program_id: programId }
    });

    return tasks.sort((a, b) => a.task_order - b.task_order);
  }

  async findActiveByProgram(programId: string): Promise<Task | null> {
    return this.findOne({
      where: {
        program_id: programId,
        status: 'active'
      }
    });
  }

  async getNextTask(programId: string, currentOrder: number): Promise<Task | null> {
    const tasks = await this.findByProgram(programId);
    return tasks.find(t => t.task_order === currentOrder + 1) || null;
  }

  async countByStatus(programId: string, status: string): Promise<number> {
    const tasks = await this.findMany({
      where: {
        program_id: programId,
        status: status
      }
    });
    return tasks.length;
  }

  protected mapToEntity(data: any): Task {
    return {
      id: data.id,
      program_id: data.program_id,
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      task_order: data.task_order,
      type: data.type,
      required_ksa: data.required_ksa || [],
      config: data.config || {},
      metadata: data.metadata || {},
      status: data.status,
      started_at: data.started_at,
      completed_at: data.completed_at,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}