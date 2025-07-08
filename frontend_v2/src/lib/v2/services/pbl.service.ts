/**
 * PBL Service Implementation for V2
 * Handles Problem-Based Learning scenarios with staged learning
 */

import { BaseLearningService, ServiceContext } from './base.service';
import { 
  SourceContent, 
  Scenario, 
  Program, 
  Task, 
  Log, 
  Evaluation 
} from '@/lib/v2/interfaces/base';

export class PBLService extends BaseLearningService {
  /**
   * Create initial programs for PBL scenario
   * PBL uses programs to represent learning stages (Foundation, Advanced, etc.)
   */
  protected async createInitialPrograms(
    scenario: Scenario,
    source: SourceContent,
    context: ServiceContext
  ): Promise<void> {
    // PBL programs represent learning stages
    const stages = source.metadata.stages || [
      { 
        id: 'foundation',
        title: 'Foundation Stage',
        description: 'Build fundamental understanding',
        tasks: []
      },
      {
        id: 'advanced',
        title: 'Advanced Stage',
        description: 'Apply knowledge in complex scenarios',
        tasks: []
      }
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      
      // Create program for this stage
      const program = await this.repositories.program.create({
        scenario_id: scenario.id,
        title: stage.title,
        description: stage.description,
        program_order: i,
        status: i === 0 ? 'active' : 'pending',
        config: {
          stage_id: stage.id,
          learning_objectives: stage.objectives || [],
          prerequisites: stage.prerequisites || []
        },
        metadata: {
          estimated_duration: stage.duration || 60,
          difficulty_level: stage.difficulty || 'intermediate'
        },
        ...(i === 0 && { started_at: new Date().toISOString() })
      });

      // Create tasks for this program
      const tasks = stage.tasks || source.metadata.default_tasks || [];
      for (let j = 0; j < tasks.length; j++) {
        const taskDef = tasks[j];
        
        await this.repositories.task.create({
          program_id: program.id,
          title: taskDef.title,
          description: taskDef.description,
          instructions: taskDef.instructions,
          task_order: j,
          type: taskDef.type || 'chat',
          required_ksa: taskDef.required_ksa || [],
          config: {
            rubric: taskDef.rubric,
            resources: taskDef.resources,
            hints: taskDef.hints
          },
          metadata: {
            can_repeat: true,
            estimated_duration: taskDef.duration || 20,
            difficulty: taskDef.difficulty || 'medium'
          },
          status: j === 0 && i === 0 ? 'active' : 'pending'
        });
      }
    }
  }

  /**
   * Evaluate PBL task response using AI
   */
  protected async evaluateResponse(
    task: Task,
    response: any,
    log: Log
  ): Promise<Evaluation> {
    // PBL uses AI to evaluate conversational responses
    const evaluationResult = await this.aiService?.evaluateTaskResponse({
      task: task,
      response: response,
      rubric: task.config.rubric,
      required_ksa: task.required_ksa
    }) || {
      scores: { overall: 0 },
      feedback: {
        summary: 'Evaluation not available',
        strengths: [],
        improvements: []
      }
    };

    // Create evaluation record
    const evaluation = await this.repositories.evaluation.create({
      log_id: log.id,
      scenario_id: log.scenario_id,
      task_id: task.id,
      evaluation_type: 'ai',
      input: { 
        response: response,
        task_context: {
          title: task.title,
          instructions: task.instructions,
          required_ksa: task.required_ksa
        }
      },
      result: evaluationResult,
      scores: evaluationResult.scores,
      feedback: evaluationResult.feedback,
      ksa_mapping: evaluationResult.ksa_achievement,
      evaluated_by: `ai:${this.aiService?.getModelInfo().model || 'unknown'}`
    });

    // Log achievement if high score
    if (evaluationResult.scores.overall >= 80) {
      await this.logActivity({
        scenario_id: log.scenario_id,
        program_id: log.program_id,
        task_id: task.id,
        user_id: log.user_id,
        log_type: 'achievement',
        activity: 'task_mastered',
        data: {
          task_title: task.title,
          score: evaluationResult.scores.overall,
          ksa_achieved: evaluationResult.ksa_achievement
        }
      });
    }

    return evaluation;
  }

  /**
   * PBL-specific: Allow task retry
   */
  async retryTask(taskId: string, userId: string): Promise<Task> {
    const task = await this.repositories.task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Reset task status
    await this.repositories.task.update(taskId, {
      status: 'active',
      started_at: new Date().toISOString(),
      completed_at: undefined
    });

    // Log retry
    await this.logActivity({
      scenario_id: task.program_id, // Will need to fetch program for scenario_id
      program_id: task.program_id,
      task_id: taskId,
      user_id: userId,
      log_type: 'completion',
      activity: 'task_retry',
      data: {
        task_title: task.title,
        retry_reason: 'user_initiated'
      }
    });

    return task;
  }

  /**
   * PBL-specific: Get learning progress
   */
  async getLearningProgress(scenarioId: string): Promise<{
    overall: number;
    by_stage: Array<{ stage: string; progress: number }>;
    ksa_coverage: Record<string, number>;
  }> {
    const programs = await this.repositories.program.findByScenario(scenarioId);
    const evaluations = await this.repositories.evaluation.findByScenario(scenarioId);
    
    // Calculate overall progress
    let totalTasks = 0;
    let completedTasks = 0;
    const stageProgress: Array<{ stage: string; progress: number }> = [];
    
    for (const program of programs) {
      const tasks = await this.repositories.task.findByProgram(program.id);
      const programCompleted = await this.repositories.task.countByStatus(program.id, 'completed');
      
      totalTasks += tasks.length;
      completedTasks += programCompleted;
      
      stageProgress.push({
        stage: program.title,
        progress: tasks.length > 0 ? (programCompleted / tasks.length) * 100 : 0
      });
    }
    
    // Calculate KSA coverage
    const ksaCoverage: Record<string, number> = {};
    for (const evaluation of evaluations) {
      if (evaluation.ksa_mapping) {
        Object.entries(evaluation.ksa_mapping).forEach(([ksa, score]) => {
          ksaCoverage[ksa] = Math.max(ksaCoverage[ksa] || 0, score as number);
        });
      }
    }
    
    return {
      overall: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      by_stage: stageProgress,
      ksa_coverage: ksaCoverage
    };
  }
}