/**
 * PBL Storage Service V2
 * Handles all PBL assessment data persistence using GCS with flat structure
 */

import { GCSStorageProvider } from '@/lib/core/storage/providers/gcs-storage.provider';
import { v4 as uuidv4 } from 'uuid';
import {
  Scenario,
  Program,
  Task,
  Evaluation,
  Completion,
  PBLLog,
  validateScenario,
  validateProgram,
  validateTask,
  validateEvaluation,
  validateCompletion,
  validatePBLLog,
  scenarioSchema,
  programSchema,
  taskSchema,
  evaluationSchema,
  completionSchema,
  pblLogSchema
} from '../schemas/pbl.schema';

export class PBLStorageService {
  private storage: GCSStorageProvider;
  private readonly BUCKET_NAME = 'ai-square-db';
  
  // V2 flat structure prefixes
  private readonly SCENARIOS_PREFIX = 'v2/scenarios';
  private readonly PROGRAMS_PREFIX = 'v2/programs';
  private readonly TASKS_PREFIX = 'v2/tasks';
  private readonly EVALUATIONS_PREFIX = 'v2/evaluations';
  private readonly COMPLETIONS_PREFIX = 'v2/completions';
  private readonly LOGS_PREFIX = 'v2/pbl-logs';
  
  // Indexes for efficient queries
  private readonly USER_INDEX_PREFIX = 'v2/indexes/users';
  private readonly SCENARIO_INDEX_PREFIX = 'v2/indexes/scenarios';

  constructor() {
    this.storage = new GCSStorageProvider(this.BUCKET_NAME, '');
  }

  // === Scenario Management ===
  
