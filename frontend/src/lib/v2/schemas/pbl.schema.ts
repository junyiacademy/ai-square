/**
 * V2 PBL (Problem-Based Learning) Schema Definitions
 * Defines the structure for PBL assessment data stored in GCS
 */

import { z } from 'zod';

// Base entity schema with UUID and timestamps
const baseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Source tracking for data loaded from YAML
const sourceTrackingSchema = z.object({
  sourceFile: z.string(), // e.g., "tourism_scenario.yaml"
  sourceId: z.string(), // original ID from YAML
  lastSyncedAt: z.string().datetime()
});

// Scenario entity (from YAML files)
export const scenarioSchema = z.object({
  title: z.record(z.string(), z.string()), // multi-language
  description: z.record(z.string(), z.string()), // multi-language
  imageUrl: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedMinutes: z.number().int().min(1),
  domains: z.array(z.string()), // AI literacy domains
  competencies: z.array(z.string()), // competency codes
  ksaMapping: z.object({
    knowledge: z.array(z.string()),
    skills: z.array(z.string()),
    attitudes: z.array(z.string())
  }),
  programIds: z.array(z.string().uuid()), // list of program attempts
  metadata: z.record(z.string(), z.any()).optional()
})
.merge(baseEntitySchema)
.merge(sourceTrackingSchema);

// Program entity (user's attempt at a scenario)
export const programSchema = z.object({
  userEmail: z.string().email(),
  scenarioId: z.string().uuid(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'abandoned']),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  timeSpentMinutes: z.number().int().min(0).default(0),
  
  // Program configuration
  config: z.object({
    language: z.string().default('en'),
    adaptiveDifficulty: z.boolean().default(false),
    aiTutorEnabled: z.boolean().default(true)
  }),
  
  // Progress tracking
  progress: z.object({
    currentTaskIndex: z.number().int().min(0).default(0),
    completedTasks: z.number().int().min(0).default(0),
    totalTasks: z.number().int().min(0)
  }),
  
  // Overall results (populated on completion)
  results: z.object({
    overallScore: z.number().min(0).max(100),
    domainScores: z.record(z.string(), z.number().min(0).max(100)),
    ksaScores: z.object({
      knowledge: z.number().min(0).max(100),
      skills: z.number().min(0).max(100),
      attitudes: z.number().min(0).max(100)
    }),
    performance: z.enum(['excellent', 'good', 'satisfactory', 'needs-improvement']),
    feedback: z.record(z.string(), z.string()).optional(), // multi-language feedback
    certificateId: z.string().uuid().optional()
  }).optional(),
  
  taskIds: z.array(z.string().uuid()), // ordered list of task attempts
  metadata: z.record(z.string(), z.any()).optional()
})
.merge(baseEntitySchema);

// Task entity (user's attempt at a question/activity)
export const taskSchema = z.object({
  programId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  userEmail: z.string().email(),
  
  // Task info from YAML
  sourceTask: z.object({
    id: z.string(), // original task ID from YAML
    title: z.record(z.string(), z.string()),
    description: z.record(z.string(), z.string()),
    type: z.enum(['multiple_choice', 'short_answer', 'code_practice', 'creative_task', 'reflection']),
    difficulty: z.enum(['basic', 'intermediate', 'advanced']),
    points: z.number().int().min(1).default(10),
    expectedTimeMinutes: z.number().int().min(1).default(5)
  }),
  
  // User's attempt
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  timeSpentSeconds: z.number().int().min(0).default(0),
  
  // User's response
  response: z.object({
    answer: z.any(), // varies by task type
    attachments: z.array(z.string()).optional(), // URLs to uploaded files
    iterations: z.number().int().min(1).default(1), // number of attempts
    lastModified: z.string().datetime()
  }).optional(),
  
  // AI interactions
  aiInteractions: z.array(z.object({
    timestamp: z.string().datetime(),
    userMessage: z.string(),
    aiResponse: z.string(),
    tokensUsed: z.number().int().min(0).optional()
  })).default([]),
  
  evaluationId: z.string().uuid().optional(), // link to evaluation
  metadata: z.record(z.string(), z.any()).optional()
})
.merge(baseEntitySchema);

