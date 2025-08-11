// Unmock database modules for integration tests
jest.unmock('pg');
jest.unmock('pg-pool');
jest.unmock('ioredis');

import { IntegrationTestEnvironment } from '../setup/test-environment';
import { 
  testUsers, 
  testScenarios, 
  seedTestDatabase,
  createTestProgram,
  createTestTask,
  createTestEvaluation 
} from '../setup/test-fixtures';
import { 
  APITestHelper,
  DatabaseTestHelper,
  CacheTestHelper,
  AssertionHelper,
  TestDataGenerator,
  PerformanceTestHelper
} from '../setup/test-helpers';

/**
 * Complete Learning Journey Integration Tests
 * 
 * Tests the full user journey from registration to completion
 */

describe('Complete Learning Journey', () => {
  let env: IntegrationTestEnvironment;
  let apiHelper: APITestHelper;
  let dbHelper: DatabaseTestHelper;
  let cacheHelper: CacheTestHelper;
  
  beforeAll(async () => {
    // Setup test environment
    env = new IntegrationTestEnvironment();
    await env.setup();
    
    // Initialize helpers
    apiHelper = new APITestHelper();
    dbHelper = new DatabaseTestHelper(env.getDbPool()!);
    cacheHelper = new CacheTestHelper(env.getRedisClient());
    
    // Seed database with test data
    await seedTestDatabase(env.getDbPool()!);
  }, 30000); // 30 second timeout for setup
  
  afterAll(async () => {
    // Cleanup
    await env.teardown();
  });
  
  beforeEach(async () => {
    // Clear cache before each test
    await cacheHelper.clearCache('test:*');
  });
  
  describe('User Registration and Onboarding', () => {
    it('should complete full registration flow', async () => {
      const email = TestDataGenerator.randomEmail();
      const password = 'SecurePass123!';
      const name = 'Test User';
      
      // 1. Register new user
      const registerResponse = await apiHelper.register(email, password, name);
      AssertionHelper.assertAPIResponse(registerResponse, 201, ['userId', 'message']);
      
      // 2. Verify user in database
      const user = await dbHelper.pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      expect(user.rows).toHaveLength(1);
      expect(user.rows[0].email).toBe(email);
      expect(user.rows[0].email_verified).toBe(false);
      
      // 3. Simulate email verification (in real app would click email link)
      await dbHelper.pool.query(
        'UPDATE users SET email_verified = true WHERE email = $1',
        [email]
      );
      
      // 4. Login with verified account
      const token = await apiHelper.login(email, password);
      expect(token).toBeDefined();
      
      // 5. Check session created
      const session = await dbHelper.pool.query(
        'SELECT * FROM sessions WHERE user_id = $1',
        [user.rows[0].id]
      );
      expect(session.rows).toHaveLength(1);
    });
    
    it('should handle duplicate registration gracefully', async () => {
      const response = await apiHelper.register(
        testUsers.student.email,
        'AnyPassword123!',
        'Duplicate User'
      );
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });
  
  describe('PBL Learning Flow', () => {
    let userToken: string;
    let userId: string;
    
    beforeAll(async () => {
      // Create a verified user and get token
      const user = await dbHelper.createUser(testUsers.student);
      userId = user.id;
      userToken = await dbHelper.createSession(userId);
    });
    
    it('should complete full PBL scenario', async () => {
      const scenarioId = testScenarios.pbl.id;
      
      // 1. Get scenario list
      const scenariosResponse = await apiHelper.authenticatedRequest(
        'get',
        '/api/pbl/scenarios',
        userToken
      );
      AssertionHelper.assertAPIResponse(scenariosResponse, 200, ['scenarios']);
      expect(scenariosResponse.body.scenarios).toBeInstanceOf(Array);
      
      // 2. Get scenario details
      const scenarioResponse = await apiHelper.authenticatedRequest(
        'get',
        `/api/pbl/scenarios/${scenarioId}`,
        userToken
      );
      AssertionHelper.assertAPIResponse(scenarioResponse, 200, ['id', 'title', 'description']);
      AssertionHelper.assertMultilingualField(scenarioResponse.body.title);
      
      // 3. Start PBL program
      const startResponse = await apiHelper.authenticatedRequest(
        'post',
        `/api/pbl/scenarios/${scenarioId}/start`,
        userToken
      );
      AssertionHelper.assertAPIResponse(startResponse, 201, ['programId', 'firstTaskId']);
      const programId = startResponse.body.programId;
      const firstTaskId = startResponse.body.firstTaskId;
      
      // 4. Verify program created in database
      const program = await dbHelper.pool.query(
        'SELECT * FROM programs WHERE id = $1',
        [programId]
      );
      expect(program.rows).toHaveLength(1);
      expect(program.rows[0].status).toBe('active');
      expect(program.rows[0].mode).toBe('pbl');
      
      // 5. Get first task
      const taskResponse = await apiHelper.authenticatedRequest(
        'get',
        `/api/pbl/programs/${programId}/tasks/${firstTaskId}`,
        userToken
      );
      AssertionHelper.assertAPIResponse(taskResponse, 200, ['id', 'type', 'content']);
      
      // 6. Submit task response
      const userResponse = 'AI is a technology that simulates human intelligence';
      const submitResponse = await apiHelper.authenticatedRequest(
        'post',
        `/api/pbl/programs/${programId}/tasks/${firstTaskId}/submit`,
        userToken,
        { response: userResponse }
      );
      AssertionHelper.assertAPIResponse(submitResponse, 200, ['success']);
      
      // 7. Get AI evaluation
      const evalResponse = await apiHelper.authenticatedRequest(
        'post',
        `/api/pbl/programs/${programId}/tasks/${firstTaskId}/evaluate`,
        userToken
      );
      AssertionHelper.assertAPIResponse(evalResponse, 200, ['score', 'feedback']);
      expect(evalResponse.body.score).toBeGreaterThanOrEqual(0);
      expect(evalResponse.body.score).toBeLessThanOrEqual(100);
      
      // 8. Move to next task
      const nextTaskResponse = await apiHelper.authenticatedRequest(
        'post',
        `/api/pbl/programs/${programId}/tasks/${firstTaskId}/next`,
        userToken
      );
      
      if (nextTaskResponse.body.nextTaskId) {
        // Continue with next task
        const secondTaskId = nextTaskResponse.body.nextTaskId;
        
        // 9. Complete second task (chat type)
        const chatResponse = await apiHelper.authenticatedRequest(
          'post',
          `/api/pbl/programs/${programId}/tasks/${secondTaskId}/chat`,
          userToken,
          { message: 'What are the ethical concerns with AI?' }
        );
        AssertionHelper.assertAPIResponse(chatResponse, 200, ['response']);
        
        // 10. Mark second task complete
        await apiHelper.authenticatedRequest(
          'post',
          `/api/pbl/programs/${programId}/tasks/${secondTaskId}/complete`,
          userToken
        );
      }
      
      // 11. Complete program
      const completeResponse = await apiHelper.authenticatedRequest(
        'post',
        `/api/pbl/programs/${programId}/complete`,
        userToken
      );
      AssertionHelper.assertAPIResponse(completeResponse, 200, ['summary', 'totalScore']);
      
      // 12. Verify program completed in database
      const completedProgram = await dbHelper.pool.query(
        'SELECT * FROM programs WHERE id = $1',
        [programId]
      );
      expect(completedProgram.rows[0].status).toBe('completed');
      expect(completedProgram.rows[0].completed_at).not.toBeNull();
      
      // 13. Check user statistics
      const stats = await dbHelper.getUserStats(userId);
      expect(stats.completedPrograms).toBeGreaterThan(0);
      expect(stats.averageScore).toBeGreaterThan(0);
    });
    
    it('should handle concurrent task submissions', async () => {
      const scenarioId = testScenarios.pbl.id;
      
      // Start program
      const startResponse = await apiHelper.authenticatedRequest(
        'post',
        `/api/pbl/scenarios/${scenarioId}/start`,
        userToken
      );
      const programId = startResponse.body.programId;
      const taskId = startResponse.body.firstTaskId;
      
      // Submit multiple responses concurrently
      const submissions = Array.from({ length: 5 }, (_, i) => 
        apiHelper.authenticatedRequest(
          'post',
          `/api/pbl/programs/${programId}/tasks/${taskId}/submit`,
          userToken,
          { response: `Response ${i}` }
        )
      );
      
      const results = await Promise.allSettled(submissions);
      
      // At least one should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      expect(successful.length).toBeGreaterThan(0);
      
      // Check task has interactions
      const task = await dbHelper.pool.query(
        'SELECT interactions FROM tasks WHERE id = $1',
        [taskId]
      );
      expect(task.rows[0].interactions).toBeDefined();
      expect(JSON.parse(task.rows[0].interactions).length).toBeGreaterThan(0);
    });
  });
  
  describe('Assessment Flow', () => {
    let userToken: string;
    let userId: string;
    
    beforeAll(async () => {
      const user = await dbHelper.createUser({
        ...testUsers.student,
        email: TestDataGenerator.randomEmail(),
      });
      userId = user.id;
      userToken = await dbHelper.createSession(userId);
    });
    
    it('should complete assessment with scoring', async () => {
      const scenarioId = testScenarios.assessment.id;
      
      // 1. Start assessment
      const startResponse = await apiHelper.authenticatedRequest(
        'post',
        `/api/assessment/scenarios/${scenarioId}/start`,
        userToken
      );
      AssertionHelper.assertAPIResponse(startResponse, 201, ['programId', 'questions']);
      
      const programId = startResponse.body.programId;
      const questions = startResponse.body.questions as Array<{ id: string; text: Record<string, string> }>;
      
      expect(questions).toBeInstanceOf(Array);
      expect(questions.length).toBeGreaterThan(0);
      
      // 2. Submit answers
      const answers = questions.map((q, index: number) => ({
        questionId: q.id,
        answer: index % 4, // Rotate through options
      }));
      
      const submitResponse = await apiHelper.authenticatedRequest(
        'post',
        `/api/assessment/programs/${programId}/submit`,
        userToken,
        { answers }
      );
      AssertionHelper.assertAPIResponse(submitResponse, 200, ['score', 'results']);
      
      // 3. Verify score calculation
      expect(submitResponse.body.score).toBeGreaterThanOrEqual(0);
      expect(submitResponse.body.score).toBeLessThanOrEqual(100);
      
      // 4. Check program completion
      const program = await dbHelper.pool.query(
        'SELECT * FROM programs WHERE id = $1',
        [programId]
      );
      expect(program.rows[0].status).toBe('completed');
      expect(program.rows[0].total_score).toBe(submitResponse.body.score);
    });
  });
  
  describe('Discovery Flow', () => {
    let userToken: string;
    let userId: string;
    
    beforeAll(async () => {
      const user = await dbHelper.createUser({
        ...testUsers.student,
        email: TestDataGenerator.randomEmail(),
      });
      userId = user.id;
      userToken = await dbHelper.createSession(userId);
    });
    
    it('should explore career path and unlock skills', async () => {
      const scenarioId = testScenarios.discovery.id;
      
      // 1. Get career scenarios
      const scenariosResponse = await apiHelper.authenticatedRequest(
        'get',
        '/api/discovery/scenarios',
        userToken
      );
      AssertionHelper.assertAPIResponse(scenariosResponse, 200, ['scenarios']);
      
      // 2. Start discovery journey
      const startResponse = await apiHelper.authenticatedRequest(
        'post',
        `/api/discovery/scenarios/${scenarioId}/start`,
        userToken
      );
      AssertionHelper.assertAPIResponse(startResponse, 201, ['programId', 'explorationPath']);
      
      const programId = startResponse.body.programId;
      const explorationPath = startResponse.body.explorationPath as Array<Record<string, unknown>>;
      
      expect(explorationPath).toBeInstanceOf(Array);
      expect(explorationPath.length).toBeGreaterThan(0);
      
      // 3. Complete first step
      const firstStep = explorationPath[0] as { id: string; title: Record<string, string> };
      const completeStepResponse = await apiHelper.authenticatedRequest(
        'post',
        `/api/discovery/programs/${programId}/steps/${firstStep.id}/complete`,
        userToken
      );
      AssertionHelper.assertAPIResponse(completeStepResponse, 200, ['success']);
      
      // 4. Check milestone progress
      const progressResponse = await apiHelper.authenticatedRequest(
        'get',
        `/api/discovery/programs/${programId}/progress`,
        userToken
      );
      AssertionHelper.assertAPIResponse(progressResponse, 200, ['completedSteps', 'unlockedSkills']);
      
      expect(progressResponse.body.completedSteps).toContain(firstStep.id);
      
      // 5. Verify in database
      const program = await dbHelper.pool.query(
        'SELECT discovery_data FROM programs WHERE id = $1',
        [programId]
      );
      const discoveryData = JSON.parse(program.rows[0].discovery_data || '{}') as Record<string, unknown>;
      expect(discoveryData.completedSteps).toBeDefined();
    });
  });
  
  describe('Cross-Module Integration', () => {
    let userToken: string;
    let userId: string;
    
    beforeAll(async () => {
      const user = await dbHelper.createUser({
        ...testUsers.student,
        email: TestDataGenerator.randomEmail(),
      });
      userId = user.id;
      userToken = await dbHelper.createSession(userId);
    });
    
    it('should track progress across all three modules', async () => {
      // Complete one activity in each module
      const modules = ['pbl', 'assessment', 'discovery'];
      const programIds: string[] = [];
      
      for (const module of modules) {
        const scenario = testScenarios[module as keyof typeof testScenarios];
        const startResponse = await apiHelper.authenticatedRequest(
          'post',
          `/api/${module}/scenarios/${scenario.id}/start`,
          userToken
        );
        programIds.push(startResponse.body.programId);
      }
      
      // Get overall user progress
      const progressResponse = await apiHelper.authenticatedRequest(
        'get',
        '/api/user/progress',
        userToken
      );
      
      if (progressResponse.status === 200) {
        expect(progressResponse.body.pblPrograms).toBeGreaterThan(0);
        expect(progressResponse.body.assessmentPrograms).toBeGreaterThan(0);
        expect(progressResponse.body.discoveryPrograms).toBeGreaterThan(0);
      }
      
      // Verify all programs in database
      const programs = await dbHelper.pool.query(
        'SELECT mode, status FROM programs WHERE user_id = $1',
        [userId]
      );
      
      const modeCount = programs.rows.reduce((acc, row) => {
        acc[row.mode] = (acc[row.mode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      expect(modeCount.pbl).toBeGreaterThan(0);
      expect(modeCount.assessment).toBeGreaterThan(0);
      expect(modeCount.discovery).toBeGreaterThan(0);
    });
  });
  
  describe('Performance Benchmarks', () => {
    let userToken: string;
    
    beforeAll(async () => {
      const user = await dbHelper.createUser({
        ...testUsers.student,
        email: TestDataGenerator.randomEmail(),
      });
      userToken = await dbHelper.createSession(user.id);
    });
    
    it('should handle API response times within SLA', async () => {
      const endpoints = [
        '/api/pbl/scenarios',
        '/api/assessment/scenarios',
        '/api/discovery/scenarios',
      ];
      
      const responseTimes: number[] = [];
      
      for (const endpoint of endpoints) {
        const { duration } = await PerformanceTestHelper.measureResponseTime(
          () => apiHelper.authenticatedRequest('get', endpoint, userToken)
        );
        responseTimes.push(duration);
      }
      
      const stats = PerformanceTestHelper.calculatePercentiles(responseTimes);
      
      // Check SLA: P95 < 500ms
      expect(stats.p95).toBeLessThan(500);
      // Check SLA: P50 < 200ms
      expect(stats.p50).toBeLessThan(200);
    });
    
    it('should maintain data integrity under load', async () => {
      const scenarioId = testScenarios.pbl.id;
      
      // Create multiple programs concurrently
      const createPrograms = Array.from({ length: 10 }, () =>
        apiHelper.authenticatedRequest(
          'post',
          `/api/pbl/scenarios/${scenarioId}/start`,
          userToken
        )
      );
      
      const results = await Promise.allSettled(createPrograms);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      // Check data integrity
      const integrity = await dbHelper.verifyDataIntegrity();
      expect(integrity.orphanedPrograms).toBe(0);
      expect(integrity.orphanedTasks).toBe(0);
      expect(integrity.modeMismatches).toBe(0);
    });
  });
});