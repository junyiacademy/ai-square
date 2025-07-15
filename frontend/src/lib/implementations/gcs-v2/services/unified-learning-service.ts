/**
 * Unified Learning Service - Business Logic Layer
 * Coordinates repositories to implement complete learning workflows
 */

import { IScenario, IProgram, ITask, IEvaluation } from '@/types/unified-learning';
import { GCSScenarioRepository } from '../repositories/gcs-scenario-repository';
import { GCSProgramRepository } from '../repositories/gcs-program-repository';
import { GCSTaskRepository } from '../repositories/gcs-task-repository';
import { GCSEvaluationRepository } from '../repositories/gcs-evaluation-repository';

export class UnifiedLearningService {
  private scenarioRepo: GCSScenarioRepository;
  private programRepo: GCSProgramRepository;
  private taskRepo: GCSTaskRepository;
  private evaluationRepo: GCSEvaluationRepository;

  constructor() {
    this.scenarioRepo = new GCSScenarioRepository();
    this.programRepo = new GCSProgramRepository();
    this.taskRepo = new GCSTaskRepository();
    this.evaluationRepo = new GCSEvaluationRepository();
  }

  /**
   * Create a complete learning program from scenario
   */
  async createLearningProgram(
    scenarioId: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<{
    scenario: IScenario;
    program: IProgram;
    tasks: ITask[];
  }> {
    // Get scenario
    const scenario = await this.scenarioRepo.findById(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    // Create program
    const programData: Omit<IProgram, 'id'> = {
      scenarioId,
      userId,
      status: 'active',
      startedAt: new Date().toISOString(),
      taskIds: [],
      currentTaskIndex: 0,
      metadata: {
        sourceType: scenario.sourceType,
        ...metadata
      }
    };

    const program = await this.programRepo.create(programData);

    // Create tasks from scenario templates
    const tasks: ITask[] = [];
    for (let i = 0; i < scenario.taskTemplates.length; i++) {
      const template = scenario.taskTemplates[i];
      const taskData: Omit<ITask, 'id'> = {
        programId: program.id,
        templateId: template.id,
        title: template.title,
        description: template.description || '',
        type: template.type,
        order: i + 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
        metadata: {
          sourceType: scenario.sourceType,
          ...template.metadata
        }
      };

      const task = await this.taskRepo.create(taskData);
      tasks.push(task);
    }

    // Update program with task IDs (manually update the program)
    const updatedProgram = await this.programRepo.findById(program.id);
    if (!updatedProgram) {
      throw new Error(`Program not found: ${program.id}`);
    }
    updatedProgram.taskIds = tasks.map(t => t.id);

    return {
      scenario,
      program: updatedProgram,
      tasks
    };
  }

  /**
   * Complete a task with evaluation
   */
  async completeTask(
    taskId: string,
    userId: string,
    response?: any,
    evaluationData?: Partial<IEvaluation>
  ): Promise<{
    task: ITask;
    evaluation: IEvaluation;
    nextTask?: ITask;
  }> {
    // Get task
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Save response if provided
    let completedTask: ITask;
    if (response) {
      completedTask = await this.taskRepo.saveResponse(taskId, response);
    } else {
      completedTask = await this.taskRepo.updateStatus(taskId, 'completed');
    }

    // Create evaluation
    const evaluation = await this.evaluationRepo.create({
      entityType: 'task',
      entityId: taskId,
      programId: task.programId,
      userId,
      type: 'ai_feedback',
      createdAt: new Date().toISOString(),
      metadata: {
        sourceType: task.metadata?.sourceType || 'unknown',
        ...evaluationData?.metadata
      },
      ...evaluationData
    });

    // Get program and update progress
    const program = await this.programRepo.findById(task.programId);
    if (!program) {
      throw new Error(`Program not found: ${task.programId}`);
    }

    const nextTaskIndex = program.currentTaskIndex + 1;
    let nextTask: ITask | undefined;

    if (nextTaskIndex < program.taskIds.length) {
      // Move to next task
      await this.programRepo.updateProgress(task.programId, nextTaskIndex);
      nextTask = await this.taskRepo.findById(program.taskIds[nextTaskIndex]);
      
      if (nextTask) {
        nextTask = await this.taskRepo.updateStatus(nextTask.id, 'active');
      }
    } else {
      // Complete program
      await this.programRepo.complete(task.programId);
    }

    return {
      task: completedTask,
      evaluation,
      nextTask
    };
  }

  /**
   * Complete a program with final evaluation
   */
  async completeProgram(
    programId: string,
    userId: string,
    evaluationData?: Partial<IEvaluation>
  ): Promise<{
    program: IProgram;
    evaluation: IEvaluation;
    taskEvaluations: IEvaluation[];
  }> {
    // Get program
    const program = await this.programRepo.findById(programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    // Complete program
    const completedProgram = await this.programRepo.complete(programId);

    // Create program evaluation
    const evaluation = await this.evaluationRepo.create({
      entityType: 'program',
      entityId: programId,
      programId,
      userId,
      type: 'program_completion',
      createdAt: new Date().toISOString(),
      metadata: {
        sourceType: program.metadata?.sourceType || 'unknown',
        ...evaluationData?.metadata
      },
      ...evaluationData
    });

    // Get all task evaluations
    const taskEvaluations = await this.evaluationRepo.findByProgram(programId);

    return {
      program: completedProgram,
      evaluation,
      taskEvaluations
    };
  }

  /**
   * Get learning progress for a user
   */
  async getLearningProgress(userId: string): Promise<{
    activePrograms: IProgram[];
    completedPrograms: IProgram[];
    totalEvaluations: number;
    averageScore?: number;
  }> {
    // Get all user programs
    const allPrograms = await this.programRepo.findByUser(userId);
    
    const activePrograms = allPrograms.filter(p => p.status === 'active');
    const completedPrograms = allPrograms.filter(p => p.status === 'completed');

    // Get all user evaluations
    const evaluations = await this.evaluationRepo.findByUser(userId);
    
    // Calculate average score if available
    let averageScore: number | undefined;
    const scoresWithScores = evaluations.filter(e => 
      e.metadata?.performance?.qualityScore || 
      e.metadata?.grading?.points
    );
    
    if (scoresWithScores.length > 0) {
      const totalScore = scoresWithScores.reduce((sum, e) => {
        return sum + (
          e.metadata?.performance?.qualityScore || 
          e.metadata?.grading?.points || 
          0
        );
      }, 0);
      averageScore = totalScore / scoresWithScores.length;
    }

    return {
      activePrograms,
      completedPrograms,
      totalEvaluations: evaluations.length,
      averageScore
    };
  }

  /**
   * Get detailed program status
   */
  async getProgramStatus(programId: string): Promise<{
    program: IProgram;
    scenario: IScenario;
    tasks: ITask[];
    evaluations: IEvaluation[];
    currentTask?: ITask;
    completionRate: number;
  }> {
    // Get program
    const program = await this.programRepo.findById(programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    // Get scenario
    const scenario = await this.scenarioRepo.findById(program.scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${program.scenarioId}`);
    }

    // Get tasks
    const tasks = await this.taskRepo.findByProgram(programId);
    
    // Get evaluations
    const evaluations = await this.evaluationRepo.findByProgram(programId);

    // Get current task
    let currentTask: ITask | undefined;
    if (program.status === 'active' && program.currentTaskIndex < tasks.length) {
      currentTask = tasks[program.currentTaskIndex];
    }

    // Calculate completion rate
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    return {
      program,
      scenario,
      tasks,
      evaluations,
      currentTask,
      completionRate
    };
  }

  /**
   * Get learning analytics for a user
   */
  async getLearningAnalytics(userId: string): Promise<{
    totalPrograms: number;
    completedPrograms: number;
    totalTasks: number;
    completedTasks: number;
    averageTaskTime?: number;
    topSkills: string[];
    recentActivity: Array<{
      type: 'program_started' | 'task_completed' | 'program_completed';
      timestamp: string;
      details: any;
    }>;
  }> {
    // Get all user programs
    const programs = await this.programRepo.findByUser(userId);
    const completedPrograms = programs.filter(p => p.status === 'completed');

    // Get all tasks from user programs
    const allTasks: ITask[] = [];
    for (const program of programs) {
      const tasks = await this.taskRepo.findByProgram(program.id);
      allTasks.push(...tasks);
    }

    const completedTasks = allTasks.filter(t => t.status === 'completed');

    // Calculate average task time
    let averageTaskTime: number | undefined;
    const tasksWithTime = completedTasks.filter(t => 
      t.startedAt && t.completedAt
    );
    
    if (tasksWithTime.length > 0) {
      const totalTime = tasksWithTime.reduce((sum, t) => {
        const start = new Date(t.startedAt!).getTime();
        const end = new Date(t.completedAt!).getTime();
        return sum + (end - start);
      }, 0);
      averageTaskTime = totalTime / tasksWithTime.length;
    }

    // Get top skills from evaluations
    const evaluations = await this.evaluationRepo.findByUser(userId);
    const skillCounts: Record<string, number> = {};
    
    evaluations.forEach(e => {
      const skills = e.metadata?.skillsGained || e.metadata?.ksaCodes || [];
      skills.forEach((skill: string) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill]) => skill);

    // Generate recent activity
    const recentActivity = [
      ...programs.map(p => ({
        type: 'program_started' as const,
        timestamp: p.startedAt,
        details: { programId: p.id, scenarioId: p.scenarioId }
      })),
      ...completedTasks.map(t => ({
        type: 'task_completed' as const,
        timestamp: t.completedAt!,
        details: { taskId: t.id, programId: t.programId }
      })),
      ...completedPrograms.map(p => ({
        type: 'program_completed' as const,
        timestamp: p.completedAt!,
        details: { programId: p.id, scenarioId: p.scenarioId }
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      totalPrograms: programs.length,
      completedPrograms: completedPrograms.length,
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      averageTaskTime,
      topSkills,
      recentActivity
    };
  }
}