/**
 * Base Service for V2 Learning Architecture
 */

import { 
  SourceContent, 
  Scenario, 
  Program, 
  Task, 
  Log, 
  Evaluation 
} from '@/lib/v2/interfaces/base';

export interface ServiceContext {
  userId: string;
  language?: string;
  metadata?: Record<string, any>;
}

export abstract class BaseLearningService {
  constructor(
    protected repositories: {
      scenario: any;
      program: any;
      task: any;
      log: any;
      evaluation: any;
    },
    protected storageService: any,
    protected aiService?: any
  ) {}

  /**
   * Start a new learning scenario from source content
   */
  async startScenario(
    context: ServiceContext,
    sourceContent: SourceContent
  ): Promise<Scenario> {
    // Check for existing active scenario
    const existingScenario = await this.repositories.scenario.findActiveByUserAndSource(
      context.userId,
      sourceContent.id
    );

    if (existingScenario) {
      await this.repositories.scenario.updateLastActive(existingScenario.id);
      return existingScenario;
    }

    // Create new scenario
    const scenario = await this.repositories.scenario.create({
      user_id: context.userId,
      source_id: sourceContent.id,
      type: sourceContent.type,
      title: this.generateScenarioTitle(sourceContent, context),
      status: 'active',
      metadata: {
        source_code: sourceContent.code,
        language: context.language,
        ...context.metadata
      },
      started_at: new Date().toISOString()
    });

    // Create initial programs
    await this.createInitialPrograms(scenario, sourceContent, context);

    // Log scenario start
    await this.logActivity({
      scenario_id: scenario.id,
      user_id: context.userId,
      log_type: 'completion',
      activity: 'scenario_started',
      data: {
        source_id: sourceContent.id,
        source_title: sourceContent.title
      }
    });

    return scenario;
  }

  /**
   * Submit response for a task
   */
  async submitTaskResponse(
    taskId: string,
    userId: string,
    response: any
  ): Promise<Evaluation> {
    const task = await this.repositories.task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const program = await this.repositories.program.findById(task.program_id);
    if (!program) {
      throw new Error('Program not found');
    }

    // Log submission
    const log = await this.logActivity({
      scenario_id: program.scenario_id,
      program_id: program.id,
      task_id: taskId,
      user_id: userId,
      log_type: 'submission',
      activity: 'task_submitted',
      data: { response }
    });

    // Evaluate response
    const evaluation = await this.evaluateResponse(task, response, log);

    // Update task status
    await this.repositories.task.update(taskId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    // Check program completion
    await this.checkProgramCompletion(program.id);

    return evaluation;
  }

  /**
   * Get or resume scenario
   */
  async getOrResumeScenario(
    userId: string,
    sourceId: string
  ): Promise<Scenario | null> {
    const scenario = await this.repositories.scenario.findActiveByUserAndSource(
      userId,
      sourceId
    );

    if (scenario) {
      await this.repositories.scenario.updateLastActive(scenario.id);
    }

    return scenario;
  }

  /**
   * Log an activity
   */
  protected async logActivity(data: Omit<Log, 'id' | 'created_at' | 'updated_at'>): Promise<Log> {
    return await this.repositories.log.create(data);
  }

  /**
   * Check if a program is completed
   */
  protected async checkProgramCompletion(programId: string): Promise<void> {
    const tasks = await this.repositories.task.findMany({
      where: { program_id: programId }
    });

    const allCompleted = tasks.every(task => 
      task.status === 'completed' || task.status === 'skipped'
    );

    if (allCompleted) {
      await this.repositories.program.update(programId, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      // Check next program
      const program = await this.repositories.program.findById(programId);
      if (program) {
        await this.activateNextProgram(program.scenario_id, program.program_order);
      }
    }
  }

  /**
   * Activate the next program in sequence
   */
  protected async activateNextProgram(scenarioId: string, currentOrder: number): Promise<void> {
    const programs = await this.repositories.program.findMany({
      where: { scenario_id: scenarioId }
    });

    const nextProgram = programs.find(p => p.program_order === currentOrder + 1);
    if (nextProgram && nextProgram.status === 'pending') {
      await this.repositories.program.update(nextProgram.id, {
        status: 'active',
        started_at: new Date().toISOString()
      });
    }
  }

  /**
   * Generate scenario title
   */
  protected generateScenarioTitle(source: SourceContent, context: ServiceContext): string {
    const timestamp = new Date().toLocaleDateString();
    return `${source.title} - ${context.userId} - ${timestamp}`;
  }

  // Abstract methods to be implemented by specific services
  protected abstract createInitialPrograms(
    scenario: Scenario,
    source: SourceContent,
    context: ServiceContext
  ): Promise<void>;

  protected abstract evaluateResponse(
    task: Task,
    response: any,
    log: Log
  ): Promise<Evaluation>;
}