/**
 * Repository Interfaces
 * 定義所有 Repository 的介面
 */

import type { 
  IProgram, 
  ITask, 
  IEvaluation, 
  IScenario,
  IInteraction
} from '@/types/unified-learning';
import type {
  IDiscoveryScenario,
  ICareerRecommendation,
  IDiscoveryMilestone,
  IPortfolioItem
} from '@/types/discovery-types';
import type {
  LearningMode as DBLearningMode,
  ProgramStatus as DBProgramStatus,
  TaskStatus as DBTaskStatus,
  ScenarioStatus as DBScenarioStatus,
  SourceType as DBSourceType
} from '@/types/database';

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
  
  // Assessment-related methods
  saveAssessmentSession(userId: string, session: CreateAssessmentSessionDto): Promise<AssessmentSession>;
  getAssessmentSessions(userId: string): Promise<AssessmentSession[]>;
  getLatestAssessmentResults(userId: string): Promise<AssessmentResults | null>;
  
  // Badge management
  addBadge(userId: string, badge: CreateBadgeDto): Promise<UserBadge>;
  getUserBadges(userId: string): Promise<UserBadge[]>;
  
  // Complete user data operations
  getUserData(userEmail: string): Promise<UserDataResponse | null>;
  saveUserData(userEmail: string, data: UserDataInput): Promise<UserDataResponse>;
  deleteUserData(userEmail: string): Promise<boolean>;
}

export interface IProgramRepository {
  findById(id: string): Promise<IProgram | null>;
  findByUser(userId: string): Promise<IProgram[]>;
  findByScenario(scenarioId: string): Promise<IProgram[]>;
  create(data: Omit<IProgram, 'id'>): Promise<IProgram>;
  updateProgress(id: string, taskIndex: number): Promise<IProgram>;
  complete(id: string): Promise<IProgram>;
  update?(id: string, data: UpdateProgramDto): Promise<IProgram>;
  updateStatus?(id: string, status: DBProgramStatus): Promise<void>;
  getActivePrograms?(userId: string): Promise<IProgram[]>;
  getCompletedPrograms?(userId: string): Promise<IProgram[]>;
}

export interface ITaskRepository {
  findById(id: string): Promise<ITask | null>;
  findByProgram(programId: string): Promise<ITask[]>;
  create(data: Omit<ITask, 'id'>): Promise<ITask>;
  createBatch(tasks: Omit<ITask, 'id'>[]): Promise<ITask[]>;
  updateInteractions(id: string, interactions: IInteraction[]): Promise<ITask>;
  complete(id: string): Promise<ITask>;
  update?(id: string, data: UpdateTaskDto): Promise<ITask>;
  updateStatus?(id: string, status: DBTaskStatus): Promise<void>;
  recordAttempt?(id: string, attempt: AttemptData): Promise<void>;
  getTaskWithInteractions?(id: string): Promise<TaskWithInteractions | null>;
}

export interface IEvaluationRepository {
  findById(id: string): Promise<IEvaluation | null>;
  findByProgram(programId: string): Promise<IEvaluation[]>;
  findByTask(taskId: string): Promise<IEvaluation[]>;
  findByUser(userId: string): Promise<IEvaluation[]>;
  findByType(evaluationType: string, evaluationSubtype?: string): Promise<IEvaluation[]>;
  create(data: Omit<IEvaluation, 'id'>): Promise<IEvaluation>;
  update?(id: string, data: UpdateEvaluationDto): Promise<IEvaluation>;
  getLatestForTask?(taskId: string): Promise<IEvaluation | null>;
  getUserProgress?(userId: string): Promise<UserProgress>;
}

export interface IScenarioRepository {
  findById(id: string): Promise<IScenario | null>;
  findBySource(sourceType: string, sourceId?: string): Promise<IScenario[]>;
  update(id: string, updates: Partial<IScenario>): Promise<IScenario>;
  create(data: Omit<IScenario, 'id'>): Promise<IScenario>;
  findByMode?(mode: DBLearningMode, includeArchived?: boolean): Promise<IScenario[]>;
  findActive?(): Promise<IScenario[]>;
  updateStatus?(id: string, status: DBScenarioStatus): Promise<void>;
  delete(id: string): Promise<boolean>;
}

