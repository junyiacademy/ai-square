import { Pool } from 'pg';
import { 
  PostgreSQLScenarioRepository,
  PostgreSQLProgramRepository, 
  PostgreSQLTaskRepository,
  PostgreSQLEvaluationRepository,
  PostgreSQLUserRepository
} from '../index';

describe('Unified Schema Tests', () => {
  let pool: Pool;
  let scenarioRepo: PostgreSQLScenarioRepository;
  let programRepo: PostgreSQLProgramRepository;
  let taskRepo: PostgreSQLTaskRepository;
  let evaluationRepo: PostgreSQLEvaluationRepository;
  let userRepo: PostgreSQLUserRepository;
  
  let testUserId: string;
  let testScenarioIds: Record<string, string> = {};
  let testProgramIds: Record<string, string> = {};

  beforeAll(async () => {
    // Create test database connection
    pool = new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Initialize repositories
    scenarioRepo = new PostgreSQLScenarioRepository(pool);
    programRepo = new PostgreSQLProgramRepository(pool);
    taskRepo = new PostgreSQLTaskRepository(pool);
    evaluationRepo = new PostgreSQLEvaluationRepository(pool);
    userRepo = new PostgreSQLUserRepository(pool);

    // Create test user
    const userResult = await pool.query(`
      INSERT INTO users (email, name, preferred_language)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['test@example.com', 'Test User', 'en']);
    testUserId = userResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data in correct order due to foreign key constraints
    await pool.query('DELETE FROM evaluations WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM tasks WHERE program_id IN (SELECT id FROM programs WHERE user_id = $1)', [testUserId]);
    await pool.query('DELETE FROM programs WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM scenarios WHERE id IN ($1, $2, $3)', 
      [testScenarioIds.pbl, testScenarioIds.discovery, testScenarioIds.assessment]);
    await pool.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
    await pool.end();
  });

  describe('Scenario Creation - All Modes', () => {
    test('should create PBL scenario with unified structure', async () => {
      const pblScenario = {
        mode: 'pbl' as const,
        status: 'active' as const,
        source_type: 'yaml' as const,
        source_path: 'pbl_data/ai-job-search_scenario.yaml',
        source_id: 'pbl-ai-job-search',
        source_metadata: {
          originalId: 'ai-job-search',
          pbl: {
            yamlId: 'ai-job-search'
          }
        },
        title: { en: 'AI Job Search Assistant', zh: 'AI 求職助手' },
        description: { en: 'Learn to use AI for job search', zh: '學習使用 AI 進行求職' },
        objectives: ['Understand AI capabilities', 'Apply AI in job search'],
        difficulty: 'intermediate' as const,
        estimated_minutes: 45,
        task_templates: [
          {
            id: 'task1',
            title: 'Resume Analysis',
            type: 'analysis',
            description: 'Analyze your resume with AI'
          },
          {
            id: 'task2', 
            title: 'Interview Preparation',
            type: 'chat',
            description: 'Practice interviews with AI'
          }
        ],
        pbl_data: {
          ksaMapping: {
            knowledge: ['K1.1', 'K2.3'],
            skills: ['S1.2', 'S3.1'],
            attitudes: ['A2.1']
          },
          aiMentorGuidelines: 'Be supportive and constructive'
        },
        ai_modules: {
          mentor: {
            role: 'career_coach',
            persona: 'Experienced HR professional'
          }
        }
      };

      const result = await pool.query(`
        INSERT INTO scenarios (
          mode, status, source_type, source_path, source_id, source_metadata,
          title, description, objectives, difficulty, estimated_minutes,
          task_templates, pbl_data, ai_modules
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        pblScenario.mode,
        pblScenario.status,
        pblScenario.source_type,
        pblScenario.source_path,
        pblScenario.source_id,
        JSON.stringify(pblScenario.source_metadata),
        JSON.stringify(pblScenario.title),
        JSON.stringify(pblScenario.description),
        JSON.stringify(pblScenario.objectives),
        pblScenario.difficulty,
        pblScenario.estimated_minutes,
        JSON.stringify(pblScenario.task_templates),
        JSON.stringify(pblScenario.pbl_data),
        JSON.stringify(pblScenario.ai_modules)
      ]);

      testScenarioIds.pbl = result.rows[0].id;
      expect(result.rows[0].id).toBeDefined();
    });

    test('should create Discovery scenario with unified structure', async () => {
      const discoveryScenario = {
        mode: 'discovery' as const,
        status: 'active' as const,
        source_type: 'yaml' as const,
        source_path: 'discovery_data/app_developer/path.yaml',
        source_id: 'discovery-app-developer',
        source_metadata: {
          originalId: 'app_developer_path',
          discovery: {
            careerType: 'app_developer',
            folderName: 'app_developer'
          }
        },
        title: { en: 'App Developer Journey', zh: '應用開發者之旅' },
        description: { en: 'Explore app development career', zh: '探索應用開發職業' },
        objectives: ['Master app development basics', 'Build portfolio'],
        difficulty: 'beginner' as const,
        estimated_minutes: 120,
        task_templates: [
          {
            id: 'explore1',
            title: 'First App Project',
            type: 'exploration',
            description: 'Create your first mobile app'
          },
          {
            id: 'challenge1',
            title: 'UI Challenge',
            type: 'challenge',
            description: 'Design an innovative UI'
          }
        ],
        discovery_data: {
          careerInfo: {
            avgSalary: '$85,000',
            demandLevel: 'high',
            requiredSkills: ['JavaScript', 'React Native', 'UI/UX']
          },
          skillTree: {
            core: ['Programming', 'Design', 'Testing'],
            advanced: ['Architecture', 'Performance', 'Security']
          },
          xpRewards: {
            completion: 200,
            challenge: 50,
            innovation: 100
          }
        }
      };

      const result = await pool.query(`
        INSERT INTO scenarios (
          mode, status, source_type, source_path, source_id, source_metadata,
          title, description, objectives, difficulty, estimated_minutes,
          task_templates, discovery_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `, [
        discoveryScenario.mode,
        discoveryScenario.status,
        discoveryScenario.source_type,
        discoveryScenario.source_path,
        discoveryScenario.source_id,
        JSON.stringify(discoveryScenario.source_metadata),
        JSON.stringify(discoveryScenario.title),
        JSON.stringify(discoveryScenario.description),
        JSON.stringify(discoveryScenario.objectives),
        discoveryScenario.difficulty,
        discoveryScenario.estimated_minutes,
        JSON.stringify(discoveryScenario.task_templates),
        JSON.stringify(discoveryScenario.discovery_data)
      ]);

      testScenarioIds.discovery = result.rows[0].id;
      expect(result.rows[0].id).toBeDefined();
    });

    test('should create Assessment scenario with unified structure', async () => {
      const assessmentScenario = {
        mode: 'assessment' as const,
        status: 'active' as const,
        source_type: 'yaml' as const,
        source_path: 'assessment_data/ai-literacy-general/config.yml',
        source_id: 'assessment-ai-literacy-general',
        source_metadata: {
          originalId: 'ai-literacy-general',
          assessment: {
            assessmentType: 'diagnostic',
            folderName: 'ai-literacy-general',
            configPath: 'assessment_data/ai-literacy-general/config.yml'
          }
        },
        title: { en: 'AI Literacy Assessment', zh: 'AI 素養評估' },
        description: { en: 'Test your AI knowledge', zh: '測試你的 AI 知識' },
        objectives: ['Measure AI understanding', 'Identify knowledge gaps'],
        difficulty: 'intermediate' as const,
        estimated_minutes: 30,
        task_templates: [
          {
            id: 'q1',
            title: 'What is Machine Learning?',
            type: 'question',
            question: 'Which best describes machine learning?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'B'
          },
          {
            id: 'q2',
            title: 'AI Ethics',
            type: 'question',
            question: 'What is AI bias?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'C'
          }
        ],
        assessment_data: {
          questionBank: {
            total: 20,
            byDomain: {
              engaging_with_ai: 5,
              creating_with_ai: 5,
              managing_ai: 5,
              designing_ai: 5
            }
          },
          scoringRubric: {
            passingScore: 70,
            excellentScore: 90
          },
          timeLimits: {
            perQuestion: 120,
            total: 1800
          }
        }
      };

      const result = await pool.query(`
        INSERT INTO scenarios (
          mode, status, source_type, source_path, source_id, source_metadata,
          title, description, objectives, difficulty, estimated_minutes,
          task_templates, assessment_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `, [
        assessmentScenario.mode,
        assessmentScenario.status,
        assessmentScenario.source_type,
        assessmentScenario.source_path,
        assessmentScenario.source_id,
        JSON.stringify(assessmentScenario.source_metadata),
        JSON.stringify(assessmentScenario.title),
        JSON.stringify(assessmentScenario.description),
        JSON.stringify(assessmentScenario.objectives),
        assessmentScenario.difficulty,
        assessmentScenario.estimated_minutes,
        JSON.stringify(assessmentScenario.task_templates),
        JSON.stringify(assessmentScenario.assessment_data)
      ]);

      testScenarioIds.assessment = result.rows[0].id;
      expect(result.rows[0].id).toBeDefined();
    });
  });

  describe('Program Creation - All Modes', () => {
    test('should create programs for all three modes', async () => {
      // PBL Program
      const pblProgram = await pool.query(`
        INSERT INTO programs (
          user_id, scenario_id, status, total_task_count,
          pbl_data
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        testUserId,
        testScenarioIds.pbl,
        'active',
        2,
        JSON.stringify({ reflectionNotes: [] })
      ]);
      testProgramIds.pbl = pblProgram.rows[0].id;

      // Discovery Program  
      const discoveryProgram = await pool.query(`
        INSERT INTO programs (
          user_id, scenario_id, status, total_task_count,
          discovery_data
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        testUserId,
        testScenarioIds.discovery,
        'active',
        2,
        JSON.stringify({ explorationPath: [], currentLevel: 1 })
      ]);
      testProgramIds.discovery = discoveryProgram.rows[0].id;

      // Assessment Program
      const assessmentProgram = await pool.query(`
        INSERT INTO programs (
          user_id, scenario_id, status, total_task_count,
          assessment_data
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        testUserId,
        testScenarioIds.assessment,
        'active',
        2,
        JSON.stringify({ answerSheet: {}, startTime: new Date().toISOString() })
      ]);
      testProgramIds.assessment = assessmentProgram.rows[0].id;

      expect(testProgramIds.pbl).toBeDefined();
      expect(testProgramIds.discovery).toBeDefined();
      expect(testProgramIds.assessment).toBeDefined();
    });
  });

  describe('Task Creation - All Modes', () => {
    test('should create tasks with proper types', async () => {
      // PBL Tasks
      await pool.query(`
        INSERT INTO tasks (
          program_id, task_index, title, type, status,
          content, pbl_data
        ) VALUES 
        ($1, 0, $2, 'analysis', 'active',
         $3, $4),
        ($1, 1, $5, 'chat', 'pending',
         $6, $7)
      `, [
        testProgramIds.pbl,
        JSON.stringify({ en: 'Resume Analysis' }),
        JSON.stringify({ instructions: 'Analyze your resume' }),
        JSON.stringify({ ksaFocus: { primary: ['K1.1'], secondary: ['S1.2'] } }),
        JSON.stringify({ en: 'Interview Practice' }),
        JSON.stringify({ instructions: 'Practice interview questions' }),
        JSON.stringify({ ksaFocus: { primary: ['S3.1'], secondary: ['A2.1'] } })
      ]);

      // Discovery Tasks
      await pool.query(`
        INSERT INTO tasks (
          program_id, task_index, title, type, status,
          content, discovery_data
        ) VALUES 
        ($1, 0, $2, 'exploration', 'active',
         $3, $4),
        ($1, 1, $5, 'challenge', 'pending',
         $6, $7)
      `, [
        testProgramIds.discovery,
        JSON.stringify({ en: 'First App' }),
        JSON.stringify({ instructions: 'Build a simple app' }),
        JSON.stringify({ skillRequirements: { programming: 2, design: 1 } }),
        JSON.stringify({ en: 'UI Challenge' }),
        JSON.stringify({ instructions: 'Design innovative UI' }),
        JSON.stringify({ skillRequirements: { design: 3, creativity: 2 } })
      ]);

      // Assessment Tasks
      await pool.query(`
        INSERT INTO tasks (
          program_id, task_index, title, type, status,
          content, assessment_data, time_limit_seconds
        ) VALUES 
        ($1, 0, $2, 'question', 'active',
         $3, $4, 120),
        ($1, 1, $5, 'question', 'pending',
         $6, $7, 120)
      `, [
        testProgramIds.assessment,
        JSON.stringify({ en: 'ML Question' }),
        JSON.stringify({ 
          question: 'Which best describes machine learning?',
          options: ['Pattern recognition', 'Rule-based system', 'Database', 'Spreadsheet']
        }),
        JSON.stringify({ correctAnswer: 0, domain: 'engaging_with_ai' }),
        JSON.stringify({ en: 'Ethics Question' }),
        JSON.stringify({
          question: 'What is AI bias?',
          options: ['A bug', 'Unfair outcomes', 'Speed issue', 'Cost problem']
        }),
        JSON.stringify({ correctAnswer: 1, domain: 'managing_ai' })
      ]);

      // Verify task creation
      const taskCount = await pool.query(`
        SELECT COUNT(*) FROM tasks WHERE program_id IN ($1, $2, $3)
      `, [testProgramIds.pbl, testProgramIds.discovery, testProgramIds.assessment]);
      
      expect(parseInt(taskCount.rows[0].count)).toBe(6);
    });
  });

  describe('Unified Queries', () => {
    test('should query scenarios by mode', async () => {
      const pblScenarios = await pool.query(`
        SELECT * FROM scenarios WHERE mode = 'pbl' AND status = 'active'
      `);
      expect(pblScenarios.rows.length).toBeGreaterThan(0);

      const discoveryScenarios = await pool.query(`
        SELECT * FROM scenarios WHERE mode = 'discovery' AND status = 'active'
      `);
      expect(discoveryScenarios.rows.length).toBeGreaterThan(0);

      const assessmentScenarios = await pool.query(`
        SELECT * FROM scenarios WHERE mode = 'assessment' AND status = 'active'
      `);
      expect(assessmentScenarios.rows.length).toBeGreaterThan(0);
    });

    test('should query with unified source fields', async () => {
      const scenarios = await pool.query(`
        SELECT 
          id,
          mode,
          source_type,
          source_path,
          source_id,
          source_metadata,
          title->>'en' as title_en,
          difficulty,
          task_count
        FROM scenarios
        WHERE source_type = 'yaml'
          AND id IN ($1, $2, $3)
        ORDER BY mode
      `, [testScenarioIds.pbl, testScenarioIds.discovery, testScenarioIds.assessment]);

      expect(scenarios.rows.length).toBe(3);
      
      // Verify each mode has proper source tracking
      const modes = scenarios.rows.map(r => r.mode);
      expect(modes).toContain('pbl');
      expect(modes).toContain('discovery');
      expect(modes).toContain('assessment');

      // Verify source_id format
      expect(scenarios.rows[0].source_id).toMatch(/^(pbl|discovery|assessment)-/);
    });

    test('should support multi-language queries', async () => {
      const scenarios = await pool.query(`
        SELECT 
          title->>'en' as title_en,
          title->>'zh' as title_zh,
          description->>'en' as desc_en,
          description->>'zh' as desc_zh
        FROM scenarios
        WHERE title->>'zh' IS NOT NULL
      `);

      scenarios.rows.forEach(row => {
        expect(row.title_en).toBeDefined();
        expect(row.title_zh).toBeDefined();
        expect(row.desc_en).toBeDefined();
        expect(row.desc_zh).toBeDefined();
      });
    });
  });

  describe('Type Safety', () => {
    test('should enforce ENUM constraints', async () => {
      // Test invalid mode
      await expect(pool.query(`
        INSERT INTO scenarios (mode, title, description)
        VALUES ('invalid_mode', '{"en":"Test"}', '{"en":"Test"}')
      `)).rejects.toThrow();

      // Test invalid task type
      await expect(pool.query(`
        INSERT INTO tasks (program_id, task_index, type)
        VALUES ($1, 0, 'invalid_type')
      `, [testProgramIds.pbl])).rejects.toThrow();

      // Test invalid difficulty
      await expect(pool.query(`
        INSERT INTO scenarios (mode, title, description, difficulty)
        VALUES ('pbl', '{"en":"Test"}', '{"en":"Test"}', 'super_hard')
      `)).rejects.toThrow();
    });
  });

  describe('Computed Fields', () => {
    test('should auto-calculate task_count', async () => {
      const result = await pool.query(`
        SELECT task_count, jsonb_array_length(task_templates) as actual_count
        FROM scenarios
        WHERE id = $1
      `, [testScenarioIds.pbl]);

      expect(result.rows[0].task_count).toBe(result.rows[0].actual_count);
    });

    test('should auto-calculate interaction_count', async () => {
      // Add some interactions
      const taskResult = await pool.query(`
        UPDATE tasks 
        SET interactions = '[
          {"type": "user", "message": "Hello"},
          {"type": "ai", "message": "Hi there"}
        ]'::jsonb
        WHERE program_id = $1
        RETURNING id, interaction_count
      `, [testProgramIds.pbl]);

      expect(taskResult.rows[0].interaction_count).toBe(2);
    });
  });

  describe('Timestamp Consistency', () => {
    test('should use unified timestamp names', async () => {
      const program = await pool.query(`
        SELECT 
          created_at,
          started_at,
          completed_at,
          updated_at
        FROM programs
        WHERE id = $1
      `, [testProgramIds.pbl]);

      // Verify no old field names exist
      expect(program.fields.map(f => f.name)).not.toContain('start_time');
      expect(program.fields.map(f => f.name)).not.toContain('end_time');
    });
  });
});