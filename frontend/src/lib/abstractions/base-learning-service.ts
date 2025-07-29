/**
 * Base Learning Service 抽象類別
 * 提供統一的學習服務介面，讓不同模組可以繼承並實作特定邏輯
 */

import {
  IScenario,
  IProgram,
  ITask,
  IEvaluation,
  BaseScenarioRepository,
  BaseProgramRepository,
  BaseTaskRepository,
  BaseEvaluationRepository,
  IEvaluationSystem
} from '@/types/unified-learning';
import { ResourceNotFoundError } from '@/lib/errors/unified-learning-errors';

export interface LearningServiceConfig {
  enableEvaluation?: boolean;
  enableHooks?: boolean;
}

export abstract class BaseLearningService {
  protected scenarioRepo: BaseScenarioRepository<IScenario>;
  protected programRepo: BaseProgramRepository<IProgram>;
  protected taskRepo: BaseTaskRepository<ITask>;
  protected evaluationRepo: BaseEvaluationRepository<IEvaluation>;
  protected evaluationSystem?: IEvaluationSystem;
  protected config: LearningServiceConfig;

  constructor(
    scenarioRepo: BaseScenarioRepository<IScenario>,
    programRepo: BaseProgramRepository<IProgram>,
    taskRepo: BaseTaskRepository<ITask>,
    evaluationRepo: BaseEvaluationRepository<IEvaluation>,
    evaluationSystem?: IEvaluationSystem,
    config: LearningServiceConfig = {}
  ) {
    this.scenarioRepo = scenarioRepo;
    this.programRepo = programRepo;
    this.taskRepo = taskRepo;
    this.evaluationRepo = evaluationRepo;
    this.evaluationSystem = evaluationSystem;
    this.config = {
      enableEvaluation: true,
      enableHooks: true,
      ...config
    };
  }

  /**
   * Hook methods for subclasses to override
   */
  protected async beforeProgramCreate(data: Partial<IProgram>): Promise<Partial<IProgram>> {
    return data;
  }

  protected async afterProgramCreate({}: IProgram): Promise<void> {
    // Default: no-op
  }

  protected async beforeTaskComplete({}: ITask): Promise<void> {
    // Default: no-op
  }

  protected async afterTaskComplete({}: ITask, {}: IEvaluation): Promise<void> {
    // Default: no-op
  }

  protected async beforeProgramComplete({}: IProgram): Promise<void> {
    // Default: no-op
  }

  protected async afterProgramComplete({}: IProgram, {}: IEvaluation): Promise<void> {
    // Default: no-op
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
      throw new ResourceNotFoundError('Scenario', scenarioId);
    }

    // Prepare program data
    let programData: Omit<IProgram, 'id'> = {
      scenarioId,
      userId,
      mode: scenario.mode,
      status: 'active',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: scenario.taskTemplates.length,
      totalScore: 0,
      domainScores: {},
      xpEarned: 0,
      badgesEarned: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      timeSpentSeconds: 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {
        sourceType: scenario.sourceType,
        ...metadata
      }
    };

    // Apply before hook
    if (this.config.enableHooks) {
      programData = await this.beforeProgramCreate(programData) as Omit<IProgram, 'id'>;
    }

    // Create program
    const program = await this.programRepo.create(programData);

    // Apply after hook
    if (this.config.enableHooks) {
      await this.afterProgramCreate(program);
    }

    // Create tasks from scenario templates
    const tasks: ITask[] = [];
    for (let i = 0; i < scenario.taskTemplates.length; i++) {
      const template = scenario.taskTemplates[i];
      const taskData: Omit<ITask, 'id'> = {
        programId: program.id,
        mode: scenario.mode,
        taskIndex: i,
        scenarioTaskIndex: i,
        title: template.title,
        description: typeof template.description === 'string' ? { en: template.description } : template.description || { en: '' },
        type: template.type,
        status: i === 0 ? 'active' : 'pending',
        content: {},
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {
          sourceType: scenario.sourceType,
          templateId: template.id,
          ...(typeof template.metadata === 'object' ? template.metadata : {})
        }
      };

      const task = await this.taskRepo.create(taskData);
      tasks.push(task);
    }

    // Tasks are linked to program via programId, no need to store taskIds in program

