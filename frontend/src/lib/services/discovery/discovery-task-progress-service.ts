import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { ITask } from "@/types/unified-learning";

export interface TaskProgressResult {
  nextTaskId: string | null;
  nextTaskIndex: number;
  programCompleted: boolean;
}

/**
 * Service for managing Discovery mode task progression
 * Handles activating next tasks and tracking program completion
 */
export class DiscoveryTaskProgressService {
  /**
   * Activate the next task in the program and update program metadata
   * @returns Information about the next task and program completion status
   */
  static async activateNextTask(
    programId: string,
    taskIds: string[],
    existingMetadata: Record<string, unknown> = {},
  ): Promise<TaskProgressResult> {
    const taskRepo = repositoryFactory.getTaskRepository();
    const programRepo = repositoryFactory.getProgramRepository();

    // Get all tasks and order them according to taskIds
    const allTasks = await taskRepo.findByProgram(programId);
    const taskMap = new Map(allTasks.map((t) => [t.id, t]));
    const orderedTasks = taskIds
      .map((id: string) => taskMap.get(id))
      .filter(Boolean) as ITask[];

    // Count completed tasks to determine next task index
    const completedTasks = this.countCompletedTasks(orderedTasks);
    const nextTaskIndex = completedTasks;

    let nextTaskId: string | null = null;
    let programCompleted = false;

    // Activate next task if available
    if (nextTaskIndex < orderedTasks.length) {
      const nextTask = orderedTasks[nextTaskIndex];
      await taskRepo.updateStatus?.(nextTask.id, "active");
      nextTaskId = nextTask.id;
    } else {
      programCompleted = true;
    }

    // Update program metadata
    await programRepo.update?.(programId, { currentTaskIndex: nextTaskIndex });
    await programRepo.update?.(programId, {
      metadata: {
        ...existingMetadata,
        currentTaskId: nextTaskId,
        currentTaskIndex: nextTaskIndex,
      },
    });

    return {
      nextTaskId,
      nextTaskIndex,
      programCompleted,
    };
  }

  /**
   * Update program's total XP
   */
  static async updateProgramXP(
    programId: string,
    earnedXP: number,
    programMetadata: Record<string, unknown> = {},
  ): Promise<void> {
    const programRepo = repositoryFactory.getProgramRepository();
    const currentXP = (programMetadata.totalXP as number) || 0;

    await programRepo.update?.(programId, {
      metadata: {
        totalXP: currentXP + earnedXP,
      },
    });
  }

  /**
   * Count the number of completed tasks
   */
  static countCompletedTasks(tasks: ITask[]): number {
    return tasks.filter((t) => t.status === "completed").length;
  }
}
