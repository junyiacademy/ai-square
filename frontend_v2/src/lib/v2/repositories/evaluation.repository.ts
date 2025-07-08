/**
 * Evaluation Repository for V2 Architecture
 */

import { BaseRepository } from './base.repository';
import { Evaluation } from '@/lib/v2/interfaces/base';

export class EvaluationRepository extends BaseRepository<Evaluation> {
  constructor(storageService: any) {
    super('evaluations', storageService);
  }

  async findByScenario(scenarioId: string): Promise<Evaluation[]> {
    const evaluations = await this.findMany({
      where: { scenario_id: scenarioId }
    });

    return evaluations.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async findByTask(taskId: string): Promise<Evaluation[]> {
    return this.findMany({
      where: { task_id: taskId }
    });
  }

  async getAverageScore(scenarioId: string): Promise<number> {
    const evaluations = await this.findByScenario(scenarioId);
    
    if (evaluations.length === 0) return 0;
    
    const totalScore = evaluations.reduce((sum, evaluation) => {
      const score = evaluation.scores.overall || evaluation.scores.percentage || 0;
      return sum + score;
    }, 0);
    
    return totalScore / evaluations.length;
  }

  protected mapToEntity(data: any): Evaluation {
    return {
      id: data.id,
      log_id: data.log_id,
      scenario_id: data.scenario_id,
      task_id: data.task_id,
      evaluation_type: data.evaluation_type,
      input: data.input || {},
      result: data.result || {},
      scores: data.scores || {},
      feedback: data.feedback,
      ksa_mapping: data.ksa_mapping,
      evaluated_by: data.evaluated_by,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}