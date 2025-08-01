import { 
  convertScenarioToIScenario,
  convertProgramToIProgram,
  convertTaskToITask,
  convertEvaluationToIEvaluation,
  convertInteractionToIInteraction,
  convertScenarios,
  convertPrograms,
  convertTasks,
  convertEvaluations,
  convertInteractions
} from '../type-converters';

import type { DBScenario, DBProgram, DBTask, DBEvaluation, DBInteraction } from '@/types/database';

describe('type-converters', () => {
  describe('convertScenarioToIScenario', () => {
    it('converts database scenario to interface', () => {
      const dbScenario: DBScenario = {
        id: 'scenario-123',
        mode: 'pbl',
        status: 'active',
        version: 1,
        source_type: 'yaml',
        source_path: '/path/to/scenario.yaml',
        source_id: null,
        source_metadata: {},
        title: { en: 'Test Scenario' },
        description: { en: 'Test description' },
        objectives: ['objective1', 'objective2'],
        difficulty: 'intermediate',
        estimated_minutes: 60,
        prerequisites: null,
        task_templates: [
          { id: 'task1', title: { en: 'Task 1' }, type: 'question' }
        ],
        task_count: 1,
        xp_rewards: { completion: 100 },
        unlock_requirements: {},
        pbl_data: {},
        discovery_data: {},
        assessment_data: {},
        ai_modules: {},
        resources: [],
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        published_at: null,
        metadata: {}
      };

      const result = convertScenarioToIScenario(dbScenario);

      expect(result).toMatchObject({
        id: 'scenario-123',
        mode: 'pbl',
        status: 'active',
        title: { en: 'Test Scenario' },
        description: { en: 'Test description' },
        taskCount: 1,
        difficulty: 'intermediate',
        estimatedMinutes: 60
      });
    });

    it('handles optional fields', () => {
      const minimalScenario: DBScenario = {
        id: 'scenario-min',
        mode: 'assessment',
        status: 'draft',
        version: 1,
        source_type: 'api',
        source_path: null,
        source_id: 'api-123',
        source_metadata: {},
        title: { en: 'Minimal' },
        description: { en: 'Minimal desc' },
        objectives: [],
        difficulty: 'beginner',
        estimated_minutes: 30,
        prerequisites: null,
        task_templates: [],
        task_count: 0,
        xp_rewards: {},
        unlock_requirements: {},
        pbl_data: {},
        discovery_data: {},
        assessment_data: {},
        ai_modules: {},
        resources: [],
        created_at: new Date(),
        updated_at: new Date(),
        published_at: new Date(),
        metadata: {}
      };

      const result = convertScenarioToIScenario(minimalScenario);

      expect(result.sourcePath).toBeUndefined();
      expect(result.sourceId).toBe('api-123');
      expect(result.publishedAt).toBeDefined();
    });
  });

  describe('convertProgramToIProgram', () => {
    it('converts database program to interface', () => {
      const dbProgram: DBProgram = {
        id: 'program-123',
        user_id: 'user-123',
        scenario_id: 'scenario-123',
        mode: 'pbl',
        status: 'active',
        current_task_index: 1,
        completed_task_count: 0,
        total_task_count: 5,
        total_score: 0,
        domain_scores: { 'Engaging_with_AI': 50 },
        xp_earned: 0,
        badges_earned: [],
        created_at: new Date('2024-01-01'),
        started_at: new Date('2024-01-01'),
        completed_at: null,
        updated_at: new Date('2024-01-01'),
        last_activity_at: new Date('2024-01-01'),
        time_spent_seconds: 0,
        pbl_data: {},
        discovery_data: {},
        assessment_data: {},
        metadata: {}
      };

      const result = convertProgramToIProgram(dbProgram);

      expect(result).toMatchObject({
        id: 'program-123',
        userId: 'user-123',
        scenarioId: 'scenario-123',
        mode: 'pbl',
        status: 'active',
        currentTaskIndex: 1,
        totalTaskCount: 5,
        startedAt: expect.any(Date),
        completedAt: undefined
      });
    });
  });

  describe('convertTaskToITask', () => {
    it('converts database task to interface', () => {
      const dbTask: DBTask = {
        id: 'task-123',
        program_id: 'program-123',
        mode: 'pbl',
        task_index: 0,
        scenario_task_index: 0,
        title: { en: 'Task Title' },
        description: { en: 'Task Description' },
        type: 'question',
        status: 'pending',
        content: { question: 'What is AI?' },
        interactions: [],
        interaction_count: 0,
        user_response: null,
        score: null,
        max_score: 100,
        allowed_attempts: 3,
        attempt_count: 0,
        time_limit_seconds: null,
        time_spent_seconds: 0,
        ai_config: {},
        created_at: new Date(),
        started_at: null,
        completed_at: null,
        updated_at: new Date(),
        pbl_data: {},
        discovery_data: {},
        assessment_data: {},
        metadata: {}
      };

      const result = convertTaskToITask(dbTask);

      expect(result).toMatchObject({
        id: 'task-123',
        programId: 'program-123',
        type: 'question',
        status: 'pending',
        title: { en: 'Task Title' },
        content: { question: 'What is AI?' }
      });
    });
  });

  describe('convertEvaluationToIEvaluation', () => {
    it('converts database evaluation to interface', () => {
      const dbEvaluation: DBEvaluation = {
        id: 'eval-123',
        user_id: 'user-123',
        program_id: 'program-123',
        task_id: 'task-123',
        mode: 'pbl',
        evaluation_type: 'formative',
        evaluation_subtype: null,
        score: 85,
        max_score: 100,
        domain_scores: { 'Engaging_with_AI': 85 },
        feedback_text: 'Good job!',
        feedback_data: {},
        ai_provider: 'vertex-ai',
        ai_model: 'gemini-2.5-flash',
        ai_analysis: {},
        time_taken_seconds: 120,
        created_at: new Date(),
        pbl_data: {},
        discovery_data: {},
        assessment_data: {},
        metadata: {}
      };

      const result = convertEvaluationToIEvaluation(dbEvaluation);

      expect(result).toMatchObject({
        id: 'eval-123',
        userId: 'user-123',
        programId: 'program-123',
        taskId: 'task-123',
        score: 85,
        maxScore: 100,
        feedbackText: 'Good job!',
        aiProvider: 'vertex-ai'
      });
    });
  });

  describe('convertInteractionToIInteraction', () => {
    it('converts database interaction to interface', () => {
      const dbInteraction: DBInteraction = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        type: 'user_input',
        content: 'User message',
        metadata: { source: 'chat' }
      };

      const result = convertInteractionToIInteraction(dbInteraction);

      expect(result).toMatchObject({
        timestamp: '2024-01-01T12:00:00.000Z',
        type: 'user_input',
        content: 'User message',
        metadata: { source: 'chat' }
      });
    });

    it('handles string timestamp', () => {
      const dbInteraction: DBInteraction = {
        timestamp: '2024-01-01T12:00:00Z' as any,
        type: 'ai_response',
        content: 'AI message',
        metadata: undefined
      };

      const result = convertInteractionToIInteraction(dbInteraction);

      expect(result.timestamp).toBe('2024-01-01T12:00:00Z');
      expect(result.metadata).toBeUndefined();
    });
  });

  describe('batch conversion functions', () => {
    it('convertScenarios converts array of scenarios', () => {
      const scenarios: DBScenario[] = [
        {
          id: 'sc1',
          mode: 'pbl',
          status: 'active',
          version: 1,
          source_type: 'yaml',
          source_path: null,
          source_id: null,
          source_metadata: {},
          title: { en: 'Scenario 1' },
          description: { en: 'Desc 1' },
          objectives: [],
          difficulty: 'beginner',
          estimated_minutes: 30,
          prerequisites: null,
          task_templates: [],
          task_count: 0,
          xp_rewards: {},
          unlock_requirements: {},
          pbl_data: {},
          discovery_data: {},
          assessment_data: {},
          ai_modules: {},
          resources: [],
          created_at: new Date(),
          updated_at: new Date(),
          published_at: null,
          metadata: {}
        }
      ];

      const result = convertScenarios(scenarios);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sc1');
    });

    it('convertPrograms converts array of programs', () => {
      const programs: DBProgram[] = [];
      const result = convertPrograms(programs);
      expect(result).toEqual([]);
    });

    it('convertTasks converts array of tasks', () => {
      const tasks: DBTask[] = [];
      const result = convertTasks(tasks);
      expect(result).toEqual([]);
    });

    it('convertEvaluations converts array of evaluations', () => {
      const evaluations: DBEvaluation[] = [];
      const result = convertEvaluations(evaluations);
      expect(result).toEqual([]);
    });

    it('convertInteractions converts array of interactions', () => {
      const interactions: DBInteraction[] = [];
      const result = convertInteractions(interactions);
      expect(result).toEqual([]);
    });
  });
});
