/**
 * Tests for mock repository implementations
 */

import {
  createMockUserRepository,
  createMockScenarioRepository,
  createMockProgramRepository,
  createMockTaskRepository,
  createMockEvaluationRepository,
  createMockAchievementRepository,
  createMockRepositoryFactory
} from '../mock-repositories';

describe('mock-repositories', () => {
  describe('createMockUserRepository', () => {
    it('creates mock user repository with all methods', () => {
      const repo = createMockUserRepository();
      
      expect(repo.findById).toBeDefined();
      expect(repo.findByEmail).toBeDefined();
      expect(repo.create).toBeDefined();
      expect(repo.update).toBeDefined();
      expect(repo.delete).toBeDefined();
      expect(repo.findAll).toBeDefined();
      expect(repo.count).toBeDefined();
      
      expect(typeof repo.findById).toBe('function');
      expect(jest.isMockFunction(repo.findById)).toBe(true);
    });

    it('has default mock implementations', async () => {
      const repo = createMockUserRepository();
      
      const users = await repo.findAll();
      expect(users).toEqual([]);
      
      const count = await repo.count();
      expect(count).toBe(0);
    });

    it('allows overriding mock implementations', async () => {
      const repo = createMockUserRepository();
      
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      repo.findById.mockResolvedValue(mockUser);
      
      const result = await repo.findById('user-1');
      expect(result).toEqual(mockUser);
      expect(repo.findById).toHaveBeenCalledWith('user-1');
    });
  });

  describe('createMockScenarioRepository', () => {
    it('creates mock scenario repository with all methods', () => {
      const repo = createMockScenarioRepository();
      
      expect(repo.findById).toBeDefined();
      expect(repo.findAll).toBeDefined();
      expect(repo.findByMode).toBeDefined();
      expect(repo.create).toBeDefined();
      expect(repo.update).toBeDefined();
      expect(repo.delete).toBeDefined();
      expect(repo.count).toBeDefined();
      expect(repo.search).toBeDefined();
    });

    it('has default mock implementations', async () => {
      const repo = createMockScenarioRepository();
      
      const scenarios = await repo.findAll();
      expect(scenarios).toEqual([]);
      
      const byMode = await repo.findByMode('pbl');
      expect(byMode).toEqual([]);
      
      const searchResults = await repo.search('test');
      expect(searchResults).toEqual([]);
      
      const count = await repo.count();
      expect(count).toBe(0);
    });

    it('can mock complex search results', async () => {
      const repo = createMockScenarioRepository();
      
      const mockResults = [
        { id: 's1', title: { en: 'Result 1' } },
        { id: 's2', title: { en: 'Result 2' } }
      ];
      repo.search.mockResolvedValue(mockResults);
      
      const results = await repo.search('query');
      expect(results).toEqual(mockResults);
    });
  });

  describe('createMockProgramRepository', () => {
    it('creates mock program repository with all methods', () => {
      const repo = createMockProgramRepository();
      
      expect(repo.findById).toBeDefined();
      expect(repo.findByUser).toBeDefined();
      expect(repo.findByScenario).toBeDefined();
      expect(repo.create).toBeDefined();
      expect(repo.update).toBeDefined();
      expect(repo.delete).toBeDefined();
      expect(repo.updateStatus).toBeDefined();
      expect(repo.recordCompletion).toBeDefined();
      expect(repo.getActivePrograms).toBeDefined();
      expect(repo.count).toBeDefined();
    });

    it('has default mock implementations', async () => {
      const repo = createMockProgramRepository();
      
      const byUser = await repo.findByUser('user-1');
      expect(byUser).toEqual([]);
      
      const byScenario = await repo.findByScenario('scenario-1');
      expect(byScenario).toEqual([]);
      
      const active = await repo.getActivePrograms('user-1');
      expect(active).toEqual([]);
      
      const count = await repo.count();
      expect(count).toBe(0);
    });

    it('can mock status updates', async () => {
      const repo = createMockProgramRepository();
      
      repo.updateStatus.mockResolvedValue({ 
        id: 'prog-1', 
        status: 'completed' 
      });
      
      const result = await repo.updateStatus('prog-1', 'completed');
      expect(result).toEqual({ id: 'prog-1', status: 'completed' });
      expect(repo.updateStatus).toHaveBeenCalledWith('prog-1', 'completed');
    });

    it('can mock completion recording', async () => {
      const repo = createMockProgramRepository();
      
      const completionData = {
        score: 95,
        timeSpent: 3600,
        completedAt: new Date().toISOString()
      };
      
      repo.recordCompletion.mockResolvedValue({
        id: 'prog-1',
        ...completionData
      });
      
      const result = await repo.recordCompletion('prog-1', completionData);
      expect(result.score).toBe(95);
    });
  });

  describe('createMockTaskRepository', () => {
    it('creates mock task repository with all methods', () => {
      const repo = createMockTaskRepository();
      
      expect(repo.findById).toBeDefined();
      expect(repo.findByProgram).toBeDefined();
      expect(repo.create).toBeDefined();
      expect(repo.update).toBeDefined();
      expect(repo.delete).toBeDefined();
      expect(repo.updateStatus).toBeDefined();
      expect(repo.updateInteractions).toBeDefined();
      expect(repo.recordAttempt).toBeDefined();
      expect(repo.addInteraction).toBeDefined();
      expect(repo.count).toBeDefined();
    });

    it('has default mock implementations', async () => {
      const repo = createMockTaskRepository();
      
      const byProgram = await repo.findByProgram('prog-1');
      expect(byProgram).toEqual([]);
      
      const count = await repo.count();
      expect(count).toBe(0);
    });

    it('can mock interaction updates', async () => {
      const repo = createMockTaskRepository();
      
      const interactions = [
        { type: 'user', content: 'Question?' },
        { type: 'ai', content: 'Answer.' }
      ];
      
      repo.updateInteractions.mockResolvedValue({
        id: 'task-1',
        interactions
      });
      
      const result = await repo.updateInteractions('task-1', interactions);
      expect(result.interactions).toEqual(interactions);
    });

    it('can mock adding single interaction', async () => {
      const repo = createMockTaskRepository();
      
      const interaction = { type: 'user', content: 'Hello' };
      
      repo.addInteraction.mockResolvedValue({
        id: 'task-1',
        interactions: [interaction]
      });
      
      const result = await repo.addInteraction('task-1', interaction);
      expect(result.interactions).toContainEqual(interaction);
    });

    it('can mock recording attempts', async () => {
      const repo = createMockTaskRepository();
      
      repo.recordAttempt.mockResolvedValue({
        id: 'task-1',
        attempts: 3,
        lastAttempt: new Date().toISOString()
      });
      
      const result = await repo.recordAttempt('task-1');
      expect(result.attempts).toBe(3);
    });
  });

  describe('createMockEvaluationRepository', () => {
    it('creates mock evaluation repository with all methods', () => {
      const repo = createMockEvaluationRepository();
      
      expect(repo.findById).toBeDefined();
      expect(repo.findByProgram).toBeDefined();
      expect(repo.findByTask).toBeDefined();
      expect(repo.findByUser).toBeDefined();
      expect(repo.create).toBeDefined();
      expect(repo.update).toBeDefined();
      expect(repo.delete).toBeDefined();
      expect(repo.getLatestForProgram).toBeDefined();
      expect(repo.count).toBeDefined();
    });

    it('has default mock implementations', async () => {
      const repo = createMockEvaluationRepository();
      
      const byProgram = await repo.findByProgram('prog-1');
      expect(byProgram).toEqual([]);
      
      const byTask = await repo.findByTask('task-1');
      expect(byTask).toEqual([]);
      
      const byUser = await repo.findByUser('user-1');
      expect(byUser).toEqual([]);
      
      const count = await repo.count();
      expect(count).toBe(0);
    });

    it('create method has default implementation that adds id', async () => {
      const repo = createMockEvaluationRepository();
      
      const evalData = {
        programId: 'prog-1',
        score: 85,
        feedback: 'Good work!'
      };
      
      const result = await repo.create(evalData);
      expect(result.id).toBe('eval-123');
      expect(result.programId).toBe('prog-1');
      expect(result.score).toBe(85);
      expect(result.feedback).toBe('Good work!');
    });

    it('can override create implementation', async () => {
      const repo = createMockEvaluationRepository();
      
      repo.create.mockResolvedValue({
        id: 'custom-id',
        score: 100
      });
      
      const result = await repo.create({ score: 90 });
      expect(result.id).toBe('custom-id');
      expect(result.score).toBe(100);
    });

    it('can mock getting latest evaluation', async () => {
      const repo = createMockEvaluationRepository();
      
      const latestEval = {
        id: 'eval-latest',
        score: 95,
        createdAt: new Date().toISOString()
      };
      
      repo.getLatestForProgram.mockResolvedValue(latestEval);
      
      const result = await repo.getLatestForProgram('prog-1');
      expect(result).toEqual(latestEval);
    });
  });

  describe('createMockAchievementRepository', () => {
    it('creates mock achievement repository with all methods', () => {
      const repo = createMockAchievementRepository();
      
      expect(repo.findById).toBeDefined();
      expect(repo.findByUser).toBeDefined();
      expect(repo.create).toBeDefined();
      expect(repo.update).toBeDefined();
      expect(repo.delete).toBeDefined();
      expect(repo.award).toBeDefined();
      expect(repo.count).toBeDefined();
    });

    it('has default mock implementations', async () => {
      const repo = createMockAchievementRepository();
      
      const byUser = await repo.findByUser('user-1');
      expect(byUser).toEqual([]);
      
      const count = await repo.count();
      expect(count).toBe(0);
    });

    it('can mock awarding achievements', async () => {
      const repo = createMockAchievementRepository();
      
      const achievement = {
        id: 'achieve-1',
        userId: 'user-1',
        type: 'first_completion',
        awardedAt: new Date().toISOString()
      };
      
      repo.award.mockResolvedValue(achievement);
      
      const result = await repo.award('user-1', 'first_completion');
      expect(result).toEqual(achievement);
      expect(repo.award).toHaveBeenCalledWith('user-1', 'first_completion');
    });
  });

  describe('createMockRepositoryFactory', () => {
    it('creates factory with all repository getters', () => {
      const factory = createMockRepositoryFactory();
      
      expect(factory.getUserRepository).toBeDefined();
      expect(factory.getScenarioRepository).toBeDefined();
      expect(factory.getProgramRepository).toBeDefined();
      expect(factory.getTaskRepository).toBeDefined();
      expect(factory.getEvaluationRepository).toBeDefined();
      expect(factory.getAchievementRepository).toBeDefined();
    });

    it('returns mock repositories from getters', () => {
      const factory = createMockRepositoryFactory();
      
      const userRepo = factory.getUserRepository();
      expect(userRepo.findById).toBeDefined();
      expect(jest.isMockFunction(userRepo.findById)).toBe(true);
      
      const scenarioRepo = factory.getScenarioRepository();
      expect(scenarioRepo.search).toBeDefined();
      expect(jest.isMockFunction(scenarioRepo.search)).toBe(true);
    });

    it('returns new instances on each call', () => {
      const factory = createMockRepositoryFactory();
      
      const repo1 = factory.getUserRepository();
      const repo2 = factory.getUserRepository();
      
      expect(repo1).not.toBe(repo2);
    });

    it('getter methods are jest mocks themselves', () => {
      const factory = createMockRepositoryFactory();
      
      expect(jest.isMockFunction(factory.getUserRepository)).toBe(true);
      expect(jest.isMockFunction(factory.getScenarioRepository)).toBe(true);
      
      factory.getUserRepository();
      expect(factory.getUserRepository).toHaveBeenCalled();
    });

    it('can override factory methods', () => {
      const factory = createMockRepositoryFactory();
      
      const customUserRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'custom' }),
        findByEmail: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findAll: jest.fn(),
        count: jest.fn()
      };
      
      factory.getUserRepository.mockReturnValue(customUserRepo);
      
      const repo = factory.getUserRepository();
      expect(repo).toBe(customUserRepo);
    });

    it('can track how many times repositories are requested', () => {
      const factory = createMockRepositoryFactory();
      
      factory.getUserRepository();
      factory.getUserRepository();
      factory.getScenarioRepository();
      
      expect(factory.getUserRepository).toHaveBeenCalledTimes(2);
      expect(factory.getScenarioRepository).toHaveBeenCalledTimes(1);
      expect(factory.getProgramRepository).not.toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('can use factory in test setup', async () => {
      const factory = createMockRepositoryFactory();
      
      // Setup mock data
      const userRepo = factory.getUserRepository();
      userRepo.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      });
      
      const programRepo = factory.getProgramRepository();
      programRepo.findByUser.mockResolvedValue([
        { id: 'prog-1', userId: 'user-1', status: 'active' }
      ]);
      
      // Simulate usage
      const user = await userRepo.findById('user-1');
      const programs = await programRepo.findByUser(user.id);
      
      expect(programs).toHaveLength(1);
      expect(programs[0].userId).toBe(user.id);
    });

    it('can chain multiple repository operations', async () => {
      const factory = createMockRepositoryFactory();
      
      const scenarioRepo = factory.getScenarioRepository();
      const programRepo = factory.getProgramRepository();
      const taskRepo = factory.getTaskRepository();
      
      // Mock scenario
      scenarioRepo.findById.mockResolvedValue({
        id: 'scenario-1',
        title: { en: 'Test Scenario' }
      });
      
      // Mock program creation
      programRepo.create.mockResolvedValue({
        id: 'prog-1',
        scenarioId: 'scenario-1',
        userId: 'user-1'
      });
      
      // Mock task creation
      taskRepo.create.mockResolvedValue({
        id: 'task-1',
        programId: 'prog-1'
      });
      
      // Simulate workflow
      const scenario = await scenarioRepo.findById('scenario-1');
      const program = await programRepo.create({
        scenarioId: scenario.id,
        userId: 'user-1'
      });
      const task = await taskRepo.create({
        programId: program.id
      });
      
      expect(task.programId).toBe(program.id);
      expect(program.scenarioId).toBe(scenario.id);
    });
  });
});