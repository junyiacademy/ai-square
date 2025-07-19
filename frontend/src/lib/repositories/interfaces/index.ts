/**
 * Repository Interfaces
 * 定義所有 Repository 的介面
 */

// ========================================
// 動態資料 Repositories (PostgreSQL)
// ========================================

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  delete(id: string): Promise<boolean>;
  findAll(options?: FindUsersOptions): Promise<User[]>;
  updateLastActive(id: string): Promise<void>;
  addAchievement(userId: string, achievementId: string): Promise<void>;
}

export interface IProgramRepository {
  findById(id: string): Promise<Program | null>;
  findByUser(userId: string): Promise<Program[]>;
  findByScenario(scenarioId: string): Promise<Program[]>;
  create(data: CreateProgramDto): Promise<Program>;
  update(id: string, data: UpdateProgramDto): Promise<Program>;
  updateStatus(id: string, status: ProgramStatus): Promise<void>;
  getActivePrograms(userId: string): Promise<Program[]>;
  getCompletedPrograms(userId: string): Promise<Program[]>;
}

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findByProgram(programId: string): Promise<Task[]>;
  create(data: CreateTaskDto): Promise<Task>;
  update(id: string, data: UpdateTaskDto): Promise<Task>;
  updateStatus(id: string, status: TaskStatus): Promise<void>;
  recordAttempt(id: string, attempt: AttemptData): Promise<void>;
  getTaskWithInteractions(id: string): Promise<TaskWithInteractions | null>;
}

export interface IEvaluationRepository {
  findById(id: string): Promise<Evaluation | null>;
  findByProgram(programId: string): Promise<Evaluation[]>;
  findByTask(taskId: string): Promise<Evaluation[]>;
  create(data: CreateEvaluationDto): Promise<Evaluation>;
  getLatestForTask(taskId: string): Promise<Evaluation | null>;
  getUserProgress(userId: string): Promise<UserProgress>;
}

export interface IScenarioRepository {
  findById(id: string): Promise<Scenario | null>;
  findByType(type: ScenarioType): Promise<Scenario[]>;
  findActive(): Promise<Scenario[]>;
  create(data: CreateScenarioDto): Promise<Scenario>;
  update(id: string, data: UpdateScenarioDto): Promise<Scenario>;
  updateStatus(id: string, status: ScenarioStatus): Promise<void>;
}

// ========================================
// 靜態內容 Repositories (GCS)
// ========================================

export interface IContentRepository {
  // YAML content management
  getYamlContent(path: string): Promise<any>;
  listYamlFiles(prefix: string): Promise<string[]>;
  
  // Scenario content
  getScenarioContent(scenarioId: string, language?: string): Promise<ScenarioContent>;
  getAllScenarios(type?: ScenarioType): Promise<ScenarioContent[]>;
  
  // KSA content
  getKSAMappings(): Promise<KSAMapping[]>;
  getAILiteracyDomains(): Promise<AILiteracyDomain[]>;
}

export interface IMediaRepository {
  // Media file management
  uploadFile(path: string, file: Buffer, contentType: string): Promise<string>;
  getFileUrl(path: string): Promise<string>;
  deleteFile(path: string): Promise<boolean>;
  listFiles(prefix: string): Promise<MediaFile[]>;
}

// ========================================
// Data Types
// ========================================

export interface User {
  id: string;
  email: string;
  name: string;
  preferredLanguage: string;
  level: number;
  totalXp: number;
  learningPreferences: any;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  metadata?: any;
}

export interface Program {
  id: string;
  userId: string;
  scenarioId: string;
  status: ProgramStatus;
  currentTaskIndex: number;
  completedTasks: number;
  totalTasks: number;
  totalScore: number;
  ksaScores?: any;
  startTime: Date;
  endTime?: Date;
  lastActivityAt: Date;
  timeSpentSeconds: number;
  metadata?: any;
  taskIds: string[];
  startedAt?: Date;
}

export interface Task {
  id: string;
  programId: string;
  taskIndex: number;
  type: string;
  status: TaskStatus;
  score?: number;
  timeSpentSeconds: number;
  attemptCount: number;
  allowedAttempts: number;
  context: any;
  userSolution?: string;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: any;
}

