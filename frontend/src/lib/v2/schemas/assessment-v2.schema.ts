/**
 * V2 Assessment Schema - Following Unified Architecture
 * Assessment mode implementation of the unified SCENARIO → PROGRAM → TASK structure
 */

import { z } from 'zod';

// Base entity schema with UUID and timestamps
const baseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Assessment Scenario (從 YAML 載入的測驗定義)
export const assessmentScenarioSchema = z.object({
  sourceFile: z.string(), // e.g., "ai_literacy_questions_en.yaml"
  sourceId: z.string(), // e.g., "ai_literacy"
  lastSyncedAt: z.string().datetime(),
  
  type: z.literal('assessment'),
  title: z.record(z.string(), z.string()), // multi-language
  description: z.record(z.string(), z.string()),
  
  // Assessment specific
  assessmentType: z.enum(['quick', 'comprehensive', 'adaptive', 'certification']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedMinutes: z.number().int().min(1),
  totalQuestions: z.number().int().min(1),
  passingScore: z.number().min(0).max(100),
  
  // Domain coverage
  domains: z.array(z.string()),
  competencies: z.array(z.string()),
  
  // Question pool metadata
  questionPool: z.object({
    total: z.number().int().min(0),
    byDomain: z.record(z.string(), z.number().int().min(0)),
    byDifficulty: z.record(z.string(), z.number().int().min(0))
  }),
  
  // User attempts
  programIds: z.array(z.string().uuid()),
  
  // Aggregate stats (cached for performance)
  stats: z.object({
    totalAttempts: z.number().int().min(0),
    averageScore: z.number().min(0).max(100),
    passRate: z.number().min(0).max(100),
    lastActivityAt: z.string().datetime().optional()
  }).optional(),
  
  metadata: z.record(z.string(), z.any()).optional()
})
.merge(baseEntitySchema);

// Assessment Program (用戶的測驗嘗試)
export const assessmentProgramSchema = z.object({
  userEmail: z.string().email(),
  scenarioId: z.string().uuid(),
  type: z.literal('assessment'),
  
  status: z.enum(['not_started', 'in_progress', 'completed', 'abandoned']),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  timeSpentMinutes: z.number().int().min(0).default(0),
  
  // Program configuration
  config: z.object({
    language: z.string().default('en'),
    randomizeQuestions: z.boolean().default(true),
    showFeedback: z.boolean().default(true),
    allowReview: z.boolean().default(true)
  }),
  
  // Progress tracking
  progress: z.object({
    currentQuestionIndex: z.number().int().min(0).default(0),
    answeredQuestions: z.number().int().min(0).default(0),
    totalQuestions: z.number().int().min(0)
  }),
  
  // Results (populated on completion)
  results: z.object({
    overallScore: z.number().min(0).max(100),
    correctAnswers: z.number().int().min(0),
    totalQuestions: z.number().int().min(0),
    passed: z.boolean(),
    performance: z.enum(['excellent', 'good', 'satisfactory', 'needs-improvement']),
    
    // Domain breakdown
    domainScores: z.record(z.string(), z.object({
      score: z.number().min(0).max(100),
      correct: z.number().int().min(0),
      total: z.number().int().min(0)
    })),
    
    // KSA scores
    ksaScores: z.object({
      knowledge: z.number().min(0).max(100),
      skills: z.number().min(0).max(100),
      attitudes: z.number().min(0).max(100)
    }),
    
    certificateId: z.string().uuid().optional()
  }).optional(),
  
  taskIds: z.array(z.string().uuid()), // ordered list of question tasks
  metadata: z.record(z.string(), z.any()).optional()
})
.merge(baseEntitySchema);

// Assessment Task (一道題目的作答記錄，包含所有 logs)
export const assessmentTaskSchema = z.object({
  programId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  userEmail: z.string().email(),
  type: z.literal('assessment'),
  
  // Question info from YAML
  sourceQuestion: z.object({
    id: z.string(),
    domain: z.string(),
    difficulty: z.enum(['basic', 'intermediate', 'advanced']),
    type: z.enum(['multiple_choice', 'short_answer', 'essay']),
    question: z.record(z.string(), z.string()), // multi-language
    options: z.record(z.string(), z.record(z.string(), z.string())).optional(), // multi-language
    correctAnswer: z.string(),
    explanation: z.record(z.string(), z.string()), // multi-language
    ksaMapping: z.object({
      knowledge: z.array(z.string()),
      skills: z.array(z.string()),
      attitudes: z.array(z.string())
    }),
    points: z.number().int().min(1).default(1)
  }),
  
  // User's attempt
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  timeSpentSeconds: z.number().int().min(0).default(0),
  
  // Answer and history (all logs embedded here)
  answerHistory: z.array(z.object({
    timestamp: z.string().datetime(),
    action: z.enum(['view', 'answer', 'change', 'submit', 'skip']),
    answer: z.any().optional(), // varies by question type
    timeSpent: z.number().int().min(0) // seconds since last action
  })).default([]),
  
  // Final answer
  finalAnswer: z.any().optional(),
  isCorrect: z.boolean().optional(),
  score: z.number().min(0).max(100).optional(),
  
  // AI interactions (if any, e.g., for essay grading)
  aiInteractions: z.array(z.object({
    timestamp: z.string().datetime(),
    type: z.enum(['hint_request', 'explanation_request', 'essay_grading']),
    request: z.string(),
    response: z.string(),
    model: z.string().optional()
  })).default([]),
  
  evaluationId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional()
})
.merge(baseEntitySchema);

// Assessment Evaluation (AI evaluation of answers)
export const assessmentEvaluationSchema = z.object({
  taskId: z.string().uuid(),
  programId: z.string().uuid(),
  userEmail: z.string().email(),
  
  // Evaluation details
  score: z.number().min(0).max(100),
  isCorrect: z.boolean(),
  
  // For essay/short answer grading
  gradingCriteria: z.array(z.object({
    criterion: z.string(),
    weight: z.number().min(0).max(1),
    score: z.number().min(0).max(100),
    feedback: z.string()
  })).optional(),
  
  // KSA demonstration
  ksaDemonstrated: z.object({
    knowledge: z.array(z.string()),
    skills: z.array(z.string()),
    attitudes: z.array(z.string())
  }),
  
  // AI feedback
  feedback: z.record(z.string(), z.string()), // multi-language
  
  // Evaluation metadata
  evaluatedBy: z.enum(['system', 'ai', 'human']).default('system'),
  aiModel: z.string().optional(),
  
  metadata: z.record(z.string(), z.any()).optional()
})
.merge(baseEntitySchema);

// Assessment Completion (測驗完成記錄)
export const assessmentCompletionSchema = z.object({
  programId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  userEmail: z.string().email(),
  
  completedAt: z.string().datetime(),
  totalTimeMinutes: z.number().int().min(0),
  questionsAnswered: z.number().int().min(0),
  questionsTotal: z.number().int().min(0),
  
  // Overall results
  overallScore: z.number().min(0).max(100),
  passed: z.boolean(),
  performance: z.enum(['excellent', 'good', 'satisfactory', 'needs-improvement']),
  
  // Domain mastery
  domainMastery: z.array(z.object({
    domain: z.string(),
    score: z.number().min(0).max(100),
    questionsCorrect: z.number().int().min(0),
    questionsTotal: z.number().int().min(0),
    competencies: z.array(z.object({
      code: z.string(),
      demonstrated: z.boolean()
    }))
  })),
  
  // KSA achievement
  ksaAchievement: z.object({
    knowledge: z.object({
      score: z.number().min(0).max(100),
      items: z.array(z.object({
        code: z.string(),
        name: z.string(),
        demonstrated: z.boolean(),
        questions: z.array(z.string()) // question IDs
      }))
    }),
    skills: z.object({
      score: z.number().min(0).max(100),
      items: z.array(z.object({
        code: z.string(),
        name: z.string(),
        demonstrated: z.boolean(),
        questions: z.array(z.string())
      }))
    }),
    attitudes: z.object({
      score: z.number().min(0).max(100),
      items: z.array(z.object({
        code: z.string(),
        name: z.string(),
        demonstrated: z.boolean(),
        questions: z.array(z.string())
      }))
    })
  }),
  
  // Certificate (if earned)
  certificate: z.object({
    id: z.string().uuid(),
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime().optional(),
    verificationCode: z.string(),
    shareableUrl: z.string().optional()
  }).optional(),
  
  // AI-generated summary
  summary: z.record(z.string(), z.string()), // multi-language
  recommendations: z.record(z.string(), z.array(z.string())), // next steps
  
  metadata: z.record(z.string(), z.any()).optional()
})
.merge(baseEntitySchema);

// Types
export type AssessmentScenario = z.infer<typeof assessmentScenarioSchema>;
export type AssessmentProgram = z.infer<typeof assessmentProgramSchema>;
export type AssessmentTask = z.infer<typeof assessmentTaskSchema>;
export type AssessmentEvaluation = z.infer<typeof assessmentEvaluationSchema>;
export type AssessmentCompletion = z.infer<typeof assessmentCompletionSchema>;

// Validation helpers
export const validateAssessmentScenario = (data: unknown): AssessmentScenario => {
  return assessmentScenarioSchema.parse(data);
};

export const validateAssessmentProgram = (data: unknown): AssessmentProgram => {
  return assessmentProgramSchema.parse(data);
};

export const validateAssessmentTask = (data: unknown): AssessmentTask => {
  return assessmentTaskSchema.parse(data);
};

export const validateAssessmentEvaluation = (data: unknown): AssessmentEvaluation => {
  return assessmentEvaluationSchema.parse(data);
};

export const validateAssessmentCompletion = (data: unknown): AssessmentCompletion => {
  return assessmentCompletionSchema.parse(data);
};