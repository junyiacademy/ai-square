/**
 * Unit tests for database types and utilities
 * Tests type definitions and utility functions
 */

import type { 
  LearningMode, 
  ScenarioStatus, 
  ProgramStatus,
  TaskStatus,
  TaskType,
  SourceType,
  DifficultyLevel,
  DBScenario,
  DBProgram,
  DBTask,
  DBEvaluation,
  DBUser
} from '@/types/database';

describe('Database Types', () => {
  describe('Type validation', () => {
    it('should validate LearningMode enum values', () => {
      const validModes: LearningMode[] = ['pbl', 'assessment', 'discovery'];
      
      validModes.forEach(mode => {
        expect(typeof mode).toBe('string');
        expect(['pbl', 'assessment', 'discovery']).toContain(mode);
      });
    });

    it('should validate ScenarioStatus enum values', () => {
      const validStatuses: ScenarioStatus[] = ['draft', 'active', 'archived'];
      
      validStatuses.forEach(status => {
        expect(typeof status).toBe('string');
        expect(['draft', 'active', 'archived']).toContain(status);
      });
    });

    it('should validate ProgramStatus enum values', () => {
      const validStatuses: ProgramStatus[] = ['pending', 'active', 'completed', 'abandoned'];
      
      validStatuses.forEach(status => {
        expect(typeof status).toBe('string');
        expect(['pending', 'active', 'completed', 'abandoned']).toContain(status);
      });
    });

    it('should validate TaskStatus enum values', () => {
      const validStatuses: TaskStatus[] = ['pending', 'active', 'completed', 'skipped'];
      
      validStatuses.forEach(status => {
        expect(typeof status).toBe('string');
        expect(['pending', 'active', 'completed', 'skipped']).toContain(status);
      });
    });

    it('should validate TaskType enum values', () => {
      const validTypes: TaskType[] = ['question', 'chat', 'creation', 'analysis'];
      
      validTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(['question', 'chat', 'creation', 'analysis']).toContain(type);
      });
    });


    it('should validate SourceType enum values', () => {
      const validTypes: SourceType[] = ['yaml', 'api', 'ai-generated'];
      
      validTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(['yaml', 'api', 'ai-generated']).toContain(type);
      });
    });

    it('should validate DifficultyLevel enum values', () => {
      const validLevels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
      
      validLevels.forEach(level => {
        expect(typeof level).toBe('string');
        expect(['beginner', 'intermediate', 'advanced']).toContain(level);
      });
    });
  });

  describe('Database schema interfaces', () => {
    it('should define DBScenario interface structure', () => {
      const mockScenario: DBScenario = {
        id: 'scenario-123',
        mode: 'pbl',
        status: 'active',
        version: '1.0.0',
        source_type: 'yaml',
        source_path: '/path/to/scenario.yaml',
        source_id: 'scenario-id',
        source_metadata: { branch: 'main' },
        title: { en: 'Test Scenario' },
        description: { en: 'Test Description' },
        objectives: ['Learn AI concepts'],
        difficulty: 'intermediate',
        estimated_minutes: 60,
        prerequisites: ['basic-ai'],
        task_templates: [],
        task_count: 0,
        xp_rewards: { completion: 100 },
        unlock_requirements: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        pbl_data: { aiMentorGuidelines: 'Be helpful' },
        discovery_data: { careerInfo: { title: 'AI Engineer' } },
        assessment_data: { questionBank: {} },
        ai_modules: { tutor: { enabled: true } },
        resources: [],
        metadata: { tags: ['ai', 'learning'] }
      };

      expect(mockScenario.id).toBeDefined();
      expect(mockScenario.mode).toBe('pbl');
      expect(mockScenario.status).toBe('active');
      expect(mockScenario.source_type).toBe('yaml');
      expect(mockScenario.title).toHaveProperty('en');
    });

    it('should define DBProgram interface structure', () => {
      const mockProgram: DBProgram = {
        id: 'program-123',
        user_id: 'user-456',
        scenario_id: 'scenario-789',
        mode: 'assessment',
        status: 'active',
        current_task_index: 1,
        completed_task_count: 2,
        total_task_count: 5,
        total_score: 85.5,
        domain_scores: { knowledge: 80, skills: 90 },
        xp_earned: 150,
        badges_earned: [{ badgeId: 'first-task', earnedAt: '2024-01-01' }],
        time_spent_seconds: 3600,
        started_at: new Date().toISOString(),
        completed_at: null,
        last_activity_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pbl_data: {},
        discovery_data: { pathId: 'career-path-1' },
        assessment_data: {},
        metadata: { source: 'web' }
      };

      expect(mockProgram.id).toBeDefined();
      expect(mockProgram.mode).toBe('assessment');
      expect(mockProgram.status).toBe('active');
      expect(mockProgram.user_id).toBe('user-456');
      expect(mockProgram.domain_scores).toHaveProperty('knowledge');
    });

    it('should define DBTask interface structure', () => {
      const mockTask: DBTask = {
        id: 'task-123',
        program_id: 'program-456',
        mode: 'discovery',
        task_index: 1,
        scenario_task_index: 0,
        title: 'Discovery Task',
        description: 'Explore career paths',
        type: 'chat',
        status: 'active',
        content: { instructions: 'Complete this task' },
        interactions: [],
        interaction_count: 0,
        user_response: {},
        score: 0,
        max_score: 100,
        allowed_attempts: 3,
        attempt_count: 0,
        time_limit_seconds: 1800,
        time_spent_seconds: 900,
        ai_config: { model: 'gemini-pro' },
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
        pbl_data: {},
        discovery_data: { explorationLevel: 1 },
        assessment_data: {},
        metadata: { difficulty: 'medium' }
      };

      expect(mockTask.id).toBeDefined();
      expect(mockTask.mode).toBe('discovery');
      expect(mockTask.type).toBe('chat');
      expect(mockTask.title).toHaveProperty('en');
      expect(mockTask.discovery_data).toHaveProperty('explorationLevel');
    });

    it('should define DBEvaluation interface structure', () => {
      const mockEvaluation: DBEvaluation = {
        id: 'eval-123',
        user_id: 'user-456',
        program_id: 'program-789',
        task_id: 'task-321',
        mode: 'assessment',
        evaluation_type: 'summative',
        evaluation_subtype: 'final_assessment',
        score: 87.5,
        max_score: 100,
        domain_scores: { knowledge: 85, skills: 90 },
        feedback_text: 'Good work!',
        feedback_data: { strengths: ['analysis'] },
        ai_provider: 'openai',
        ai_model: 'gpt-4',
        ai_analysis: { confidence: 0.85 },
        time_taken_seconds: 1800,
        created_at: new Date().toISOString(),
        pbl_data: {},
        discovery_data: {},
        assessment_data: { questionResults: [] },
        metadata: { source: 'auto-evaluation' }
      };

      expect(mockEvaluation.id).toBeDefined();
      expect(mockEvaluation.mode).toBe('assessment');
      expect(mockEvaluation.evaluation_type).toBe('summative');
      expect(mockEvaluation.score).toBe(87.5);
      expect(mockEvaluation.assessment_data).toHaveProperty('questionResults');
    });

    it('should define DBUser interface structure', () => {
      const mockUser: DBUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        preferred_language: 'en',
        level: 1,
        total_xp: 100,
        learning_preferences: { difficulty: 'intermediate' },
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        metadata: { source: 'registration' }
      };

      expect(mockUser.id).toBeDefined();
      expect(mockUser.email).toBe('test@example.com');
      expect(mockUser.preferred_language).toBe('en');
      expect(mockUser.onboarding_completed).toBe(true);
    });
  });

  describe('Type compatibility', () => {
    it('should ensure enum types are string-compatible', () => {
      const mode: LearningMode = 'pbl';
      const status: ScenarioStatus = 'active';
      
      // These should work as strings
      expect(typeof mode).toBe('string');
      expect(typeof status).toBe('string');
      
      // Should be usable in string contexts
      const modeString = `Mode is ${mode}`;
      expect(modeString).toBe('Mode is pbl');
    });

    it('should handle optional fields correctly', () => {
      const partialScenario: Partial<DBScenario> = {
        id: 'test-id',
        mode: 'pbl',
        status: 'draft'
      };
      
      expect(partialScenario.id).toBe('test-id');
      expect(partialScenario.source_path).toBeUndefined();
    });

    it('should handle nullable fields correctly', () => {
      const taskWithNulls: DBTask = {
        id: 'task-123',
        program_id: 'program-456',
        mode: 'pbl',
        task_index: 1,
        scenario_task_index: null, // nullable field
        title: 'Test Task',
        description: 'Test Description',
        type: 'question',
        status: 'pending',
        content: {},
        interactions: [],
        interaction_count: 0,
        user_response: {}, // nullable field
        score: 0, // nullable field
        max_score: 100,
        allowed_attempts: 3,
        attempt_count: 0,
        time_limit_seconds: null, // nullable field
        time_spent_seconds: 0,
        ai_config: {}, // nullable field
        created_at: new Date().toISOString(),
        started_at: null, // nullable field
        completed_at: null, // nullable field
        updated_at: new Date().toISOString(),
        pbl_data: {}, // not nullable
        discovery_data: {}, // not nullable  
        assessment_data: {}, // not nullable
        metadata: {} // nullable field
      };
      
      expect(taskWithNulls.scenario_task_index).toBeNull();
      expect(taskWithNulls.user_response).toBeNull();
      expect(taskWithNulls.score).toBeNull();
    });
  });

  describe('JSONB field handling', () => {
    it('should handle multilingual JSONB fields', () => {
      const multilingualTitle = {
        en: 'English Title',
        zh: '中文標題',
        es: 'Título en Español'
      };
      
      expect(multilingualTitle.en).toBe('English Title');
      expect(multilingualTitle.zh).toBe('中文標題');
      expect(multilingualTitle.es).toBe('Título en Español');
    });

    it('should handle complex JSONB metadata', () => {
      const metadata = {
        tags: ['ai', 'learning', 'assessment'],
        author: 'Test Author',
        version: '1.0.0',
        config: {
          enableHints: true,
          maxAttempts: 3
        }
      };
      
      expect(metadata.tags).toHaveLength(3);
      expect(metadata.config.enableHints).toBe(true);
    });

    it('should handle domain scores JSONB', () => {
      const domainScores = {
        'AI_Knowledge': 85,
        'Critical_Thinking': 78,
        'Problem_Solving': 92,
        'Communication': 88
      };
      
      expect(domainScores['AI_Knowledge']).toBe(85);
      expect(domainScores['Problem_Solving']).toBe(92);
      expect(Object.keys(domainScores)).toHaveLength(4);
    });
  });
});