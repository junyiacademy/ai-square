/**
 * Unit tests for PostgreSQLScenarioRepository
 * Tests scenario database operations
 */

import { Pool } from 'pg';
import { PostgreSQLScenarioRepository } from '../scenario-repository';
import type { DBScenario } from '@/types/database';
import type { IScenario } from '@/types/unified-learning';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }))
}));

describe('PostgreSQLScenarioRepository', () => {
  let repository: PostgreSQLScenarioRepository;
  let mockPool: jest.Mocked<Pool>;

  const mockDBScenario: DBScenario = {
    id: 'scenario-123',
    mode: 'pbl',
    status: 'active',
    version: '1.0.0',
    source_type: 'yaml',
    source_path: 'pbl_data/scenario.yaml',
    source_id: 'test-scenario',
    source_metadata: { tags: ['AI', 'literacy'] },
    title: { en: 'Test Scenario' },
    description: { en: 'Test Description' },
    objectives: ['Learn AI concepts'],
    difficulty: 'intermediate',
    estimated_minutes: 60,
    prerequisites: [],
    task_templates: [
      {
        id: 'task-1',
        title: 'Task 1',
        type: 'chat',
        description: 'Task description'
      }
    ],
    task_count: 1,
    xp_rewards: { completion: 100 },
    unlock_requirements: {},
    pbl_data: { aiModules: ['tutor'] },
    discovery_data: {},
    assessment_data: {},
    ai_modules: { tutor: { enabled: true } },
    resources: [],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
    published_at: '2024-01-03T00:00:00.000Z',
    metadata: { custom: 'value' }
  };

  const expectedScenario: IScenario = {
    id: 'scenario-123',
    mode: 'pbl',
    status: 'active',
    version: '1.0.0',
    sourceType: 'yaml',
    sourcePath: 'pbl_data/scenario.yaml',
    sourceId: 'test-scenario',
    sourceMetadata: { tags: ['AI', 'literacy'] },
    title: { en: 'Test Scenario' },
    description: { en: 'Test Description' },
    objectives: ['Learn AI concepts'],
    difficulty: 'intermediate',
    estimatedMinutes: 60,
    prerequisites: [],
    taskTemplates: [
      {
        id: 'task-1',
        title: 'Task 1' as unknown as Record<string, string>,
        type: 'chat',
        description: 'Task description' as unknown as Record<string, string>
      }
    ],
    taskCount: 1,
    xpRewards: { completion: 100 },
    unlockRequirements: {},
    pblData: { aiModules: ['tutor'] },
    discoveryData: {},
    assessmentData: {},
    aiModules: { tutor: { enabled: true } },
    resources: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    publishedAt: '2024-01-03T00:00:00.000Z',
    metadata: { custom: 'value' }
  };

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    } as any;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
    repository = new PostgreSQLScenarioRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find scenario by ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('scenario-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM scenarios WHERE id = $1'),
        ['scenario-123']
      );
      expect(result).toEqual(expectedScenario);
    });

    it('should return null if scenario not found', async () => {
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

      await expect(repository.findById('scenario-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('findBySource', () => {
    it('should find scenarios by source type', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findBySource('yaml');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE source_type = $1'),
        ['yaml']
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedScenario);
    });

    it('should find scenarios by source type and ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findBySource('yaml', 'test-scenario');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND source_id = $2'),
        ['yaml', 'test-scenario']
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array if no scenarios found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.findBySource('unknown');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new scenario', async () => {
      const newScenario: Omit<IScenario, 'id'> = {
        mode: 'pbl',
        status: 'draft',
        version: '1.0.0',
        sourceType: 'yaml',
        sourceMetadata: {},
        title: { en: 'New Scenario' },
        description: { en: 'New Description' },
        objectives: ['Learn new concepts'],
        difficulty: 'beginner',
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {}
      };

      const createdScenario = {
        ...newScenario,
        id: 'new-scenario-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBScenario, ...createdScenario }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.create(newScenario);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scenarios'),
        expect.any(Array)
      );
      expect(result.title).toEqual({ en: 'New Scenario' });
    });

    it('should handle create errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Insert failed'));

      const newScenario: Omit<IScenario, 'id'> = {
        mode: 'pbl' as const,
        status: 'draft' as const,
        version: '1.0.0',
        sourceType: 'yaml' as const,
        sourceMetadata: {},
        title: { en: 'New Scenario' },
        description: { en: 'New Description' },
        objectives: ['Learn new concepts'],
        difficulty: 'beginner' as const,
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {}
      };

      await expect(repository.create(newScenario))
        .rejects.toThrow('Insert failed');
    });
  });

  describe('update', () => {
    it('should update scenario by ID', async () => {
      const updates = {
        title: { en: 'Updated Title' },
        status: 'active' as const
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          ...mockDBScenario,
          title: { en: 'Updated Title' },
          status: 'active'
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('scenario-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scenarios'),
        expect.any(Array)
      );
      expect(result.title).toEqual({ en: 'Updated Title' });
    });

    it('should handle update when scenario not found', async () => {
      const updates = { status: 'archived' as const };
      
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await expect(repository.update('non-existent', updates))
        .rejects.toThrow('Scenario not found');
    });
  });

  describe('status updates', () => {
    it('should update scenario status', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBScenario, status: 'archived' }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('scenario-123', { status: 'archived' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scenarios'),
        expect.arrayContaining(['archived', 'scenario-123'])
      );
      expect(result.status).toBe('archived');
    });
  });

  describe('Data conversion', () => {
    it('should handle scenarios with null optional fields', async () => {
      const dbScenarioWithNulls = {
        ...mockDBScenario,
        source_path: null,
        source_id: null,
        prerequisites: [],
        published_at: null,
        discovery_data: null,
        assessment_data: null
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbScenarioWithNulls],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('scenario-123');

      expect(result).toBeDefined();
      expect(result!.sourcePath).toBeUndefined();
      expect(result!.sourceId).toBeUndefined();
      expect(result!.prerequisites).toEqual([]);
      expect(result!.publishedAt).toBeUndefined();
    });

    it('should handle empty task templates array', async () => {
      const dbScenarioEmptyTasks = {
        ...mockDBScenario,
        task_templates: []
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbScenarioEmptyTasks],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('scenario-123');

      expect(result!.taskTemplates).toEqual([]);
    });
  });
});