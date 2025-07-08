/**
 * V2 Core Types and Interfaces
 * Following SCENARIO → PROGRAM → TASK → LOG architecture
 */

// Base entity interface
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// User types
export interface User extends BaseEntity {
  email: string;
  display_name?: string;
  avatar_url?: string;
  language_preference: string;
  metadata?: Record<string, any>;
}

// Project types (scenarios from YAML files)
export interface Project extends BaseEntity {
  code: string; // e.g., 'ai-job-search', 'high-school-smart-city'
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number; // in minutes
  target_domains: string[];
  prerequisites: string[];
  learning_objectives: string[];
  ksa_mapping: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
  is_active: boolean;
  metadata?: Record<string, any>;
}

// Scenario types
export interface Scenario extends BaseEntity {
  code: string; // e.g., 'ai-literacy', 'prompt-engineering'
  title: string;
  description: string;
  order_index: number;
  is_active: boolean;
  structure_type: 'standard' | 'direct_task' | 'single_program'; // New field for flexible architecture
  metadata?: Record<string, any>;
}

// Program types
export interface Program extends BaseEntity {
  scenario_id: string;
  code: string; // e.g., 'beginner', 'intermediate'
  title: string;
  description: string;
  duration_hours?: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  order_index: number;
  is_active: boolean;
  is_virtual?: boolean; // New field: true for auto-generated programs
  auto_generated?: boolean; // New field: true if created automatically
  metadata?: Record<string, any>;
}

// Task types
export interface Task extends BaseEntity {
  program_id: string;
  code: string; // e.g., 'task-1', 'task-2'
  title: string;
  description: string;
  instructions: string;
  evaluation_criteria?: string[];
  order_index: number;
  is_active: boolean;
  task_type: 'learning' | 'practice' | 'assessment';
  task_variant?: 'standard' | 'question' | 'exploration' | 'assessment'; // New field for flexible task types
  
  // 模組化設計
  module_type?: string;  // 'multiple_choice', 'conversation', 'code_writing', etc.
  module_config?: Record<string, any>;  // 模組特定配置
  evaluation_method?: string;  // 'exact_match', 'ai_evaluation', 'rubric_based', etc.
  
  // 動態任務相關
  is_dynamic?: boolean;  // 是否為動態生成
  can_branch?: boolean;  // 是否可以分支
  prerequisites?: string[];  // 前置任務 IDs
  unlock_condition?: Record<string, any>;  // 解鎖條件
  
  estimated_minutes?: number;
  metadata?: Record<string, any>;
}

// User Progress types
export interface UserScenarioProgress extends BaseEntity {
  user_id: string;
  scenario_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at?: Date;
  completed_at?: Date;
  completion_percentage: number;
  metadata?: Record<string, any>;
}

export interface UserProgramProgress extends BaseEntity {
  user_id: string;
  program_id: string;
  scenario_progress_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at?: Date;
  completed_at?: Date;
  completion_percentage: number;
  metadata?: Record<string, any>;
}

export interface UserTaskProgress extends BaseEntity {
  user_id: string;
  task_id: string;
  program_progress_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at?: Date;
  completed_at?: Date;
  score?: number;
  attempts: number;
  metadata?: Record<string, any>;
}

// Task Log types
export interface TaskLog extends BaseEntity {
  task_progress_id: string;
  user_id: string;
  log_type: 'chat' | 'submission' | 'evaluation' | 'system';
  content: any; // JSON content
  metadata?: Record<string, any>;
}

// Chat message types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Submission types
export interface TaskSubmission {
  submission_type: 'text' | 'code' | 'file' | 'mixed';
  content: any;
  files?: string[]; // URLs to files in GCS
  timestamp: Date;
}

// Evaluation types
export interface TaskEvaluation {
  score: number;
  max_score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  criteria_scores?: Record<string, number>;
  evaluated_at: Date;
  evaluator_type: 'ai' | 'human' | 'peer';
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Query filter types
export interface QueryFilters {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

// Storage types
export interface StorageObject {
  bucket: string;
  path: string;
  url: string;
  size?: number;
  contentType?: string;
  metadata?: Record<string, any>;
}

// Flexible architecture creation types
export interface CreateScenarioOptions {
  structure_type: 'standard' | 'direct_task' | 'single_program';
  programs?: Omit<Program, 'id' | 'created_at' | 'updated_at' | 'scenario_id'>[];
  tasks?: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'program_id'>[];
}

export interface CreateProgramOptions {
  is_virtual?: boolean;
  auto_generated?: boolean;
  tasks?: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'program_id'>[];
}

export interface CreateTaskOptions {
  task_variant?: 'standard' | 'question' | 'exploration' | 'assessment';
  ai_modules?: string[];
  context?: Record<string, any>;
}

// Service response types
export interface ScenarioWithHierarchy extends Scenario {
  programs: ProgramWithTasks[];
}

export interface ProgramWithTasks extends Program {
  tasks: Task[];
}

// Quick creation types for simplified APIs
export interface QuickAssessmentOptions {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questions: Array<{
    question: string;
    type: 'multiple_choice' | 'short_answer' | 'essay';
    options?: string[];
    correct_answer?: string;
  }>;
  time_limit?: number;
  domains?: string[];
}

export interface DiscoveryStartOptions {
  topic: string;
  language: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  user_context?: string;
}