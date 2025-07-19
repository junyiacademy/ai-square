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
  ksaScores?: Record<string, number>;
  startTime: Date;
  endTime?: Date;
  lastActivityAt: Date;
  timeSpentSeconds: number;
  metadata?: Record<string, unknown>;
  taskIds: string[];
  startedAt?: Date;
}

export interface Task {
  id: string;
  programId: string;
  taskIndex: number;
  type: string;
  title?: string;
  content?: {
    description?: string;
    instructions?: string;
    hints?: string[];
    resources?: Array<{ type: string; url: string; title?: string }>;
  };
  status: TaskStatus;
  score?: number;
  timeSpentSeconds: number;
  attemptCount: number;
  allowedAttempts: number;
  context: {
    scenarioId?: string;
    taskType?: string;
    difficulty?: string;
    estimatedTime?: number;
    ksaCodes?: string[];
  };
  userSolution?: string;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
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
  aiAnalysis?: {
    insights?: string[];
    strengths?: string[];
    improvements?: string[];
    detailedFeedback?: Record<string, string>;
  };
  ksaScores?: Record<string, number>;
  timeTakenSeconds: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
  targetId?: string;
}

export interface Scenario {
  id: string;
  type: ScenarioType;
  status: ScenarioStatus;
  version: string;
  title?: string;
  description?: string;
  sourceRef?: {
    type: string;
    path: string;
    version?: string;
    lastModified?: Date;
  };
  difficultyLevel?: string;
  estimatedMinutes?: number;
  prerequisites: string[];
  xpRewards: {
    completion?: number;
    mastery?: number;
    bonus?: number;
    conditions?: Record<string, number>;
  };
  unlockRequirements: {
    level?: number;
    completedScenarios?: string[];
    achievements?: string[];
    customConditions?: Array<{ type: string; value: unknown }>;
  };
  tasks: Array<{
    id: string;
    type: string;
    title?: string;
    description?: string;
    estimatedTime?: number;
    requiredForCompletion?: boolean;
    ksaCodes?: string[];
  }>;
  aiModules: {
    tutor?: { enabled: boolean; model?: string; systemPrompt?: string };
    evaluator?: { enabled: boolean; rubric?: string; criteria?: Record<string, unknown> };
    feedbackGenerator?: { enabled: boolean; style?: string };
  };
  resources: Array<{
    id?: string;
    type: 'video' | 'article' | 'document' | 'link' | 'other';
    url: string;
    title: string;
    description?: string;
    required?: boolean;
  }>;
  metadata?: Record<string, unknown>;
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
  totalTasks: number;
}

export interface UpdateProgramDto {
  status?: ProgramStatus;
  currentTaskIndex?: number;
  completedTasks?: number;
  totalScore?: number;
  ksaScores?: Record<string, number>;
  endTime?: Date;
  metadata?: Record<string, unknown>;
  taskIds?: string[];
}

export interface CreateTaskDto {
  programId: string;
  taskIndex: number;
  type: string;
  title?: string;
  content?: {
    description?: string;
    instructions?: string;
    hints?: string[];
    resources?: Array<{ type: string; url: string; title?: string }>;
  };
  context: {
    scenarioId?: string;
    taskType?: string;
    difficulty?: string;
    estimatedTime?: number;
    ksaCodes?: string[];
  };
  allowedAttempts?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskDto {
  status?: TaskStatus;
  score?: number;
  userSolution?: string;
  timeSpentSeconds?: number;
  attemptCount?: number;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateEvaluationDto {
  userId: string;
  programId?: string;
  taskId?: string;
  evaluationType: string;
  score: number;
  maxScore: number;
  feedback?: string;
  aiAnalysis?: {
    insights?: string[];
    strengths?: string[];
    improvements?: string[];
    detailedFeedback?: Record<string, string>;
  };
  ksaScores?: Record<string, number>;
  timeTakenSeconds: number;
  metadata?: Record<string, unknown>;
  targetType?: string;
  targetId?: string;
  dimensions?: Array<{ name: string; score: number; maxScore: number }>;
  createdAt?: string;
}

export interface CreateScenarioDto {
  type: ScenarioType;
  difficultyLevel?: string;
  estimatedMinutes?: number;
  prerequisites?: string[];
  xpRewards?: {
    completion?: number;
    mastery?: number;
    bonus?: number;
    conditions?: Record<string, number>;
  };
  tasks?: Array<{
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

export interface UpdateScenarioDto {
  status?: ScenarioStatus;
  difficultyLevel?: string;
  estimatedMinutes?: number;
  prerequisites?: string[];
  xpRewards?: {
    completion?: number;
    mastery?: number;
    bonus?: number;
    conditions?: Record<string, number>;
  };
  tasks?: Array<{
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
  metadata?: Record<string, unknown>;
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