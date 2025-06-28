/**
 * Validation schema for PBL (Problem-Based Learning) scenarios
 */

import { z } from 'zod'
import { multilingualFieldSchema, idSchemas, commonSchemas } from './base.schema'

// Scenario info schema
const scenarioInfoSchema = z.object({
  id: idSchemas.scenarioId,
  ...multilingualFieldSchema('title').shape,
  ...multilingualFieldSchema('description').shape,
  difficulty: commonSchemas.difficulty,
  estimated_duration: z.number().positive().int(), // in minutes
  target_domains: z.array(idSchemas.domainId),
  prerequisites: z.array(z.string()),
  ...multilingualFieldSchema('learning_objectives').shape
}).transform(data => {
  // Transform learning_objectives fields to arrays
  const transformed: any = { ...data }
  Object.keys(data).forEach(key => {
    if (key === 'learning_objectives' || key.startsWith('learning_objectives_')) {
      if (typeof transformed[key] === 'string') {
        try {
          transformed[key] = JSON.parse(transformed[key])
        } catch {
          // If not valid JSON, split by newlines or semicolons
          transformed[key] = transformed[key].split(/[;\n]/).map((s: string) => s.trim()).filter(Boolean)
        }
      }
    }
  })
  return transformed
})

// KSA mapping schema for scenarios
const scenarioKSAMappingSchema = z.object({
  knowledge: z.array(idSchemas.knowledgeId),
  skills: z.array(idSchemas.skillId),
  attitudes: z.array(idSchemas.attitudeId)
})

// Task schema
const taskSchema = z.object({
  ...multilingualFieldSchema('task').shape,
  ...multilingualFieldSchema('expected_output').shape,
  ...multilingualFieldSchema('ai_tool_suggestion').shape
})

// Stage schema
const stageSchema = z.object({
  id: idSchemas.stageId,
  ...multilingualFieldSchema('name').shape,
  ...multilingualFieldSchema('description').shape,
  duration: z.number().positive().int(), // in minutes
  modality: z.enum(['individual', 'group', 'ai_assisted']),
  tasks: z.array(taskSchema),
  ...multilingualFieldSchema('learning_points').shape,
  ...multilingualFieldSchema('assessment_criteria').shape
}).transform(data => {
  // Transform array-like fields
  const transformed: any = { ...data }
  const arrayFields = ['learning_points', 'assessment_criteria']
  
  Object.keys(data).forEach(key => {
    arrayFields.forEach(field => {
      if (key === field || key.startsWith(`${field}_`)) {
        if (typeof transformed[key] === 'string') {
          try {
            transformed[key] = JSON.parse(transformed[key])
          } catch {
            transformed[key] = transformed[key].split(/[;\n]/).map((s: string) => s.trim()).filter(Boolean)
          }
        }
      }
    })
  })
  return transformed
})

// Evaluation criteria schema
const evaluationCriteriaSchema = z.object({
  ...multilingualFieldSchema('criteria').shape,
  weight: commonSchemas.percentage
})

// Complete PBL scenario file schema
export const pblScenarioFileSchema = z.object({
  scenario_info: scenarioInfoSchema,
  ksa_mapping: scenarioKSAMappingSchema,
  stages: z.array(stageSchema),
  evaluation: z.object({
    ...multilingualFieldSchema('rubric_description').shape,
    criteria: z.array(evaluationCriteriaSchema),
    ...multilingualFieldSchema('completion_requirements').shape
  }).optional()
})

// Type exports
export type PBLScenarioFile = z.infer<typeof pblScenarioFileSchema>
export type ScenarioInfo = z.infer<typeof scenarioInfoSchema>
export type Stage = z.infer<typeof stageSchema>
export type Task = z.infer<typeof taskSchema>

// Helper functions
export function validateStageDuration(scenario: PBLScenarioFile): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Calculate total duration from stages
  const totalStageDuration = scenario.stages.reduce((sum, stage) => sum + stage.duration, 0)
  
  // Check if it matches estimated duration (with some tolerance)
  const estimatedDuration = scenario.scenario_info.estimated_duration
  const tolerance = estimatedDuration * 0.1 // 10% tolerance
  
  if (Math.abs(totalStageDuration - estimatedDuration) > tolerance) {
    errors.push(
      `Total stage duration (${totalStageDuration} min) differs significantly from estimated duration (${estimatedDuration} min)`
    )
  }

  return { valid: errors.length === 0, errors }
}

export function validateScenarioKSAReferences(
  scenario: PBLScenarioFile,
  validKSAIds: { knowledgeIds: string[], skillIds: string[], attitudeIds: string[] }
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check knowledge references
  scenario.ksa_mapping.knowledge.forEach(kId => {
    if (!validKSAIds.knowledgeIds.includes(kId)) {
      errors.push(`Invalid knowledge reference ${kId} in scenario ${scenario.scenario_info.id}`)
    }
  })

  // Check skill references
  scenario.ksa_mapping.skills.forEach(sId => {
    if (!validKSAIds.skillIds.includes(sId)) {
      errors.push(`Invalid skill reference ${sId} in scenario ${scenario.scenario_info.id}`)
    }
  })

  // Check attitude references
  scenario.ksa_mapping.attitudes.forEach(aId => {
    if (!validKSAIds.attitudeIds.includes(aId)) {
      errors.push(`Invalid attitude reference ${aId} in scenario ${scenario.scenario_info.id}`)
    }
  })

  return { valid: errors.length === 0, errors }
}