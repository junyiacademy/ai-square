/**
 * Base Learning Service V2
 * Provides flexible learning structure management for different patterns
 */

import {
  Scenario,
  Program,
  Task,
  CreateScenarioOptions,
  CreateProgramOptions,
  CreateTaskOptions,
  ScenarioWithHierarchy,
  ProgramWithTasks
} from '../types';
import { ScenarioRepositoryV2 } from '../repositories/scenario-repository';
import { ProgramRepositoryV2 } from '../repositories/program-repository';
import { TaskRepositoryV2 } from '../repositories/task-repository';
import { DatabaseConnection } from '../utils/database';

export abstract class BaseLearningServiceV2 {
  protected scenarioRepo: ScenarioRepositoryV2;
  protected programRepo: ProgramRepositoryV2;
  protected taskRepo: TaskRepositoryV2;

  constructor(protected db: DatabaseConnection) {
    this.scenarioRepo = new ScenarioRepositoryV2(db);
    this.programRepo = new ProgramRepositoryV2(db);
    this.taskRepo = new TaskRepositoryV2(db);
  }

  /**
   * Create a scenario with flexible structure
   */
  async createScenario(
    scenarioData: Omit<Scenario, 'id' | 'created_at' | 'updated_at'>,
    options?: CreateScenarioOptions
  ): Promise<ScenarioWithHierarchy> {
    // Set structure type from options or default
    const scenario = await this.scenarioRepo.create({
      ...scenarioData,
      structure_type: options?.structure_type || 'standard'
    });

    const programs: ProgramWithTasks[] = [];

    // Handle different structure types
    switch (scenario.structure_type) {
      case 'standard':
        // Standard structure: create programs if provided
        if (options?.programs) {
          for (const programData of options.programs) {
            const program = await this.createProgram(scenario.id, programData);
            programs.push(program);
          }
        }
        break;

      case 'single_program':
        // Single program structure: create one virtual program
        const virtualProgram = await this.createVirtualProgram(scenario.id, {
          title: `${scenario.title} Program`,
          description: scenario.description,
          tasks: options?.tasks
        });
        programs.push(virtualProgram);
        break;

      case 'direct_task':
        // Direct task structure: create virtual program with tasks
        const taskProgram = await this.createVirtualProgram(scenario.id, {
          title: 'Tasks',
          description: 'Direct tasks',
          tasks: options?.tasks
        });
        programs.push(taskProgram);
        break;
    }

    return {
      ...scenario,
      programs
    };
  }

  /**
   * Create a program with optional tasks
   */
  async createProgram(
    scenarioId: string,
    programData: Omit<Program, 'id' | 'created_at' | 'updated_at' | 'scenario_id'>,
    options?: CreateProgramOptions
  ): Promise<ProgramWithTasks> {
    const program = await this.programRepo.create({
      ...programData,
      scenario_id: scenarioId,
      is_virtual: options?.is_virtual,
      auto_generated: options?.auto_generated
    });

    const tasks: Task[] = [];

    // Create tasks if provided
    if (options?.tasks) {
      for (const taskData of options.tasks) {
        const task = await this.createTask(program.id, taskData);
        tasks.push(task);
      }
    }

    return {
      ...program,
      tasks
    };
  }

  /**
   * Create a virtual program (for flexible architectures)
   */
  async createVirtualProgram(
    scenarioId: string,
    options: {
      title?: string;
      description?: string;
      tasks?: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'program_id'>[];
    }
  ): Promise<ProgramWithTasks> {
    const program = await this.programRepo.createVirtualProgram(scenarioId, {
      title: options.title,
      description: options.description
    });

    const tasks: Task[] = [];

    // Create tasks if provided
    if (options.tasks) {
      for (const taskData of options.tasks) {
        const task = await this.createTask(program.id, taskData);
        tasks.push(task);
      }
    }

    return {
      ...program,
      tasks
    };
  }

  /**
   * Create a task with flexible options
   */
  async createTask(
    programId: string,
    taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'program_id'>,
    options?: CreateTaskOptions
  ): Promise<Task> {
    return this.taskRepo.createFlexibleTask(programId, {
      ...taskData,
      task_variant: options?.task_variant || taskData.task_variant,
      metadata: {
        ...taskData.metadata,
        ai_modules: options?.ai_modules,
        context: options?.context
      }
    });
  }

  /**
   * Create a question-based task (for assessments)
   */
  async createQuestionTask(
    programId: string,
    question: string,
    type: 'multiple_choice' | 'short_answer' | 'essay',
    options?: {
      choices?: string[];
      correct_answer?: string;
      context?: any;
    }
  ): Promise<Task> {
    return this.taskRepo.createQuestionTask(programId, question, {
      type,
      choices: options?.choices,
      context: {
        correct_answer: options?.correct_answer,
        ...options?.context
      }
    });
  }

  /**
   * Get scenario with full hierarchy
   */
  async getScenarioWithHierarchy(scenarioId: string): Promise<ScenarioWithHierarchy | null> {
    const scenario = await this.scenarioRepo.findById(scenarioId);
    if (!scenario) return null;

    const programs = await this.programRepo.findByScenario(scenarioId);
    const programsWithTasks: ProgramWithTasks[] = [];

    for (const program of programs) {
      const tasks = await this.taskRepo.findByProgram(program.id);
      programsWithTasks.push({
        ...program,
        tasks
      });
    }

    return {
      ...scenario,
      programs: programsWithTasks
    };
  }

  /**
   * Get scenarios by structure type
   */
  async getScenariosByStructureType(
    structureType: 'standard' | 'direct_task' | 'single_program'
  ): Promise<Scenario[]> {
    return this.scenarioRepo.findByStructureType(structureType);
  }

  /**
   * Abstract methods to be implemented by specific services
   */
  abstract getServiceName(): string;
  abstract getDefaultStructureType(): 'standard' | 'direct_task' | 'single_program';
}