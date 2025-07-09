/**
 * Assessment Storage Service V2
 * Implements the unified architecture with optimizations for GCS
 */

import { GCSStorageProvider } from '@/lib/core/storage/providers/gcs-storage.provider';
import { v4 as uuidv4 } from 'uuid';
import {
  AssessmentScenario,
  AssessmentProgram,
  AssessmentTask,
  AssessmentEvaluation,
  AssessmentCompletion,
  validateAssessmentScenario,
  validateAssessmentProgram,
  validateAssessmentTask,
  validateAssessmentEvaluation,
  validateAssessmentCompletion
} from '../schemas/assessment-v2.schema';

// Cache entry type
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class AssessmentStorageV2Service {
  private storage: GCSStorageProvider;
  private readonly BUCKET_NAME = 'ai-square-db';
  
  // V2 flat structure prefixes
  private readonly SCENARIOS_PREFIX = 'v2/assessment-scenarios';
  private readonly PROGRAMS_PREFIX = 'v2/assessment-programs';
  private readonly TASKS_PREFIX = 'v2/assessment-tasks';
  private readonly EVALUATIONS_PREFIX = 'v2/assessment-evaluations';
  private readonly COMPLETIONS_PREFIX = 'v2/assessment-completions';
  
  // Indexes for efficient queries
  private readonly USER_INDEX_PREFIX = 'v2/indexes/assessment-users';
  private readonly SCENARIO_INDEX_PREFIX = 'v2/indexes/assessment-scenarios';
  
  // Simple memory cache
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.storage = new GCSStorageProvider(this.BUCKET_NAME, '');
  }

  // === Cache Management ===
  
  private async getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    
    const data = await fetcher();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }
  
  private invalidateCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // === Scenario Management ===
  
  /**
   * Save or update an assessment scenario (from YAML import)
   */
  async saveScenario(scenario: Partial<AssessmentScenario> & { 
    sourceFile: string; 
    sourceId: string;
  }): Promise<AssessmentScenario> {
    const now = new Date().toISOString();
    const fullScenario: AssessmentScenario = {
      id: scenario.id || uuidv4(),
      type: 'assessment',
      createdAt: scenario.createdAt || now,
      updatedAt: now,
      lastSyncedAt: now,
      programIds: scenario.programIds || [],
      stats: scenario.stats || {
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0
      },
      ...scenario
    } as AssessmentScenario;
    
    const validated = validateAssessmentScenario(fullScenario);
    const path = `${this.SCENARIOS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    this.invalidateCache(`scenario:${validated.id}`);
    return validated;
  }
  
  /**
   * Get a scenario by ID with caching
   */
  async getScenario(scenarioId: string): Promise<AssessmentScenario | null> {
    const cacheKey = `scenario:${scenarioId}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const path = `${this.SCENARIOS_PREFIX}/${scenarioId}.json`;
        const data = await this.storage.get(path);
        return validateAssessmentScenario(data);
      } catch (error) {
        console.error('Failed to get scenario:', error);
        return null;
      }
    });
  }
  
  /**
   * Find scenario by source info (for YAML sync)
   */
  async findScenarioBySource(sourceFile: string, sourceId: string): Promise<AssessmentScenario | null> {
    const scenarios = await this.getAllScenarios();
    return scenarios.find(s => s.sourceFile === sourceFile && s.sourceId === sourceId) || null;
  }
  
  /**
   * Get all scenarios with basic caching
   */
  async getAllScenarios(): Promise<AssessmentScenario[]> {
    return this.getCached('all-scenarios', async () => {
      try {
        const scenarios = await this.storage.list<AssessmentScenario>(`${this.SCENARIOS_PREFIX}/`);
        return scenarios.map(s => validateAssessmentScenario(s));
      } catch (error) {
        console.error('Failed to get scenarios:', error);
        return [];
      }
    });
  }

  // === Program Management ===
  
  /**
   * Create a new assessment program (user starts an assessment)
   */
  async createProgram(
    userEmail: string, 
    scenarioId: string,
    config?: Partial<AssessmentProgram['config']>
  ): Promise<AssessmentProgram> {
    const scenario = await this.getScenario(scenarioId);
    if (!scenario) {
      throw new Error(`Assessment scenario ${scenarioId} not found`);
    }
    
    const now = new Date().toISOString();
    const program: AssessmentProgram = {
      id: uuidv4(),
      userEmail,
      scenarioId,
      type: 'assessment',
      status: 'not_started',
      createdAt: now,
      updatedAt: now,
      timeSpentMinutes: 0,
      config: {
        language: 'en',
        randomizeQuestions: true,
        showFeedback: true,
        allowReview: true,
        ...config
      },
      progress: {
        currentQuestionIndex: 0,
        answeredQuestions: 0,
        totalQuestions: scenario.totalQuestions
      },
      taskIds: []
    };
    
    const validated = validateAssessmentProgram(program);
    const path = `${this.PROGRAMS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    // Update scenario stats
    scenario.programIds.push(validated.id);
    scenario.stats = {
      ...scenario.stats,
      totalAttempts: (scenario.stats?.totalAttempts || 0) + 1,
      lastActivityAt: now
    };
    await this.saveScenario(scenario);
    
    // Update user index
    await this.updateUserProgramIndex(userEmail, validated.id);
    
    this.invalidateCache(`user:${userEmail}`);
    this.invalidateCache(`scenario:${scenarioId}`);
    
    return validated;
  }
  
  /**
   * Get a program by ID
   */
  async getProgram(programId: string): Promise<AssessmentProgram | null> {
    const cacheKey = `program:${programId}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const path = `${this.PROGRAMS_PREFIX}/${programId}.json`;
        const data = await this.storage.get(path);
        return validateAssessmentProgram(data);
      } catch (error) {
        console.error('Failed to get program:', error);
        return null;
      }
    });
  }
  
  /**
   * Update program
   */
  async updateProgram(programId: string, updates: Partial<AssessmentProgram>): Promise<AssessmentProgram> {
    const existing = await this.getProgram(programId);
    if (!existing) {
      throw new Error(`Program ${programId} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    const validated = validateAssessmentProgram(updated);
    const path = `${this.PROGRAMS_PREFIX}/${programId}.json`;
    await this.storage.set(path, validated);
    
    this.invalidateCache(`program:${programId}`);
    this.invalidateCache(`user:${existing.userEmail}`);
    
    return validated;
  }
  
  /**
   * Get all programs for a user with batch loading
   */
  async getUserPrograms(userEmail: string): Promise<AssessmentProgram[]> {
    const cacheKey = `user:${userEmail}:programs`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const indexPath = `${this.USER_INDEX_PREFIX}/${userEmail}/programs.json`;
        const programIds = await this.storage.get<string[]>(indexPath) || [];
        
        // Batch load programs
        const programs = await Promise.all(
          programIds.map(id => this.getProgram(id))
        );
        
        return programs
          .filter((p): p is AssessmentProgram => p !== null)
          .sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      } catch (error) {
        console.error('Failed to get user programs:', error);
        return [];
      }
    });
  }

  // === Task Management ===
  
  /**
   * Create tasks for a program from question pool
   */
  async createTasksForProgram(
    programId: string, 
    questions: any[]
  ): Promise<AssessmentTask[]> {
    const program = await this.getProgram(programId);
    if (!program) {
      throw new Error(`Program ${programId} not found`);
    }
    
    const tasks: AssessmentTask[] = [];
    const now = new Date().toISOString();
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const task: AssessmentTask = {
        id: uuidv4(),
        programId,
        scenarioId: program.scenarioId,
        userEmail: program.userEmail,
        type: 'assessment',
        sourceQuestion: {
          id: question.id,
          domain: question.domain,
          difficulty: question.difficulty || 'intermediate',
          type: question.type || 'multiple_choice',
          question: question.question || {},
          options: question.options || {},
          correctAnswer: question.correctAnswer || '',
          explanation: question.explanation || {},
          ksaMapping: question.ksaMapping || { knowledge: [], skills: [], attitudes: [] },
          points: question.points || 1
        },
        status: 'not_started',
        createdAt: now,
        updatedAt: now,
        timeSpentSeconds: 0,
        answerHistory: [],
        aiInteractions: []
      };
      
      const validated = validateAssessmentTask(task);
      const path = `${this.TASKS_PREFIX}/${validated.id}.json`;
      await this.storage.set(path, validated);
      
      tasks.push(validated);
    }
    
    // Update program with task IDs
    await this.updateProgram(programId, {
      taskIds: tasks.map(t => t.id),
      progress: {
        ...program.progress,
        totalQuestions: tasks.length
      }
    });
    
    return tasks;
  }
  
  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<AssessmentTask | null> {
    try {
      const path = `${this.TASKS_PREFIX}/${taskId}.json`;
      const data = await this.storage.get(path);
      return validateAssessmentTask(data);
    } catch (error) {
      console.error('Failed to get task:', error);
      return null;
    }
  }
  
  /**
   * Update task (save answer, add to history)
   */
  async updateTask(taskId: string, updates: Partial<AssessmentTask>): Promise<AssessmentTask> {
    const existing = await this.getTask(taskId);
    if (!existing) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    const validated = validateAssessmentTask(updated);
    const path = `${this.TASKS_PREFIX}/${taskId}.json`;
    await this.storage.set(path, validated);
    
    this.invalidateCache(`program:${existing.programId}`);
    
    return validated;
  }
  
  /**
   * Add answer to task history
   */
  async addAnswerToHistory(
    taskId: string, 
    action: 'view' | 'answer' | 'change' | 'submit' | 'skip',
    answer?: any
  ): Promise<AssessmentTask> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const lastAction = task.answerHistory[task.answerHistory.length - 1];
    const lastTimestamp = lastAction ? new Date(lastAction.timestamp).getTime() : new Date(task.startedAt || task.createdAt).getTime();
    const now = Date.now();
    const timeSpent = Math.floor((now - lastTimestamp) / 1000);
    
    const newHistory = [...task.answerHistory, {
      timestamp: new Date().toISOString(),
      action,
      answer,
      timeSpent
    }];
    
    const updates: Partial<AssessmentTask> = {
      answerHistory: newHistory,
      timeSpentSeconds: task.timeSpentSeconds + timeSpent
    };
    
    if (action === 'submit' && answer !== undefined) {
      updates.finalAnswer = answer;
      updates.status = 'completed';
      updates.completedAt = new Date().toISOString();
    }
    
    if (!task.startedAt && action !== 'view') {
      updates.startedAt = new Date().toISOString();
      updates.status = 'in_progress';
    }
    
    return this.updateTask(taskId, updates);
  }
  
  /**
   * Get all tasks for a program with batch loading
   */
  async getProgramTasks(programId: string): Promise<AssessmentTask[]> {
    const program = await this.getProgram(programId);
    if (!program) {
      return [];
    }
    
    // Batch load all tasks
    const tasks = await Promise.all(
      program.taskIds.map(id => this.getTask(id))
    );
    
    return tasks.filter((t): t is AssessmentTask => t !== null);
  }
  
  /**
   * Get program with all details (optimized batch loading)
   */
  async getProgramWithDetails(programId: string): Promise<{
    program: AssessmentProgram | null;
    scenario: AssessmentScenario | null;
    tasks: AssessmentTask[];
    evaluations: AssessmentEvaluation[];
  }> {
    const program = await this.getProgram(programId);
    if (!program) {
      return { program: null, scenario: null, tasks: [], evaluations: [] };
    }
    
    // Batch load related data
    const [scenario, tasks] = await Promise.all([
      this.getScenario(program.scenarioId),
      this.getProgramTasks(programId)
    ]);
    
    // Load evaluations for completed tasks
    const evaluationIds = tasks
      .filter(t => t.evaluationId)
      .map(t => t.evaluationId!);
    
    const evaluations = await Promise.all(
      evaluationIds.map(id => this.getEvaluation(id))
    );
    
    return {
      program,
      scenario,
      tasks,
      evaluations: evaluations.filter((e): e is AssessmentEvaluation => e !== null)
    };
  }

  // === Evaluation Management ===
  
  /**
   * Create an evaluation for a task
   */
  async createEvaluation(
    taskId: string,
    isCorrect: boolean,
    score: number
  ): Promise<AssessmentEvaluation> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const now = new Date().toISOString();
    const evaluation: AssessmentEvaluation = {
      id: uuidv4(),
      taskId,
      programId: task.programId,
      userEmail: task.userEmail,
      createdAt: now,
      updatedAt: now,
      score,
      isCorrect,
      ksaDemonstrated: {
        knowledge: isCorrect ? task.sourceQuestion.ksaMapping.knowledge : [],
        skills: isCorrect ? task.sourceQuestion.ksaMapping.skills : [],
        attitudes: isCorrect ? task.sourceQuestion.ksaMapping.attitudes : []
      },
      feedback: {}, // Would be populated with multi-language feedback
      evaluatedBy: 'system'
    };
    
    const validated = validateAssessmentEvaluation(evaluation);
    const path = `${this.EVALUATIONS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    // Update task with evaluation
    await this.updateTask(taskId, {
      evaluationId: validated.id,
      isCorrect,
      score
    });
    
    return validated;
  }
  
  /**
   * Get an evaluation by ID
   */
  async getEvaluation(evaluationId: string): Promise<AssessmentEvaluation | null> {
    try {
      const path = `${this.EVALUATIONS_PREFIX}/${evaluationId}.json`;
      const data = await this.storage.get(path);
      return validateAssessmentEvaluation(data);
    } catch (error) {
      console.error('Failed to get evaluation:', error);
      return null;
    }
  }

  // === Completion Management ===
  
  /**
   * Create a completion record for a program
   */
  async createCompletion(programId: string): Promise<AssessmentCompletion> {
    const { program, scenario, tasks, evaluations } = await this.getProgramWithDetails(programId);
    
    if (!program || !program.results) {
      throw new Error(`Program ${programId} not found or not completed`);
    }
    
    if (!scenario) {
      throw new Error(`Scenario not found for program ${programId}`);
    }
    
    // Calculate domain mastery
    const domainMastery = this.calculateDomainMastery(tasks, evaluations);
    
    // Calculate KSA achievement
    const ksaAchievement = this.calculateKSAAchievement(tasks, evaluations);
    
    const now = new Date().toISOString();
    const completion: AssessmentCompletion = {
      id: uuidv4(),
      programId,
      scenarioId: program.scenarioId,
      userEmail: program.userEmail,
      createdAt: now,
      updatedAt: now,
      completedAt: program.completedAt || now,
      totalTimeMinutes: program.timeSpentMinutes,
      questionsAnswered: program.progress.answeredQuestions,
      questionsTotal: program.progress.totalQuestions,
      overallScore: program.results.overallScore,
      passed: program.results.passed,
      performance: program.results.performance,
      domainMastery,
      ksaAchievement,
      summary: {}, // Would be populated by AI
      recommendations: {} // Would be populated by AI
    };
    
    // Generate certificate if passed
    if (program.results.passed && scenario.passingScore <= program.results.overallScore) {
      completion.certificate = {
        id: uuidv4(),
        issuedAt: now,
        verificationCode: this.generateVerificationCode(),
        shareableUrl: `https://ai-square.com/certificates/${completion.id}`
      };
    }
    
    const validated = validateAssessmentCompletion(completion);
    const path = `${this.COMPLETIONS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    // Update scenario stats
    const completions = await this.getScenarioCompletions(scenario.id);
    const passedCount = completions.filter(c => c.passed).length;
    const averageScore = completions.reduce((sum, c) => sum + c.overallScore, 0) / completions.length;
    
    await this.saveScenario({
      ...scenario,
      stats: {
        ...scenario.stats,
        averageScore,
        passRate: (passedCount / completions.length) * 100
      }
    });
    
    return validated;
  }
  
  /**
   * Get all completions for a scenario
   */
  async getScenarioCompletions(scenarioId: string): Promise<AssessmentCompletion[]> {
    try {
      const completions = await this.storage.list<AssessmentCompletion>(
        `${this.COMPLETIONS_PREFIX}/`,
        (c: AssessmentCompletion) => c.scenarioId === scenarioId
      );
      return completions.map(c => validateAssessmentCompletion(c));
    } catch (error) {
      console.error('Failed to get scenario completions:', error);
      return [];
    }
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
  private calculateDomainMastery(
    tasks: AssessmentTask[], 
    evaluations: AssessmentEvaluation[]
  ): AssessmentCompletion['domainMastery'] {
    const domainStats: Record<string, {
      correct: number;
      total: number;
      competencies: Set<string>;
    }> = {};
    
    for (const task of tasks) {
      const domain = task.sourceQuestion.domain;
      if (!domainStats[domain]) {
        domainStats[domain] = { correct: 0, total: 0, competencies: new Set() };
      }
      
      domainStats[domain].total++;
      
      const evaluation = evaluations.find(e => e.taskId === task.id);
      if (evaluation?.isCorrect) {
        domainStats[domain].correct++;
        // Add competencies from task
        task.sourceQuestion.ksaMapping.knowledge.forEach(k => domainStats[domain].competencies.add(k));
        task.sourceQuestion.ksaMapping.skills.forEach(s => domainStats[domain].competencies.add(s));
        task.sourceQuestion.ksaMapping.attitudes.forEach(a => domainStats[domain].competencies.add(a));
      }
    }
    
    return Object.entries(domainStats).map(([domain, stats]) => ({
      domain,
      score: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      questionsCorrect: stats.correct,
      questionsTotal: stats.total,
      competencies: Array.from(stats.competencies).map(code => ({
        code,
        demonstrated: true
      }))
    }));
  }
  
  /**
   * Calculate KSA achievement from tasks and evaluations
   */
  private calculateKSAAchievement(
    tasks: AssessmentTask[],
    evaluations: AssessmentEvaluation[]
  ): AssessmentCompletion['ksaAchievement'] {
    const ksaItems: Record<'knowledge' | 'skills' | 'attitudes', Map<string, Set<string>>> = {
      knowledge: new Map(),
      skills: new Map(),
      attitudes: new Map()
    };
    
    for (const evaluation of evaluations) {
      if (evaluation.isCorrect) {
        const task = tasks.find(t => t.id === evaluation.taskId);
        if (!task) continue;
        
        // Knowledge items
        evaluation.ksaDemonstrated.knowledge.forEach(k => {
          if (!ksaItems.knowledge.has(k)) {
            ksaItems.knowledge.set(k, new Set());
          }
          ksaItems.knowledge.get(k)!.add(task.sourceQuestion.id);
        });
        
        // Skills items
        evaluation.ksaDemonstrated.skills.forEach(s => {
          if (!ksaItems.skills.has(s)) {
            ksaItems.skills.set(s, new Set());
          }
          ksaItems.skills.get(s)!.add(task.sourceQuestion.id);
        });
        
        // Attitudes items
        evaluation.ksaDemonstrated.attitudes.forEach(a => {
          if (!ksaItems.attitudes.has(a)) {
            ksaItems.attitudes.set(a, new Set());
          }
          ksaItems.attitudes.get(a)!.add(task.sourceQuestion.id);
        });
      }
    }
    
    return {
      knowledge: {
        score: ksaItems.knowledge.size > 0 ? 80 : 0, // Simplified scoring
        items: Array.from(ksaItems.knowledge.entries()).map(([code, questions]) => ({
          code,
          name: code, // Would be resolved from KSA data
          demonstrated: true,
          questions: Array.from(questions)
        }))
      },
      skills: {
        score: ksaItems.skills.size > 0 ? 80 : 0,
        items: Array.from(ksaItems.skills.entries()).map(([code, questions]) => ({
          code,
          name: code,
          demonstrated: true,
          questions: Array.from(questions)
        }))
      },
      attitudes: {
        score: ksaItems.attitudes.size > 0 ? 80 : 0,
        items: Array.from(ksaItems.attitudes.entries()).map(([code, questions]) => ({
          code,
          name: code,
          demonstrated: true,
          questions: Array.from(questions)
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