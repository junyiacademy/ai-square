/**
 * Unit tests for Zod scenario validation schemas
 */

import {
  pblScenarioSchema,
  discoveryScenarioSchema,
  assessmentScenarioSchema,
  validateScenario,
  getSchemaByMode,
} from '../scenario-schema';

describe('scenario-schema', () => {
  const baseScenarioData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    mode: 'pbl',
    status: 'draft',
    version: '1.0.0',
    sourceType: 'ai_generated',
    sourceMetadata: {},
    title: { en: 'Test Scenario', zhTW: '測試情境' },
    description: { en: 'Test Description', zhTW: '測試描述' },
    objectives: { en: ['Objective 1'], zhTW: ['目標 1'] },
    difficulty: 'beginner',
    estimatedMinutes: 60,
    prerequisites: [],
    taskTemplates: [
      {
        id: 'task-1',
        title: { en: 'Task 1', zhTW: '任務 1' },
        type: 'analysis',
      },
    ],
    xpRewards: {},
    unlockRequirements: {},
    aiModules: {},
    resources: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    metadata: {},
  };

  describe('pblScenarioSchema', () => {
    it('should validate correct PBL scenario', () => {
      const pblData = {
        ...baseScenarioData,
        mode: 'pbl' as const,
        pblData: {
          scenario: {
            context: { en: 'Context', zhTW: '情境' },
            challenge: { en: 'Challenge', zhTW: '挑戰' },
          },
          stages: [
            {
              id: 'explore',
              name: { en: 'Explore', zhTW: '探索' },
              type: 'explore' as const,
              taskIds: ['task-1'],
            },
          ],
        },
        discoveryData: {},
        assessmentData: {},
      };

      const result = pblScenarioSchema.safeParse(pblData);
      expect(result.success).toBe(true);
    });

    it('should reject PBL scenario without pblData', () => {
      const invalidData = {
        ...baseScenarioData,
        mode: 'pbl' as const,
        discoveryData: {},
        assessmentData: {},
      };

      const result = pblScenarioSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate multilingual fields', () => {
      const pblData = {
        ...baseScenarioData,
        mode: 'pbl' as const,
        title: { en: 'Title' }, // Missing zhTW is ok
        pblData: {
          scenario: {
            context: { en: 'Context' },
            challenge: { en: 'Challenge' },
          },
          stages: [],
        },
        discoveryData: {},
        assessmentData: {},
      };

      const result = pblScenarioSchema.safeParse(pblData);
      expect(result.success).toBe(true);
    });
  });

  describe('discoveryScenarioSchema', () => {
    it('should validate correct Discovery scenario', () => {
      const discoveryData = {
        ...baseScenarioData,
        mode: 'discovery' as const,
        discoveryData: {
          careerPath: 'Software Engineer',
          requiredSkills: ['Programming', 'Problem Solving'],
          industryInsights: {},
          careerLevel: 'entry' as const,
          relatedCareers: ['Data Scientist', 'DevOps Engineer'],
        },
        pblData: {},
        assessmentData: {},
      };

      const result = discoveryScenarioSchema.safeParse(discoveryData);
      expect(result.success).toBe(true);
    });

    it('should validate salary range if provided', () => {
      const discoveryData = {
        ...baseScenarioData,
        mode: 'discovery' as const,
        discoveryData: {
          careerPath: 'Software Engineer',
          requiredSkills: ['Programming'],
          industryInsights: {},
          careerLevel: 'entry' as const,
          estimatedSalaryRange: {
            min: 60000,
            max: 120000,
            currency: 'USD',
          },
          relatedCareers: [],
        },
        pblData: {},
        assessmentData: {},
      };

      const result = discoveryScenarioSchema.safeParse(discoveryData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid career level', () => {
      const invalidData = {
        ...baseScenarioData,
        mode: 'discovery' as const,
        discoveryData: {
          careerPath: 'Software Engineer',
          requiredSkills: ['Programming'],
          industryInsights: {},
          careerLevel: 'invalid_level',
          relatedCareers: [],
        },
        pblData: {},
        assessmentData: {},
      };

      const result = discoveryScenarioSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('assessmentScenarioSchema', () => {
    it('should validate correct Assessment scenario', () => {
      const assessmentData = {
        ...baseScenarioData,
        mode: 'assessment' as const,
        assessmentData: {
          domains: ['ai_literacy', 'ethics'],
          questionTypes: ['multiple_choice' as const],
          passingScore: 70,
          randomizeQuestions: true,
          showCorrectAnswers: true,
        },
        pblData: {},
        discoveryData: {},
      };

      const result = assessmentScenarioSchema.safeParse(assessmentData);
      expect(result.success).toBe(true);
    });

    it('should validate passing score range', () => {
      const assessmentData = {
        ...baseScenarioData,
        mode: 'assessment' as const,
        assessmentData: {
          domains: ['ai_literacy'],
          questionTypes: ['multiple_choice' as const],
          passingScore: 150, // Invalid: > 100
          randomizeQuestions: false,
          showCorrectAnswers: true,
        },
        pblData: {},
        discoveryData: {},
      };

      const result = assessmentScenarioSchema.safeParse(assessmentData);
      expect(result.success).toBe(false);
    });
  });

  describe('validateScenario', () => {
    it('should return success for valid scenario', () => {
      const validData = {
        ...baseScenarioData,
        mode: 'pbl' as const,
        pblData: {
          scenario: {
            context: { en: 'Context' },
            challenge: { en: 'Challenge' },
          },
          stages: [],
        },
        discoveryData: {},
        assessmentData: {},
      };

      const result = validateScenario(validData);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return errors for invalid scenario', () => {
      const invalidData = {
        ...baseScenarioData,
        mode: 'invalid_mode',
      };

      const result = validateScenario(invalidData);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should validate UUID format', () => {
      const invalidData = {
        ...baseScenarioData,
        id: 'not-a-uuid',
      };

      const result = validateScenario(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate difficulty enum', () => {
      const invalidData = {
        ...baseScenarioData,
        difficulty: 'super_hard',
      };

      const result = validateScenario(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate estimated minutes range', () => {
      const invalidData = {
        ...baseScenarioData,
        estimatedMinutes: 0, // Invalid: < 1
      };

      const result = validateScenario(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('getSchemaByMode', () => {
    it('should return PBL schema for pbl mode', () => {
      const schema = getSchemaByMode('pbl');
      expect(schema).toBe(pblScenarioSchema);
    });

    it('should return Discovery schema for discovery mode', () => {
      const schema = getSchemaByMode('discovery');
      expect(schema).toBe(discoveryScenarioSchema);
    });

    it('should return Assessment schema for assessment mode', () => {
      const schema = getSchemaByMode('assessment');
      expect(schema).toBe(assessmentScenarioSchema);
    });

    it('should throw error for unknown mode', () => {
      expect(() => {
        getSchemaByMode('unknown' as 'pbl');
      }).toThrow('Unknown mode');
    });
  });

  describe('Task template validation', () => {
    it('should validate task types', () => {
      const data = {
        ...baseScenarioData,
        taskTemplates: [
          {
            id: 'task-1',
            title: { en: 'Task 1' },
            type: 'invalid_type',
          },
        ],
      };

      const result = validateScenario(data);
      expect(result.success).toBe(false);
    });

    it('should allow passthrough additional fields in tasks', () => {
      const data = {
        ...baseScenarioData,
        mode: 'pbl' as const,
        taskTemplates: [
          {
            id: 'task-1',
            title: { en: 'Task 1' },
            type: 'analysis' as const,
            customField: 'custom value',
          },
        ],
        pblData: {
          scenario: {
            context: { en: 'Context' },
            challenge: { en: 'Challenge' },
          },
          stages: [],
        },
        discoveryData: {},
        assessmentData: {},
      };

      const result = validateScenario(data);
      expect(result.success).toBe(true);
    });
  });
});
