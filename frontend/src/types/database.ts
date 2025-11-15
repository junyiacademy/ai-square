/**
 * Database type definitions matching PostgreSQL schema v2
 * These types map directly to database tables and enums
 */

// ============================================
// ENUM Types (matching PostgreSQL ENUMs)
// ============================================

export type LearningMode = 'pbl' | 'discovery' | 'assessment';
export type ScenarioStatus = 'draft' | 'active' | 'archived';
export type ProgramStatus = 'pending' | 'active' | 'completed' | 'abandoned';
export type TaskStatus = 'pending' | 'active' | 'completed' | 'skipped';
export type TaskType =
  | 'interactive'   // Common types
  | 'reflection'
  | 'chat'         // PBL specific
  | 'creation'
  | 'analysis'
  | 'exploration'  // Discovery specific
  | 'experiment'
  | 'challenge'
  | 'question'     // Assessment specific
  | 'quiz'
  | 'assessment';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SourceType = 'yaml' | 'api' | 'ai-generated' | 'manual';

// ============================================
// Database Table Types
// ============================================

export interface DBUser {
  id: string;
  email: string;
  name: string;
  preferred_language: string;
  level: number;
  total_xp: number;
  learning_preferences: Record<string, unknown>;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  last_active_at: string;
  metadata: Record<string, unknown>;
}

export interface DBScenario {
  id: string;
  mode: LearningMode;
  status: ScenarioStatus;
  version: string;

  // Source tracking
  source_type: SourceType;
  source_path: string | null;
  source_id: string | null;
  source_metadata: Record<string, unknown>;

  // Basic info (multi-language)
  title: Record<string, string>;       // {"en": "Title", "zh": "標題"}
  description: Record<string, string>;  // {"en": "Desc", "zh": "描述"}
  objectives: string[];

  // Common attributes
  difficulty: DifficultyLevel;
  estimated_minutes: number;
  prerequisites: string[];

  // Task templates
  task_templates: Array<{
    id: string;
    title: string;
    type: TaskType;
    description?: string;
    [key: string]: unknown;
  }>;

  // Rewards and progression
  xp_rewards: Record<string, number>;
  unlock_requirements: Record<string, unknown>;

  // Mode-specific data
  pbl_data: {
    ksaMapping?: {
      knowledge: string[];
      skills: string[];
      attitudes: string[];
    };
    aiMentorGuidelines?: string;
    [key: string]: unknown;
  };
  discovery_data: {
    careerInfo?: Record<string, unknown>;
    skillTree?: Record<string, unknown>;
    xpRewards?: Record<string, number>;
    [key: string]: unknown;
  };
  assessment_data: {
    questionBank?: Record<string, unknown>;
    scoringRubric?: Record<string, unknown>;
    timeLimits?: Record<string, number>;
    [key: string]: unknown;
  };

  // Resources and AI
  ai_modules: Record<string, unknown>;
  resources: Array<Record<string, unknown>>;

  // Timestamps
  created_at: string;
  updated_at: string;
  published_at: string | null;

  // Extensible metadata
  metadata: Record<string, unknown>;
}

export interface DBProgram {
  id: string;
  user_id: string;
  scenario_id: string;
  mode: LearningMode;  // NEW: Propagated from scenario
  status: ProgramStatus;

  // Progress tracking
  current_task_index: number;
  completed_task_count: number;
  total_task_count: number;

  // Scoring (unified)
  total_score: number;
  domain_scores: Record<string, number>; // {"engaging_with_ai": 85, "creating_with_ai": 70}

  // XP and rewards (mainly for Discovery)
  xp_earned: number;
  badges_earned: Array<Record<string, unknown>>;

  // Timestamps (unified naming)
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;

  // Time tracking
  time_spent_seconds: number;

  // Mode-specific data
  pbl_data: Record<string, unknown>;
  discovery_data: Record<string, unknown>;
  assessment_data: Record<string, unknown>;

  // Extensible metadata
  metadata: Record<string, unknown>;
}

export interface DBTask {
  id: string;
  program_id: string;
  scenario_id: string;  // Foreign key to scenarios table
  mode: LearningMode;  // NEW: Propagated from program
  task_index: number;
  scenario_task_index: number | null;

  // Basic info
  title: string | null;
  description: string | null;
  type: TaskType;
  status: TaskStatus;

  // Content
  content: Record<string, unknown>;

  // Interaction tracking
  interactions: Array<Record<string, unknown>>;
  interaction_count: number; // Computed field

  // Response/solution
  user_response: Record<string, unknown>;

