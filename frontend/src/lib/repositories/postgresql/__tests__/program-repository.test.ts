/**
 * Unit tests for PostgreSQLProgramRepository
 * Tests program database operations
 */

import { Pool } from 'pg';
import { PostgreSQLProgramRepository } from '../program-repository';
import type { DBProgram } from '@/types/database';
import type { IProgram } from '@/types/unified-learning';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }))
}));

describe('PostgreSQLProgramRepository', () => {
  let repository: PostgreSQLProgramRepository;
  let mockPool: jest.Mocked<Pool>;

  const mockDBProgram: DBProgram = {
    id: 'program-123',
    user_id: 'user-456',
    scenario_id: 'scenario-789',
    mode: 'pbl',
    status: 'active',
    current_task_index: 1,
    completed_task_count: 2,
    total_task_count: 5,
    total_score: 85.5,
    domain_scores: { knowledge: 80, skills: 85, attitudes: 90 },
    xp_earned: 150,
    badges_earned: [{ badgeId: 'first-task', earnedAt: '2024-01-01' }, { badgeId: 'problem-solver', earnedAt: '2024-01-02' }],
    time_spent_seconds: 3600,
    started_at: '2024-01-02T00:00:00.000Z',
    completed_at: null,
    pbl_data: { aiModules: ['tutor'] },
    discovery_data: {},
    assessment_data: {},
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-03T00:00:00.000Z',
    metadata: { source: 'web' }
  };

  const expectedProgram: IProgram = {
    id: 'program-123',
    userId: 'user-456',
    scenarioId: 'scenario-789',
    mode: 'pbl',
    status: 'active',
    currentTaskIndex: 1,
    completedTaskCount: 2,
    totalTaskCount: 5,
    totalScore: 85.5,
    domainScores: { knowledge: 80, skills: 85, attitudes: 90 },
    xpEarned: 150,
    badgesEarned: [{ badgeId: 'first-task', earnedAt: '2024-01-01' }, { badgeId: 'problem-solver', earnedAt: '2024-01-02' }],
    timeSpentSeconds: 3600,
    startedAt: '2024-01-02T00:00:00.000Z',
    completedAt: undefined,
    lastActivityAt: '2024-01-03T00:00:00.000Z',
    pblData: { aiModules: ['tutor'] },
    discoveryData: {},
    assessmentData: {},
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
    metadata: { source: 'web' }
  };

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    } as any;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
    repository = new PostgreSQLProgramRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find program by ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBProgram],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('program-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM programs WHERE id = $1'),
        ['program-123']
      );
      expect(result).toEqual(expectedProgram);
    });

    it('should return null if program not found', async () => {
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

      await expect(repository.findById('program-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('findByUser', () => {
    it('should find programs by user ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBProgram],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findByUser('user-456');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-456']
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedProgram);
    });

    it('should order by last activity descending', async () => {
      const program1 = { ...mockDBProgram, id: 'prog-1', updated_at: '2024-01-01T00:00:00.000Z' };
      const program2 = { ...mockDBProgram, id: 'prog-2', updated_at: '2024-01-02T00:00:00.000Z' };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [program1, program2],
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      const result = await repository.findByUser('user-456');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY updated_at DESC'),
        ['user-456']
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no programs found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.findByUser('user-with-no-programs');

      expect(result).toEqual([]);
    });
  });

  describe('findByScenario', () => {
    it('should find programs by scenario ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBProgram],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findByScenario('scenario-789');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE scenario_id = $1'),
        ['scenario-789']
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedProgram);
    });

    it('should order by creation time descending', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBProgram],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.findByScenario('scenario-789');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        ['scenario-789']
      );
    });
  });

  describe('create', () => {
    it('should create a new program', async () => {
      const newProgram: Omit<IProgram, 'id'> = {
        userId: 'user-456',
        scenarioId: 'scenario-789',
        mode: 'pbl',
        status: 'pending',
        currentTaskIndex: 0,
        completedTaskCount: 0,
        totalTaskCount: 3,
        totalScore: 0,
        domainScores: {},
        xpEarned: 0,
        badgesEarned: [],
        timeSpentSeconds: 0,
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString()
      };

      const createdProgram = {
        ...mockDBProgram,
        id: 'new-program-id',
        status: 'pending',
        completed_task_count: 0,
        current_task_index: 0,
        total_task_count: 3
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [createdProgram],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.create(newProgram);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO programs'),
        expect.any(Array)
      );
      expect(result.status).toBe('pending');
      expect(result.completedTaskCount).toBe(0);
    });

    it('should use default values for optional fields', async () => {
      const minimalProgram: Omit<IProgram, 'id'> = {
        userId: 'user-456',
        scenarioId: 'scenario-789',
        mode: 'assessment',
        status: 'pending',
        currentTaskIndex: 0,
        completedTaskCount: 0,
        totalTaskCount: 0,
        totalScore: 0,
        domainScores: {},
        xpEarned: 0,
        badgesEarned: [],
        timeSpentSeconds: 0,
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBProgram, mode: 'assessment' }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.create(minimalProgram);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO programs'),
        expect.arrayContaining([
          'user-456',
          'scenario-789',
          'assessment',
          'pending'
        ])
      );
    });

    it('should handle create errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Insert failed'));

      const newProgram = {
        userId: 'user-456',
        scenarioId: 'scenario-789',
        mode: 'pbl' as const,
        status: 'pending' as const,
        currentTaskIndex: 0,
        completedTaskCount: 0,
        totalTaskCount: 0,
        totalScore: 0,
        domainScores: {},
        xpEarned: 0,
        badgesEarned: [],
        timeSpentSeconds: 0,
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString()
      };

      await expect(repository.create(newProgram))
        .rejects.toThrow('Insert failed');
    });
  });

  describe('update', () => {
    it('should update program with single field', async () => {
      const updates = {
        status: 'completed' as const
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          ...mockDBProgram,
          status: 'completed',
          completed_at: new Date().toISOString()
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('program-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE programs'),
        expect.arrayContaining(['completed', 'program-123'])
      );
      expect(result.status).toBe('completed');
    });

    it('should update program with multiple fields', async () => {
      const updates = {
        currentTaskIndex: 2,
        completedTaskCount: 3,
        totalScore: 92.5,
        timeSpentSeconds: 7200
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          ...mockDBProgram,
          current_task_index: 2,
          completed_task_count: 3,
          total_score: 92.5,
          time_spent_seconds: 7200
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('program-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE programs'),
        expect.arrayContaining([2, 3, 92.5, 7200, 'program-123'])
      );
      expect(result.currentTaskIndex).toBe(2);
      expect(result.completedTaskCount).toBe(3);
    });

    it('should handle JSON field updates', async () => {
      const updates = {
        domainScores: { knowledge: 95, skills: 88, attitudes: 92 },
        pblData: { aiModules: ['tutor', 'evaluator'] }
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBProgram, ...updates }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.update('program-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('domain_scores = $1'),
        expect.arrayContaining([
          JSON.stringify({ knowledge: 95, skills: 88, attitudes: 92 }),
          'program-123'
        ])
      );
    });

    it('should handle empty updates', async () => {
      const updates = {};

      await expect(repository.update('program-123', updates))
        .rejects.toThrow('No fields to update');
    });

    it('should handle update when program not found', async () => {
      const updates = { status: 'completed' as const };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await expect(repository.update('non-existent', updates))
        .rejects.toThrow('Program not found');
    });
  });

  describe('updateStatus', () => {
    it('should update status to active and set started_at', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.updateStatus('program-123', 'active');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('started_at = COALESCE(started_at, CURRENT_TIMESTAMP)'),
        ['active', 'program-123']
      );
    });

    it('should update status to completed and set completed_at', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.updateStatus('program-123', 'completed');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('completed_at = CURRENT_TIMESTAMP'),
        ['completed', 'program-123']
      );
    });
  });

  describe('getActivePrograms', () => {
    it('should find active programs for user', async () => {
      const activeProgram = { ...mockDBProgram, status: 'active' };
      
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [activeProgram],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.getActivePrograms('user-456');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'active'"),
        ['user-456']
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
    });
  });

  describe('updateTimeSpent', () => {
    it('should update time spent for program', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.updateTimeSpent('program-123', 900);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('time_spent_seconds = time_spent_seconds + $1'),
        [900, 'program-123']
      );
    });
  });

  describe('incrementCompletedTasks', () => {
    it('should increment completed task count', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.incrementCompletedTasks('program-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('completed_task_count = completed_task_count + 1'),
        ['program-123']
      );
    });
  });

  describe('Data conversion', () => {
    it('should handle programs with null optional fields', async () => {
      const dbProgramWithNulls = {
        ...mockDBProgram,
        started_at: null,
        completed_at: null,
        total_score: null,
        domain_scores: null,
        xp_earned: null,
        badges_earned: null,
        pbl_data: null,
        discovery_data: null,
        assessment_data: null
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbProgramWithNulls],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('program-123');

      expect(result).toBeDefined();
      expect(result!.startedAt).toBeUndefined();
      expect(result!.completedAt).toBeUndefined();
      expect(result!.totalScore).toBeNull();
      expect(result!.domainScores).toBeNull();
      expect(result!.pblData).toBeNull();
    });

    it('should convert database timestamps correctly', async () => {
      const dbProgram = {
        ...mockDBProgram,
        created_at: '2024-01-01T10:00:00.000Z',
        updated_at: '2024-01-02T15:30:00.000Z',
        // removed last_activity_at - using updated_at instead
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbProgram],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('program-123');

      expect(result!.createdAt).toBe('2024-01-01T10:00:00.000Z');
      expect(result!.updatedAt).toBe('2024-01-02T15:30:00.000Z');
      expect(result!.lastActivityAt).toBe('2024-01-02T15:30:00.000Z'); // Now uses updated_at value
    });
  });

  describe('Complex queries', () => {
    it('should handle programs with different modes', async () => {
      const pblProgram = { ...mockDBProgram, mode: 'pbl' };
      const assessmentProgram = { ...mockDBProgram, id: 'prog-2', mode: 'assessment' };
      const discoveryProgram = { ...mockDBProgram, id: 'prog-3', mode: 'discovery' };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [pblProgram, assessmentProgram, discoveryProgram],
        command: 'SELECT',
        rowCount: 3,
        oid: 0,
        fields: []
      });

      const result = await repository.findByUser('user-456');

      expect(result).toHaveLength(3);
      expect(result[0].mode).toBe('pbl');
      expect(result[1].mode).toBe('assessment');
      expect(result[2].mode).toBe('discovery');
    });
  });
});