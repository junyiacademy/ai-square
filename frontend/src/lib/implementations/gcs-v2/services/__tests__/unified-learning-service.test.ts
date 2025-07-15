/**
 * TDD Test: Unified Learning Service
 * Tests for business logic layer - complete learning workflows
 */

import { UnifiedLearningService } from '../unified-learning-service';
import { IScenario, IProgram, ITask, IEvaluation } from '@/types/unified-learning';
import { jest } from '@jest/globals';

// Mock all repositories
jest.mock('../../repositories/gcs-scenario-repository');
jest.mock('../../repositories/gcs-program-repository');
jest.mock('../../repositories/gcs-task-repository');
jest.mock('../../repositories/gcs-evaluation-repository');

import { GCSScenarioRepository } from '../../repositories/gcs-scenario-repository';
import { GCSProgramRepository } from '../../repositories/gcs-program-repository';
import { GCSTaskRepository } from '../../repositories/gcs-task-repository';
import { GCSEvaluationRepository } from '../../repositories/gcs-evaluation-repository';

// Mock the repository classes
const MockGCSScenarioRepository = GCSScenarioRepository as jest.MockedClass<typeof GCSScenarioRepository>;
const MockGCSProgramRepository = GCSProgramRepository as jest.MockedClass<typeof GCSProgramRepository>;
const MockGCSTaskRepository = GCSTaskRepository as jest.MockedClass<typeof GCSTaskRepository>;
const MockGCSEvaluationRepository = GCSEvaluationRepository as jest.MockedClass<typeof GCSEvaluationRepository>;

