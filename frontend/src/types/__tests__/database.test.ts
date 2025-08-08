import type {
  LearningMode,
  ScenarioStatus,
  ProgramStatus,
  TaskStatus,
  TaskType,
  DifficultyLevel,
  SourceType,
  DBUser,
  DBScenario,
  DBProgram,
  DBTask,
  DBEvaluation,
  DBProgramInsert,
  DBTaskInsert,
  DBEvaluationInsert
} from '../database';

describe('Database Types', () => {
  describe('Enum Types', () => {
    it('should define LearningMode correctly', () => {
      const modes: LearningMode[] = ['pbl', 'discovery', 'assessment'];
      expect(modes).toHaveLength(3);
    });

    it('should define ScenarioStatus correctly', () => {
      const statuses: ScenarioStatus[] = ['draft', 'active', 'archived'];
      expect(statuses).toHaveLength(3);
    });

    it('should define ProgramStatus correctly', () => {
      const statuses: ProgramStatus[] = ['pending', 'active', 'completed', 'abandoned'];
      expect(statuses).toHaveLength(4);
    });

    it('should define TaskStatus correctly', () => {
      const statuses: TaskStatus[] = ['pending', 'active', 'completed', 'skipped'];
      expect(statuses).toHaveLength(4);
    });

    it('should define TaskType correctly', () => {
      const types: TaskType[] = [
        'interactive', 'reflection', 'chat', 'creation', 
        'analysis', 'exploration', 'experiment', 'challenge',
        'question', 'quiz', 'assessment'
      ];
      expect(types.length).toBeGreaterThan(0);
    });

    it('should define DifficultyLevel correctly', () => {
      const levels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
      expect(levels).toHaveLength(4);
    });

    it('should define SourceType correctly', () => {
      const types: SourceType[] = ['yaml', 'api', 'ai-generated', 'manual'];
      expect(types).toHaveLength(4);
    });
  });

  describe('DBUser Type', () => {
    it('should create valid DBUser object', () => {
      const user: DBUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        preferred_language: 'en',
        level: 1,
        total_xp: 0,
        learning_preferences: {},
        onboarding_completed: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        last_active_at: '2025-01-01T00:00:00Z',
        metadata: {}
      };

      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.level).toBe(1);
      expect(user.onboarding_completed).toBe(false);
    });
  });

  describe('DBScenario Type', () => {
    it('should create valid DBScenario object', () => {
      const scenario: DBScenario = {
        id: 'scenario-123',
        mode: 'pbl',
        status: 'active',
        version: '1.0.0',
        source_type: 'yaml',
        source_path: '/path/to/scenario.yaml',
        source_id: null,
        source_metadata: {},
        title: { en: 'Test Scenario', zh: '測試場景' },
        description: { en: 'Description', zh: '描述' },
        objectives: ['Learn X', 'Practice Y'],
        difficulty: 'intermediate',
        estimated_minutes: 30,
        prerequisites: [],
        task_templates: [],
        task_count: 0,
        xp_rewards: { completion: 100 },
        unlock_requirements: {},
        pbl_data: {},
        discovery_data: {},
        assessment_data: {},
        ai_modules: {},
        resources: {},
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        metadata: {}
      };

      expect(scenario.mode).toBe('pbl');
      expect(scenario.status).toBe('active');
      expect(scenario.title.en).toBe('Test Scenario');
      expect(scenario.difficulty).toBe('intermediate');
    });

    it('should handle multilingual fields', () => {
      const scenario: Partial<DBScenario> = {
        title: { 
          en: 'English Title',
          zh: '中文標題',
          es: 'Título en Español'
        },
        description: {
          en: 'English Description',
          zh: '中文描述'
        }
      };

      expect(Object.keys(scenario.title!)).toHaveLength(3);
      expect(scenario.title!.zh).toBe('中文標題');
    });
  });

  describe('DBProgram Type', () => {
    it('should create valid DBProgram object', () => {
      const program: DBProgram = {
        id: 'program-123',
        scenario_id: 'scenario-123',
        user_id: 'user-123',
        mode: 'pbl',
        status: 'active',
        current_task_index: 0,
        completed_tasks: 0,
        total_tasks: 5,
        total_score: 0,
        max_score: 100,
        time_spent_seconds: 0,
        started_at: '2025-01-01T00:00:00Z',
        completed_at: null,
        abandoned_at: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        pbl_data: {},
        discovery_data: {},
        assessment_data: {},
        metadata: {}
      };

      expect(program.status).toBe('active');
      expect(program.completed_tasks).toBe(0);
      expect(program.total_tasks).toBe(5);
      expect(program.completed_at).toBeNull();
    });
  });

  describe('DBTask Type', () => {
    it('should create valid DBTask object', () => {
      const task: DBTask = {
        id: 'task-123',
        program_id: 'program-123',
        mode: 'pbl',
        task_index: 0,
        status: 'pending',
        type: 'interactive',
        title: { en: 'Task Title' },
        description: { en: 'Task Description' },
        instructions: { en: 'Do this task' },
        context: {},
        interactions: [],
        score: null,
        max_score: 10,
        feedback: null,
        time_spent_seconds: 0,
        started_at: null,
        completed_at: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        metadata: {}
      };

      expect(task.type).toBe('interactive');
      expect(task.status).toBe('pending');
      expect(task.score).toBeNull();
      expect(task.started_at).toBeNull();
    });

    it('should handle interactions array', () => {
      const task: Partial<DBTask> = {
        interactions: [
          { type: 'user', content: 'User input', timestamp: '2025-01-01T00:00:00Z' },
          { type: 'ai', content: 'AI response', timestamp: '2025-01-01T00:01:00Z' }
        ]
      };

      expect(task.interactions).toHaveLength(2);
      expect(task.interactions![0].type).toBe('user');
      expect(task.interactions![1].type).toBe('ai');
    });
  });

  describe('DBEvaluation Type', () => {
    it('should create valid DBEvaluation object', () => {
      const evaluation: DBEvaluation = {
        id: 'eval-123',
        task_id: 'task-123',
        user_id: 'user-123',
        mode: 'pbl',
        evaluation_type: 'formative',
        score: 8,
        max_score: 10,
        percentage: 80,
        feedback: { en: 'Good job!' },
        strengths: ['Understanding', 'Application'],
        improvements: ['Speed'],
        criteria: {},
        rubric: {},
        ai_config: {},
        ai_response: {},
        evaluated_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        metadata: {}
      };

      expect(evaluation.evaluation_type).toBe('formative');
      expect(evaluation.score).toBe(8);
      expect(evaluation.percentage).toBe(80);
      expect(evaluation.strengths).toHaveLength(2);
    });
  });

  describe('Insert Types', () => {
    it('should create valid DBProgramInsert', () => {
      const insert: DBProgramInsert = {
        scenario_id: 'scenario-123',
        user_id: 'user-123',
        status: 'pending'
      };

      expect(insert.scenario_id).toBe('scenario-123');
      expect(insert.user_id).toBe('user-123');
      expect(insert.status).toBe('pending');
    });

    it('should create valid DBTaskInsert', () => {
      const insert: DBTaskInsert = {
        program_id: 'program-123',
        task_index: 0,
        type: 'interactive',
        title: { en: 'Task' },
        instructions: { en: 'Instructions' }
      };

      expect(insert.program_id).toBe('program-123');
      expect(insert.type).toBe('interactive');
    });

    it('should create valid DBEvaluationInsert', () => {
      const insert: DBEvaluationInsert = {
        task_id: 'task-123',
        user_id: 'user-123',
        evaluation_type: 'summative',
        score: 9,
        max_score: 10
      };

      expect(insert.evaluation_type).toBe('summative');
      expect(insert.score).toBe(9);
    });
  });
});