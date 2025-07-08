/**
 * V2 Assessment Schema Definitions
 * Defines the structure for assessment data stored in GCS
 */

import { z } from 'zod';

// Base timestamp schema
const timestampSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// User response for a single question
export const assessmentResponseSchema = z.object({
  questionId: z.string(),
  answer: z.string().nullable(),
  timeSpent: z.number().int().min(0), // seconds
  timestamp: z.string().datetime()
});

// KSA mastery item
export const ksaMasterySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  competencies: z.array(z.string()),
  mastery: z.number().int().min(0).max(2), // 0=red, 1=yellow, 2=green
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
  tasks: z.array(z.string()) // question IDs
});

// Domain score
export const domainScoreSchema = z.object({
  domain: z.enum(['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai']),
  score: z.number().min(0).max(100),
  correct: z.number().int().min(0),
  total: z.number().int().min(0)
});

// Assessment session data
export const assessmentSessionSchema = z.object({
  id: z.string(),
  userEmail: z.string().email(),
  sessionType: z.enum(['quick', 'comprehensive', 'adaptive', 'certification']),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']),
  
  // Configuration
  config: z.object({
    totalQuestions: z.number().int().min(1),
    timeLimit: z.number().int().min(0).optional(), // minutes
    passingScore: z.number().min(0).max(100),
    domains: z.array(z.string()),
    language: z.string().default('en')
  }),
  
  // Responses
  responses: z.array(assessmentResponseSchema),
  
  // Results (only populated after completion)
  results: z.object({
    overallScore: z.number().min(0).max(100),
    correctAnswers: z.number().int().min(0),
    totalQuestions: z.number().int().min(0),
    timeSpent: z.number().int().min(0), // seconds
    performance: z.enum(['excellent', 'good', 'satisfactory', 'needs-improvement']),
    passed: z.boolean(),
    
    // Domain breakdown
    domainScores: z.record(z.string(), z.number().min(0).max(100)),
    
    // KSA breakdown
    ksaScores: z.object({
      knowledge: z.number().min(0).max(100),
      skills: z.number().min(0).max(100),
      attitudes: z.number().min(0).max(100)
    }),
    
    // Detailed KSA demonstration
    ksaDemonstrated: z.object({
      knowledge: z.array(ksaMasterySchema),
      skills: z.array(ksaMasterySchema),
      attitudes: z.array(ksaMasterySchema)
    }),
    
    // Completion certificate (if passed)
    certificate: z.object({
      id: z.string(),
      issuedAt: z.string().datetime(),
      expiresAt: z.string().datetime().optional(),
      verificationCode: z.string()
    }).optional()
  }).optional(),
  
  // Metadata
  metadata: z.record(z.string(), z.any()).optional()
}).merge(timestampSchema);

// Assessment question (for reference)
export const assessmentQuestionSchema = z.object({
  id: z.string(),
  domain: z.string(),
  difficulty: z.enum(['basic', 'intermediate', 'advanced']),
  type: z.enum(['multiple_choice', 'short_answer', 'essay']),
  question: z.string(),
  options: z.record(z.string(), z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string(),
  ksaMapping: z.object({
    knowledge: z.array(z.string()),
    skills: z.array(z.string()),
    attitudes: z.array(z.string())
  }),
  metadata: z.record(z.string(), z.any()).optional()
});

// User assessment history
export const userAssessmentHistorySchema = z.object({
  userEmail: z.string().email(),
  assessments: z.array(z.object({
    id: z.string(),
    completedAt: z.string().datetime(),
    score: z.number().min(0).max(100),
    passed: z.boolean(),
    certificateId: z.string().optional()
  })),
  
  // Aggregated stats
  stats: z.object({
    totalAssessments: z.number().int().min(0),
    averageScore: z.number().min(0).max(100),
    bestScore: z.number().min(0).max(100),
    lastAssessmentDate: z.string().datetime(),
    certificatesEarned: z.number().int().min(0),
    
    // Progress tracking
    domainProgress: z.record(z.string(), z.object({
      averageScore: z.number().min(0).max(100),
      assessmentCount: z.number().int().min(0),
      trend: z.enum(['improving', 'stable', 'declining'])
    })),
    
    ksaProgress: z.object({
      knowledge: z.number().min(0).max(100),
      skills: z.number().min(0).max(100),
      attitudes: z.number().min(0).max(100)
    })
  })
}).merge(timestampSchema);

// Types exported from schemas
export type AssessmentResponse = z.infer<typeof assessmentResponseSchema>;
export type KSAMastery = z.infer<typeof ksaMasterySchema>;
export type DomainScore = z.infer<typeof domainScoreSchema>;
export type AssessmentSession = z.infer<typeof assessmentSessionSchema>;
export type AssessmentQuestion = z.infer<typeof assessmentQuestionSchema>;
export type UserAssessmentHistory = z.infer<typeof userAssessmentHistorySchema>;

// Validation helpers
export const validateAssessmentSession = (data: unknown): AssessmentSession => {
  return assessmentSessionSchema.parse(data);
};

export const validateUserHistory = (data: unknown): UserAssessmentHistory => {
  return userAssessmentHistorySchema.parse(data);
};