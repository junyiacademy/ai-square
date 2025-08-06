/**
 * Unit tests for PostgreSQLTaskRepository
 * Tests task database operations
 */

import { Pool } from 'pg';
import { PostgreSQLTaskRepository } from '../task-repository';
import type { DBTask } from '@/types/database';
import type { ITask, IInteraction } from '@/types/unified-learning';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }))
}));

describe('PostgreSQLTaskRepository', () => {
  let repository: PostgreSQLTaskRepository;
  let mockPool: jest.Mocked<Pool>;

  const mockInteractions: IInteraction[] = [
    {
      type: 'user_input',
      content: 'This is my answer',
      timestamp: new Date('2024-01-01T10:00:00Z').toISOString()
    },
    {
      type: 'ai_response', 
      content: 'Good job!',
      timestamp: new Date('2024-01-01T10:01:00Z').toISOString()
    }
  ];

  const mockDBTask: DBTask = {
    id: 'task-123',
    program_id: 'program-456',
    mode: 'pbl',
    task_index: 1,
    scenario_task_index: null,
    title: 'Test Task',
    description: 'Test Description',
    type: 'chat',
    status: 'active',
    content: { instructions: 'Complete this task' },
    interactions: mockInteractions as unknown as Array<Record<string, unknown>>,
    interaction_count: 2,
    user_response: { answer: 'My response' },
    score: 85,
    max_score: 100,
    allowed_attempts: 3,
    attempt_count: 1,
    time_limit_seconds: 1800,
    time_spent_seconds: 900,
    ai_config: { model: 'gemini-pro' },
    created_at: '2024-01-01T00:00:00.000Z',
    started_at: '2024-01-02T00:00:00.000Z',
    completed_at: null,
    updated_at: '2024-01-03T00:00:00.000Z',
    pbl_data: { complexity: 'medium' },
    discovery_data: {},
    assessment_data: {},
    metadata: { source: 'template' }
  };

  const expectedTask: ITask = {
    id: 'task-123',
    programId: 'program-456',
    mode: 'pbl',
    taskIndex: 1,
    scenarioTaskIndex: undefined,
    title: { en: 'Test Task' },
    description: { en: 'Test Description' },
    type: 'chat',
    status: 'active',
    content: { instructions: 'Complete this task' },
    interactions: mockInteractions,
    interactionCount: 2,
    userResponse: { answer: 'My response' },
    score: 85,
    maxScore: 100,
    allowedAttempts: 3,
    attemptCount: 1,
    timeLimitSeconds: 1800,
    timeSpentSeconds: 900,
    aiConfig: { model: 'gemini-pro' },
    createdAt: '2024-01-01T00:00:00.000Z',
    startedAt: '2024-01-02T00:00:00.000Z',
    completedAt: undefined,
    updatedAt: '2024-01-03T00:00:00.000Z',
    pblData: { complexity: 'medium' },
    discoveryData: {},
    assessmentData: {},
    metadata: { source: 'template' }
  };

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    } as unknown as jest.Mocked<Pool>;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
    repository = new PostgreSQLTaskRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find task by ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBTask],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('task-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM tasks WHERE id = $1'),
        ['task-123']
      );
      expect(result).toEqual(expectedTask);
    });

    it('should return null if task not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(repository.findById('task-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('findByProgram', () => {
    it('should find tasks by program ID', async () => {
      const task2 = { ...mockDBTask, id: 'task-456', task_index: 2 };
      
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBTask, task2],
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      const result = await repository.findByProgram('program-456');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE program_id = $1'),
        ['program-456']
      );
      expect(result).toHaveLength(2);
      expect(result[0].taskIndex).toBe(1);
      expect(result[1].taskIndex).toBe(2);
    });

    it('should order tasks by task_index ascending', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBTask],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.findByProgram('program-456');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY task_index ASC'),
        ['program-456']
      );
    });

    it('should return empty array if no tasks found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.findByProgram('program-with-no-tasks');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const newTask: Omit<ITask, 'id'> = {
        programId: 'program-456',
        mode: 'assessment',
        taskIndex: 0,
        title: { en: 'New Task' },
        description: { en: 'New Description' },
        type: 'question',
        status: 'pending',
        content: { question: 'What is AI?' },
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 1,
        attemptCount: 0,
        timeLimitSeconds: undefined,
        timeSpentSeconds: 0,
        aiConfig: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {}
      };

      const createdDBTask = {
        ...mockDBTask,
        id: 'new-task-id',
        mode: 'assessment',
        type: 'question',
        status: 'pending',
        task_index: 0,
        title: { en: 'New Task' },
        interactions: []
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [createdDBTask],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.create(newTask);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tasks'),
        expect.any(Array)
      );
      expect(result.mode).toBe('assessment');
      expect(result.type).toBe('question');
      expect(result.status).toBe('pending');
    });

    it('should handle string title and description conversion', async () => {
      const newTask: Omit<ITask, 'id'> = {
        programId: 'program-456',
        mode: 'pbl',
        taskIndex: 1,
        title: { en: 'String Title' },
        description: { en: 'String Description' },
        type: 'chat',
        status: 'pending',
        content: {},
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 1,
        attemptCount: 0,
        timeLimitSeconds: undefined,
        timeSpentSeconds: 0,
        aiConfig: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {}
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBTask, title: 'String Title', description: 'String Description' }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.create(newTask);

      expect(result.title).toEqual({ en: 'String Title' });
      expect(result.description).toEqual({ en: 'String Description' });
    });

    it('should handle create errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Insert failed'));

      const newTask: Omit<ITask, 'id'> = {
        programId: 'program-456',
        mode: 'pbl' as const,
        taskIndex: 1,
        type: 'chat' as const,
        status: 'pending' as const,
        content: {},
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 1,
        attemptCount: 0,
        timeLimitSeconds: undefined,
        timeSpentSeconds: 0,
        aiConfig: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {}
      };

      await expect(repository.create(newTask))
        .rejects.toThrow('Insert failed');
    });
  });

  describe('update', () => {
    it('should update task with single field', async () => {
      const updates = {
        status: 'completed' as const
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          ...mockDBTask,
          status: 'completed',
          completed_at: new Date()
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('task-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining(['completed', 'task-123'])
      );
      expect(result.status).toBe('completed');
    });

    it('should update task with interactions', async () => {
      const newInteraction: IInteraction = {
        type: 'user_input',
        content: 'New interaction',
        timestamp: new Date().toISOString()
      };

      const updates = {
        interactions: [...mockInteractions, newInteraction]
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          ...mockDBTask,
          interactions: [...mockInteractions, newInteraction],
          interaction_count: 3
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('task-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('interactions = $1'),
        expect.arrayContaining([JSON.stringify([...mockInteractions, newInteraction])])
      );
      expect(result.interactions).toHaveLength(3);
    });

    it('should handle score and response updates', async () => {
      const updates = {
        score: 95,
        userResponse: { finalAnswer: 'Updated response' },
        timeSpentSeconds: 1200
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          ...mockDBTask,
          score: 95,
          user_response: { finalAnswer: 'Updated response' },
          time_spent_seconds: 1200
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('task-123', updates);

      expect(result.score).toBe(95);
      expect(result.userResponse).toEqual({ finalAnswer: 'Updated response' });
      expect(result.timeSpentSeconds).toBe(1200);
    });

    it('should automatically set completedAt when status becomes completed', async () => {
      const updates = { status: 'completed' as const };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBTask, status: 'completed' }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.update('task-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('completed_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
    });

    it('should handle empty updates', async () => {
      const updates = {};

      await expect(repository.update('task-123', updates))
        .rejects.toThrow('No fields to update');
    });

    it('should handle update when task not found', async () => {
      const updates = { status: 'completed' as const };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await expect(repository.update('non-existent', updates))
        .rejects.toThrow('Task not found');
    });
  });

  describe('Data conversion', () => {
    it('should handle tasks with null optional fields', async () => {
      const dbTaskWithNulls = {
        ...mockDBTask,
        scenario_task_index: null,
        time_limit_seconds: null,
        started_at: null,
        completed_at: null,
        user_response: null,
        score: null,
        max_score: null,
        discovery_data: null,
        assessment_data: null
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbTaskWithNulls],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('task-123');

      expect(result).toBeDefined();
      expect(result!.scenarioTaskIndex).toBeUndefined();
      expect(result!.timeLimitSeconds).toBeUndefined();
      expect(result!.startedAt).toBeUndefined();
      expect(result!.completedAt).toBeUndefined();
      expect(result!.discoveryData).toBeNull();
    });

    it('should handle string title and description conversion', async () => {
      const dbTaskWithStrings = {
        ...mockDBTask,
        title: 'Simple Title',
        description: 'Simple Description'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbTaskWithStrings],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('task-123');

      expect(result!.title).toEqual({ en: 'Simple Title' });
      expect(result!.description).toEqual({ en: 'Simple Description' });
    });

    it('should handle empty interactions array', async () => {
      const dbTaskNoInteractions = {
        ...mockDBTask,
        interactions: [],
        interaction_count: 0
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbTaskNoInteractions],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('task-123');

      expect(result!.interactions).toEqual([]);
      expect(result!.interactionCount).toBe(0);
    });
  });

  describe('Complex queries', () => {
    it('should handle tasks with different types', async () => {
      const chatTask = { ...mockDBTask, type: 'chat' };
      const questionTask = { ...mockDBTask, id: 'task-2', type: 'question' };
      const creationTask = { ...mockDBTask, id: 'task-3', type: 'creation' };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [chatTask, questionTask, creationTask],
        command: 'SELECT',
        rowCount: 3,
        oid: 0,
        fields: []
      });

      const result = await repository.findByProgram('program-456');

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('chat');
      expect(result[1].type).toBe('question');
      expect(result[2].type).toBe('creation');
    });

    it('should handle tasks with different modes', async () => {
      const pblTask = { ...mockDBTask, mode: 'pbl' };
      const assessmentTask = { ...mockDBTask, id: 'task-2', mode: 'assessment' };
      const discoveryTask = { ...mockDBTask, id: 'task-3', mode: 'discovery' };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [pblTask, assessmentTask, discoveryTask],
        command: 'SELECT',
        rowCount: 3,
        oid: 0,
        fields: []
      });

      const result = await repository.findByProgram('program-456');

      expect(result).toHaveLength(3);
      expect(result[0].mode).toBe('pbl');
      expect(result[1].mode).toBe('assessment');
      expect(result[2].mode).toBe('discovery');
    });
  });
});