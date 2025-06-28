/**
 * Validation schemas for PBL (Problem-Based Learning) scenarios
 * These schemas match the types defined in @/types/pbl.ts
 */

import { z } from 'zod';

// Enum schemas
const domainTypeSchema = z.enum(['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai']);
const difficultyLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
const stageTypeSchema = z.enum(['research', 'analysis', 'creation', 'interaction']);
const modalityFocusSchema = z.enum(['reading', 'writing', 'listening', 'speaking', 'mixed']);
const aiRoleSchema = z.enum(['assistant', 'evaluator', 'actor']);

// KSA mapping schema
const ksaMappingSchema = z.object({
  knowledge: z.array(z.string()), // K1.1, K2.3 etc
  skills: z.array(z.string()),    // S1.2, S3.1 etc
  attitudes: z.array(z.string()), // A1.1, A2.2 etc
});

// Rubric level schema
const rubricLevelSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  description: z.string(),
  criteria: z.array(z.string()),
});

// Rubrics criteria schema
const rubricsCriteriaSchema = z.object({
  criterion: z.string(),
  weight: z.number().min(0).max(1),
  levels: z.array(rubricLevelSchema),
});

// AI module schema
const aiModuleSchema = z.object({
  role: aiRoleSchema,
  model: z.string(),
  persona: z.string().optional(),
});

// Logging config schema
const loggingConfigSchema = z.object({
  trackInteractions: z.boolean(),
  trackThinkingTime: z.boolean(),
  trackRevisions: z.boolean(),
  trackResourceUsage: z.boolean(),
});

// Task schema
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  instructions: z.array(z.string()),
  expectedOutcome: z.string(),
  timeLimit: z.number().positive().optional(),
  resources: z.array(z.string()).optional(),
});

// Stage schema
export const stageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  stageType: stageTypeSchema,
  modalityFocus: modalityFocusSchema,
  assessmentFocus: z.object({
    primary: z.array(z.string()),
    secondary: z.array(z.string()),
  }),
  rubricsCriteria: z.array(rubricsCriteriaSchema),
  aiModules: z.array(aiModuleSchema),
  tasks: z.array(taskSchema),
  timeLimit: z.number().positive().optional(),
  loggingConfig: loggingConfigSchema,
});

// Scenario program schema
export const scenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetDomain: z.array(domainTypeSchema),
  ksaMapping: ksaMappingSchema,
  stages: z.array(stageSchema),
  estimatedDuration: z.number().positive(),
  difficulty: difficultyLevelSchema,
  prerequisites: z.array(z.string()).optional(),
  learningObjectives: z.array(z.string()),
});

// Type exports
export type Task = z.infer<typeof taskSchema>;
export type Stage = z.infer<typeof stageSchema>;
export type ScenarioProgram = z.infer<typeof scenarioSchema>;

// Custom validators
export const validateRubricWeights = (stage: Stage): boolean => {
  const totalWeight = stage.rubricsCriteria.reduce((sum, criteria) => sum + criteria.weight, 0);
  return Math.abs(totalWeight - 1.0) < 0.001; // Allow small floating point errors
};

export const validateRubricLevels = (criteria: z.infer<typeof rubricsCriteriaSchema>): boolean => {
  // Check that we have exactly 4 levels (1-4)
  if (criteria.levels.length !== 4) return false;
  
  // Check that levels are numbered correctly
  const levelNumbers = criteria.levels.map(l => l.level).sort();
  return JSON.stringify(levelNumbers) === JSON.stringify([1, 2, 3, 4]);
};

// Additional validation for KSA codes
export const validateKSACode = (code: string, type: 'K' | 'S' | 'A'): boolean => {
  const pattern = new RegExp(`^${type}\\d+\\.\\d+$`);
  return pattern.test(code);
};

export const validateKSAMapping = (mapping: z.infer<typeof ksaMappingSchema>): boolean => {
  const knowledgeValid = mapping.knowledge.every(k => validateKSACode(k, 'K'));
  const skillsValid = mapping.skills.every(s => validateKSACode(s, 'S'));
  const attitudesValid = mapping.attitudes.every(a => validateKSACode(a, 'A'));
  
  return knowledgeValid && skillsValid && attitudesValid;
};