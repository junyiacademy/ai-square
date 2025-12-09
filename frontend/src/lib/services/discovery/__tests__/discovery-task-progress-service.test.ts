import { DiscoveryTaskProgressService } from '../discovery-task-progress-service';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { ITask } from '@/types/unified-learning';

// Mock repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getTaskRepository: jest.fn(),
    getProgramRepository: jest.fn(),
  }
}));

describe('DiscoveryTaskProgressService', () => {
  let mockTaskRepo: {
    findByProgram: jest.Mock;
    updateStatus: jest.Mock;
  };

  let mockProgramRepo: {
    update: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTaskRepo = {
      findByProgram: jest.fn(),
      updateStatus: jest.fn(),
    };

    mockProgramRepo = {
      update: jest.fn(),
    };

    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
  });

  describe('activateNextTask', () => {
    it('should activate next task when available', async () => {
      const programId = 'prog-1';
      const taskIds = ['task-1', 'task-2', 'task-3'];
      const tasks: ITask[] = [
        { id: 'task-1', programId, status: 'completed', type: 'interactive', title: { en: 'Task 1' }, content: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01', mode: 'discovery', taskIndex: 0, interactions: [], interactionCount: 0 } as unknown as ITask,
        { id: 'task-2', programId, status: 'pending', type: 'interactive', title: { en: 'Task 2' }, content: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01', mode: 'discovery', taskIndex: 1, interactions: [], interactionCount: 0 } as unknown as ITask,
        { id: 'task-3', programId, status: 'pending', type: 'interactive', title: { en: 'Task 3' }, content: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01', mode: 'discovery', taskIndex: 2, interactions: [], interactionCount: 0 } as unknown as ITask,
      ];

      mockTaskRepo.findByProgram.mockResolvedValue(tasks);
      mockTaskRepo.updateStatus.mockResolvedValue(undefined);
      mockProgramRepo.update.mockResolvedValue(undefined);

      const result = await DiscoveryTaskProgressService.activateNextTask(programId, taskIds);

      expect(result.nextTaskId).toBe('task-2');
      expect(result.nextTaskIndex).toBe(1);
      expect(result.programCompleted).toBe(false);
      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith('task-2', 'active');
      expect(mockProgramRepo.update).toHaveBeenCalledWith(programId, {
        currentTaskIndex: 1
      });
      expect(mockProgramRepo.update).toHaveBeenCalledWith(programId, {
        metadata: expect.objectContaining({
          currentTaskId: 'task-2',
          currentTaskIndex: 1,
        })
      });
    });

    it('should return null and mark program complete when no next task', async () => {
      const programId = 'prog-1';
      const taskIds = ['task-1'];
      const tasks: ITask[] = [
        { id: 'task-1', programId, status: 'completed', type: 'interactive', title: { en: 'Task 1' }, content: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01', mode: 'discovery', taskIndex: 0, interactions: [], interactionCount: 0 } as unknown as ITask,
      ];

      mockTaskRepo.findByProgram.mockResolvedValue(tasks);
      mockProgramRepo.update.mockResolvedValue(undefined);

      const result = await DiscoveryTaskProgressService.activateNextTask(programId, taskIds);

      expect(result.nextTaskId).toBeNull();
      expect(result.nextTaskIndex).toBe(1);
      expect(result.programCompleted).toBe(true);
      expect(mockTaskRepo.updateStatus).not.toHaveBeenCalled();
      expect(mockProgramRepo.update).toHaveBeenCalledWith(programId, {
        currentTaskIndex: 1
      });
      expect(mockProgramRepo.update).toHaveBeenCalledWith(programId, {
        metadata: expect.objectContaining({
          currentTaskId: null,
          currentTaskIndex: 1,
        })
      });
    });

    it('should handle empty task list', async () => {
      const programId = 'prog-1';
      const taskIds: string[] = [];
      const tasks: ITask[] = [];

      mockTaskRepo.findByProgram.mockResolvedValue(tasks);
      mockProgramRepo.update.mockResolvedValue(undefined);

      const result = await DiscoveryTaskProgressService.activateNextTask(programId, taskIds);

      expect(result.nextTaskId).toBeNull();
      expect(result.nextTaskIndex).toBe(0);
      expect(result.programCompleted).toBe(true);
    });

    it('should preserve existing program metadata', async () => {
      const programId = 'prog-1';
      const taskIds = ['task-1', 'task-2'];
      const tasks: ITask[] = [
        { id: 'task-1', programId, status: 'completed', type: 'interactive', title: { en: 'Task 1' }, content: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01', mode: 'discovery', taskIndex: 0, interactions: [], interactionCount: 0 } as unknown as ITask,
        { id: 'task-2', programId, status: 'pending', type: 'interactive', title: { en: 'Task 2' }, content: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01', mode: 'discovery', taskIndex: 1, interactions: [], interactionCount: 0 } as unknown as ITask,
      ];

      const existingMetadata = { totalXP: 50, customField: 'value' };

      mockTaskRepo.findByProgram.mockResolvedValue(tasks);
      mockProgramRepo.update.mockResolvedValue(undefined);

      await DiscoveryTaskProgressService.activateNextTask(programId, taskIds, existingMetadata);

      expect(mockProgramRepo.update).toHaveBeenCalledWith(programId, {
        metadata: expect.objectContaining({
          totalXP: 50,
          customField: 'value',
          currentTaskId: 'task-2',
          currentTaskIndex: 1,
        })
      });
    });
  });

  describe('updateProgramXP', () => {
    it('should update program XP correctly', async () => {
      const programId = 'prog-1';
      const currentXP = 100;
      const earnedXP = 50;
      const programMetadata = { totalXP: currentXP };

      mockProgramRepo.update.mockResolvedValue(undefined);

      await DiscoveryTaskProgressService.updateProgramXP(programId, earnedXP, programMetadata);

      expect(mockProgramRepo.update).toHaveBeenCalledWith(programId, {
        metadata: {
          totalXP: 150
        }
      });
    });

    it('should handle zero initial XP', async () => {
      const programId = 'prog-1';
      const earnedXP = 75;
      const programMetadata = {};

      mockProgramRepo.update.mockResolvedValue(undefined);

      await DiscoveryTaskProgressService.updateProgramXP(programId, earnedXP, programMetadata);

      expect(mockProgramRepo.update).toHaveBeenCalledWith(programId, {
        metadata: {
          totalXP: 75
        }
      });
    });
  });

  describe('countCompletedTasks', () => {
    it('should count completed tasks correctly', () => {
      const tasks: ITask[] = [
        { id: 'task-1', programId: 'prog-1', status: 'completed', type: 'interactive', title: { en: 'Task 1' }, content: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01', mode: 'discovery', taskIndex: 0, interactions: [], interactionCount: 0 } as unknown as ITask,
        { id: 'task-2', programId: 'prog-1', status: 'active', type: 'interactive', title: { en: 'Task 2' }, content: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01', mode: 'discovery', taskIndex: 1, interactions: [], interactionCount: 0 } as unknown as ITask,
        { id: 'task-3', programId: 'prog-1', status: 'completed', type: 'interactive', title: { en: 'Task 3' }, content: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01', mode: 'discovery', taskIndex: 2, interactions: [], interactionCount: 0 } as unknown as ITask,
      ];

      const count = DiscoveryTaskProgressService.countCompletedTasks(tasks);

      expect(count).toBe(2);
    });

    it('should return 0 for empty task list', () => {
      const count = DiscoveryTaskProgressService.countCompletedTasks([]);
      expect(count).toBe(0);
    });
  });
});