// Evaluation entity (AI evaluation of a task)
export const evaluationSchema = z.object({
  taskId: z.string().uuid(),
  programId: z.string().uuid(),
  userEmail: z.string().email(),
  
  // Evaluation details
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  
  // Detailed scoring
  criteria: z.array(z.object({
    name: z.string(),
    weight: z.number().min(0).max(1),
    score: z.number().min(0).max(100),
    feedback: z.string()
  })),
  
  // KSA demonstration
  ksaDemonstrated: z.object({
    knowledge: z.array(z.string()),
    skills: z.array(z.string()),
    attitudes: z.array(z.string())
  }),
  
  // AI feedback
  feedback: z.object({
    summary: z.record(z.string(), z.string()), // multi-language
    strengths: z.record(z.string(), z.array(z.string())),
    improvements: z.record(z.string(), z.array(z.string())),
    nextSteps: z.record(z.string(), z.array(z.string()))
  }),
  
  // Evaluation metadata
  evaluatedBy: z.enum(['ai', 'human', 'hybrid']).default('ai'),
  aiModel: z.string().optional(),
  tokensUsed: z.number().int().min(0).optional(),
  
  metadata: z.record(z.string(), z.any()).optional()
})
.merge(baseEntitySchema);

// Completion entity (program completion record)
export const completionSchema = z.object({
  programId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  userEmail: z.string().email(),
  
  // Completion details
  completedAt: z.string().datetime(),
  totalTimeMinutes: z.number().int().min(0),
  tasksCompleted: z.number().int().min(0),
  tasksTotal: z.number().int().min(0),
  
  // Overall results
  overallScore: z.number().min(0).max(100),
  performance: z.enum(['excellent', 'good', 'satisfactory', 'needs-improvement']),
  
  // Domain mastery
  domainMastery: z.array(z.object({
    domain: z.string(),
    score: z.number().min(0).max(100),
    competencies: z.array(z.object({
      code: z.string(),
      demonstrated: z.boolean(),
      score: z.number().min(0).max(100).optional()
    }))
  })),
  
  // KSA achievement
  ksaAchievement: z.object({
    knowledge: z.object({
      score: z.number().min(0).max(100),
      items: z.array(z.object({
        code: z.string(),
        name: z.string(),
        demonstrated: z.boolean()
      }))
    }),
    skills: z.object({
      score: z.number().min(0).max(100),
      items: z.array(z.object({
        code: z.string(),
        name: z.string(),
        demonstrated: z.boolean()
      }))
    }),
    attitudes: z.object({
      score: z.number().min(0).max(100),
      items: z.array(z.object({
        code: z.string(),
        name: z.string(),
        demonstrated: z.boolean()
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
  recommendations: z.record(z.string(), z.array(z.string())), // next learning paths
  
  metadata: z.record(z.string(), z.any()).optional()
})
.merge(baseEntitySchema);

// Log entry for detailed activity tracking
export const pblLogSchema = z.object({
  userEmail: z.string().email(),
  programId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  
  // Log details
  eventType: z.enum([
    'program_started',
    'program_resumed',
    'program_completed',
    'program_abandoned',
    'task_started',
    'task_completed',
    'task_skipped',
    'ai_interaction',
    'response_saved',
    'evaluation_completed',
    'certificate_issued',
    'error',
    'custom'
  ]),
  
  eventData: z.record(z.string(), z.any()),
  
  // Context
  sessionId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  
  timestamp: z.string().datetime()
})
.merge(z.object({
  id: z.string().uuid()
}));

// Types exported from schemas
export type Scenario = z.infer<typeof scenarioSchema>;
export type Program = z.infer<typeof programSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;
export type Completion = z.infer<typeof completionSchema>;
export type PBLLog = z.infer<typeof pblLogSchema>;

// Validation helpers
export const validateScenario = (data: unknown): Scenario => {
  return scenarioSchema.parse(data);
};

export const validateProgram = (data: unknown): Program => {
  return programSchema.parse(data);
};

export const validateTask = (data: unknown): Task => {
  return taskSchema.parse(data);
};

export const validateEvaluation = (data: unknown): Evaluation => {
  return evaluationSchema.parse(data);
};

export const validateCompletion = (data: unknown): Completion => {
  return completionSchema.parse(data);
};

export const validatePBLLog = (data: unknown): PBLLog => {
  return pblLogSchema.parse(data);
};