  /**
   * Save or update a scenario (usually from YAML import)
   */
  async saveScenario(scenario: Partial<Scenario> & { sourceFile: string; sourceId: string }): Promise<Scenario> {
    const now = new Date().toISOString();
    const fullScenario: Scenario = {
      id: scenario.id || uuidv4(),
      createdAt: scenario.createdAt || now,
      updatedAt: now,
      lastSyncedAt: now,
      programIds: scenario.programIds || [],
      ...scenario
    } as Scenario;
    
    const validated = validateScenario(fullScenario);
    const path = `${this.SCENARIOS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    return validated;
  }
  
  /**
   * Get a scenario by ID
   */
  async getScenario(scenarioId: string): Promise<Scenario | null> {
    try {
      const path = `${this.SCENARIOS_PREFIX}/${scenarioId}.json`;
      const data = await this.storage.get(path);
      return validateScenario(data);
    } catch (error) {
      console.error('Failed to get scenario:', error);
      return null;
    }
  }
  
  /**
   * Get all scenarios
   */
  async getAllScenarios(): Promise<Scenario[]> {
    try {
      const scenarios = await this.storage.list<Scenario>(`${this.SCENARIOS_PREFIX}/`);
      return scenarios.map(s => validateScenario(s));
    } catch (error) {
      console.error('Failed to get scenarios:', error);
      return [];
    }
  }
  
  /**
   * Find scenario by source info (for YAML sync)
   */
  async findScenarioBySource(sourceFile: string, sourceId: string): Promise<Scenario | null> {
    const scenarios = await this.getAllScenarios();
    return scenarios.find(s => s.sourceFile === sourceFile && s.sourceId === sourceId) || null;
  }

  // === Program Management ===
  
  /**
   * Create a new program (user starts a scenario)
   */
  async createProgram(userEmail: string, scenarioId: string, config?: Partial<Program['config']>): Promise<Program> {
    const scenario = await this.getScenario(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }
    
    const now = new Date().toISOString();
    const program: Program = {
      id: uuidv4(),
      userEmail,
      scenarioId,
      status: 'not_started',
      createdAt: now,
      updatedAt: now,
      timeSpentMinutes: 0,
      config: {
        language: 'en',
        adaptiveDifficulty: false,
        aiTutorEnabled: true,
        ...config
      },
      progress: {
        currentTaskIndex: 0,
        completedTasks: 0,
        totalTasks: 0 // Will be updated when tasks are created
      },
      taskIds: []
    };
    
    const validated = validateProgram(program);
    const path = `${this.PROGRAMS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    // Update scenario's program list
    scenario.programIds.push(validated.id);
    await this.saveScenario(scenario);
    
    // Update user index
    await this.updateUserProgramIndex(userEmail, validated.id);
    
    // Log event
    await this.logEvent({
      userEmail,
      programId: validated.id,
      eventType: 'program_started',
      eventData: { scenarioId }
    });
    
    return validated;
  }
  
  /**
   * Get a program by ID
   */
  async getProgram(programId: string): Promise<Program | null> {
    try {
      const path = `${this.PROGRAMS_PREFIX}/${programId}.json`;
      const data = await this.storage.get(path);
      return validateProgram(data);
    } catch (error) {
      console.error('Failed to get program:', error);
      return null;
    }
  }
  
  /**
   * Update program (progress, status, etc.)
   */
  async updateProgram(programId: string, updates: Partial<Program>): Promise<Program> {
    const existing = await this.getProgram(programId);
    if (!existing) {
      throw new Error(`Program ${programId} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    const validated = validateProgram(updated);
    const path = `${this.PROGRAMS_PREFIX}/${programId}.json`;
    await this.storage.set(path, validated);
    
    return validated;
  }
  
  /**
   * Get all programs for a user
   */
  async getUserPrograms(userEmail: string): Promise<Program[]> {
    try {
      const indexPath = `${this.USER_INDEX_PREFIX}/${userEmail}/programs.json`;
      const programIds = await this.storage.get<string[]>(indexPath) || [];
      
      const programs: Program[] = [];
      for (const id of programIds) {
        const program = await this.getProgram(id);
        if (program) {
          programs.push(program);
        }
      }
      
      return programs.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get user programs:', error);
      return [];
    }
  }

  // === Task Management ===
  
  /**
   * Create tasks for a program (from scenario tasks)
   */
  async createTasksForProgram(programId: string, sourceTasks: any[]): Promise<Task[]> {
    const program = await this.getProgram(programId);
    if (!program) {
      throw new Error(`Program ${programId} not found`);
    }
    
    const tasks: Task[] = [];
    const now = new Date().toISOString();
    
    for (const sourceTask of sourceTasks) {
      const task: Task = {
        id: uuidv4(),
        programId,
        scenarioId: program.scenarioId,
        userEmail: program.userEmail,
        sourceTask: {
          id: sourceTask.id,
          title: sourceTask.title || {},
          description: sourceTask.description || {},
          type: sourceTask.type || 'multiple_choice',
          difficulty: sourceTask.difficulty || 'intermediate',
          points: sourceTask.points || 10,
          expectedTimeMinutes: sourceTask.expectedTimeMinutes || 5
        },
        status: 'not_started',
        createdAt: now,
        updatedAt: now,
        timeSpentSeconds: 0,
        aiInteractions: []
      };
      
      const validated = validateTask(task);
      const path = `${this.TASKS_PREFIX}/${validated.id}.json`;
      await this.storage.set(path, validated);
      
      tasks.push(validated);
    }
    
    // Update program with task IDs and total count
    await this.updateProgram(programId, {
      taskIds: tasks.map(t => t.id),
      progress: {
        ...program.progress,
        totalTasks: tasks.length
      }
    });
    
    return tasks;
  }
  
  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    try {
      const path = `${this.TASKS_PREFIX}/${taskId}.json`;
      const data = await this.storage.get(path);
      return validateTask(data);
    } catch (error) {
      console.error('Failed to get task:', error);
      return null;
    }
  }
  
  /**
   * Update task (save response, update status, etc.)
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const existing = await this.getTask(taskId);
    if (!existing) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    const validated = validateTask(updated);
    const path = `${this.TASKS_PREFIX}/${taskId}.json`;
    await this.storage.set(path, validated);
    
    // Log response saved event if response was updated
    if (updates.response) {
      await this.logEvent({
        userEmail: existing.userEmail,
        programId: existing.programId,
        taskId: existing.id,
        eventType: 'response_saved',
        eventData: { responseType: updates.response.answer ? 'answer' : 'draft' }
      });
    }
    
    return validated;
  }
  
  /**
   * Get all tasks for a program
   */
  async getProgramTasks(programId: string): Promise<Task[]> {
    const program = await this.getProgram(programId);
    if (!program) {
      return [];
    }
    
    const tasks: Task[] = [];
    for (const taskId of program.taskIds) {
      const task = await this.getTask(taskId);
      if (task) {
        tasks.push(task);
      }
    }
    
    return tasks;
  }

  // === Evaluation Management ===
  
  /**
   * Create an evaluation for a task
   */
  async createEvaluation(
    taskId: string,
    evaluation: Omit<Evaluation, 'id' | 'createdAt' | 'updatedAt' | 'taskId' | 'programId' | 'userEmail'>
  ): Promise<Evaluation> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const now = new Date().toISOString();
    const fullEvaluation: Evaluation = {
      id: uuidv4(),
      taskId,
      programId: task.programId,
      userEmail: task.userEmail,
      createdAt: now,
      updatedAt: now,
      ...evaluation
    };
    
    const validated = validateEvaluation(fullEvaluation);
    const path = `${this.EVALUATIONS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    // Update task with evaluation ID
    await this.updateTask(taskId, { evaluationId: validated.id });
    
    // Log event
    await this.logEvent({
      userEmail: task.userEmail,
      programId: task.programId,
      taskId,
      eventType: 'evaluation_completed',
      eventData: { score: evaluation.score, passed: evaluation.passed }
    });
    
    return validated;
  }
  
  /**
   * Get an evaluation by ID
   */
  async getEvaluation(evaluationId: string): Promise<Evaluation | null> {
    try {
      const path = `${this.EVALUATIONS_PREFIX}/${evaluationId}.json`;
      const data = await this.storage.get(path);
      return validateEvaluation(data);
    } catch (error) {
      console.error('Failed to get evaluation:', error);
      return null;
    }
  }

  // === Completion Management ===
  
  /**
   * Create a completion record for a program
   */
  async createCompletion(programId: string): Promise<Completion> {
    const program = await this.getProgram(programId);
    if (!program || !program.results) {
      throw new Error(`Program ${programId} not found or not completed`);
    }
    
    const tasks = await this.getProgramTasks(programId);
    const evaluations = await Promise.all(
      tasks
        .filter(t => t.evaluationId)
        .map(t => this.getEvaluation(t.evaluationId!))
    );
    
    // Calculate detailed results
    const domainMastery = this.calculateDomainMastery(tasks, evaluations.filter(e => e !== null) as Evaluation[]);
    const ksaAchievement = this.calculateKSAAchievement(evaluations.filter(e => e !== null) as Evaluation[]);
    
    const now = new Date().toISOString();
    const completion: Completion = {
      id: uuidv4(),
      programId,
      scenarioId: program.scenarioId,
      userEmail: program.userEmail,
      createdAt: now,
      updatedAt: now,
      completedAt: program.completedAt || now,
      totalTimeMinutes: program.timeSpentMinutes,
      tasksCompleted: program.progress.completedTasks,
      tasksTotal: program.progress.totalTasks,
      overallScore: program.results.overallScore,
      performance: program.results.performance,
      domainMastery,
      ksaAchievement,
      summary: {}, // Will be populated by AI
      recommendations: {} // Will be populated by AI
    };
    
    // Generate certificate if passed
    if (program.results.overallScore >= 70) {
      completion.certificate = {
        id: uuidv4(),
        issuedAt: now,
        verificationCode: this.generateVerificationCode(),
        shareableUrl: `https://ai-square.com/certificates/${completion.id}`
      };
      
      await this.logEvent({
        userEmail: program.userEmail,
        programId,
        eventType: 'certificate_issued',
        eventData: { certificateId: completion.certificate.id }
      });
    }
    
    const validated = validateCompletion(completion);
    const path = `${this.COMPLETIONS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    return validated;
  }
  
  /**
   * Get a completion by ID
   */
  async getCompletion(completionId: string): Promise<Completion | null> {
    try {
      const path = `${this.COMPLETIONS_PREFIX}/${completionId}.json`;
      const data = await this.storage.get(path);
      return validateCompletion(data);
    } catch (error) {
      console.error('Failed to get completion:', error);
      return null;
    }
  }
  
  /**
   * Get all completions for a user
   */
  async getUserCompletions(userEmail: string): Promise<Completion[]> {
    try {
      const programs = await this.getUserPrograms(userEmail);
      const completedPrograms = programs.filter(p => p.status === 'completed');
      
      const completions: Completion[] = [];
      for (const program of completedPrograms) {
        const completion = await this.storage.list<Completion>(
          `${this.COMPLETIONS_PREFIX}/`,
          (c: Completion) => c.programId === program.id
        );
        if (completion.length > 0) {
          completions.push(...completion);
        }
      }
      
      return completions.sort((a, b) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get user completions:', error);
      return [];
    }
  }

  // === Logging ===
  
  /**
   * Log a PBL event
   */
  async logEvent(event: Omit<PBLLog, 'id' | 'timestamp'>): Promise<void> {
    const log: PBLLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...event
    };
    
    const validated = validatePBLLog(log);
    const path = `${this.LOGS_PREFIX}/${validated.userEmail}/${validated.timestamp.replace(/:/g, '-')}-${validated.id}.json`;
    await this.storage.set(path, validated);
  }

  // === Helper Methods ===
  
  /**
   * Update user's program index
   */
  private async updateUserProgramIndex(userEmail: string, programId: string): Promise<void> {
    const indexPath = `${this.USER_INDEX_PREFIX}/${userEmail}/programs.json`;
    let programIds: string[] = [];
    
    try {
      programIds = await this.storage.get<string[]>(indexPath) || [];
    } catch {
      // Index doesn't exist yet
    }
    
    if (!programIds.includes(programId)) {
      programIds.push(programId);
      await this.storage.set(indexPath, programIds);
    }
  }
  
  /**
   * Calculate domain mastery from tasks and evaluations
   */
  private calculateDomainMastery(tasks: Task[], evaluations: Evaluation[]): Completion['domainMastery'] {
    // Group evaluations by domain
    const domainScores: Record<string, { total: number; count: number; competencies: Record<string, boolean> }> = {};
    
    // This is a simplified implementation - in production, you'd map tasks to domains
    // and calculate scores based on evaluation criteria
    return [];
  }
  
  /**
   * Calculate KSA achievement from evaluations
   */
  private calculateKSAAchievement(evaluations: Evaluation[]): Completion['ksaAchievement'] {
    const ksaItems: Record<'knowledge' | 'skills' | 'attitudes', Set<string>> = {
      knowledge: new Set(),
      skills: new Set(),
      attitudes: new Set()
    };
    
    for (const evaluation of evaluations) {
      if (evaluation.passed) {
        evaluation.ksaDemonstrated.knowledge.forEach(k => ksaItems.knowledge.add(k));
        evaluation.ksaDemonstrated.skills.forEach(s => ksaItems.skills.add(s));
        evaluation.ksaDemonstrated.attitudes.forEach(a => ksaItems.attitudes.add(a));
      }
    }
    
    return {
      knowledge: {
        score: ksaItems.knowledge.size > 0 ? 80 : 0, // Simplified scoring
        items: Array.from(ksaItems.knowledge).map(code => ({
          code,
          name: code, // Would be resolved from KSA data
          demonstrated: true
        }))
      },
      skills: {
        score: ksaItems.skills.size > 0 ? 80 : 0,
        items: Array.from(ksaItems.skills).map(code => ({
          code,
          name: code,
          demonstrated: true
        }))
      },
      attitudes: {
        score: ksaItems.attitudes.size > 0 ? 80 : 0,
        items: Array.from(ksaItems.attitudes).map(code => ({
          code,
          name: code,
          demonstrated: true
        }))
      }
    };
  }
  
  /**
   * Generate a verification code for certificates
   */
  private generateVerificationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}