export interface Evaluation {
  id: string;
  userId: string;
  programId?: string;
  taskId?: string;
  evaluationType: string;
  score: number;
  maxScore: number;
  feedback?: string;
  aiAnalysis?: any;
  ksaScores?: any;
  timeTakenSeconds: number;
  createdAt: Date;
  metadata?: any;
  targetId?: string;
}

export interface Scenario {
  id: string;
  type: ScenarioType;
  status: ScenarioStatus;
  version: string;
  difficultyLevel?: string;
  estimatedMinutes?: number;
  prerequisites: string[];
  xpRewards: any;
  unlockRequirements: any;
  tasks: any[];
  aiModules: any;
  resources: any[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

// Enums
export type ProgramStatus = 'pending' | 'active' | 'completed' | 'abandoned';
export type TaskStatus = 'pending' | 'active' | 'completed' | 'skipped';
export type ScenarioType = 'pbl' | 'assessment' | 'discovery';
export type ScenarioStatus = 'active' | 'draft' | 'archived';

// DTOs
export interface CreateUserDto {
  email: string;
  name: string;
  preferredLanguage?: string;
  learningPreferences?: any;
}

export interface UpdateUserDto {
  name?: string;
  preferredLanguage?: string;
  level?: number;
  totalXp?: number;
  learningPreferences?: any;
  onboardingCompleted?: boolean;
}

export interface CreateProgramDto {
  userId: string;
  scenarioId: string;
  totalTasks: number;
}

export interface UpdateProgramDto {
  status?: ProgramStatus;
  currentTaskIndex?: number;
  completedTasks?: number;
  totalScore?: number;
  ksaScores?: any;
  endTime?: Date;
  metadata?: any;
  taskIds?: string[];
}

export interface CreateTaskDto {
  programId: string;
  taskIndex: number;
  type: string;
  context: any;
  allowedAttempts?: number;
}

export interface UpdateTaskDto {
  status?: TaskStatus;
  score?: number;
  userSolution?: string;
  timeSpentSeconds?: number;
  attemptCount?: number;
  completedAt?: Date;
  metadata?: any;
}

export interface CreateEvaluationDto {
  userId: string;
  programId?: string;
  taskId?: string;
  evaluationType: string;
  score: number;
  maxScore: number;
  feedback?: string;
  aiAnalysis?: any;
  ksaScores?: any;
  timeTakenSeconds: number;
  metadata?: any;
  targetType?: string;
  targetId?: string;
}

export interface CreateScenarioDto {
  type: ScenarioType;
  difficultyLevel?: string;
  estimatedMinutes?: number;
  prerequisites?: string[];
  xpRewards?: any;
  tasks?: any[];
  metadata?: any;
}

export interface UpdateScenarioDto {
  status?: ScenarioStatus;
  difficultyLevel?: string;
  estimatedMinutes?: number;
  prerequisites?: string[];
  xpRewards?: any;
  tasks?: any[];
  metadata?: any;
}

// Query Options
export interface FindUsersOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

// Extended Types
export interface TaskWithInteractions extends Task {
  interactions: Interaction[];
}

export interface Interaction {
  id: string;
  taskId: string;
  sequenceNumber: number;
  type: string;
  role: string;
  content: string;
  metadata?: any;
  createdAt: Date;
}

export interface UserProgress {
  totalPrograms: number;
  completedPrograms: number;
  totalTasks: number;
  completedTasks: number;
  totalXpEarned: number;
  averageScore: number;
  timeSpentSeconds: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  code: string;
  type: string;
  xpReward: number;
  earnedAt: Date;
}

export interface AttemptData {
  response: any;
  score?: number;
  timeSpent: number;
}

// Content Types
export interface ScenarioContent {
  id: string;
  type: string;
  title: { [lang: string]: string };
  description: { [lang: string]: string };
  tasks: any[];
  metadata?: any;
}

export interface KSAMapping {
  code: string;
  type: 'knowledge' | 'skill' | 'attitude';
  domain: string;
  description: { [lang: string]: string };
}

export interface AILiteracyDomain {
  id: string;
  name: { [lang: string]: string };
  description: { [lang: string]: string };
  competencies: string[];
}

export interface MediaFile {
  name: string;
  url: string;
  size: number;
  contentType: string;
  updatedAt: Date;
}