describe('UnifiedLearningService - Business Logic Layer', () => {
  let service: UnifiedLearningService;
  let mockScenarioRepo: jest.Mocked<GCSScenarioRepository>;
  let mockProgramRepo: jest.Mocked<GCSProgramRepository>;
  let mockTaskRepo: jest.Mocked<GCSTaskRepository>;
  let mockEvaluationRepo: jest.Mocked<GCSEvaluationRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocked repositories
    mockScenarioRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      findBySource: jest.fn(),
      update: jest.fn()
    } as any;

    mockProgramRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      findByScenario: jest.fn(),
      updateProgress: jest.fn(),
      complete: jest.fn()
    } as any;

    mockTaskRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByProgram: jest.fn(),
      updateStatus: jest.fn(),
      saveResponse: jest.fn()
    } as any;

    mockEvaluationRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEntity: jest.fn(),
      findByProgram: jest.fn(),
      findByUser: jest.fn(),
      update: jest.fn()
    } as any;

    // Mock repository constructors
    MockGCSScenarioRepository.mockImplementation(() => mockScenarioRepo);
    MockGCSProgramRepository.mockImplementation(() => mockProgramRepo);
    MockGCSTaskRepository.mockImplementation(() => mockTaskRepo);
    MockGCSEvaluationRepository.mockImplementation(() => mockEvaluationRepo);

    service = new UnifiedLearningService();
  });

  describe('createLearningProgram() - End-to-end program creation', () => {
    it('should create complete PBL learning program', async () => {
      // Red: Write failing test first
      const mockScenario: IScenario = {
        id: 'scenario-uuid-1234',
        sourceType: 'pbl',
        sourceRef: {
          type: 'yaml',
          path: 'pbl_scenario.yaml',
          metadata: {}
        },
        title: 'AI Education Design',
        description: 'Design AI-powered educational tool',
        objectives: ['Learn AI in education'],
        taskTemplates: [
          {
            id: 'task-template-1',
            title: 'Research Phase',
            type: 'chat',
            description: 'Research existing tools',
            metadata: {
              aiModules: ['research'],
              ksaCodes: ['K1']
            }
          },
          {
            id: 'task-template-2',
            title: 'Design Phase',
            type: 'chat',
            description: 'Design the interface',
            metadata: {
              aiModules: ['design'],
              ksaCodes: ['S1']
            }
          }
        ],
        metadata: {},
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockProgram: IProgram = {
        id: 'program-uuid-1234',
        scenarioId: 'scenario-uuid-1234',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: [],
        currentTaskIndex: 0,
        metadata: {
          sourceType: 'pbl'
        }
      };

      const mockTasks: ITask[] = [
        {
          id: 'task-uuid-1',
          programId: 'program-uuid-1234',
          templateId: 'task-template-1',
          title: 'Research Phase',
          description: 'Research existing tools',
          type: 'chat',
          order: 1,
          status: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: {
            sourceType: 'pbl',
            aiModules: ['research'],
            ksaCodes: ['K1']
          }
        },
        {
          id: 'task-uuid-2',
          programId: 'program-uuid-1234',
          templateId: 'task-template-2',
          title: 'Design Phase',
          description: 'Design the interface',
          type: 'chat',
          order: 2,
          status: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: {
            sourceType: 'pbl',
            aiModules: ['design'],
            ksaCodes: ['S1']
          }
        }
      ];

      const updatedProgram: IProgram = {
        ...mockProgram,
        taskIds: ['task-uuid-1', 'task-uuid-2']
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockTaskRepo.create.mockResolvedValueOnce(mockTasks[0]).mockResolvedValueOnce(mockTasks[1]);
      mockProgramRepo.findById.mockResolvedValueOnce(mockProgram).mockResolvedValueOnce(updatedProgram);

      // Green: Make test pass
      const result = await service.createLearningProgram(
        'scenario-uuid-1234',
        'user@example.com',
        { customData: 'test' }
      );

      expect(result).toEqual({
        scenario: mockScenario,
        program: updatedProgram,
        tasks: mockTasks
      });

      // Verify repository calls
      expect(mockScenarioRepo.findById).toHaveBeenCalledWith('scenario-uuid-1234');
      expect(mockProgramRepo.create).toHaveBeenCalledWith({
        scenarioId: 'scenario-uuid-1234',
        userId: 'user@example.com',
        status: 'active',
        startedAt: expect.any(String),
        taskIds: [],
        currentTaskIndex: 0,
        metadata: {
          sourceType: 'pbl',
          customData: 'test'
        }
      });
      expect(mockTaskRepo.create).toHaveBeenCalledTimes(2);
      expect(mockProgramRepo.findById).toHaveBeenCalledWith('program-uuid-1234');
    });

    it('should throw error if scenario not found', async () => {
      mockScenarioRepo.findById.mockResolvedValue(null);

      await expect(service.createLearningProgram('invalid-id', 'user@example.com'))
        .rejects.toThrow('Scenario not found: invalid-id');
    });
  });

  describe('completeTask() - Task completion with evaluation', () => {
    it('should complete task and create evaluation', async () => {
      const mockTask: ITask = {
        id: 'task-uuid-1234',
        programId: 'program-uuid-1234',
        templateId: 'task-template-1',
        title: 'Research Phase',
        description: 'Research existing tools',
        type: 'chat',
        order: 1,
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T01:00:00.000Z',
        metadata: {
          sourceType: 'pbl'
        }
      };

      const completedTask: ITask = {
        ...mockTask,
        status: 'completed',
        completedAt: '2024-01-01T02:00:00.000Z',
        response: { answer: 'User response' }
      };

      const mockEvaluation: IEvaluation = {
        id: 'eval-uuid-1234',
        entityType: 'task',
        entityId: 'task-uuid-1234',
        programId: 'program-uuid-1234',
        userId: 'user@example.com',
        type: 'ai_feedback',
        createdAt: '2024-01-01T02:00:00.000Z',
        metadata: {
          sourceType: 'pbl',
          performance: { qualityScore: 85 }
        }
      };

      const mockProgram: IProgram = {
        id: 'program-uuid-1234',
        scenarioId: 'scenario-uuid',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: ['task-uuid-1234', 'task-uuid-5678'],
        currentTaskIndex: 0,
        metadata: {}
      };

      const nextTask: ITask = {
        id: 'task-uuid-5678',
        programId: 'program-uuid-1234',
        templateId: 'task-template-2',
        title: 'Design Phase',
        description: 'Design interface',
        type: 'chat',
        order: 2,
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T02:00:00.000Z',
        metadata: {}
      };

      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.saveResponse.mockResolvedValue(completedTask);
      mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockProgramRepo.updateProgress.mockResolvedValue(mockProgram);
      mockTaskRepo.findById.mockResolvedValueOnce(mockTask).mockResolvedValueOnce(nextTask);
      mockTaskRepo.updateStatus.mockResolvedValue(nextTask);

      const result = await service.completeTask(
        'task-uuid-1234',
        'user@example.com',
        { answer: 'User response' },
        { metadata: { performance: { qualityScore: 85 } } }
      );

      expect(result).toEqual({
        task: completedTask,
        evaluation: mockEvaluation,
        nextTask
      });

      expect(mockTaskRepo.saveResponse).toHaveBeenCalledWith('task-uuid-1234', { answer: 'User response' });
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith({
        entityType: 'task',
        entityId: 'task-uuid-1234',
        programId: 'program-uuid-1234',
        userId: 'user@example.com',
        type: 'ai_feedback',
        createdAt: expect.any(String),
        metadata: {
          sourceType: 'pbl',
          performance: { qualityScore: 85 }
        }
      });
    });

    it('should complete program when last task is completed', async () => {
      const mockTask: ITask = {
        id: 'task-uuid-1234',
        programId: 'program-uuid-1234',
        templateId: 'task-template-1',
        title: 'Final Task',
        description: 'Final task',
        type: 'chat',
        order: 1,
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: { sourceType: 'pbl' }
      };

      const mockProgram: IProgram = {
        id: 'program-uuid-1234',
        scenarioId: 'scenario-uuid',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: ['task-uuid-1234'],
        currentTaskIndex: 0,
        metadata: {}
      };

      const completedTask: ITask = {
        ...mockTask,
        status: 'completed',
        completedAt: '2024-01-01T02:00:00.000Z'
      };

      const mockEvaluation: IEvaluation = {
        id: 'eval-uuid-1234',
        entityType: 'task',
        entityId: 'task-uuid-1234',
        programId: 'program-uuid-1234',
        userId: 'user@example.com',
        type: 'ai_feedback',
        createdAt: '2024-01-01T02:00:00.000Z',
        metadata: { sourceType: 'pbl' }
      };

      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.updateStatus.mockResolvedValue(completedTask);
      mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockProgramRepo.complete.mockResolvedValue({
        ...mockProgram,
        status: 'completed',
        completedAt: '2024-01-01T02:00:00.000Z'
      });

      const result = await service.completeTask('task-uuid-1234', 'user@example.com');

      expect(result.nextTask).toBeUndefined();
      expect(mockProgramRepo.complete).toHaveBeenCalledWith('program-uuid-1234');
    });
  });

  describe('completeProgram() - Program completion with evaluation', () => {
    it('should complete program and create final evaluation', async () => {
      const mockProgram: IProgram = {
        id: 'program-uuid-1234',
        scenarioId: 'scenario-uuid',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: ['task-1', 'task-2'],
        currentTaskIndex: 2,
        metadata: { sourceType: 'pbl' }
      };

      const completedProgram: IProgram = {
        ...mockProgram,
        status: 'completed',
        completedAt: '2024-01-01T02:00:00.000Z'
      };

      const mockEvaluation: IEvaluation = {
        id: 'eval-uuid-1234',
        entityType: 'program',
        entityId: 'program-uuid-1234',
        programId: 'program-uuid-1234',
        userId: 'user@example.com',
        type: 'program_completion',
        createdAt: '2024-01-01T02:00:00.000Z',
        metadata: {
          sourceType: 'pbl',
          overallScore: 85
        }
      };

      const taskEvaluations: IEvaluation[] = [
        {
          id: 'eval-task-1',
          entityType: 'task',
          entityId: 'task-1',
          programId: 'program-uuid-1234',
          userId: 'user@example.com',
          type: 'ai_feedback',
          createdAt: '2024-01-01T01:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        }
      ];

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockProgramRepo.complete.mockResolvedValue(completedProgram);
      mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);
      mockEvaluationRepo.findByProgram.mockResolvedValue(taskEvaluations);

      const result = await service.completeProgram(
        'program-uuid-1234',
        'user@example.com',
        { metadata: { overallScore: 85 } }
      );

      expect(result).toEqual({
        program: completedProgram,
        evaluation: mockEvaluation,
        taskEvaluations
      });

      expect(mockProgramRepo.complete).toHaveBeenCalledWith('program-uuid-1234');
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith({
        entityType: 'program',
        entityId: 'program-uuid-1234',
        programId: 'program-uuid-1234',
        userId: 'user@example.com',
        type: 'program_completion',
        createdAt: expect.any(String),
        metadata: {
          sourceType: 'pbl',
          overallScore: 85
        }
      });
    });
  });

  describe('getLearningProgress() - User progress analytics', () => {
    it('should get comprehensive learning progress', async () => {
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
          metadata: {
            performance: { qualityScore: 80 }
          }
        },
        {
          id: 'eval-2',
          entityType: 'task',
          entityId: 'task-2',
          programId: 'program-2',
          userId: 'user@example.com',
          type: 'ai_feedback',
          createdAt: '2024-01-01T02:00:00.000Z',
          metadata: {
            performance: { qualityScore: 90 }
          }
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);
      mockEvaluationRepo.findByUser.mockResolvedValue(mockEvaluations);

      const result = await service.getLearningProgress('user@example.com');

      expect(result).toEqual({
        activePrograms: [mockPrograms[0]],
        completedPrograms: [mockPrograms[1]],
        totalEvaluations: 2,
        averageScore: 85
      });
    });
  });

  describe('getProgramStatus() - Detailed program information', () => {
    it('should get complete program status', async () => {
      const mockProgram: IProgram = {
        id: 'program-uuid-1234',
        scenarioId: 'scenario-uuid',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: ['task-1', 'task-2'],
        currentTaskIndex: 0,
        metadata: {}
      };

      const mockScenario: IScenario = {
        id: 'scenario-uuid',
        sourceType: 'pbl',
        sourceRef: { type: 'yaml', path: 'test.yaml', metadata: {} },
        title: 'Test Scenario',
        description: 'Test description',
        objectives: ['Test objective'],
        taskTemplates: [],
        metadata: {},
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockTasks: ITask[] = [
        {
          id: 'task-1',
          programId: 'program-uuid-1234',
          templateId: 'template-1',
          title: 'Task 1',
          description: 'Description 1',
          type: 'chat',
          order: 1,
          status: 'active',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: {}
        },
        {
          id: 'task-2',
          programId: 'program-uuid-1234',
          templateId: 'template-2',
          title: 'Task 2',
          description: 'Description 2',
          type: 'chat',
          order: 2,
          status: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: {}
        }
      ];

      const mockEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          entityType: 'task',
          entityId: 'task-1',
          programId: 'program-uuid-1234',
          userId: 'user@example.com',
          type: 'ai_feedback',
          createdAt: '2024-01-01T01:00:00.000Z',
          metadata: {}
        }
      ];

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations);

      const result = await service.getProgramStatus('program-uuid-1234');

      expect(result).toEqual({
        program: mockProgram,
        scenario: mockScenario,
        tasks: mockTasks,
        evaluations: mockEvaluations,
        currentTask: mockTasks[0],
        completionRate: 0  // No completed tasks
      });
    });
  });

  describe('getLearningAnalytics() - Comprehensive analytics', () => {
    it('should get detailed learning analytics', async () => {
      const mockPrograms: IProgram[] = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          userId: 'user@example.com',
          status: 'completed',
          startedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T02:00:00.000Z',
          taskIds: ['task-1'],
          currentTaskIndex: 1,
          metadata: {}
        }
      ];

      const mockTasks: ITask[] = [
        {
          id: 'task-1',
          programId: 'program-1',
          templateId: 'template-1',
          title: 'Task 1',
          description: 'Description 1',
          type: 'chat',
          order: 1,
          status: 'completed',
          createdAt: '2024-01-01T00:00:00.000Z',
          startedAt: '2024-01-01T01:00:00.000Z',
          completedAt: '2024-01-01T01:30:00.000Z',
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
          createdAt: '2024-01-01T01:30:00.000Z',
          metadata: {
            skillsGained: ['problem_solving', 'communication']
          }
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
      mockEvaluationRepo.findByUser.mockResolvedValue(mockEvaluations);

      const result = await service.getLearningAnalytics('user@example.com');

      expect(result.totalPrograms).toBe(1);
      expect(result.completedPrograms).toBe(1);
      expect(result.totalTasks).toBe(1);
      expect(result.completedTasks).toBe(1);
      expect(result.averageTaskTime).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
      expect(result.topSkills).toEqual(['problem_solving', 'communication']);
      expect(result.recentActivity).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockScenarioRepo.findById.mockRejectedValue(new Error('Database error'));

      await expect(service.createLearningProgram('scenario-id', 'user@example.com'))
        .rejects.toThrow('Database error');
    });

    it('should throw descriptive errors for missing entities', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(service.completeTask('invalid-task-id', 'user@example.com'))
        .rejects.toThrow('Task not found: invalid-task-id');
    });
  });
});