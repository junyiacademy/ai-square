/**
 * V2 Architecture Base Interfaces
 * SCENARIO → PROGRAM → TASK → LOG
 */

// Base interface for all entities with timestamps
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Source content that defines the learning experience
// PBL: Scenario Card, Discovery: Career Card, Assessment: Exam Definition
export interface SourceContent extends BaseEntity {
  type: 'pbl' | 'discovery' | 'assessment';
  code: string;
  title: string;
  description: string;
  objectives: string[];
  prerequisites: string[];
  metadata: Record<string, any>;
  is_active: boolean;
}

// Scenario represents a user's journey through source content
export interface Scenario extends BaseEntity {
  user_id: string;
  source_id: string; // References SourceContent
  type: 'pbl' | 'discovery' | 'assessment';
  title: string;
  status: 'created' | 'active' | 'paused' | 'completed' | 'abandoned';
  metadata: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  last_active_at?: string;
}

// Program represents a phase/stage/attempt within a scenario
export interface Program extends BaseEntity {
  scenario_id: string;
  title: string;
  description?: string;
  program_order: number;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  config: Record<string, any>;
  metadata: Record<string, any>;
  started_at?: string;
  completed_at?: string;
}

// Task represents an individual activity within a program
export interface Task extends BaseEntity {
  program_id: string;
  title: string;
  description?: string;
  instructions?: string;
  task_order: number;
  type: 'chat' | 'code' | 'quiz' | 'submission' | 'discussion';
  required_ksa: string[];
  config: Record<string, any>;
  metadata: Record<string, any>;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  started_at?: string;
  completed_at?: string;
}

// Log represents an activity record
export interface Log extends BaseEntity {
  scenario_id: string;
  program_id?: string;
  task_id?: string;
  user_id: string;
  log_type: 'chat' | 'submission' | 'evaluation' | 'completion' | 'feedback' | 'achievement';
  activity: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  duration_seconds?: number;
}

// Evaluation represents assessment results
export interface Evaluation extends BaseEntity {
  log_id: string;
  scenario_id: string;
  task_id?: string;
  evaluation_type: 'ai' | 'rubric' | 'quiz' | 'peer' | 'self';
  input: Record<string, any>;
  result: Record<string, any>;
  scores: Record<string, number>;
  feedback?: Record<string, any>;
  ksa_mapping?: Record<string, any>;
  evaluated_by?: string;
}

// Type guards
export function isSourceContent(obj: any): obj is SourceContent {
  return obj && typeof obj.type === 'string' && ['pbl', 'discovery', 'assessment'].includes(obj.type);
}

export function isScenario(obj: any): obj is Scenario {
  return obj && obj.user_id && obj.source_id && obj.status;
}

export function isProgram(obj: any): obj is Program {
  return obj && obj.scenario_id && typeof obj.program_order === 'number';
}

export function isTask(obj: any): obj is Task {
  return obj && obj.program_id && typeof obj.task_order === 'number';
}