export interface IDiscoveryRepository {
  // Career path management
  findCareerPaths(): Promise<IDiscoveryScenario[]>;
  findCareerPathById(id: string): Promise<IDiscoveryScenario | null>;
  findCareerPathBySlug(slug: string): Promise<IDiscoveryScenario | null>;
  
  // Career recommendations
  getCareerRecommendations(userId: string): Promise<ICareerRecommendation[]>;
  
  // Progress tracking
  getUserDiscoveryProgress(userId: string): Promise<{
    exploredCareers: string[];
    completedMilestones: IDiscoveryMilestone[];
    portfolioItems: IPortfolioItem[];
    overallProgress: number;
  }>;
  
  // Portfolio management
  addPortfolioItem(userId: string, item: Omit<IPortfolioItem, 'id' | 'createdAt'>): Promise<IPortfolioItem>;
  updatePortfolioItem(userId: string, itemId: string, updates: Partial<IPortfolioItem>): Promise<IPortfolioItem>;
  deletePortfolioItem(userId: string, itemId: string): Promise<void>;
  getPortfolioItems(userId: string): Promise<IPortfolioItem[]>;
}

// ========================================
// 靜態內容 Repositories (GCS)
// ========================================

export interface IContentRepository {
  // YAML content management
  getYamlContent(path: string): Promise<Record<string, unknown>>;
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
  learningPreferences: {
    goals?: string[];
    interests?: string[];
    learningPreferences?: string[];
    learningStyle?: string;
  };
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  metadata?: Record<string, unknown>;
  role?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: Date;
}

// Legacy type aliases for compatibility
export type Program = IProgram;
export type Task = ITask;
export type Evaluation = IEvaluation;
export type Scenario = IScenario;

// Re-export types from database for backward compatibility
export type ProgramStatus = DBProgramStatus;
export type TaskStatus = DBTaskStatus;
export type ScenarioType = DBLearningMode;
export type ScenarioStatus = DBScenarioStatus;

// DTOs
export interface CreateUserDto {
  email: string;
  name: string;
  preferredLanguage?: string;
  learningPreferences?: {
    goals?: string[];
    interests?: string[];
    learningPreferences?: string[];
    learningStyle?: string;
  };
}

export interface UpdateUserDto {
  name?: string;
  preferredLanguage?: string;
  level?: number;
  totalXp?: number;
  learningPreferences?: {
    goals?: string[];
    interests?: string[];
    learningPreferences?: string[];
    learningStyle?: string;
  };
  onboardingCompleted?: boolean;
}

export interface CreateProgramDto {
  userId: string;
  scenarioId: string;
  mode: DBLearningMode;
  totalTaskCount: number;
  status?: DBProgramStatus;
}

export interface UpdateProgramDto {
  status?: DBProgramStatus;
  currentTaskIndex?: number;
  completedTaskCount?: number;
  totalTaskCount?: number;
  totalScore?: number;
  domainScores?: Record<string, unknown>;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  startedAt?: string;
  lastActivityAt?: string;
  xpEarned?: number;
  discoveryData?: Record<string, unknown>;
  pblData?: Record<string, unknown>;
  assessmentData?: Record<string, unknown>;
}

