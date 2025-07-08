/**
 * Scenario Repository for V2 Architecture
 */

import { BaseRepository } from './base.repository';
import { Scenario } from '@/lib/v2/interfaces/base';

export class ScenarioRepository extends BaseRepository<Scenario> {
  constructor(storageService: any) {
    super('scenarios', storageService);
  }

  async findActiveByUserAndSource(userId: string, sourceId: string): Promise<Scenario | null> {
    return this.findOne({
      where: {
        user_id: userId,
        source_id: sourceId,
        status: 'active'
      }
    });
  }

  async findByUser(userId: string, options?: { type?: string; status?: string }): Promise<Scenario[]> {
    const scenarios = await this.findMany({
      where: {
        user_id: userId,
        ...(options?.type && { type: options.type }),
        ...(options?.status && { status: options.status })
      }
    });

    return scenarios.sort((a, b) => 
      new Date(b.last_active_at || b.created_at).getTime() - 
      new Date(a.last_active_at || a.created_at).getTime()
    );
  }

  async updateLastActive(id: string): Promise<void> {
    await this.update(id, {
      last_active_at: new Date().toISOString()
    });
  }

  protected mapToEntity(data: any): Scenario {
    return {
      id: data.id,
      user_id: data.user_id,
      source_id: data.source_id,
      type: data.type,
      title: data.title,
      status: data.status,
      metadata: data.metadata || {},
      started_at: data.started_at,
      completed_at: data.completed_at,
      last_active_at: data.last_active_at,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}