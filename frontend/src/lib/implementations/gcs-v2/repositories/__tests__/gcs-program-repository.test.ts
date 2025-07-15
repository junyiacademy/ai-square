/**
 * TDD Test: GCS Program Repository
 * Tests for unified learning architecture - Program stage
 */

import { GCSProgramRepository } from '../gcs-program-repository';
import { IProgram } from '@/types/unified-learning';
import { jest } from '@jest/globals';

// Mock GCS dependencies
jest.mock('@google-cloud/storage');
jest.mock('@/lib/config/gcs.config', () => ({
  GCS_CONFIG: {
    paths: {
      programs: 'test-programs/'
    }
  }
}));

describe('GCSProgramRepository - Unified Learning Architecture', () => {
  let repository: GCSProgramRepository;
  let mockSaveEntity: jest.Mock;
  let mockLoadEntity: jest.Mock;
  let mockListAllEntities: jest.Mock;
  let mockUpdateEntity: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    repository = new GCSProgramRepository();
    
    // Mock the base repository methods
    mockSaveEntity = jest.fn();
    mockLoadEntity = jest.fn();
    mockListAllEntities = jest.fn();
    mockUpdateEntity = jest.fn();
    
    (repository as any).saveEntity = mockSaveEntity;
    (repository as any).loadEntity = mockLoadEntity;
    (repository as any).listAllEntities = mockListAllEntities;
    (repository as any).updateEntity = mockUpdateEntity;
    (repository as any).generateId = jest.fn(() => 'program-uuid-1234');
  });

  describe('create() - Scenario → Program instantiation', () => {
    it('should create PBL program from scenario', async () => {
      // Red: Write failing test first
      const pblProgramData: Omit<IProgram, 'id'> = {
        scenarioId: 'pbl-scenario-uuid',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: [],
        currentTaskIndex: 0,
        metadata: {
          sourceType: 'pbl',
          language: 'en',
          title: 'AI Education Design Challenge',
          totalTasks: 3,
          ksaCodes: ['K1', 'S2', 'A1'],
          aiModules: ['research', 'design', 'prototype']
        }
      };

      const expectedProgram: IProgram = {
        ...pblProgramData,
        id: 'program-uuid-1234',
        startedAt: expect.any(String),
        status: 'active',
        currentTaskIndex: 0,
        taskIds: []
      };

      mockSaveEntity.mockResolvedValue(expectedProgram);

      // Green: Make test pass
      const result = await repository.create(pblProgramData);

      expect(result).toEqual(expectedProgram);
      expect(result.status).toBe('active');
      expect(result.currentTaskIndex).toBe(0);
      expect(result.taskIds).toEqual([]);
      expect(mockSaveEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          ...pblProgramData,
          id: 'program-uuid-1234',
          startedAt: expect.any(String)
        })
      );
    });

    it('should create Discovery program from scenario', async () => {
      const discoveryProgramData: Omit<IProgram, 'id'> = {
        scenarioId: 'discovery-scenario-uuid',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: [],
        currentTaskIndex: 0,
        metadata: {
          sourceType: 'discovery',
          careerType: 'app_developer',
          worldSetting: 'Tech Hub City',
          totalXP: 0,
          achievements: [],
          skillProgress: []
        }
      };

      const expectedProgram: IProgram = {
        ...discoveryProgramData,
        id: 'program-uuid-1234',
        startedAt: expect.any(String),
        status: 'active',
        currentTaskIndex: 0,
        taskIds: []
      };

      mockSaveEntity.mockResolvedValue(expectedProgram);

      const result = await repository.create(discoveryProgramData);

      expect(result).toEqual(expectedProgram);
      expect(result.metadata?.sourceType).toBe('discovery');
      expect(result.metadata?.totalXP).toBe(0);
    });

    it('should create Assessment program from scenario', async () => {
      const assessmentProgramData: Omit<IProgram, 'id'> = {
        scenarioId: 'assessment-scenario-uuid',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: [],
        currentTaskIndex: 0,
        metadata: {
          sourceType: 'assessment',
          assessmentType: 'ai_literacy',
          selectedQuestions: ['q1', 'q2', 'q3'],
          timeStarted: '2024-01-01T00:00:00.000Z',
          timeLimit: 15,
          language: 'en'
        }
      };

      const expectedProgram: IProgram = {
        ...assessmentProgramData,
        id: 'program-uuid-1234',
        startedAt: expect.any(String),
        status: 'active',
        currentTaskIndex: 0,
        taskIds: []
      };

      mockSaveEntity.mockResolvedValue(expectedProgram);

      const result = await repository.create(assessmentProgramData);

      expect(result).toEqual(expectedProgram);
      expect(result.metadata?.sourceType).toBe('assessment');
      expect(result.metadata?.selectedQuestions).toEqual(['q1', 'q2', 'q3']);
    });
  });

  describe('findById() - Program retrieval', () => {
    it('should find program by UUID', async () => {
      const programId = 'program-uuid-1234';
      const expectedProgram: IProgram = {
        id: programId,
        scenarioId: 'scenario-uuid',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: ['task-1', 'task-2'],
        currentTaskIndex: 1,
        metadata: {
          sourceType: 'pbl'
        }
      };

      mockLoadEntity.mockResolvedValue(expectedProgram);

      const result = await repository.findById(programId);

      expect(result).toEqual(expectedProgram);
      expect(mockLoadEntity).toHaveBeenCalledWith(programId);
    });

    it('should return null for non-existent program', async () => {
      mockLoadEntity.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUser() - User programs', () => {
    it('should find all programs for a user', async () => {
      const userId = 'user@example.com';
      const mockPrograms: IProgram[] = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          userId,
          status: 'active',
          startedAt: '2024-01-01T00:00:00.000Z',
          taskIds: [],
          currentTaskIndex: 0,
          metadata: { sourceType: 'pbl' }
        },
        {
          id: 'program-2',
          scenarioId: 'scenario-2',
          userId,
          status: 'completed',
          startedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-02T00:00:00.000Z',
          taskIds: ['task-1'],
          currentTaskIndex: 1,
          metadata: { sourceType: 'discovery' }
        }
      ];

      mockListAllEntities.mockResolvedValue([
        ...mockPrograms,
        {
          id: 'program-3',
          scenarioId: 'scenario-3',
          userId: 'other@example.com',
          status: 'active',
          startedAt: '2024-01-01T00:00:00.000Z',
          taskIds: [],
          currentTaskIndex: 0,
          metadata: { sourceType: 'assessment' }
        }
      ]);

      const result = await repository.findByUser(userId);

      expect(result).toHaveLength(2);
      expect(result.every(p => p.userId === userId)).toBe(true);
    });
  });

  describe('findByScenario() - Scenario programs', () => {
    it('should find all programs for a scenario', async () => {
      const scenarioId = 'scenario-uuid';
      const mockPrograms: IProgram[] = [
        {
          id: 'program-1',
          scenarioId,
          userId: 'user1@example.com',
          status: 'active',
          startedAt: '2024-01-01T00:00:00.000Z',
          taskIds: [],
          currentTaskIndex: 0,
          metadata: { sourceType: 'pbl' }
        },
        {
          id: 'program-2',
          scenarioId,
          userId: 'user2@example.com',
          status: 'completed',
          startedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-02T00:00:00.000Z',
          taskIds: ['task-1'],
          currentTaskIndex: 1,
          metadata: { sourceType: 'pbl' }
        }
      ];

      mockListAllEntities.mockResolvedValue([
        ...mockPrograms,
        {
          id: 'program-3',
          scenarioId: 'other-scenario',
          userId: 'user3@example.com',
          status: 'active',
          startedAt: '2024-01-01T00:00:00.000Z',
          taskIds: [],
          currentTaskIndex: 0,
          metadata: { sourceType: 'discovery' }
        }
      ]);

      const result = await repository.findByScenario(scenarioId);

      expect(result).toHaveLength(2);
      expect(result.every(p => p.scenarioId === scenarioId)).toBe(true);
    });
  });

  describe('updateProgress() - Task progression', () => {
    it('should update current task index', async () => {
      const programId = 'program-uuid-1234';
      const newTaskIndex = 2;
      
      const updatedProgram: IProgram = {
        id: programId,
        scenarioId: 'scenario-uuid',
        userId: 'user@example.com',
        status: 'active',
        startedAt: '2024-01-01T00:00:00.000Z',
        taskIds: ['task-1', 'task-2', 'task-3'],
        currentTaskIndex: newTaskIndex,
        metadata: { sourceType: 'pbl' }
      };

      mockUpdateEntity.mockResolvedValue(updatedProgram);

      const result = await repository.updateProgress(programId, newTaskIndex);

      expect(result).toEqual(updatedProgram);
      expect(result.currentTaskIndex).toBe(newTaskIndex);
      expect(mockUpdateEntity).toHaveBeenCalledWith(programId, {
        currentTaskIndex: newTaskIndex
      });
    });
  });

  describe('complete() - Program completion', () => {
    it('should mark program as completed', async () => {
      const programId = 'program-uuid-1234';
      
      const completedProgram: IProgram = {
        id: programId,
        scenarioId: 'scenario-uuid',
        userId: 'user@example.com',
        status: 'completed',
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-02T00:00:00.000Z',
        taskIds: ['task-1', 'task-2', 'task-3'],
        currentTaskIndex: 3,
        metadata: { sourceType: 'pbl' }
      };

      mockUpdateEntity.mockResolvedValue(completedProgram);

      const result = await repository.complete(programId);

      expect(result).toEqual(completedProgram);
      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
      expect(mockUpdateEntity).toHaveBeenCalledWith(programId, {
        status: 'completed',
        completedAt: expect.any(String)
      });
    });
  });

  describe('Unified Architecture Compliance', () => {
    it('should ensure all programs follow IProgram interface', async () => {
      const testPrograms = [
        {
          sourceType: 'pbl',
          metadata: { ksaCodes: ['K1'], aiModules: ['research'] }
        },
        {
          sourceType: 'discovery',
          metadata: { careerType: 'app_developer', totalXP: 100 }
        },
        {
          sourceType: 'assessment',
          metadata: { assessmentType: 'ai_literacy', selectedQuestions: ['q1'] }
        }
      ];

      for (const testCase of testPrograms) {
        const programData: Omit<IProgram, 'id'> = {
          scenarioId: 'test-scenario-uuid',
          userId: 'test@example.com',
          status: 'active',
          startedAt: '2024-01-01T00:00:00.000Z',
          taskIds: [],
          currentTaskIndex: 0,
          metadata: testCase.metadata
        };

        const expectedProgram = {
          ...programData,
          id: 'program-uuid-1234',
          startedAt: expect.any(String),
          status: 'active',
          currentTaskIndex: 0,
          taskIds: []
        };

        mockSaveEntity.mockResolvedValue(expectedProgram);

        const result = await repository.create(programData);

        // Verify unified interface compliance
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('scenarioId');
        expect(result).toHaveProperty('userId');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('startedAt');
        expect(result).toHaveProperty('taskIds');
        expect(result).toHaveProperty('currentTaskIndex');
        expect(result).toHaveProperty('metadata');
        
        // Verify status is valid
        expect(['active', 'completed', 'abandoned']).toContain(result.status);
      }
    });
  });
});