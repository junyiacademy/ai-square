/**
 * Validation schema for assessment questions
 */

import { z } from 'zod'
import { multilingualFieldSchema, idSchemas, commonSchemas } from './base.schema'

// Assessment configuration schema
const assessmentConfigSchema = z.object({
  total_questions: z.number().positive().int(),
  time_limit_minutes: z.number().positive().int(),
  passing_score: z.number().min(0).max(100),
  domains: z.array(idSchemas.domainId)
})

// Domain info schema
const domainInfoSchema = z.object({
  ...multilingualFieldSchema('description').shape,
  question_count: z.number().nonnegative().int()
})

// Question options schema
const optionsSchema = z.object({
  a: z.string().min(1),
  b: z.string().min(1),
  c: z.string().min(1),
  d: z.string().min(1)
})

// KSA mapping schema
const ksaMappingSchema = z.object({
  knowledge: z.array(idSchemas.knowledgeId),
  skills: z.array(idSchemas.skillId),
  attitudes: z.array(idSchemas.attitudeId)
})

// Individual question schema
const questionSchema = z.object({
  id: idSchemas.questionId,
  domain: idSchemas.domainId,
  difficulty: commonSchemas.difficulty,
  type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
  ...multilingualFieldSchema('question').shape,
  options: optionsSchema,
  options_zh: optionsSchema,
  options_es: optionsSchema,
  options_ja: optionsSchema,
  options_ko: optionsSchema,
  options_fr: optionsSchema,
  options_de: optionsSchema,
  options_ru: optionsSchema,
  options_it: optionsSchema,
  correct_answer: z.enum(['a', 'b', 'c', 'd']),
  ...multilingualFieldSchema('explanation').shape,
  ksa_mapping: ksaMappingSchema
})

// Complete assessment file schema
export const assessmentFileSchema = z.object({
  assessment_config: assessmentConfigSchema,
  domains: z.record(idSchemas.domainId, domainInfoSchema),
  questions: z.array(questionSchema)
})

// Type exports
export type AssessmentFile = z.infer<typeof assessmentFileSchema>
export type AssessmentConfig = z.infer<typeof assessmentConfigSchema>
export type Question = z.infer<typeof questionSchema>
export type KSAMapping = z.infer<typeof ksaMappingSchema>

// Helper functions
export function validateQuestionDistribution(data: AssessmentFile): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Count questions per domain
  const domainCounts: Record<string, number> = {}
  data.questions.forEach(q => {
    domainCounts[q.domain] = (domainCounts[q.domain] || 0) + 1
  })

  // Check if counts match configuration
  Object.entries(data.domains).forEach(([domainId, domainInfo]) => {
    const actualCount = domainCounts[domainId] || 0
    if (actualCount !== domainInfo.question_count) {
      errors.push(`Domain ${domainId} has ${actualCount} questions but expected ${domainInfo.question_count}`)
    }
  })

  // Check total question count
  const totalQuestions = data.questions.length
  if (totalQuestions !== data.assessment_config.total_questions) {
    errors.push(`Total questions is ${totalQuestions} but expected ${data.assessment_config.total_questions}`)
  }

  return { valid: errors.length === 0, errors }
}

export function validateQuestionKSAReferences(
  questions: Question[],
  validKSAIds: { knowledgeIds: string[], skillIds: string[], attitudeIds: string[] }
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  questions.forEach(question => {
    // Check knowledge references
    question.ksa_mapping.knowledge.forEach(kId => {
      if (!validKSAIds.knowledgeIds.includes(kId)) {
        errors.push(`Invalid knowledge reference ${kId} in question ${question.id}`)
      }
    })

    // Check skill references
    question.ksa_mapping.skills.forEach(sId => {
      if (!validKSAIds.skillIds.includes(sId)) {
        errors.push(`Invalid skill reference ${sId} in question ${question.id}`)
      }
    })

    // Check attitude references
    question.ksa_mapping.attitudes.forEach(aId => {
      if (!validKSAIds.attitudeIds.includes(aId)) {
        errors.push(`Invalid attitude reference ${aId} in question ${question.id}`)
      }
    })
  })

  return { valid: errors.length === 0, errors }
}