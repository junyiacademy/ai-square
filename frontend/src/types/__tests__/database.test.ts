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
  DBInteraction
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
        task_templates: [] as Array<{
          id: string;
          title: string;
          type: TaskType;
          description?: string;
        }>,
        task_count: 0,
        xp_rewards: { completion: 100 },
        unlock_requirements: {},
        pbl_data: {} as Record<string, unknown>,
        discovery_data: {} as Record<string, unknown>,
        assessment_data: {} as Record<string, unknown>,
        ai_modules: {} as Record<string, unknown>,
        resources: [] as Array<Record<string, unknown>>,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        published_at: null,
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
        user_id: 'user-123',
        scenario_id: 'scenario-123',
        mode: 'pbl',
        status: 'active',
        current_task_index: 0,
        completed_task_count: 0,
        total_task_count: 5,
        total_score: 0,
        domain_scores: {},
        xp_earned: 0,
        badges_earned: [],
        created_at: '2025-01-01T00:00:00Z',
        started_at: null,
        completed_at: null,
        updated_at: '2025-01-01T00:00:00Z',
        last_activity_at: '2025-01-01T00:00:00Z',
        time_spent_seconds: 0,
        pbl_data: {},
        discovery_data: {},
        assessment_data: {},
        metadata: {}
      };

      expect(program.status).toBe('active');
      expect(program.completed_task_count).toBe(0);
      expect(program.total_task_count).toBe(5);
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
        scenario_task_index: null,
        title: 'Task Title',
        description: 'Task Description',
        type: 'interactive',
        status: 'pending',
        content: { instructions: 'Do this task' },
        interactions: [],
        interaction_count: 0,
        user_response: {},
        score: 0,
        max_score: 10,
        allowed_attempts: 3,
        attempt_count: 0,
        time_limit_seconds: null,
        time_spent_seconds: 0,
        ai_config: {},
        created_at: '2025-01-01T00:00:00Z',
        started_at: null,
        completed_at: null,
        updated_at: '2025-01-01T00:00:00Z',
        pbl_data: {},
        discovery_data: {},
        assessment_data: {},
        metadata: {}
      };

      expect(task.type).toBe('interactive');
      expect(task.status).toBe('pending');
      expect(task.score).toBe(0);
      expect(task.started_at).toBeNull();
    });

    it('should handle interactions array', () => {
      const interactions: DBInteraction[] = [
        { 
          timestamp: new Date('2025-01-01T00:00:00Z'), 
          type: 'user_input', 
          content: 'User input',
          metadata: {}
        },
        { 
          timestamp: new Date('2025-01-01T00:01:00Z'), 
          type: 'ai_response', 
          content: 'AI response',
          metadata: {}
        }
      ];
      
      const task: Partial<DBTask> = {
        interactions: interactions as unknown as Array<Record<string, unknown>>
      };

      expect(task.interactions).toHaveLength(2);
      const firstInteraction = task.interactions![0] as Record<string, unknown>;
      const secondInteraction = task.interactions![1] as Record<string, unknown>;
      expect(firstInteraction.type).toBe('user_input');
      expect(secondInteraction.type).toBe('ai_response');
    });
  });

  describe('DBEvaluation Type', () => {
    it('should create valid DBEvaluation object', () => {
      const evaluation: DBEvaluation = {
        id: 'eval-123',
        user_id: 'user-123',
        program_id: 'program-123',
        task_id: 'task-123',
        mode: 'pbl',
        evaluation_type: 'formative',
        evaluation_subtype: null,
        score: 8,
        max_score: 10,
        domain_scores: { 'engaging_with_ai': 80 },
        feedback_text: 'Good job!',
        feedback_data: {},
        ai_provider: 'openai',
        ai_model: 'gpt-4',
        ai_analysis: {},
        time_taken_seconds: 120,
        created_at: '2025-01-01T00:00:00Z',
        pbl_data: {},
        discovery_data: {},
        assessment_data: {},
        metadata: {}
      };

      expect(evaluation.evaluation_type).toBe('formative');
      expect(evaluation.score).toBe(8);
      expect(evaluation.max_score).toBe(10);
      expect(evaluation.domain_scores['engaging_with_ai']).toBe(80);
    });
  });

  describe('Additional Types', () => {
    it('should create valid DBInteraction object', () => {
      const interaction: DBInteraction = {
        timestamp: new Date('2025-01-01T00:00:00Z'),
        type: 'user_input',
        content: 'Test content',
        metadata: { source: 'chat' }
      };

      expect(interaction.type).toBe('user_input');
      expect(interaction.content).toBe('Test content');
      expect(interaction.metadata?.source).toBe('chat');
    });
  });
});