    return {
      scenario,
      program,
      tasks
    };
  }

  /**
   * Complete a task with evaluation
   */
  async completeTask(
    taskId: string,
    userId: string,
    response?: unknown,
    evaluationData?: Partial<IEvaluation>
  ): Promise<{
    task: ITask;
    evaluation: IEvaluation;
    nextTask?: ITask;
  }> {
    // Get task
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new ResourceNotFoundError('Task', taskId);
    }

    // Apply before hook
    if (this.config.enableHooks) {
      await this.beforeTaskComplete(task);
    }

    // Save response and update status
    // Update task with response if provided
    if (response !== undefined && task) {
      task.userResponse = response as Record<string, unknown>;
    }
    
    // Complete the task
    const completedTask = await this.taskRepo.complete(taskId);

    // Create evaluation
    const evaluation = await this.createTaskEvaluation(
      completedTask,
      userId,
      evaluationData
    );

    // Apply after hook
    if (this.config.enableHooks) {
      await this.afterTaskComplete(completedTask, evaluation);
    }

    // Get program and update progress
    const program = await this.programRepo.findById(task.programId);
    if (!program) {
      throw new ResourceNotFoundError('Program', task.programId);
    }

    const nextTaskIndex = program.currentTaskIndex + 1;
    let nextTask: ITask | undefined;

    // Get all tasks for the program to check if there are more
    const allTasks = await this.taskRepo.findByProgram(task.programId);
    
    if (nextTaskIndex < allTasks.length) {
      // Move to next task
      await this.programRepo.updateProgress(task.programId, nextTaskIndex);
      nextTask = allTasks[nextTaskIndex];
      
      if (nextTask) {
        // Mark next task as active by storing in metadata
        nextTask.status = 'active';
      }
    } else {
      // Complete program
      await this.completeProgram(task.programId, userId);
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
      throw new ResourceNotFoundError('Program', programId);
    }

    // Apply before hook
    if (this.config.enableHooks) {
      await this.beforeProgramComplete(program);
    }

    // Get all task evaluations
    const taskEvaluations = await this.evaluationRepo.findByProgram(programId);

    // Complete program
    const completedProgram = await this.programRepo.complete(programId);

    // Create program evaluation
    const evaluation = await this.createProgramEvaluation(
      completedProgram,
      userId,
      taskEvaluations,
      evaluationData
    );

    // Apply after hook
    if (this.config.enableHooks) {
      await this.afterProgramComplete(completedProgram, evaluation);
    }

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
    const evaluationsWithScores = evaluations.filter(e => e.score !== undefined);
    
    if (evaluationsWithScores.length > 0) {
      const totalScore = evaluationsWithScores.reduce((sum, e) => sum + (e.score || 0), 0);
      averageScore = totalScore / evaluationsWithScores.length;
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
      throw new ResourceNotFoundError('Program', programId);
    }

    // Get scenario
    const scenario = await this.scenarioRepo.findById(program.scenarioId);
    if (!scenario) {
      throw new ResourceNotFoundError('Scenario', program.scenarioId);
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
   * Create task evaluation - can be overridden by subclasses
   */
  protected async createTaskEvaluation(
    task: ITask,
    userId: string,
    evaluationData?: Partial<IEvaluation>
  ): Promise<IEvaluation> {
    const baseEvaluation: Omit<IEvaluation, 'id'> = {
      userId,
      programId: task.programId,
      taskId: task.id,
      mode: task.mode,
      evaluationType: evaluationData?.evaluationType || 'task',
      score: evaluationData?.score || 0,
      maxScore: evaluationData?.maxScore || 100,
      domainScores: evaluationData?.domainScores || {},
      feedbackData: evaluationData?.feedbackData || {},
      aiAnalysis: evaluationData?.aiAnalysis || {},
      timeTakenSeconds: evaluationData?.timeTakenSeconds || 0,
      createdAt: new Date().toISOString(),
      pblData: evaluationData?.pblData || {},
      discoveryData: evaluationData?.discoveryData || {},
      assessmentData: evaluationData?.assessmentData || {},
      metadata: {
        sourceType: task.metadata?.sourceType || 'unknown',
        ...evaluationData?.metadata
      }
    };

    return this.evaluationRepo.create(baseEvaluation);
  }

  /**
   * Create program evaluation - can be overridden by subclasses
   */
  protected async createProgramEvaluation(
    program: IProgram,
    userId: string,
    _taskEvaluations: IEvaluation[],
    evaluationData?: Partial<IEvaluation>
  ): Promise<IEvaluation> {
    const baseEvaluation: Omit<IEvaluation, 'id'> = {
      userId,
      programId: program.id,
      mode: program.mode,
      evaluationType: evaluationData?.evaluationType || 'program',
      score: evaluationData?.score || 0,
      maxScore: evaluationData?.maxScore || 100,
      domainScores: evaluationData?.domainScores || {},
      feedbackData: evaluationData?.feedbackData || {},
      aiAnalysis: evaluationData?.aiAnalysis || {},
      timeTakenSeconds: evaluationData?.timeTakenSeconds || 0,
      createdAt: new Date().toISOString(),
      pblData: evaluationData?.pblData || {},
      discoveryData: evaluationData?.discoveryData || {},
      assessmentData: evaluationData?.assessmentData || {},
      metadata: {
        sourceType: program.metadata?.sourceType || 'unknown',
        taskCount: _taskEvaluations.length,
        ...evaluationData?.metadata
      }
    };

    return this.evaluationRepo.create(baseEvaluation);
  }
}