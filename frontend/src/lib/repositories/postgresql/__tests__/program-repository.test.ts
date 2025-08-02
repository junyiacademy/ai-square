import { PostgreSQLProgramRepository } from '../program-repository';
import type { IProgram } from '@/types/unified-learning';
import type { Pool } from 'pg';

// Mock Pool
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery
} as unknown as Pool;

describe('PostgreSQLProgramRepository', () => {
  let repository: PostgreSQLProgramRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PostgreSQLProgramRepository(mockPool);
  });

  const mockProgramRow = {
    id: 'prog-123',
    scenario_id: 'scenario-123',
    user_id: 'user-123',
    mode: 'pbl',
    status: 'active',
    total_score: 85,
    time_spent_seconds: 3600,
    started_at: '2024-01-01T00:00:00Z',
    completed_at: null,
    metadata: { taskIds: ['task1', 'task2'] },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  };

  const mockProgram: IProgram = {
    id: 'prog-123',
    scenarioId: 'scenario-123',
    userId: 'user-123',
    mode: 'pbl',
    status: 'active',
    totalScore: 85,
    timeSpentSeconds: 3600,
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: undefined,
    metadata: { taskIds: ['task1', 'task2'] },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  };

  describe('findById', () => {
    it('finds program by id', async () => {
      mockQuery.mockResolvedValue({ rows: [mockProgramRow] });

      const result = await repository.findById('prog-123');

      expect(result).toEqual(mockProgram);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM programs WHERE id = $1'),
        ['prog-123']
      );
    });

    it('returns null when program not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById('invalid');

      expect(result).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('finds programs by user id', async () => {
      mockQuery.mockResolvedValue({ rows: [mockProgramRow] });

      const result = await repository.findByUser('user-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockProgram);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM programs WHERE user_id = $1'),
        ['user-123']
      );
    });

    it('returns empty array when no programs found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByUser('user-999');

      expect(result).toEqual([]);
    });
  });

  describe('findByScenario', () => {
    it('finds programs by scenario id', async () => {
      mockQuery.mockResolvedValue({ rows: [mockProgramRow] });

      const result = await repository.findByScenario('scenario-123');

      expect(result).toHaveLength(1);
      expect(result[0].scenarioId).toBe('scenario-123');
    });
  });

  describe('create', () => {
    it('creates a new program', async () => {
      const newProgram = {
        scenarioId: 'scenario-456',
        userId: 'user-456',
        mode: 'assessment' as const,
        status: 'pending' as const,
        startedAt: new Date().toISOString()
      };

      mockQuery.mockResolvedValue({ 
        rows: [{ ...mockProgramRow, ...newProgram, id: 'new-prog' }] 
      });

      const result = await repository.create(newProgram);

      expect(result.scenarioId).toBe(newProgram.scenarioId);
      expect(result.mode).toBe(newProgram.mode);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO programs'),
        expect.arrayContaining([newProgram.scenarioId, newProgram.userId])
      );
    });
  });

  describe('update', () => {
    it('updates program fields', async () => {
      const updates = {
        status: 'completed' as const,
        totalScore: 95,
        completedAt: new Date().toISOString()
      };

      mockQuery.mockResolvedValue({ 
        rows: [{ 
          ...mockProgramRow, 
          status: updates.status,
          total_score: updates.totalScore,
          completed_at: updates.completedAt
        }] 
      });

      const result = await repository.update?.('prog-123', updates);

      expect(result?.status).toBe(updates.status);
      expect(result?.totalScore).toBe(updates.totalScore);
      expect(result?.completedAt).toBe(updates.completedAt);
    });
  });

  describe('findActiveByUser', () => {
    it('finds active programs for user', async () => {
      mockQuery.mockResolvedValue({ rows: [mockProgramRow] });

      const result = await repository.findActiveByUser?.('user-123');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE user_id = $1 AND status = 'active'"),
        ['user-123']
      );
    });
  });

  describe('findByScenario', () => {
    it('finds programs by scenario', async () => {
      mockQuery.mockResolvedValue({ rows: [mockProgramRow] });

      const result = await repository.findByScenario('scenario-123');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE scenario_id = $1'),
        ['scenario-123']
      );
    });
  });

  describe('error handling', () => {
    it('handles null values correctly', async () => {
      const rowWithNulls = {
        ...mockProgramRow,
        total_score: null,
        time_spent_seconds: null,
        metadata: null
      };
      mockQuery.mockResolvedValue({ rows: [rowWithNulls] });

      const result = await repository.findById('prog-123');

      expect(result?.totalScore).toBeUndefined();
      expect(result?.timeSpentSeconds).toBeUndefined();
      expect(result?.metadata).toBeUndefined();
    });
  });
});