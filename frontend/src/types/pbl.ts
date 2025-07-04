// PBL v2 (Problem-Based Learning) Type Definitions
// This is the new simplified structure without stages

export type DomainType = 'engaging_with_ai' | 'creating_with_ai' | 'managing_with_ai' | 'designing_with_ai';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type TaskCategory = 'research' | 'analysis' | 'creation' | 'interaction';
export type ModalityFocus = 'reading' | 'writing' | 'listening' | 'speaking' | 'mixed';
export type AIRole = 'assistant' | 'evaluator' | 'actor';
export type ProgramStatus = 'draft' | 'in_progress' | 'completed';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';
export type InteractionType = 'user' | 'ai' | 'system';

// KSA Mapping
export interface KSAMapping {
  knowledge: string[]; // K1.1, K2.3 etc
  skills: string[];    // S1.2, S3.1 etc
  attitudes: string[]; // A1.1, A2.2 etc
}

// AI Module Configuration
export interface AIModule {
  role: AIRole;
  model: string;
  persona?: string; // e.g., interviewer, customer, mentor
  initialPrompt?: string;
}

// Task Definition (simplified, no longer nested under stages)
export interface Task {
  id: string;
  title: string;
  title_zhTW?: string;
  title_zhCN?: string;
  title_pt?: string;
  title_ar?: string;
  title_id?: string;
  title_th?: string;
  description: string;
  description_zhTW?: string;
  description_zhCN?: string;
  description_pt?: string;
  description_ar?: string;
  description_id?: string;
  description_th?: string;
  category: TaskCategory;
  instructions: string[];
  instructions_zhTW?: string[];
  instructions_zhCN?: string[];
  instructions_pt?: string[];
  instructions_ar?: string[];
  instructions_id?: string[];
  instructions_th?: string[];
  expectedOutcome: string;
  expectedOutcome_zhTW?: string;
  expectedOutcome_zhCN?: string;
  expectedOutcome_pt?: string;
  expectedOutcome_ar?: string;
  expectedOutcome_id?: string;
  expectedOutcome_th?: string;
  timeLimit?: number; // minutes
  resources?: string[];
  assessmentFocus: {
    primary: string[];   // Primary KSA codes to assess
    secondary: string[]; // Secondary KSA codes
  };
  focusKSA?: string[];  // Combined KSA codes for evaluation
  aiModule?: AIModule;
}

// Scenario Definition (simplified, stages removed)
export interface Scenario {
  id: string;
  title: string;
  title_zhTW?: string;
  title_zhCN?: string;
  title_pt?: string;
  title_ar?: string;
  title_id?: string;
  title_th?: string;
  description: string;
  description_zhTW?: string;
  description_zhCN?: string;
  description_pt?: string;
  description_ar?: string;
  description_id?: string;
  description_th?: string;
  targetDomains: DomainType[];
  difficulty: DifficultyLevel;
  estimatedDuration: number; // minutes
  prerequisites?: string[];
  learningObjectives: string[];
  learningObjectives_zhTW?: string[];
  learningObjectives_zhCN?: string[];
  learningObjectives_pt?: string[];
  learningObjectives_ar?: string[];
  learningObjectives_id?: string[];
  learningObjectives_th?: string[];
  ksaMapping: KSAMapping;
  tasks: Task[]; // Direct array of tasks, no stages
}

// Alias for backward compatibility
export type PBLScenario = Scenario;

// Scenario for list display
export interface ScenarioListItem {
  id: string;
  title: string;
  title_zhTW?: string;
  title_zhCN?: string;
  title_pt?: string;
  title_ar?: string;
  title_id?: string;
  title_th?: string;
  description: string;
  description_zhTW?: string;
  description_zhCN?: string;
  description_pt?: string;
  description_ar?: string;
  description_id?: string;
  description_th?: string;
  targetDomains: DomainType[];
  difficulty: DifficultyLevel;
  estimatedDuration: number;
  taskCount: number;
  tags?: string[];
}


// Program - represents one learning journey through a scenario
export interface Program {
  id: string;
  scenarioId: string;
  userId: string;
  userEmail: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  status: ProgramStatus;
  totalTasks: number;
  currentTaskId?: string;
  language: string;
}

// Program Metadata (stored in program folder)
export interface ProgramMetadata extends Program {
  scenarioTitle: string;
  scenarioTitle_zhTW?: string;
  scenarioTitle_zhCN?: string;
  scenarioTitle_pt?: string;
  scenarioTitle_ar?: string;
  scenarioTitle_id?: string;
  scenarioTitle_th?: string;
}

// Task Metadata (stored in task folder)
export interface TaskMetadata {
  taskId: string;
  programId: string;
  title: string;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  status: TaskStatus;
  attempts: number;
}

// Task Interaction
export interface TaskInteraction {
  timestamp: string;
  type: InteractionType;
  content: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    responseTime?: number;
  };
}

// Task Log (stored as log.json)
export interface TaskLog {
  taskId: string;
  programId: string;
  interactions: TaskInteraction[];
  totalInteractions: number;
  lastInteractionAt?: string;
}

// Task Progress (stored as progress.json)
export interface TaskProgress {
  taskId: string;
  programId: string;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
  timeSpentSeconds: number;
  score?: number;
  feedback?: string;
  ksaScores?: Record<string, number>;
  evaluationDetails?: {
    strengths: string[];
    improvements: string[];
    nextSteps: string[];
  };
}

// Program Summary (for history and complete pages)
export interface ProgramSummary {
  program: ProgramMetadata;
  tasks: Array<{
    metadata: TaskMetadata;
    progress: TaskProgress;
    interactionCount: number;
  }>;
  overallScore?: number;
  domainScores?: Record<DomainType, number>;
  totalTimeSeconds: number;
  completionRate: number;
}

// Conversation and Process Types
export interface ConversationTurn {
  id: string;
  timestamp: Date;
  role: 'user' | 'ai' | 'system';
  content: string;
  metadata?: {
    processingTime?: number;
    tokensUsed?: number;
  };
}

export interface ProcessLog {
  id: string;
  timestamp: Date;
  sessionId: string;
  stageId: string;
  actionType: 'interaction' | 'evaluation' | 'navigation';
  detail: {
    aiInteraction?: {
      model: string;
      prompt: string;
      response: string;
      tokensUsed: number;
    };
    timeSpent?: number;
    taskId?: string;
  };
}

// API Response Types
export interface CreateProgramResponse {
  success: boolean;
  programId: string;
  program: Program;
  firstTaskId: string;
}

export interface SaveTaskLogRequest {
  programId: string;
  taskId: string;
  interaction: TaskInteraction;
  scenarioId?: string;
  taskTitle?: string;
}

export interface SaveTaskProgressRequest {
  programId: string;
  taskId: string;
  progress: Partial<TaskProgress>;
}

export interface GetProgramHistoryResponse {
  success: boolean;
  programs: ProgramSummary[];
  totalPrograms: number;
}