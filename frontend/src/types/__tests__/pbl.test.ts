import type {
  DomainType,
  DifficultyLevel,
  TaskCategory,
  ModalityFocus,
  AIRole,
  ProgramStatus,
  TaskStatus,
  InteractionType,
  KSAMapping,
  AIModule,
  Task,
  TaskMetadata,
  Program,
  TaskInteraction,
  PBLScenario,
  Scenario,
  ScenarioListItem,
  TaskProgress
} from '../pbl';

describe('PBL Types', () => {
  describe('Enum Types', () => {
    it('should define DomainType correctly', () => {
      const domains: DomainType[] = ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'];
      expect(domains).toHaveLength(4);
    });

    it('should define DifficultyLevel correctly', () => {
      const levels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
      expect(levels).toHaveLength(3);
    });

    it('should define TaskCategory correctly', () => {
      const categories: TaskCategory[] = ['research', 'analysis', 'creation', 'interaction'];
      expect(categories).toHaveLength(4);
    });

    it('should define ModalityFocus correctly', () => {
      const modalities: ModalityFocus[] = ['reading', 'writing', 'listening', 'speaking', 'mixed'];
      expect(modalities).toHaveLength(5);
    });

    it('should define AIRole correctly', () => {
      const roles: AIRole[] = ['assistant', 'evaluator', 'actor'];
      expect(roles).toHaveLength(3);
    });

    it('should define ProgramStatus correctly', () => {
      const statuses: ProgramStatus[] = ['draft', 'in_progress', 'completed'];
      expect(statuses).toHaveLength(3);
    });

    it('should define TaskStatus correctly', () => {
      const statuses: TaskStatus[] = ['not_started', 'in_progress', 'completed'];
      expect(statuses).toHaveLength(3);
    });

    it('should define InteractionType correctly', () => {
      const types: InteractionType[] = ['user', 'ai', 'system'];
      expect(types).toHaveLength(3);
    });
  });

  describe('KSAMapping Type', () => {
    it('should create valid KSAMapping object', () => {
      const mapping: KSAMapping = {
        knowledge: ['K1.1', 'K2.3'],
        skills: ['S1.2', 'S3.1'],
        attitudes: ['A1.1', 'A2.2']
      };

      expect(mapping.knowledge).toHaveLength(2);
      expect(mapping.skills).toHaveLength(2);
      expect(mapping.attitudes).toHaveLength(2);
    });
  });

  describe('AIModule Type', () => {
    it('should create valid AIModule object', () => {
      const module: AIModule = {
        role: 'assistant',
        model: 'gpt-4',
        persona: 'mentor',
        initialPrompt: 'You are a helpful mentor'
      };

      expect(module.role).toBe('assistant');
      expect(module.model).toBe('gpt-4');
      expect(module.persona).toBe('mentor');
    });

    it('should allow optional fields', () => {
      const module: AIModule = {
        role: 'evaluator',
        model: 'gpt-3.5'
      };

      expect(module.persona).toBeUndefined();
      expect(module.initialPrompt).toBeUndefined();
    });
  });

  describe('Task Type', () => {
    it('should create valid Task object', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Research Task',
        description: 'Research AI applications',
        category: 'research',
        instructions: ['Step 1', 'Step 2'],
        expectedOutcome: 'A research report',
        resources: ['Resource 1'],
        assessmentFocus: { primary: ['accuracy'], secondary: [] },
        aiModule: {
          role: 'assistant',
          model: 'gpt-4'
        }
      };

      expect(task.id).toBe('task-1');
      expect(task.category).toBe('research');
      expect(task.instructions).toHaveLength(2);
      expect(task.resources).toHaveLength(1);
    });

    it('should support multilingual fields', () => {
      const task: Task = {
        id: 'task-1',
        title: 'English Title',
        title_zhTW: '繁體中文標題',
        title_zhCN: '简体中文标题',
        description: 'English description',
        description_zhTW: '繁體中文描述',
        category: 'creation',
        instructions: ['Step 1'],
        expectedOutcome: 'Completed task',
        assessmentFocus: { primary: ['creativity'], secondary: [] }
      };

      expect(task.title_zhTW).toBe('繁體中文標題');
      expect(task.title_zhCN).toBe('简体中文标题');
      expect(task.description_zhTW).toBe('繁體中文描述');
    });
  });

  describe('TaskMetadata Type', () => {
    it('should create valid TaskMetadata object', () => {
      const taskMeta: TaskMetadata = {
        taskId: 'task-1',
        programId: 'program-1',
        title: 'Task Title',
        status: 'in_progress',
        attempts: 1,
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      expect(taskMeta.status).toBe('in_progress');
      expect(taskMeta.attempts).toBe(1);
      expect(taskMeta.taskId).toBe('task-1');
    });
  });

  describe('Program Type', () => {
    it('should create valid Program object', () => {
      const program: Program = {
        id: 'program-1',
        scenarioId: 'scenario-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        status: 'in_progress',
        currentTaskId: 'task-1',
        totalTasks: 5,
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        language: 'en',
        taskIds: ['task-1', 'task-2']
      };

      expect(program.status).toBe('in_progress');
      expect(program.totalTasks).toBe(5);
      expect(program.language).toBe('en');
      expect(program.taskIds).toHaveLength(2);
    });
  });

  describe('TaskInteraction Type', () => {
    it('should create valid TaskInteraction object', () => {
      const interaction: TaskInteraction = {
        type: 'user',
        content: 'User message',
        timestamp: '2025-01-01T00:00:00Z',
        metadata: { model: 'gpt-4' }
      };

      expect(interaction.type).toBe('user');
      expect(interaction.content).toBe('User message');
      expect(interaction.metadata?.model).toBe('gpt-4');
    });
  });

  describe('Scenario Type', () => {
    it('should create valid Scenario object', () => {
      const scenario: Scenario = {
        id: 'scenario-1',
        title: 'AI Ethics',
        description: 'Learn about AI ethics',
        targetDomains: ['managing_with_ai'],
        difficulty: 'intermediate',
        ksaMapping: {
          knowledge: ['K1.1'],
          skills: ['S2.1'],
          attitudes: ['A3.1']
        },
        tasks: [],
        estimatedDuration: 60,
        prerequisites: ['Basic AI knowledge'],
        learningObjectives: ['Understand AI ethics']
      };

      expect(scenario.targetDomains[0]).toBe('managing_with_ai');
      expect(scenario.difficulty).toBe('intermediate');
      expect(scenario.estimatedDuration).toBe(60);
    });

    it('should support multilingual scenario fields', () => {
      const scenario: Scenario = {
        id: 'scenario-1',
        title: 'English Title',
        title_zhTW: '繁體中文標題',
        description: 'English description',
        description_zhTW: '繁體中文描述',
        targetDomains: ['creating_with_ai'],
        difficulty: 'beginner',
        ksaMapping: { knowledge: [], skills: [], attitudes: [] },
        tasks: [],
        estimatedDuration: 30,
        learningObjectives: ['Learn AI basics']
      };

      expect(scenario.title_zhTW).toBe('繁體中文標題');
      expect(scenario.description_zhTW).toBe('繁體中文描述');
    });
  });

  describe('TaskProgress Type', () => {
    it('should create valid TaskProgress object', () => {
      const progress: TaskProgress = {
        taskId: 'task-1',
        programId: 'program-1',
        status: 'completed',
        startedAt: '2025-01-01T00:00:00Z',
        completedAt: '2025-01-01T01:00:00Z',
        timeSpentSeconds: 3600,
        score: 95,
        feedback: 'Great job!'
      };

      expect(progress.status).toBe('completed');
      expect(progress.score).toBe(95);
      expect(progress.timeSpentSeconds).toBe(3600);
      expect(progress.completedAt).toBeTruthy();
    });
  });

  describe('ScenarioListItem Type', () => {
    it('should create valid ScenarioListItem', () => {
      const listItem: ScenarioListItem = {
        id: 'scenario-1',
        title: 'Test Scenario',
        description: 'Description',
        targetDomains: ['engaging_with_ai'],
        difficulty: 'beginner',
        estimatedDuration: 60,
        taskCount: 3,
        tags: ['ai', 'ethics']
      };

      expect(listItem.targetDomains).toHaveLength(1);
      expect(listItem.taskCount).toBe(3);
      expect(listItem.tags).toContain('ai');
    });
  });
});