/**
 * Unified V2 Schema Definitions
 * Based on unified-track-architecture-v2.md
 */

import { z } from 'zod';

// Base trackable entity
export const trackableEntitySchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// Learning Project (Source layer)
export const learningProjectSchema = z.object({
  type: z.enum(['pbl', 'discovery', 'assessment']),
  code: z.string(),
  title: z.string(),
  description: z.string(),
  objectives: z.array(z.string()),
  prerequisites: z.array(z.string()),
  metadata: z.record(z.string(), z.any()),
  is_active: z.boolean()
})
.merge(trackableEntitySchema);

// Scenario (User's learning journey)
export const scenarioSchema = z.object({
  user_email: z.string().email(),
  project_id: z.string().uuid(),
  type: z.enum(['pbl', 'discovery', 'assessment']),
  title: z.string(),
  status: z.enum(['created', 'active', 'paused', 'completed', 'abandoned']),
  metadata: z.record(z.string(), z.any()),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  last_active_at: z.string().datetime().optional()
})
.merge(trackableEntitySchema);

// Program (Learning phase/round)
export const programSchema = z.object({
  scenario_id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  program_order: z.number().int(),
  status: z.enum(['pending', 'active', 'completed', 'skipped']),
  config: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional()
})
.merge(trackableEntitySchema);

// Task (Learning unit)
export const taskSchema = z.object({
  program_id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  task_order: z.number().int(),
  type: z.enum(['chat', 'code', 'quiz', 'submission', 'discussion']),
  required_ksa: z.array(z.string()),
  config: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()),
  status: z.enum(['pending', 'active', 'completed', 'skipped']),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional()
})
.merge(trackableEntitySchema);

// Log (Activity record - but we embed in Task for efficiency)
export const logSchema = z.object({
  scenario_id: z.string().uuid(),
  program_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  user_email: z.string().email(),
  log_type: z.enum(['chat', 'submission', 'evaluation', 'completion', 'feedback', 'achievement']),
  activity: z.string(),
  data: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional(),
  duration_seconds: z.number().int().optional()
})
.merge(trackableEntitySchema);

// Evaluation
export const evaluationSchema = z.object({
  log_id: z.string().uuid(),
  scenario_id: z.string().uuid(),
  task_id: z.string().uuid().optional(),
  evaluation_type: z.enum(['ai', 'rubric', 'quiz', 'peer', 'self']),
  input: z.record(z.string(), z.any()),
  result: z.record(z.string(), z.any()),
  scores: z.record(z.string(), z.number()),
  feedback: z.record(z.string(), z.any()).optional(),
  ksa_mapping: z.record(z.string(), z.any()).optional(),
  evaluated_by: z.string().optional()
})
.merge(trackableEntitySchema);

// Types
export type LearningProject = z.infer<typeof learningProjectSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Program = z.infer<typeof programSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Log = z.infer<typeof logSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;