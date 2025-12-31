/**
 * PostgreSQL-based Unified Learning Service
 * Implements the learning service using PostgreSQL repositories
 */

import { BaseLearningService } from "@/lib/abstractions/base-learning-service";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import type { IProgram, ITask, IEvaluation } from "@/types/unified-learning";

export class PostgreSQLLearningService extends BaseLearningService {
  constructor() {
    const factory = repositoryFactory;

    super(
      factory.getScenarioRepository(),
      factory.getProgramRepository(),
      factory.getTaskRepository(),
      factory.getEvaluationRepository(),
      undefined, // evaluationSystem - can be added later if needed
      {
        enableEvaluation: true,
        enableHooks: true,
      },
    );
  }

  /**
   * Override hooks for PostgreSQL-specific behavior if needed
   */
  protected async afterProgramCreate(program: IProgram): Promise<void> {
    // Log or perform PostgreSQL-specific actions
    console.log(`[PostgreSQLLearningService] Program created: ${program.id}`);
  }

  protected async afterTaskComplete(
    task: ITask,
    evaluation: IEvaluation,
  ): Promise<void> {
    // Log or perform PostgreSQL-specific actions
    console.log(
      `[PostgreSQLLearningService] Task completed: ${task.id}, evaluation: ${evaluation.id}`,
    );
  }

  protected async afterProgramComplete(
    program: IProgram,
    evaluation: IEvaluation,
  ): Promise<void> {
    // Log or perform PostgreSQL-specific actions
    console.log(
      `[PostgreSQLLearningService] Program completed: ${program.id}, evaluation: ${evaluation.id}`,
    );
  }
}

// Export singleton instance
export const postgresqlLearningService = new PostgreSQLLearningService();