export interface CreateTaskDto {
  programId: string;
  mode: DBLearningMode;
  taskIndex: number;
  type: string;
  title?: string;
  description?: string;
  content?: Record<string, unknown>;
  maxScore?: number;
  allowedAttempts?: number;
  aiConfig?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskDto {
  status?: DBTaskStatus;
  score?: number;
  userResponse?: Record<string, unknown>;
  timeSpentSeconds?: number;
  attemptCount?: number;
  completedAt?: string;
  startedAt?: string;
  interactions?: IInteraction[];
  interactionCount?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateEvaluationDto {
  userId: string;
  programId?: string;
  taskId?: string;
  mode: DBLearningMode;
  evaluationType: string;
  evaluationSubtype?: string;
  score: number;
  maxScore: number;
  domainScores?: Record<string, number>;
  feedbackText?: string;
  feedbackData?: Record<string, unknown>;
  aiProvider?: string;
  aiModel?: string;
  aiAnalysis?: Record<string, unknown>;
  timeTakenSeconds: number;
  pblData?: Record<string, unknown>;
  discoveryData?: Record<string, unknown>;
  assessmentData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateEvaluationDto {
  score?: number;
  maxScore?: number;
  domainScores?: Record<string, number>;
  feedbackText?: string;
  feedbackData?: Record<string, unknown>;
  aiAnalysis?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateScenarioDto {
  mode: DBLearningMode;
  status?: DBScenarioStatus;
  version?: string;
  sourceType: DBSourceType;
  sourcePath?: string;
  sourceId?: string;
  sourceMetadata?: Record<string, unknown>;
  title: Record<string, string>;
  description: Record<string, string>;
  objectives?: string[];
  difficulty?: string;
  estimatedMinutes?: number;
  prerequisites?: string[];
  taskTemplates?: Array<Record<string, unknown>>;
  xpRewards?: Record<string, number>;
  unlockRequirements?: Record<string, unknown>;
  pblData?: Record<string, unknown>;
  discoveryData?: Record<string, unknown>;
  assessmentData?: Record<string, unknown>;
  aiModules?: Record<string, unknown>;
  resources?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

export interface UpdateScenarioDto {
  status?: DBScenarioStatus;
  version?: string;
  title?: Record<string, string>;
  description?: Record<string, string>;
  objectives?: string[];
  difficulty?: string;
  estimatedMinutes?: number;
  prerequisites?: string[];
  taskTemplates?: Array<Record<string, unknown>>;
  xpRewards?: Record<string, number>;
  unlockRequirements?: Record<string, unknown>;
  pblData?: Record<string, unknown>;
  discoveryData?: Record<string, unknown>;
  assessmentData?: Record<string, unknown>;
  aiModules?: Record<string, unknown>;
  resources?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  publishedAt?: string;
}

// Query Options
export interface FindUsersOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

// Extended Types
export type Interaction = IInteraction;

export interface TaskWithInteractions extends ITask {
  interactions: IInteraction[];
}

// Remove the Interaction interface as we use IInteraction from unified-learning types

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
  response: string | Record<string, unknown>;
  score?: number;
  timeSpent: number;
}

// Content Types
export interface ScenarioContent {
  id: string;
  type: string;
  title: { [lang: string]: string };
  description: { [lang: string]: string };
  tasks: Array<{
    id: string;
    type: string;
    title?: string;
    description?: string;
    estimatedTime?: number;
    requiredForCompletion?: boolean;
    ksaCodes?: string[];
  }>;
  metadata?: Record<string, unknown>;
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

// ========================================
// Assessment System Types
// ========================================

export interface AssessmentSession {
  id: string;
  userId: string;
  sessionKey: string;
  techScore: number;
  creativeScore: number;
  businessScore: number;
  answers: Record<string, string[]>;
  generatedPaths: string[];
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface AssessmentResults {
  tech: number;
  creative: number;
  business: number;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: 'exploration' | 'learning' | 'mastery' | 'community' | 'special';
  xpReward: number;
  unlockedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateAssessmentSessionDto {
  sessionKey: string;
  techScore: number;
  creativeScore: number;
  businessScore: number;
  answers?: Record<string, string[]>;
  generatedPaths?: string[];
}

export interface CreateBadgeDto {
  badgeId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: 'exploration' | 'learning' | 'mastery' | 'community' | 'special';
  xpReward: number;
}

// Legacy user data compatibility types
export interface UserDataResponse {
  assessmentResults?: AssessmentResults | null;
  achievements: {
    badges: UserBadge[];
    totalXp: number;
    level: number;
    completedTasks: string[];
    achievements?: Achievement[];
  };
  assessmentSessions: AssessmentSession[];
  currentView?: string;
  lastUpdated: string;
  version: string;
}

export interface UserDataInput {
  assessmentResults?: AssessmentResults | null;
  achievements: {
    badges: Array<{
      id: string;
      name: string;
      description: string;
      imageUrl?: string;
      unlockedAt: string;
      category: 'exploration' | 'learning' | 'mastery' | 'community' | 'special';
      xpReward: number;
    }>;
    totalXp: number;
    level: number;
    completedTasks: string[];
    achievements?: Achievement[];
  };
  assessmentSessions: Array<{
    id: string;
    createdAt: string;
    results: AssessmentResults;
    answers?: Record<string, string[]>;
    generatedPaths?: string[];
  }>;
  currentView?: string;
  lastUpdated: string;
  version: string;
}