  // Scoring
  score: number;
  max_score: number;

  // Attempts and timing
  allowed_attempts: number;
  attempt_count: number;
  time_limit_seconds: number | null;
  time_spent_seconds: number;

  // AI configuration
  ai_config: Record<string, unknown>;

  // Timestamps
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;

  // Mode-specific data
  pbl_data: Record<string, unknown>;
  discovery_data: Record<string, unknown>;
  assessment_data: Record<string, unknown>;

  // Extensible metadata
  metadata: Record<string, unknown>;
}

export interface DBInteraction {
  timestamp: Date;
  type: 'user_input' | 'ai_response' | 'system_event';
  content: unknown;
  metadata?: Record<string, unknown>;
}

export interface DBEvaluation {
  id: string;
  user_id: string;
  program_id: string | null;
  task_id: string | null;
  mode: LearningMode;  // NEW: Mode for easy filtering

  // Evaluation scope
  evaluation_type: string;
  evaluation_subtype: string | null;

  // Scoring (unified 0-100 scale)
  score: number;
  max_score: number;

  // Multi-dimensional scoring
  domain_scores: Record<string, number>;

  // Feedback
  feedback_text: string | null;
  feedback_data: Record<string, unknown>;

  // AI analysis
  ai_provider: string | null;
  ai_model: string | null;
  ai_analysis: Record<string, unknown>;

  // Time tracking
  time_taken_seconds: number;

  // Timestamps
  created_at: string;

  // Mode-specific data
  pbl_data: Record<string, unknown>;
  discovery_data: Record<string, unknown>;
  assessment_data: Record<string, unknown>;

  // Extensible metadata
  metadata: Record<string, unknown>;
}

export interface DBDomain {
  id: string;
  name: Record<string, string>;        // Multi-language
  description: Record<string, string>; // Multi-language
  icon: string | null;
  display_order: number | null;
  created_at: string;
}

export interface DBScenarioDomain {
  scenario_id: string;
  domain_id: string;
  is_primary: boolean;
  weight: number;
  created_at: string;
}

export interface DBAchievement {
  id: string;
  code: string;
  name: Record<string, string>;        // Multi-language
  description: Record<string, string>; // Multi-language
  category: string;
  icon_url: string | null;
  xp_reward: number;
  criteria: Record<string, unknown>;
  is_hidden: boolean;
  display_order: number | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface DBUserAchievement {
  user_id: string;
  achievement_id: string;
  earned_at: string;
  earned_context: Record<string, unknown>;
}

export interface DBAIUsage {
  id: string;
  user_id: string;
  program_id: string | null;
  task_id: string | null;
  feature: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  request_data: Record<string, unknown>;
  response_data: Record<string, unknown>;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface DBUserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  last_activity_at: string;
  data: Record<string, unknown>;
}

// ============================================
// View Types
// ============================================

export interface DBUserProgressOverview {
  user_id: string;
  email: string;
  name: string;
  level: number;
  total_xp: number;
  total_programs: number;
  completed_programs: number;
  active_programs: number;
  avg_score: number | null;
  total_time_seconds: number | null;
}

export interface DBScenarioStatistics {
  id: string;
  mode: LearningMode;
  title_en: string | null;
  difficulty: DifficultyLevel;
  total_programs: number;
  completed_programs: number;
  avg_score: number | null;
  avg_time_seconds: number | null;
}

// ============================================
// Helper Types for Mode-Specific Data
// ============================================

export interface PBLSpecificData {
  ksaMapping?: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
  aiMentorGuidelines?: string;
  reflectionPrompts?: string[];
  [key: string]: unknown;
}

export interface DiscoverySpecificData {
  careerType?: string;
  careerInfo?: {
    avgSalary?: string;
    demandLevel?: string;
    requiredSkills?: string[];
  };
  skillTree?: {
    core?: string[];
    advanced?: string[];
  };
  xpRewards?: {
    completion?: number;
    challenge?: number;
    innovation?: number;
  };
  explorationPath?: string[];
  [key: string]: unknown;
}

export interface AssessmentSpecificData {
  assessmentType?: 'diagnostic' | 'formative' | 'summative';
  questionBank?: {
    total?: number;
    byDomain?: Record<string, number>;
  };
  scoringRubric?: {
    passingScore?: number;
    excellentScore?: number;
  };
  timeLimits?: {
    perQuestion?: number;
    total?: number;
  };
  correctAnswer?: string | number;
  answerSheet?: Record<string, unknown>;
  [key: string]: unknown;
}
