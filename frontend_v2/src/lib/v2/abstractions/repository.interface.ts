/**
 * Repository Interfaces for V2 Architecture
 */

import { 
  SourceContent, 
  Scenario, 
  Program, 
  Task, 
  Log, 
  Evaluation 
} from '@/lib/v2/interfaces/base';

export interface ISourceContentRepository {
  findById(id: string): Promise<SourceContent | null>;
  findByCode(code: string): Promise<SourceContent | null>;
  findByType(type: 'pbl' | 'discovery' | 'assessment'): Promise<SourceContent[]>;
  findActive(): Promise<SourceContent[]>;
  create(data: Omit<SourceContent, 'id' | 'created_at' | 'updated_at'>): Promise<SourceContent>;
  update(id: string, data: Partial<SourceContent>): Promise<SourceContent>;
}

export interface IScenarioRepository {
  findById(id: string): Promise<Scenario | null>;
  findActiveByUserAndSource(userId: string, sourceId: string): Promise<Scenario | null>;
  findByUser(userId: string, options?: { type?: string; status?: string }): Promise<Scenario[]>;
  create(data: Omit<Scenario, 'id' | 'created_at' | 'updated_at'>): Promise<Scenario>;
  update(id: string, data: Partial<Scenario>): Promise<Scenario>;
  updateLastActive(id: string): Promise<void>;
}

export interface IProgramRepository {
  findById(id: string): Promise<Program | null>;
  findByScenario(scenarioId: string): Promise<Program[]>;
  findActiveByScenario(scenarioId: string): Promise<Program | null>;
  getNextProgram(scenarioId: string, currentOrder: number): Promise<Program | null>;
  create(data: Omit<Program, 'id' | 'created_at' | 'updated_at'>): Promise<Program>;
  update(id: string, data: Partial<Program>): Promise<Program>;
}

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findByProgram(programId: string): Promise<Task[]>;
  findActiveByProgram(programId: string): Promise<Task | null>;
  getNextTask(programId: string, currentOrder: number): Promise<Task | null>;
  countByStatus(programId: string, status: string): Promise<number>;
  create(data: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task>;
  update(id: string, data: Partial<Task>): Promise<Task>;
}

export interface ILogRepository {
  findById(id: string): Promise<Log | null>;
  findByScenario(scenarioId: string, options?: any): Promise<Log[]>;
  findByTask(taskId: string): Promise<Log[]>;
  getRecentActivity(userId: string, limit?: number): Promise<Log[]>;
  create(data: Omit<Log, 'id' | 'created_at' | 'updated_at'>): Promise<Log>;
}

export interface IEvaluationRepository {
  findById(id: string): Promise<Evaluation | null>;
  findByScenario(scenarioId: string): Promise<Evaluation[]>;
  findByTask(taskId: string): Promise<Evaluation[]>;
  getAverageScore(scenarioId: string): Promise<number>;
  create(data: Omit<Evaluation, 'id' | 'created_at' | 'updated_at'>): Promise<Evaluation>;
}