/**
 * Program Repository for V2 Architecture
 */

import { BaseRepository } from './base.repository';
import { Program } from '@/lib/v2/interfaces/base';

export class ProgramRepository extends BaseRepository<Program> {
  constructor(storageService: any) {
    super('programs', storageService);
  }

  async findByScenario(scenarioId: string): Promise<Program[]> {
    const programs = await this.findMany({
      where: { scenario_id: scenarioId }
    });

    return programs.sort((a, b) => a.program_order - b.program_order);
  }

  async findActiveByScenario(scenarioId: string): Promise<Program | null> {
    return this.findOne({
      where: {
        scenario_id: scenarioId,
        status: 'active'
      }
    });
  }

  async getNextProgram(scenarioId: string, currentOrder: number): Promise<Program | null> {
    const programs = await this.findByScenario(scenarioId);
    return programs.find(p => p.program_order === currentOrder + 1) || null;
  }

  protected mapToEntity(data: any): Program {
    return {
      id: data.id,
      scenario_id: data.scenario_id,
      title: data.title,
      description: data.description,
      program_order: data.program_order,
      status: data.status,
      config: data.config || {},
      metadata: data.metadata || {},
      started_at: data.started_at,
      completed_at: data.completed_at,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}