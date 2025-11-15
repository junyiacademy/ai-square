/**
 * PBL Scenario validation schema
 */

import { z } from 'zod';

export const TaskSchema = z.object({
  task_id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['question', 'chat', 'creation', 'analysis']),
  content: z.record(z.unknown()),
  context: z.record(z.unknown()).optional(),
  ksa_codes: z.object({
    knowledge: z.array(z.string()),
    skills: z.array(z.string()),
    attitudes: z.array(z.string())
  }).optional()
});

export const AIModuleSchema = z.object({
  name: z.string(),
  type: z.string(),
  config: z.record(z.unknown()).optional()
});

export const PBLScenarioSchema = z.object({
  scenario_id: z.string(),
  title: z.string(),
  description: z.string(),
  domain: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  tasks: z.array(TaskSchema),
  ai_modules: z.array(AIModuleSchema).optional(),
  resources: z.array(z.object({
    type: z.string(),
    url: z.string(),
    title: z.string()
  })).optional()
});

export type Task = z.infer<typeof TaskSchema>;
export type AIModule = z.infer<typeof AIModuleSchema>;
export type PBLScenario = z.infer<typeof PBLScenarioSchema>;
