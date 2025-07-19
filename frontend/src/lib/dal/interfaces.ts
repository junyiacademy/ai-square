/**
 * Data Access Layer Interfaces for PostgreSQL Migration
 * These interfaces define the contract for data operations
 */


// ==========================================
// Base Interfaces
// ==========================================

export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at?: Date;
  metadata?: Record<string, unknown>;
}

export interface MultilingualContent {
  [languageCode: string]: string;
}

// ==========================================
// Domain Entities
// ==========================================

export interface User extends BaseEntity {
  email: string;
  name?: string;
  preferred_language?: string;
}

export interface Scenario extends BaseEntity {
  type: 'pbl' | 'assessment' | 'discovery';
  status: 'active' | 'draft' | 'archived';
  version?: string;
  title: MultilingualContent;
  description: MultilingualContent;
  objectives?: Array<{
    id: string;
    description: string;
    type?: string;
  }>;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_minutes?: number;
  ksa_mappings?: string[];
  tasks?: Array<{
    id: string;
    type: string;
    title?: MultilingualContent;
    description?: MultilingualContent;
    estimatedTime?: number;
    requiredForCompletion?: boolean;
    ksaCodes?: string[];
  }>;
  ai_modules?: Record<string, {
    enabled: boolean;
    model?: string;
    config?: Record<string, unknown>;
  }>;
}

export interface Program extends BaseEntity {
  user_id: string;
  scenario_id: string;
  status: 'pending' | 'active' | 'completed' | 'abandoned';
  current_task_index?: number;
  completed_tasks?: number;
  total_tasks: number;
  total_score?: number;
  ksa_scores?: Record<string, number>;
  start_time?: Date;
  end_time?: Date;
}

export interface Task extends BaseEntity {
  program_id: string;
  task_index: number;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  title: MultilingualContent;
  description: MultilingualContent;
  type: string;
  ksa_codes?: string[];
  interactions?: Array<{
    id: string;
    sequenceNumber: number;
    type: string;
    role: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  user_solution?: string;
  score?: number;
  time_spent_seconds?: number;
  attempt_count?: number;
  started_at?: Date;
  completed_at?: Date;
}

export interface Evaluation extends BaseEntity {
  task_id?: string;
  program_id?: string;
  user_id: string;
  evaluation_type: 'task' | 'program' | 'final';
  module_type: 'pbl' | 'assessment' | 'discovery';
  overall_score?: number;
  ksa_scores?: Record<string, number>;
  detailed_scores?: Record<string, {
    score: number;
    maxScore: number;
    feedback?: string;
  }>;
  feedback: MultilingualContent;
  strengths?: string[];
  improvements?: string[];
  evaluator_model?: string;
  evaluation_criteria?: Record<string, {
    weight: number;
    description: string;
    rubric?: string;
  }>;
}

// ==========================================
// Query Interfaces
// ==========================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: unknown;
}

export interface QueryOptions {
  pagination?: PaginationParams;
  sort?: SortParams;
  filters?: FilterParams;
  include?: string[];
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  hasMore?: boolean;
  nextCursor?: string;
}

// ==========================================
// Repository Interfaces
// ==========================================

export interface BaseRepository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<QueryResult<T>>;
  create(data: Omit<T, keyof BaseEntity>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}

export interface UserRepository extends BaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  updatePreferences(id: string, preferences: Record<string, unknown>): Promise<User>;
}

export interface ScenarioRepository extends BaseRepository<Scenario> {
  findByType(type: Scenario['type'], options?: QueryOptions): Promise<QueryResult<Scenario>>;
  findActive(options?: QueryOptions): Promise<QueryResult<Scenario>>;
  updateTranslation(id: string, field: string, language: string, content: string): Promise<Scenario>;
}

export interface ProgramRepository extends BaseRepository<Program> {
  findByUser(userId: string, options?: QueryOptions): Promise<QueryResult<Program>>;
  findByScenario(scenarioId: string, options?: QueryOptions): Promise<QueryResult<Program>>;
  findByUserAndScenario(userId: string, scenarioId: string): Promise<Program[]>;
  updateProgress(id: string, taskIndex: number, completed: number): Promise<Program>;
  complete(id: string, totalScore: number, ksaScores: Record<string, number>): Promise<Program>;
}

export interface TaskRepository extends BaseRepository<Task> {
  findByProgram(programId: string, options?: QueryOptions): Promise<QueryResult<Task>>;
  findByProgramAndIndex(programId: string, taskIndex: number): Promise<Task | null>;
  addInteraction(id: string, interaction: {
    sequenceNumber: number;
    type: string;
    role: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<Task>;
  complete(id: string, score: number, solution?: string): Promise<Task>;
}

export interface EvaluationRepository extends BaseRepository<Evaluation> {
  findByUser(userId: string, options?: QueryOptions): Promise<QueryResult<Evaluation>>;
  findByProgram(programId: string, options?: QueryOptions): Promise<QueryResult<Evaluation>>;
  findByTask(taskId: string): Promise<Evaluation[]>;
  getLatestForProgram(programId: string, type: Evaluation['evaluation_type']): Promise<Evaluation | null>;
}

// ==========================================
// Unit of Work Pattern
// ==========================================

export interface UnitOfWork {
  users: UserRepository;
  scenarios: ScenarioRepository;
  programs: ProgramRepository;
  tasks: TaskRepository;
  evaluations: EvaluationRepository;
  
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// ==========================================
// Database Connection Interface
// ==========================================

export interface DatabaseConnection {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<{ rowCount: number }>;
  transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T>;
}

// ==========================================
// Migration Interfaces
// ==========================================

export interface MigrationService {
  /**
   * Migrate a single entity from GCS to PostgreSQL
   */
  migrateEntity(entityType: string, gcsData: unknown): Promise<void>;
  
  /**
   * Batch migrate entities
   */
  migrateBatch(entityType: string, gcsDataArray: unknown[]): Promise<{ success: number; failed: number }>;
  
  /**
   * Verify migration integrity
   */
  verifyMigration(entityType: string, id: string): Promise<boolean>;
}

// ==========================================
// Cache Integration Interface
// ==========================================

export interface CacheableRepository<T extends BaseEntity> extends BaseRepository<T> {
  /**
   * Clear cache for specific entity
   */
  clearCache(id: string): Promise<void>;
  
  /**
   * Warm cache with frequently accessed data
   */
  warmCache(): Promise<void>;
}

// ==========================================
// Export Configuration
// ==========================================

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  poolSize?: number;
  connectionTimeout?: number;
}

export interface DALConfig {
  database: DatabaseConfig;
  cache?: {
    enabled: boolean;
    ttl: number;
    redis?: {
      host: string;
      port: number;
    };
  };
  migrations?: {
    autoRun: boolean;
    directory: string;
  };
}