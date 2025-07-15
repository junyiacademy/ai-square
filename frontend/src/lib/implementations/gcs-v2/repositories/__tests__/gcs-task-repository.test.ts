/**
 * TDD Test: GCS Task Repository
 * Tests for unified learning architecture - Task stage
 */

import { GCSTaskRepository } from '../gcs-task-repository';
import { ITask } from '@/types/unified-learning';
import { jest } from '@jest/globals';

// Mock GCS dependencies
jest.mock('@google-cloud/storage');
jest.mock('@/lib/config/gcs.config', () => ({
  GCS_CONFIG: {
    paths: {
      tasks: 'test-tasks/'
    }
  }
}));

describe('GCSTaskRepository - Unified Learning Architecture', () => {
  let repository: GCSTaskRepository;
  let mockSaveEntity: jest.Mock;
  let mockLoadEntity: jest.Mock;
  let mockListAllEntities: jest.Mock;
  let mockUpdateEntity: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    repository = new GCSTaskRepository();
    
    // Mock the base repository methods
    mockSaveEntity = jest.fn();
    mockLoadEntity = jest.fn();
    mockListAllEntities = jest.fn();
    mockUpdateEntity = jest.fn();
    
    (repository as any).saveEntity = mockSaveEntity;
    (repository as any).loadEntity = mockLoadEntity;
    (repository as any).listAllEntities = mockListAllEntities;
    (repository as any).updateEntity = mockUpdateEntity;
    (repository as any).generateId = jest.fn(() => 'task-uuid-1234');
  });

  describe('create() - Program → Task instantiation', () => {
    it('should create PBL task from program', async () => {
      // Red: Write failing test first
      const pblTaskData: Omit<ITask, 'id'> = {
        programId: 'program-uuid-1234',
        templateId: 'task-template-1',
        title: 'Research Phase',
        description: 'Research existing AI education tools',
        type: 'chat',
        order: 1,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: {
          sourceType: 'pbl',
          aiModules: ['research', 'analysis'],
          ksaCodes: ['K1', 'S2'],
          estimatedDuration: 30,
          difficulty: 'intermediate',
          instructions: 'Use AI tools to research existing educational platforms'
        }
      };

      const expectedTask: ITask = {
        ...pblTaskData,
        id: 'task-uuid-1234',
        createdAt: expect.any(String),
        status: 'pending',
        order: 1
      };

      mockSaveEntity.mockResolvedValue(expectedTask);

      // Green: Make test pass
      const result = await repository.create(pblTaskData);

      expect(result).toEqual(expectedTask);
      expect(result.status).toBe('pending');
      expect(result.order).toBe(1);
      expect(result.metadata?.sourceType).toBe('pbl');
      expect(mockSaveEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          ...pblTaskData,
          id: 'task-uuid-1234'
        })
      );
    });

    it('should create Discovery task from program', async () => {
      const discoveryTaskData: Omit<ITask, 'id'> = {
        programId: 'program-uuid-1234',
        templateId: 'discovery-task-1',
        title: 'Explore Tech Hub City',
        description: 'Navigate through the digital workplace and meet your team',
        type: 'interaction',
        order: 1,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: {
          sourceType: 'discovery',
          worldSetting: 'Tech Hub City',
          characters: ['mentor', 'colleague'],
          skillsToGain: ['communication', 'problem_solving'],
          xpReward: 50,
          questObjectives: ['Meet your mentor', 'Explore the office']
        }
      };

      const expectedTask: ITask = {
        ...discoveryTaskData,
        id: 'task-uuid-1234',
        createdAt: expect.any(String),
        status: 'pending',
        order: 1
      };

      mockSaveEntity.mockResolvedValue(expectedTask);

      const result = await repository.create(discoveryTaskData);

      expect(result).toEqual(expectedTask);
      expect(result.metadata?.sourceType).toBe('discovery');
      expect(result.metadata?.xpReward).toBe(50);
      expect(result.metadata?.questObjectives).toEqual(['Meet your mentor', 'Explore the office']);
    });

    it('should create Assessment task from program', async () => {
      const assessmentTaskData: Omit<ITask, 'id'> = {
        programId: 'program-uuid-1234',
        templateId: 'assessment-task-1',
        title: 'AI Literacy Question 1',
        description: 'What is machine learning?',
        type: 'question',
        order: 1,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: {
          sourceType: 'assessment',
          questionType: 'multiple_choice',
          options: ['A) A type of AI', 'B) A programming language', 'C) A database', 'D) A web framework'],
          correctAnswer: 'A',
          domain: 'Engaging_with_AI',
          difficulty: 'beginner',
          points: 10,
          timeLimit: 60
        }
      };

      const expectedTask: ITask = {
        ...assessmentTaskData,
        id: 'task-uuid-1234',
        createdAt: expect.any(String),
        status: 'pending',
        order: 1
      };

      mockSaveEntity.mockResolvedValue(expectedTask);

      const result = await repository.create(assessmentTaskData);

      expect(result).toEqual(expectedTask);
      expect(result.metadata?.sourceType).toBe('assessment');
      expect(result.metadata?.questionType).toBe('multiple_choice');
      expect(result.metadata?.correctAnswer).toBe('A');
      expect(result.metadata?.points).toBe(10);
    });
  });

  describe('findById() - Task retrieval', () => {
    it('should find task by UUID', async () => {
      const taskId = 'task-uuid-1234';
      const expectedTask: ITask = {
        id: taskId,
        programId: 'program-uuid',
        templateId: 'template-1',
        title: 'Test Task',
        description: 'Test description',
        type: 'chat',
        order: 1,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: {
          sourceType: 'pbl'
        }
      };

      mockLoadEntity.mockResolvedValue(expectedTask);

      const result = await repository.findById(taskId);

      expect(result).toEqual(expectedTask);
      expect(mockLoadEntity).toHaveBeenCalledWith(taskId);
    });

    it('should return null for non-existent task', async () => {
      mockLoadEntity.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByProgram() - Program tasks', () => {
    it('should find all tasks for a program', async () => {
      const programId = 'program-uuid-1234';
      const mockTasks: ITask[] = [
        {
          id: 'task-1',
          programId,
          templateId: 'template-1',
          title: 'Task 1',
          description: 'Description 1',
          type: 'chat',
          order: 1,
          status: 'completed',
          createdAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T01:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        },
        {
          id: 'task-2',
          programId,
          templateId: 'template-2',
          title: 'Task 2',
          description: 'Description 2',
          type: 'interaction',
          order: 2,
          status: 'active',
          createdAt: '2024-01-01T00:00:00.000Z',
          startedAt: '2024-01-01T02:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        }
      ];

      mockListAllEntities.mockResolvedValue([
        ...mockTasks,
        {
          id: 'task-3',
          programId: 'other-program',
          templateId: 'template-3',
          title: 'Task 3',
          description: 'Description 3',
          type: 'question',
          order: 1,
          status: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: { sourceType: 'assessment' }
        }
      ]);

      const result = await repository.findByProgram(programId);

      expect(result).toHaveLength(2);
      expect(result.every(t => t.programId === programId)).toBe(true);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'task-1', order: 1 }),
          expect.objectContaining({ id: 'task-2', order: 2 })
        ])
      );
    });

    it('should return tasks sorted by order', async () => {
      const programId = 'program-uuid-1234';
      const mockTasks: ITask[] = [
        {
          id: 'task-2',
          programId,
          templateId: 'template-2',
          title: 'Task 2',
          description: 'Description 2',
          type: 'chat',
          order: 2,
          status: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        },
        {
          id: 'task-1',
          programId,
          templateId: 'template-1',
          title: 'Task 1',
          description: 'Description 1',
          type: 'chat',
          order: 1,
          status: 'completed',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        }
      ];

      mockListAllEntities.mockResolvedValue(mockTasks);

      const result = await repository.findByProgram(programId);

      expect(result).toHaveLength(2);
      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(2);
    });
  });

  describe('updateStatus() - Task state management', () => {
    it('should update task status to active', async () => {
      const taskId = 'task-uuid-1234';
      const updatedTask: ITask = {
        id: taskId,
        programId: 'program-uuid',
        templateId: 'template-1',
        title: 'Test Task',
        description: 'Test description',
        type: 'chat',
        order: 1,
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T01:00:00.000Z',
        metadata: { sourceType: 'pbl' }
      };

      mockUpdateEntity.mockResolvedValue(updatedTask);

      const result = await repository.updateStatus(taskId, 'active');

      expect(result).toEqual(updatedTask);
      expect(result.status).toBe('active');
      expect(result.startedAt).toBeDefined();
      expect(mockUpdateEntity).toHaveBeenCalledWith(taskId, {
        status: 'active',
        startedAt: expect.any(String)
      });
    });

    it('should update task status to completed', async () => {
      const taskId = 'task-uuid-1234';
      const updatedTask: ITask = {
        id: taskId,
        programId: 'program-uuid',
        templateId: 'template-1',
        title: 'Test Task',
        description: 'Test description',
        type: 'chat',
        order: 1,
        status: 'completed',
        createdAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T01:00:00.000Z',
        completedAt: '2024-01-01T02:00:00.000Z',
        metadata: { sourceType: 'pbl' }
      };

      mockUpdateEntity.mockResolvedValue(updatedTask);

      const result = await repository.updateStatus(taskId, 'completed');

      expect(result).toEqual(updatedTask);
      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
      expect(mockUpdateEntity).toHaveBeenCalledWith(taskId, {
        status: 'completed',
        completedAt: expect.any(String)
      });
    });
  });

  describe('saveResponse() - Task interactions', () => {
    it('should save user response to task', async () => {
      const taskId = 'task-uuid-1234';
      const response = { answer: 'A', userInput: 'Machine learning is a subset of AI' };
      
      const updatedTask: ITask = {
        id: taskId,
        programId: 'program-uuid',
        templateId: 'template-1',
        title: 'Test Task',
        description: 'Test description',
        type: 'question',
        order: 1,
        status: 'completed',
        createdAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T01:00:00.000Z',
        completedAt: '2024-01-01T02:00:00.000Z',
        response,
        metadata: { sourceType: 'assessment' }
      };

      mockUpdateEntity.mockResolvedValue(updatedTask);

      const result = await repository.saveResponse(taskId, response);

      expect(result).toEqual(updatedTask);
      expect(result.response).toEqual(response);
      expect(mockUpdateEntity).toHaveBeenCalledWith(taskId, {
        response,
        status: 'completed',
        completedAt: expect.any(String)
      });
    });
  });

  describe('Unified Architecture Compliance', () => {
    it('should ensure all tasks follow ITask interface', async () => {
      const testTasks = [
        {
          sourceType: 'pbl',
          expectedFields: ['aiModules', 'ksaCodes', 'instructions']
        },
        {
          sourceType: 'discovery',
          expectedFields: ['worldSetting', 'xpReward', 'questObjectives']
        },
        {
          sourceType: 'assessment',
          expectedFields: ['questionType', 'correctAnswer', 'points']
        }
      ];

      for (const testCase of testTasks) {
        const taskData: Omit<ITask, 'id'> = {
          programId: 'program-uuid',
          templateId: 'template-1',
          title: `${testCase.sourceType} Task`,
          description: `Test ${testCase.sourceType} task`,
          type: testCase.sourceType === 'assessment' ? 'question' : 'chat',
          order: 1,
          status: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: {
            sourceType: testCase.sourceType as any,
            // Add type-specific metadata
            ...(testCase.sourceType === 'pbl' && {
              aiModules: ['research'],
              ksaCodes: ['K1'],
              instructions: 'Test instructions'
            }),
            ...(testCase.sourceType === 'discovery' && {
              worldSetting: 'Test World',
              xpReward: 50,
              questObjectives: ['Test objective']
            }),
            ...(testCase.sourceType === 'assessment' && {
              questionType: 'multiple_choice',
              correctAnswer: 'A',
              points: 10
            })
          }
        };

        const expectedTask = {
          ...taskData,
          id: 'task-uuid-1234',
          createdAt: expect.any(String),
          status: 'pending',
          order: 1
        };

        mockSaveEntity.mockResolvedValue(expectedTask);

        const result = await repository.create(taskData);

        // Verify unified interface compliance
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('programId');
        expect(result).toHaveProperty('templateId');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('description');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('order');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('createdAt');
        expect(result).toHaveProperty('metadata');
        
        // Verify status is valid
        expect(['pending', 'active', 'completed', 'skipped']).toContain(result.status);
        
        // Verify order is positive integer
        expect(result.order).toBeGreaterThan(0);
      }
    });
  });
});