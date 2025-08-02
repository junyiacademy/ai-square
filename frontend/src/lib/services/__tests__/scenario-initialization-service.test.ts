import { ScenarioInitializationService } from '../scenario-initialization-service';
import type { IScenario, IProgram, ITask } from '@/types/unified-learning';

// Mock repositories
const mockScenarioRepo = {
  findById: jest.fn(),
  create: jest.fn()
};

const mockProgramRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn()
};

const mockTaskRepo = {
  create: jest.fn(),
  findByProgram: jest.fn()
};

const mockRepositoryFactory = {
  getScenarioRepository: () => mockScenarioRepo,
  getProgramRepository: () => mockProgramRepo,
  getTaskRepository: () => mockTaskRepo
};

describe('ScenarioInitializationService', () => {
  let service: ScenarioInitializationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScenarioInitializationService();
  });

  const mockScenario: IScenario = {
    id: 'scenario-123',
    mode: 'pbl',
    sourceType: 'yaml',
    sourcePath: 'test.yaml',
    sourceId: undefined,
    sourceMetadata: {},
    title: { en: 'Test Scenario' },
    description: { en: 'Test description' },
    status: 'active',
    version: '1.0.0',
    objectives: ['Learn testing'],
    difficulty: 'intermediate',
    estimatedMinutes: 60,
    prerequisites: [],
    taskTemplates: [
      {
        id: 'task-1',
        title: { en: 'Task 1' },
        type: 'question',
        description: { en: 'First task' }
      },
      {
        id: 'task-2',
        title: { en: 'Task 2' },
        type: 'chat',
        description: { en: 'Second task' }
      }
    ],
    taskCount: 2,
    xpRewards: { completion: 100 },
    unlockRequirements: {},
    pblData: {
      aiModules: ['tutor'],
      ksaCodes: ['K1.1', 'S1.1']
    },
    discoveryData: {},
    assessmentData: {},
    aiModules: {},
    resources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: undefined,
    metadata: {}
  };

  const mockProgram: IProgram = {
    id: 'program-123',
    scenarioId: 'scenario-123',
    mode: 'pbl',
    userId: 'user-123',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 2,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    completedAt: undefined,
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    timeSpentSeconds: 0,
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  // TODO: These tests should be moved to a ProgramInitializationService test file
  // The ScenarioInitializationService is for loading scenarios from YAML, not creating programs
  /*
  describe('initializeProgram', () => {
    it('initializes a new program with tasks', async () => {
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockTaskRepo.create.mockImplementation((task) => ({ ...task, id: `task-${Date.now()}` }));

      const result = await service.initializeProgram('scenario-123', 'user-123');

      expect(result.program).toEqual(mockProgram);
      expect(result.tasks).toHaveLength(2);
      expect(mockProgramRepo.create).toHaveBeenCalledWith({
        scenarioId: 'scenario-123',
        mode: 'pbl',
        userId: 'user-123',
        status: 'active',
        startedAt: expect.any(String),
        metadata: {
          scenarioTitle: mockScenario.title,
          totalTasks: 2,
          taskIds: expect.any(Array)
        }
      });
      expect(mockTaskRepo.create).toHaveBeenCalledTimes(2);
    });

    it('throws error when scenario not found', async () => {
      mockScenarioRepo.findById.mockResolvedValue(null);

      await expect(service.initializeProgram('invalid', 'user-123'))
        .rejects.toThrow('Scenario not found');
    });

    it('throws error when scenario is not active', async () => {
      const inactiveScenario = { ...mockScenario, status: 'archived' };
      mockScenarioRepo.findById.mockResolvedValue(inactiveScenario);

      await expect(service.initializeProgram('scenario-123', 'user-123'))
        .rejects.toThrow('Scenario is not active');
    });
  });
  */

  /*
  describe('resumeProgram', () => {
    it('resumes an existing program', async () => {
      const existingTasks: ITask[] = [
        {
          id: 'task-1',
          programId: 'program-123',
          mode: 'pbl',
          type: 'question',
          status: 'completed',
          title: { en: 'Task 1' },
          createdAt: new Date().toISOString()
        },
        {
          id: 'task-2',
          programId: 'program-123',
          mode: 'pbl',
          type: 'chat',
          status: 'pending',
          title: { en: 'Task 2' },
          createdAt: new Date().toISOString()
        }
      ];

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(existingTasks);

      const result = await service.resumeProgram('program-123', 'user-123');

      expect(result.program).toEqual(mockProgram);
      expect(result.tasks).toEqual(existingTasks);
      expect(result.currentTaskIndex).toBe(1);
    });

    it('throws error when program not found', async () => {
      mockProgramRepo.findById.mockResolvedValue(null);

      await expect(service.resumeProgram('invalid', 'user-123'))
        .rejects.toThrow('Program not found');
    });

    it('throws error when user does not own program', async () => {
      const otherUserProgram = { ...mockProgram, userId: 'other-user' };
      mockProgramRepo.findById.mockResolvedValue(otherUserProgram);

      await expect(service.resumeProgram('program-123', 'user-123'))
        .rejects.toThrow('Unauthorized access to program');
    });
  });
  */

  /*
  describe('validateScenarioTasks', () => {
    it('validates scenario has task templates', async () => {
      const scenarioNoTasks = { ...mockScenario, taskTemplates: [] };
      mockScenarioRepo.findById.mockResolvedValue(scenarioNoTasks);
      mockProgramRepo.create.mockResolvedValue(mockProgram);

      await expect(service.initializeProgram('scenario-123', 'user-123'))
        .rejects.toThrow('Scenario has no task templates');
    });

    it('validates scenario has valid task templates', async () => {
      const scenarioInvalidTasks = { 
        ...mockScenario, 
        taskTemplates: [{ invalid: 'task' }] 
      };
      mockScenarioRepo.findById.mockResolvedValue(scenarioInvalidTasks);
      mockProgramRepo.create.mockResolvedValue(mockProgram);

      const result = await service.initializeProgram('scenario-123', 'user-123');
      
      // Should create program but with no tasks due to invalid templates
      expect(result.tasks).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('handles repository errors gracefully', async () => {
      mockScenarioRepo.findById.mockRejectedValue(new Error('Database error'));

      await expect(service.initializeProgram('scenario-123', 'user-123'))
        .rejects.toThrow('Database error');
    });

    it('rolls back on task creation failure', async () => {
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockTaskRepo.create
        .mockResolvedValueOnce({ id: 'task-1' })
        .mockRejectedValueOnce(new Error('Task creation failed'));

      await expect(service.initializeProgram('scenario-123', 'user-123'))
        .rejects.toThrow('Task creation failed');
    });
  });
  */
});