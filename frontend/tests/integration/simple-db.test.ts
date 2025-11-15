import { IntegrationTestEnvironment } from './setup/test-environment';
import { Pool } from 'pg';

/**
 * Simple Database Test
 * Tests basic database operations without API dependencies
 */

describe.skip('Simple Database Integration', () => {
  let env: IntegrationTestEnvironment;
  let pool: Pool | null;

  beforeAll(async () => {
    env = new IntegrationTestEnvironment();
    await env.setup();
    pool = env.getDbPool();

    // Debug: Check if pool is properly initialized
    if (!pool) {
      console.error('Pool is null after setup!');
    } else {
      console.log('Pool initialized successfully');
      console.log('Database name:', env.getTestDbName());
      console.log('Environment DB_NAME:', process.env.DB_NAME);
      // Test connection
      try {
        const client = await pool.connect();
        console.log('Connected to database');
        const testResult = await client.query('SELECT 1 as test');
        console.log('Test query result:', testResult.rows);

        // Also try with text protocol
        const textResult = await client.query({
          text: 'SELECT $1::int + $2::int as sum',
          values: [1, 1]
        });
        console.log('Text protocol result:', textResult.rows);

        client.release();
      } catch (error) {
        console.error('Test query failed:', error);
      }
    }
  }, 30000);

  afterAll(async () => {
    await env.teardown();
  });

  describe.skip('Database Operations', () => {
    it('should perform basic SELECT query', async () => {
      expect(pool).toBeDefined();
      if (!pool) return;

      const client = await pool.connect();
      try {
        const result = await client.query('SELECT 1 + 1 as sum');
        console.log('Query result:', result);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].sum).toBe(2);
      } finally {
        client.release();
      }
    });

    it('should insert and retrieve user', async () => {
      if (!pool) return;

      const email = `test${Date.now()}@example.com`;

      // Insert user and return generated id
      const insertUser = await pool.query(
        `INSERT INTO users (email, name, role, email_verified)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [email, 'Test User', 'user', true]
      );
      const userId = insertUser.rows[0].id as string;

      // Retrieve user
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].email).toBe(email);
      expect(result.rows[0].name).toBe('Test User');
    });

    it('should create and query scenario', async () => {
      if (!pool) return;

      // Create scenario with generated id
      const insertScenario = await pool.query(
        `INSERT INTO scenarios (mode, status, title, description, pbl_data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          'pbl',
          'active',
          JSON.stringify({ en: 'Test Scenario' }),
          JSON.stringify({ en: 'Test Description' }),
          JSON.stringify({ ksaMapping: {} })
        ]
      );
      const scenarioId = insertScenario.rows[0].id as string;

      // Query scenario
      const result = await pool.query(
        'SELECT id, mode, status, title::text as title_text FROM scenarios WHERE id = $1',
        [scenarioId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].mode).toBe('pbl');
      expect(result.rows[0].status).toBe('active');

      const title = JSON.parse(result.rows[0].title_text as unknown as string);
      expect(title.en).toBe('Test Scenario');
    });

    it('should handle transactions', async () => {
      if (!pool) return;

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Insert user
        const insertedUser = await client.query(
          'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id',
          [`tx-${Date.now()}@test.com`, 'TX User']
        );
        const userId: string = insertedUser.rows[0].id;

        // Insert scenario
        const insertedScenario = await client.query(
          'INSERT INTO scenarios (mode, title, description, pbl_data) VALUES ($1, $2, $3, $4) RETURNING id',
          ['pbl', JSON.stringify({ en: 'TX Scenario' }), JSON.stringify({ en: 'TX Description' }), JSON.stringify({ ksaMapping: {} })]
        );
        const scenarioId: string = insertedScenario.rows[0].id;

        // Insert program (mode inherited by trigger). total_task_count is required by schema
        const insertedProgram = await client.query(
          'INSERT INTO programs (user_id, scenario_id, status, total_task_count) VALUES ($1, $2, $3, $4) RETURNING id',
          [userId, scenarioId, 'active', 1]
        );
        const programId: string = insertedProgram.rows[0].id;

        await client.query('COMMIT');

        // Verify all inserts succeeded
        const programs = await pool.query(
          'SELECT * FROM programs WHERE id = $1',
          [programId]
        );

        expect(programs.rows).toHaveLength(1);
        expect(programs.rows[0].user_id).toBe(userId);
        expect(programs.rows[0].scenario_id).toBe(scenarioId);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });

    it('should verify custom types exist', async () => {
      if (!pool) return;

      const result = await pool.query(`
        SELECT typname
        FROM pg_type
        WHERE typname IN ('learning_mode', 'program_status')
        AND typtype = 'e'
      `);

      expect(result.rows.length).toBeGreaterThanOrEqual(2);

      const typeNames = result.rows.map(r => r.typname);
      expect(typeNames).toContain('learning_mode');
      expect(typeNames).toContain('program_status');
    });

    it('should test mode inheritance trigger', async () => {
      if (!pool) return;

      // Create user
      const insertedUser = await pool.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id',
        [`trigger-${Date.now()}@test.com`, 'Trigger User']
      );
      const userId: string = insertedUser.rows[0].id;

      // Create scenario with discovery mode
      const insertedScenario = await pool.query(
        'INSERT INTO scenarios (mode, title, description) VALUES ($1, $2, $3) RETURNING id',
        ['discovery', JSON.stringify({ en: 'Discovery Scenario' }), JSON.stringify({ en: 'Discovery Description' })]
      );
      const scenarioId: string = insertedScenario.rows[0].id;

      // Create program without specifying mode (should inherit). Provide required total_task_count
      const insertedProgram = await pool.query(
        'INSERT INTO programs (user_id, scenario_id, status, total_task_count) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, scenarioId, 'active', 1]
      );
      const programId: string = insertedProgram.rows[0].id;

      // Check if mode was inherited
      const result = await pool.query(
        'SELECT mode FROM programs WHERE id = $1',
        [programId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].mode).toBe('discovery');
    });
  });

  describe.skip('Schema Validation', () => {
    it('should have all required tables', async () => {
      if (!pool) return;

      const tables = [
        'users',
        'scenarios',
        'programs',
        'tasks',
        'evaluations',
        'sessions',
        'verification_tokens'
      ];

      for (const table of tables) {
        const result = await pool.query(
          `SELECT to_regclass('public.${table}')::text as table_exists`
        );

        expect(result.rows[0].table_exists).toBe(table);
      }
    });

    it('should have required indexes', async () => {
      if (!pool) return;

      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      `);

      expect(result.rows.length).toBeGreaterThan(10);

      const indexNames = result.rows.map(r => r.indexname);
      expect(indexNames).toContain('idx_programs_user_id');
      expect(indexNames).toContain('idx_scenarios_mode');
      expect(indexNames).toContain('idx_tasks_program_id');
    });
  });
});
