/**
 * Simplified TDD Test: Unified Learning Service
 * Basic functionality tests
 */

import { UnifiedLearningService } from '../unified-learning-service';
import { IScenario, IProgram, ITask, IEvaluation } from '@/types/unified-learning';

// Mock repositories using simple objects
const mockScenarioRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  findBySource: jest.fn(),
  update: jest.fn()
};

const mockProgramRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUser: jest.fn(),
  findByScenario: jest.fn(),
  updateProgress: jest.fn(),
  complete: jest.fn()
};

const mockTaskRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByProgram: jest.fn(),
  updateStatus: jest.fn(),
  saveResponse: jest.fn()
};

const mockEvaluationRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEntity: jest.fn(),
  findByProgram: jest.fn(),
  findByUser: jest.fn(),
  update: jest.fn()
};

// Mock the constructors
jest.mock('../../repositories/gcs-scenario-repository', () => ({
  GCSScenarioRepository: jest.fn(() => mockScenarioRepo)
}));

jest.mock('../../repositories/gcs-program-repository', () => ({
  GCSProgramRepository: jest.fn(() => mockProgramRepo)
}));

jest.mock('../../repositories/gcs-task-repository', () => ({
  GCSTaskRepository: jest.fn(() => mockTaskRepo)
}));

jest.mock('../../repositories/gcs-evaluation-repository', () => ({
  GCSEvaluationRepository: jest.fn(() => mockEvaluationRepo)
}));

describe('UnifiedLearningService - Basic Functionality', () => {
  let service: UnifiedLearningService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UnifiedLearningService();
  });

  describe('createLearningProgram()', () => {
    it('should create a complete learning program', async () => {
      const mockScenario: IScenario = {
        id: 'scenario-1',
        sourceType: 'pbl',
        sourceRef: { type: 'yaml', path: 'test.yaml', metadata: {} },
        title: 'Test Scenario',
        description: 'Test description',
        objectives: ['Learn something'],
        taskTemplates: [
          { id: 'template-1', title: 'Task 1', type: 'chat', description: 'First task' }
        ],
        metadata: {},
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockProgram: IProgram = {
        id: 'program-1',
        scenarioId: 'scenario-1',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: [],
        currentTaskIndex: 0,
        metadata: { sourceType: 'pbl' }
      };

      const mockTask: ITask = {
        id: 'task-1',
        programId: 'program-1',
        templateId: 'template-1',
        title: 'Task 1',
        description: 'First task',
        type: 'chat',
        order: 1,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: { sourceType: 'pbl' }
      };

      const updatedProgram = { ...mockProgram, taskIds: ['task-1'] };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockTaskRepo.create.mockResolvedValue(mockTask);
      mockProgramRepo.findById.mockResolvedValue(updatedProgram);

      const result = await service.createLearningProgram('scenario-1', 'user@example.com');

      expect(result.scenario).toEqual(mockScenario);
      expect(result.program).toEqual(updatedProgram);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toEqual(mockTask);
    });

    it('should throw error if scenario not found', async () => {
      mockScenarioRepo.findById.mockResolvedValue(null);

      await expect(service.createLearningProgram('invalid-id', 'user@example.com'))
        .rejects.toThrow('Scenario not found: invalid-id');
    });
  });

  describe('completeTask()', () => {
    it('should complete a task with evaluation', async () => {
      const mockTask: ITask = {
        id: 'task-1',
        programId: 'program-1',
        templateId: 'template-1',
        title: 'Task 1',
        description: 'First task',
        type: 'chat',
        order: 1,
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: { sourceType: 'pbl' }
      };

      const completedTask = {
        ...mockTask,
        status: 'completed' as const,
        completedAt: '2024-01-01T01:00:00.000Z'
      };

      const mockEvaluation: IEvaluation = {
        id: 'eval-1',
        entityType: 'task',
        entityId: 'task-1',
        programId: 'program-1',
        userId: 'user@example.com',
        type: 'ai_feedback',
        createdAt: '2024-01-01T01:00:00.000Z',
        metadata: { sourceType: 'pbl' }
      };

      const mockProgram: IProgram = {
        id: 'program-1',
        scenarioId: 'scenario-1',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: ['task-1'],
        currentTaskIndex: 0,
        metadata: {}
      };

      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.updateStatus.mockResolvedValue(completedTask);
      mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockProgramRepo.complete.mockResolvedValue({
        ...mockProgram,
        status: 'completed' as const,
        completedAt: '2024-01-01T01:00:00.000Z'
      });

      const result = await service.completeTask('task-1', 'user@example.com');

      expect(result.task).toEqual(completedTask);
      expect(result.evaluation).toEqual(mockEvaluation);
      expect(result.nextTask).toBeUndefined();
    });
  });

  describe('getLearningProgress()', () => {
    it('should get user learning progress', async () => {
      const mockPrograms: IProgram[] = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          userId: 'user@example.com',
          status: 'active',
          startedAt: '2024-01-01T00:00:00.000Z',
          taskIds: ['task-1'],
          currentTaskIndex: 0,
          metadata: {}
        },
        {
          id: 'program-2',
          scenarioId: 'scenario-2',
          userId: 'user@example.com',
          status: 'completed',
          startedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T02:00:00.000Z',
          taskIds: ['task-2'],
          currentTaskIndex: 1,
          metadata: {}
        }
      ];

      const mockEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          entityType: 'task',
          entityId: 'task-1',
          programId: 'program-1',
          userId: 'user@example.com',
          type: 'ai_feedback',
          createdAt: '2024-01-01T01:00:00.000Z',
          metadata: { performance: { qualityScore: 85 } }
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);
      mockEvaluationRepo.findByUser.mockResolvedValue(mockEvaluations);

      const result = await service.getLearningProgress('user@example.com');

      expect(result.activePrograms).toHaveLength(1);
      expect(result.completedPrograms).toHaveLength(1);
      expect(result.totalEvaluations).toBe(1);
      expect(result.averageScore).toBe(85);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors', async () => {
      mockScenarioRepo.findById.mockRejectedValue(new Error('Database error'));

      await expect(service.createLearningProgram('scenario-1', 'user@example.com'))
        .rejects.toThrow('Database error');
    });

    it('should throw error for missing task', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(service.completeTask('invalid-task', 'user@example.com'))
        .rejects.toThrow('Task not found: invalid-task');
    });
  });
});