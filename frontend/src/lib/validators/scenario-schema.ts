/**
 * Zod schemas for scenario validation
 * Supports PBL, Discovery, and Assessment modes
 */

import { z } from "zod";

/**
 * Multilingual field schema
 */
const multilingualSchema = z.record(z.string(), z.string());

/**
 * Task template schema (common for all modes)
 */
const taskTemplateSchema = z
  .object({
    id: z.string(),
    title: multilingualSchema,
    type: z.enum([
      "analysis",
      "creation",
      "chat",
      "reflection",
      "quiz",
      "project",
    ]),
    description: multilingualSchema.optional(),
    // Allow additional fields
  })
  .passthrough();

/**
 * Base scenario schema (common fields)
 */
const baseScenarioSchema = z.object({
  id: z.string().uuid(),
  mode: z.enum(["pbl", "discovery", "assessment"]),
  status: z.enum(["draft", "published", "archived"]),
  version: z.string(),

  // Source tracking
  sourceType: z.enum(["yaml", "api", "ai_generated"]),
  sourcePath: z.string().optional(),
  sourceId: z.string().optional(),
  sourceMetadata: z.record(z.unknown()).default({}),

  // Basic info
  title: multilingualSchema,
  description: multilingualSchema,
  objectives: z.union([
    z.array(z.string()),
    z.record(z.string(), z.array(z.string())),
  ]),

  // Common attributes
  difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  estimatedMinutes: z.number().min(1).max(600),
  prerequisites: z.array(z.string()).default([]),

  // Task templates
  taskTemplates: z.array(taskTemplateSchema),
  taskCount: z.number().optional(),

  // Rewards
  xpRewards: z.record(z.string(), z.number()).default({}),
  unlockRequirements: z.record(z.unknown()).default({}),

  // Resources and AI
  aiModules: z.record(z.unknown()).default({}),
  resources: z.array(z.record(z.unknown())).default([]),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),

  // Metadata
  metadata: z.record(z.unknown()).default({}),
});

/**
 * PBL-specific schema
 */
export const pblScenarioSchema = baseScenarioSchema.extend({
  mode: z.literal("pbl"),
  pblData: z.object({
    scenario: z.object({
      context: multilingualSchema,
      challenge: multilingualSchema,
      roles: z.array(z.string()).optional(),
    }),
    stages: z.array(
      z.object({
        id: z.string(),
        name: multilingualSchema,
        type: z.enum(["explore", "analyze", "create", "evaluate", "reflect"]),
        description: multilingualSchema.optional(),
        taskIds: z.array(z.string()),
      }),
    ),
  }),
  discoveryData: z.record(z.unknown()).default({}),
  assessmentData: z.record(z.unknown()).default({}),
});

/**
 * Discovery-specific schema
 */
export const discoveryScenarioSchema = baseScenarioSchema.extend({
  mode: z.literal("discovery"),
  discoveryData: z.object({
    careerPath: z.string(),
    requiredSkills: z.array(z.string()),
    industryInsights: z.record(z.unknown()).default({}),
    careerLevel: z.enum(["entry", "intermediate", "senior", "expert"]),
    estimatedSalaryRange: z
      .object({
        min: z.number(),
        max: z.number(),
        currency: z.string(),
      })
      .optional(),
    relatedCareers: z.array(z.string()).default([]),
    dayInLife: multilingualSchema.optional(),
    challenges: z.record(z.string(), z.array(z.string())).optional(),
    rewards: z.record(z.string(), z.array(z.string())).optional(),
  }),
  pblData: z.record(z.unknown()).default({}),
  assessmentData: z.record(z.unknown()).default({}),
});

/**
 * Assessment-specific schema
 */
export const assessmentScenarioSchema = baseScenarioSchema.extend({
  mode: z.literal("assessment"),
  assessmentData: z.object({
    domains: z.array(z.string()),
    questionTypes: z.array(
      z.enum(["multiple_choice", "true_false", "short_answer", "essay"]),
    ),
    passingScore: z.number().min(0).max(100),
    timeLimit: z.number().optional(),
    randomizeQuestions: z.boolean().default(false),
    showCorrectAnswers: z.boolean().default(true),
  }),
  pblData: z.record(z.unknown()).default({}),
  discoveryData: z.record(z.unknown()).default({}),
});

/**
 * Union schema for all scenario types
 */
export const scenarioSchema = z.discriminatedUnion("mode", [
  pblScenarioSchema,
  discoveryScenarioSchema,
  assessmentScenarioSchema,
]);

/**
 * Type inference
 */
export type PBLScenario = z.infer<typeof pblScenarioSchema>;
export type DiscoveryScenario = z.infer<typeof discoveryScenarioSchema>;
export type AssessmentScenario = z.infer<typeof assessmentScenarioSchema>;
export type ValidatedScenario = z.infer<typeof scenarioSchema>;

/**
 * Validation helper function
 */
export function validateScenario(data: unknown): {
  success: boolean;
  data?: ValidatedScenario;
  errors?: Array<{ path: string; message: string }>;
} {
  try {
    const result = scenarioSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }));

    return { success: false, errors };
  } catch (error) {
    return {
      success: false,
      errors: [{ path: "root", message: String(error) }],
    };
  }
}

/**
 * Get schema by mode
 */
export function getSchemaByMode(mode: "pbl" | "discovery" | "assessment") {
  switch (mode) {
    case "pbl":
      return pblScenarioSchema;
    case "discovery":
      return discoveryScenarioSchema;
    case "assessment":
      return assessmentScenarioSchema;
    default:
      throw new Error(`Unknown mode: ${mode as string}`);
  }
}
