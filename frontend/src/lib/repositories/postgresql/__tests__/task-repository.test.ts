/**
 * PostgreSQL Task Repository Tests
 * 提升覆蓋率從 2.3% 到 80%+
 */

import { Pool } from 'pg';
import { PostgreSQLTaskRepository } from '../task-repository';
import type { DBTask, TaskStatus, TaskType } from '@/types/database';
import type { ITask, IInteraction } from '@/types/unified-learning';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn()
}));

describe('PostgreSQLTaskRepository', () => {
  let repository: PostgreSQLTaskRepository;
  let mockPool: any;
  let mockClient: any;
  let mockQuery: jest.Mock;
  let mockClientQuery: jest.Mock;

  // Mock data
  const mockDBTask: DBTask = {
    id: 'task-123',
    program_id: 'prog-123',
    mode: 'pbl',
    task_index: 0,
    scenario_task_index: 1,
    title: { en: 'Test Task', zh: '測試任務' } as any,
    description: { en: 'Test Description' } as any,
    type: 'question' as TaskType,
    status: 'active' as TaskStatus,
    content: { instructions: 'Do this task' },
    interactions: [{ type: 'user_input', content: 'test', timestamp: '2024-01-01' }] as any,
    interaction_count: 1,
    user_response: { answer: 'test' } as any,
    score: 85,
    max_score: 100,
    allowed_attempts: 3,
    attempt_count: 1,
    time_limit_seconds: 3600,
    time_spent_seconds: 1200,
    ai_config: { model: 'gemini' } as any,
    pbl_data: { extra: 'data' } as any,
    discovery_data: {} as any,
    assessment_data: {} as any,
    metadata: { key: 'value' } as any,
    created_at: '2024-01-01T00:00:00Z',
    started_at: '2024-01-01T00:30:00Z',
    completed_at: null,
    updated_at: '2024-01-01T01:00:00Z'
  };

  const mockITask: ITask = {
    id: 'task-123',
    programId: 'prog-123',
    mode: 'pbl',
    taskIndex: 0,
    scenarioTaskIndex: 1,
    title: { en: 'Test Task', zh: '測試任務' },
    description: { en: 'Test Description' },
    type: 'question',
    status: 'active',
    content: { instructions: 'Do this task' },
    interactions: [{ type: 'user_input', content: 'test', timestamp: '2024-01-01' }],
    interactionCount: 1,
    userResponse: { answer: 'test' },
    score: 85,
    maxScore: 100,
    allowedAttempts: 3,
    attemptCount: 1,
    timeLimitSeconds: 3600,
    timeSpentSeconds: 1200,
    aiConfig: { model: 'gemini' },
    pblData: { extra: 'data' },
    discoveryData: {},
    assessmentData: {},
    metadata: { key: 'value' },
    createdAt: '2024-01-01T00:00:00Z',
    startedAt: '2024-01-01T00:30:00Z',
    completedAt: undefined,
    updatedAt: '2024-01-01T01:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock pool methods
    mockQuery = jest.fn();
    mockClientQuery = jest.fn();
    
    mockClient = {
      query: mockClientQuery,
      release: jest.fn()
    };

    mockPool = {
      query: mockQuery,
      connect: jest.fn().mockResolvedValue(mockClient)
    };

    // Create repository instance
    repository = new PostgreSQLTaskRepository(mockPool);
  });

  describe('findById', () => {
    it('should find task by id', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      const result = await repository.findById('task-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM tasks WHERE id = $1'),
        ['task-123']
      );
      expect(result).toMatchObject({
        id: 'task-123',
        programId: 'prog-123',
        title: { en: 'Test Task', zh: '測試任務' }
      });
    });

    it('should return null when task not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle string title conversion', async () => {
      const taskWithStringTitle = {
        ...mockDBTask,
        title: 'String Title',
        description: 'String Description'
      };
      mockQuery.mockResolvedValue({ rows: [taskWithStringTitle] });

      const result = await repository.findById('task-123');

      expect(result?.title).toEqual({ en: 'String Title' });
      expect(result?.description).toEqual({ en: 'String Description' });
    });
  });

  describe('findByProgram', () => {
    it('should find all tasks for a program', async () => {
      const tasks = [mockDBTask, { ...mockDBTask, id: 'task-124', task_index: 1 }];
      mockQuery.mockResolvedValue({ rows: tasks });

      const result = await repository.findByProgram('prog-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE program_id = $1'),
        ['prog-123']
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('task-123');
      expect(result[1].id).toBe('task-124');
    });

    it('should return empty array when no tasks found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByProgram('prog-123');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new task', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      const newTask = {
        ...mockITask,
        id: undefined as any
      };
      delete newTask.id;

      const result = await repository.create(newTask);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tasks'),
        expect.arrayContaining([
          'prog-123',
          'pbl',
          0,
          1,
          { en: 'Test Task', zh: '測試任務' }
        ])
      );
      expect(result.id).toBe('task-123');
    });

    it('should handle missing optional fields', async () => {
      const minimalTask = {
        programId: 'prog-123',
        mode: 'pbl' as const,
        taskIndex: 0,
        type: 'question' as TaskType,
        content: {},
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {},
        status: 'active' as TaskStatus,
        createdAt: '',
        updatedAt: ''
      };

      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      await repository.create(minimalTask);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tasks'),
        expect.arrayContaining([
          'prog-123',
          'pbl',
          0,
          null, // scenario_task_index
          null, // title
          null  // description
        ])
      );
    });
  });

  describe('createBatch', () => {
    it('should create multiple tasks in a transaction', async () => {
      mockClientQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockDBTask] }) // First insert
        .mockResolvedValueOnce({ rows: [{ ...mockDBTask, id: 'task-124' }] }) // Second insert
        .mockResolvedValueOnce({}); // COMMIT

      const tasks = [
        { ...mockITask, id: undefined as any },
        { ...mockITask, id: undefined as any, taskIndex: 1 }
      ];
      tasks.forEach(t => delete t.id);

      const result = await repository.createBatch(tasks);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should rollback on error', async () => {
      mockClientQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')); // First insert fails

      const tasks = [{ ...mockITask, id: undefined as any }];
      delete tasks[0].id;

      await expect(repository.createBatch(tasks)).rejects.toThrow('Insert failed');

      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update task fields', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      const updates = {
        status: 'completed' as TaskStatus,
        score: 95,
        userResponse: { answer: 'updated' }
      };

      const result = await repository.update('task-123', updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining(['completed', 95, JSON.stringify({ answer: 'updated' }), 'task-123'])
      );
      expect(result.id).toBe('task-123');
    });

    it('should handle status change timestamps', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      await repository.update('task-123', { status: 'active' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('started_at = COALESCE(started_at, CURRENT_TIMESTAMP)'),
        expect.any(Array)
      );
    });

    it('should update all supported fields', async () => {
      const fullUpdate = {
        status: 'completed' as TaskStatus,
        title: { en: 'Updated Title' },
        description: { en: 'Updated Description' },
        content: { instructions: 'Updated' },
        interactions: [],
        userResponse: { updated: true },
        score: 100,
        attemptCount: 2,
        timeSpentSeconds: 1500,
        aiConfig: { model: 'updated' },
        pblData: { updated: true },
        discoveryData: { updated: true },
        assessmentData: { updated: true },
        metadata: { updated: true }
      };

      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      await repository.update('task-123', fullUpdate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining([
          'completed',
          { en: 'Updated Title' },
          { en: 'Updated Description' },
          JSON.stringify({ instructions: 'Updated' })
        ])
      );
    });

    it('should throw error when no fields to update', async () => {
      await expect(repository.update('task-123', {})).rejects.toThrow('No fields to update');
    });

    it('should throw error when task not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repository.update('task-123', { score: 95 }))
        .rejects.toThrow('Task not found');
    });
  });

  describe('updateStatus', () => {
    it('should update task status', async () => {
      await repository.updateStatus('task-123', 'completed');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        ['completed', 'task-123']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('completed_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
    });

    it('should set started_at for active status', async () => {
      await repository.updateStatus('task-123', 'active');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('started_at = COALESCE(started_at, CURRENT_TIMESTAMP)'),
        ['active', 'task-123']
      );
    });
  });

  describe('updateInteractions', () => {
    it('should update task interactions', async () => {
      const updatedDBTask = {
        ...mockDBTask,
        interactions: [
          { type: 'user_input', content: 'test1', timestamp: '2024-01-01' },
          { type: 'ai_response', content: 'test2', timestamp: '2024-01-02' }
        ] as any
      };
      mockQuery.mockResolvedValue({ rows: [updatedDBTask] });

      const newInteractions: IInteraction[] = [
        { type: 'user_input', content: 'test1', timestamp: '2024-01-01' },
        { type: 'ai_response', content: 'test2', timestamp: '2024-01-02' }
      ];

      const result = await repository.updateInteractions('task-123', newInteractions);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        [JSON.stringify(newInteractions), 'task-123']
      );
      expect(result.interactions).toHaveLength(2); // Updated interactions
    });

    it('should throw error when task not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repository.updateInteractions('task-123', []))
        .rejects.toThrow('Task not found');
    });
  });

  describe('addInteraction', () => {
    it('should add interaction to existing interactions', async () => {
      mockQuery
        .mockResolvedValueOnce({ 
          rows: [{ interactions: [{ type: 'user_input', content: 'existing' }] }] 
        })
        .mockResolvedValueOnce({ rows: [] });

      const newInteraction: IInteraction = {
        type: 'ai_response',
        content: 'new response',
        timestamp: '2024-01-02'
      };

      await repository.addInteraction('task-123', newInteraction);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining([
          JSON.stringify([
            { type: 'user_input', content: 'existing' },
            newInteraction
          ]),
          'task-123'
        ])
      );
    });

    it('should throw error when task not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repository.addInteraction('task-123', {} as IInteraction))
        .rejects.toThrow('Task not found');
    });
  });

  describe('complete', () => {
    it('should mark task as completed', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...mockDBTask, status: 'completed' }] });

      const result = await repository.complete('task-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'completed'"),
        ['task-123']
      );
      expect(result.status).toBe('completed');
    });

    it('should throw error when task not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repository.complete('task-123'))
        .rejects.toThrow('Task not found');
    });
  });

  describe('recordAttempt', () => {
    it('should record attempt with score update', async () => {
      const attemptData = {
        score: 90,
        response: { answer: 'new attempt' },
        timeSpent: 300
      };

      await repository.recordAttempt('task-123', attemptData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        [90, JSON.stringify({ answer: 'new attempt' }), 300, 'task-123']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('attempt_count = attempt_count + 1'),
        expect.any(Array)
      );
    });

    it('should handle attempt without score', async () => {
      const attemptData = {
        response: { answer: 'no score' },
        timeSpent: 100
      };

      await repository.recordAttempt('task-123', attemptData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        [0, JSON.stringify({ answer: 'no score' }), 100, 'task-123']
      );
    });
  });

  describe('updateTimeSpent', () => {
    it('should update time spent', async () => {
      await repository.updateTimeSpent('task-123', 600);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('time_spent_seconds = time_spent_seconds + $1'),
        [600, 'task-123']
      );
    });
  });

  describe('getCurrentTask', () => {
    it('should get current task for program', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      const result = await repository.getCurrentTask('prog-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN programs p ON t.program_id = p.id'),
        ['prog-123']
      );
      expect(result?.id).toBe('task-123');
    });

    it('should return null when no current task', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getCurrentTask('prog-123');

      expect(result).toBeNull();
    });
  });

  describe('findByType', () => {
    it('should find tasks by type', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      const result = await repository.findByType('question');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE type = $1'),
        ['question']
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by program when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      const result = await repository.findByType('question', 'prog-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND program_id = $2'),
        ['question', 'prog-123']
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findByStatus', () => {
    it('should find tasks by status', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      const result = await repository.findByStatus('active');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1'),
        ['active']
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by program when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      const result = await repository.findByStatus('active', 'prog-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND program_id = $2'),
        ['active', 'prog-123']
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getTaskWithInteractions', () => {
    it('should get task with interactions', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      const result = await repository.getTaskWithInteractions('task-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM tasks WHERE id = $1'),
        ['task-123']
      );
      expect(result?.interactions).toBeDefined();
    });
  });

  describe('toTask conversion', () => {
    it('should handle all optional fields', async () => {
      const minimalDBTask = {
        ...mockDBTask,
        scenario_task_index: null,
        title: null,
        description: null,
        started_at: null,
        completed_at: null,
        time_limit_seconds: null
      };

      mockQuery.mockResolvedValue({ rows: [minimalDBTask] });

      const result = await repository.findById('task-123');

      expect(result?.scenarioTaskIndex).toBeUndefined();
      expect(result?.title).toBeUndefined();
      expect(result?.description).toBeUndefined();
      expect(result?.startedAt).toBeUndefined();
      expect(result?.completedAt).toBeUndefined();
      expect(result?.timeLimitSeconds).toBeUndefined();
    });

    it('should parse JSON fields correctly', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBTask] });

      const result = await repository.findById('task-123');

      expect(result?.interactions).toEqual([
        { type: 'user_input', content: 'test', timestamp: '2024-01-01' }
      ]);
      expect(result?.userResponse).toEqual({ answer: 'test' });
      expect(result?.aiConfig).toEqual({ model: 'gemini' });
      expect(result?.metadata).toEqual({ key: 'value' });
    });
  });
});