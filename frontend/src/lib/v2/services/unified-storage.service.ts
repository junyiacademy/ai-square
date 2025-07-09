/**
 * Unified Storage Service V2
 * Implements the unified architecture for all learning modes
 */

import { GCSStorageProvider } from '@/lib/core/storage/providers/gcs-storage.provider';
import { v4 as uuidv4 } from 'uuid';
import {
  LearningProject,
  Scenario,
  Program,
  Task,
  Log,
  Evaluation,
  learningProjectSchema,
  scenarioSchema,
  programSchema,
  taskSchema,
  logSchema,
  evaluationSchema
} from '../schemas/unified.schema';

// Cache entry type
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class UnifiedStorageService {
  private storage: GCSStorageProvider;
  private readonly BUCKET_NAME = 'ai-square-db';
  
  // Flat structure prefixes (統一的，不分 mode)
  private readonly PROJECTS_PREFIX = 'projects';
  private readonly SCENARIOS_PREFIX = 'scenarios';
  private readonly PROGRAMS_PREFIX = 'programs';
  private readonly TASKS_PREFIX = 'tasks';
  private readonly LOGS_PREFIX = 'logs';
  private readonly EVALUATIONS_PREFIX = 'evaluations';
  
  // Indexes
  private readonly USER_INDEX_PREFIX = 'indexes/users';
  private readonly PROJECT_INDEX_PREFIX = 'indexes/projects';
  
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

  // === Project Management ===
  
  async createProject(project: Omit<LearningProject, 'id' | 'created_at' | 'updated_at'>): Promise<LearningProject> {
    const now = new Date().toISOString();
    const fullProject: LearningProject = {
      id: uuidv4(),
      created_at: now,
      updated_at: now,
      ...project
    };
    
    const validated = learningProjectSchema.parse(fullProject);
    const path = `${this.PROJECTS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    return validated;
  }
  
  async getProject(projectId: string): Promise<LearningProject | null> {
    const cacheKey = `project:${projectId}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const path = `${this.PROJECTS_PREFIX}/${projectId}.json`;
        const data = await this.storage.get(path);
        return learningProjectSchema.parse(data);
      } catch (error) {
        console.error('Failed to get project:', error);
        return null;
      }
    });
  }
  
  async getProjectByCode(code: string): Promise<LearningProject | null> {
    // In real implementation, this would use an index
    const allProjects = await this.getAllProjects();
    return allProjects.find(p => p.code === code) || null;
  }
  
  async getAllProjects(type?: LearningProject['type']): Promise<LearningProject[]> {
    const cacheKey = type ? `projects:${type}` : 'projects:all';
    
    return this.getCached(cacheKey, async () => {
      try {
        const projects = await this.storage.list<LearningProject>(`${this.PROJECTS_PREFIX}/`);
        const validProjects = projects.map(p => learningProjectSchema.parse(p));
        
        if (type) {
          return validProjects.filter(p => p.type === type);
        }
        
        return validProjects;
      } catch (error) {
        console.error('Failed to get projects:', error);
        return [];
      }
    });
  }

  // === Scenario Management ===
  
  async createScenario(
    userEmail: string,
    projectId: string,
    metadata?: Record<string, any>
  ): Promise<Scenario> {
    // For assessment mode, projectId is the assessmentId from YAML
    // We don't check if project exists in GCS
    
    // Check if user already has an active scenario for this project
    const existingScenarios = await this.getUserScenariosForProject(userEmail, projectId);
    const activeScenario = existingScenarios.find(s => 
      s.status === 'active' || s.status === 'paused'
    );
    
    if (activeScenario) {
      return activeScenario;
    }
    
    const now = new Date().toISOString();
    const scenario: Scenario = {
      id: uuidv4(),
      user_email: userEmail,
      project_id: projectId,
      type: metadata?.type || 'assessment', // Get type from metadata
      title: metadata?.title || `Session - ${new Date().toLocaleDateString()}`,
      status: 'created',
      metadata: metadata || {},
      created_at: now,
      updated_at: now
    };
    
    const validated = scenarioSchema.parse(scenario);
    const path = `${this.SCENARIOS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    // Update user index
    await this.updateUserScenarioIndex(userEmail, validated.id);
    
    // Update project index
    await this.updateProjectScenarioIndex(projectId, validated.id);
    
    this.invalidateCache(`user:${userEmail}`);
    this.invalidateCache(`project:${projectId}`);
    
    return validated;
  }
  
  async getScenario(scenarioId: string): Promise<Scenario | null> {
    const cacheKey = `scenario:${scenarioId}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const path = `${this.SCENARIOS_PREFIX}/${scenarioId}.json`;
        const data = await this.storage.get(path);
        return scenarioSchema.parse(data);
      } catch (error) {
        console.error('Failed to get scenario:', error);
        return null;
      }
    });
  }
  
  async updateScenario(scenarioId: string, updates: Partial<Scenario>): Promise<Scenario> {
    const existing = await this.getScenario(scenarioId);
    if (!existing) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Don't allow changing these fields
    delete (updated as any).id;
    delete (updated as any).user_email;
    delete (updated as any).project_id;
    delete (updated as any).type;
    delete (updated as any).created_at;
    
    const validated = scenarioSchema.parse(updated);
    const path = `${this.SCENARIOS_PREFIX}/${scenarioId}.json`;
    await this.storage.set(path, validated);
    
    this.invalidateCache(`scenario:${scenarioId}`);
    this.invalidateCache(`user:${existing.user_email}`);
    
    return validated;
  }
  
  async getUserScenarios(userEmail: string): Promise<Scenario[]> {
    const cacheKey = `user:${userEmail}:scenarios`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const indexPath = `${this.USER_INDEX_PREFIX}/${userEmail}/scenarios.json`;
        const scenarioIds = await this.storage.get<string[]>(indexPath) || [];
        
        const scenarios = await Promise.all(
          scenarioIds.map(id => this.getScenario(id))
        );
        
        return scenarios
          .filter((s): s is Scenario => s !== null)
          .sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
      } catch (error) {
        console.error('Failed to get user scenarios:', error);
        return [];
      }
    });
  }
  
  async getUserScenariosForProject(userEmail: string, projectId: string): Promise<Scenario[]> {
    const allScenarios = await this.getUserScenarios(userEmail);
    return allScenarios.filter(s => s.project_id === projectId);
  }

  // === Program Management ===
  
  async createProgram(
    scenarioId: string,
    title: string,
    order: number,
    config?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<Program> {
    const scenario = await this.getScenario(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }
    
    const now = new Date().toISOString();
    const program: Program = {
      id: uuidv4(),
      scenario_id: scenarioId,
      title,
      program_order: order,
      status: 'pending',
      config: config || {},
      metadata: metadata || {},
      created_at: now,
      updated_at: now
    };
    
    const validated = programSchema.parse(program);
    const path = `${this.PROGRAMS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    this.invalidateCache(`scenario:${scenarioId}`);
    
    return validated;
  }
  
  async getProgram(programId: string): Promise<Program | null> {
    try {
      const path = `${this.PROGRAMS_PREFIX}/${programId}.json`;
      const data = await this.storage.get(path);
      return programSchema.parse(data);
    } catch (error) {
      console.error('Failed to get program:', error);
      return null;
    }
  }
  
  async getScenarioPrograms(scenarioId: string): Promise<Program[]> {
    try {
      const programs = await this.storage.list<Program>(
        `${this.PROGRAMS_PREFIX}/`,
        (p: Program) => p.scenario_id === scenarioId
      );
      
      return programs
        .map(p => programSchema.parse(p))
        .sort((a, b) => a.program_order - b.program_order);
    } catch (error) {
      console.error('Failed to get scenario programs:', error);
      return [];
    }
  }
  
  async updateProgram(programId: string, updates: Partial<Program>): Promise<Program> {
    const existing = await this.getProgram(programId);
    if (!existing) {
      throw new Error(`Program ${programId} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const validated = programSchema.parse(updated);
    const path = `${this.PROGRAMS_PREFIX}/${programId}.json`;
    await this.storage.set(path, validated);
    
    return validated;
  }

  // === Task Management ===
  
  async createTask(
    programId: string,
    title: string,
    order: number,
    type: Task['type'],
    config?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<Task> {
    const program = await this.getProgram(programId);
    if (!program) {
      throw new Error(`Program ${programId} not found`);
    }
    
    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      program_id: programId,
      title,
      task_order: order,
      type,
      required_ksa: [],
      config: config || {},
      metadata: metadata || {},
      status: 'pending',
      created_at: now,
      updated_at: now
    };
    
    const validated = taskSchema.parse(task);
    const path = `${this.TASKS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    return validated;
  }
  
  async getTask(taskId: string): Promise<Task | null> {
    try {
      const path = `${this.TASKS_PREFIX}/${taskId}.json`;
      const data = await this.storage.get(path);
      return taskSchema.parse(data);
    } catch (error) {
      console.error('Failed to get task:', error);
      return null;
    }
  }
  
  async getProgramTasks(programId: string): Promise<Task[]> {
    try {
      const tasks = await this.storage.list<Task>(
        `${this.TASKS_PREFIX}/`,
        (t: Task) => t.program_id === programId
      );
      
      return tasks
        .map(t => taskSchema.parse(t))
        .sort((a, b) => a.task_order - b.task_order);
    } catch (error) {
      console.error('Failed to get program tasks:', error);
      return [];
    }
  }
  
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const existing = await this.getTask(taskId);
    if (!existing) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const validated = taskSchema.parse(updated);
    const path = `${this.TASKS_PREFIX}/${taskId}.json`;
    await this.storage.set(path, validated);
    
    return validated;
  }
  
  // === Task with embedded logs (for Assessment) ===
  
  async updateTaskWithLog(
    taskId: string,
    updates: Partial<Task>,
    logEntry?: any
  ): Promise<Task> {
    const existing = await this.getTask(taskId);
    if (!existing) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // If log entry provided, add to metadata
    if (logEntry) {
      const logs = existing.metadata.logs || [];
      logs.push({
        ...logEntry,
        timestamp: new Date().toISOString()
      });
      
      updates.metadata = {
        ...existing.metadata,
        ...updates.metadata,
        logs
      };
    }
    
    return this.updateTask(taskId, updates);
  }

  // === Log Management (when not embedded) ===
  
  async createLog(
    scenarioId: string,
    userEmail: string,
    logType: Log['log_type'],
    activity: string,
    data: Record<string, any>,
    programId?: string,
    taskId?: string
  ): Promise<Log> {
    const now = new Date().toISOString();
    const log: Log = {
      id: uuidv4(),
      scenario_id: scenarioId,
      program_id: programId,
      task_id: taskId,
      user_email: userEmail,
      log_type: logType,
      activity,
      data,
      created_at: now,
      updated_at: now
    };
    
    const validated = logSchema.parse(log);
    const path = `${this.LOGS_PREFIX}/${validated.id}.json`;
    await this.storage.set(path, validated);
    
    return validated;
  }

  // === Helper Methods ===
  
  private async updateUserScenarioIndex(userEmail: string, scenarioId: string): Promise<void> {
    const indexPath = `${this.USER_INDEX_PREFIX}/${userEmail}/scenarios.json`;
    let scenarioIds: string[] = [];
    
    try {
      scenarioIds = await this.storage.get<string[]>(indexPath) || [];
    } catch {
      // Index doesn't exist yet
    }
    
    if (!scenarioIds.includes(scenarioId)) {
      scenarioIds.push(scenarioId);
      await this.storage.set(indexPath, scenarioIds);
    }
  }
  
  private async updateProjectScenarioIndex(projectId: string, scenarioId: string): Promise<void> {
    const indexPath = `${this.PROJECT_INDEX_PREFIX}/${projectId}/scenarios.json`;
    let scenarioIds: string[] = [];
    
    try {
      scenarioIds = await this.storage.get<string[]>(indexPath) || [];
    } catch {
      // Index doesn't exist yet
    }
    
    if (!scenarioIds.includes(scenarioId)) {
      scenarioIds.push(scenarioId);
      await this.storage.set(indexPath, scenarioIds);
    }
  }
}