/**
 * PostgreSQL Scenario Repository Tests
 * 提升覆蓋率從 16.66% 到 80%+
 */

import { Pool } from 'pg';
import { PostgreSQLScenarioRepository } from '../scenario-repository';
import type { DBScenario, LearningMode, ScenarioStatus } from '@/types/database';
import type { IScenario, ITaskTemplate } from '@/types/unified-learning';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn()
}));

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation()
};

describe('PostgreSQLScenarioRepository', () => {
  let repository: PostgreSQLScenarioRepository;
  let mockPool: jest.Mocked<Pool>;

  const mockDBScenario: DBScenario = {
    id: 'scenario-123',
    mode: 'pbl' as LearningMode,
    status: 'active' as ScenarioStatus,
    version: '1.0.0',
    source_type: 'yaml',
    source_path: '/path/to/scenario.yaml',
    source_id: 'source-123',
    source_metadata: { author: 'Test Author' },
    title: { en: 'Test Scenario', zh: '測試場景' },
    description: { en: 'Test Description', zh: '測試描述' },
    objectives: ['Objective 1', 'Objective 2'],
    difficulty: 'intermediate',
    estimated_minutes: 60,
    prerequisites: ['prerequisite-1'],
    task_templates: [
      {
        id: 'task-1',
        title: 'Task 1',
        type: 'question',
        status: 'active',
        content: { instructions: 'Do this task' }
      }
    ],
    task_count: 1,
    xp_rewards: { completion: 100, bonus: 50 },
    unlock_requirements: { minLevel: 5 },
    pbl_data: { projectType: 'web-app' },
    discovery_data: {},
    assessment_data: {},
    ai_modules: { 'tutor-1': { type: 'tutor' } },
    resources: [{ id: 'resource-1', type: 'document' }],
    metadata: { tags: ['web', 'javascript'] },
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z',
    published_at: '2024-01-20T11:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPool = {
      query: jest.fn()
    } as unknown as jest.Mocked<Pool>;

    repository = new PostgreSQLScenarioRepository(mockPool);
  });

  afterEach(() => {
    consoleSpy.error.mockClear();
  });

  describe('findById', () => {
    it('should find scenario by id', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        rowCount: 1
      });

      const result = await repository.findById('scenario-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM scenarios WHERE id = $1'),
        ['scenario-123']
      );
      expect(result).toMatchObject({
        id: 'scenario-123',
        mode: 'pbl',
        status: 'active',
        title: { en: 'Test Scenario', zh: '測試場景' },
        taskTemplates: expect.arrayContaining([
          expect.objectContaining({
            id: 'task-1',
            title: { en: 'Task 1' },
            type: 'question'
          })
        ])
      });
    });

    it('should return null when scenario not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findBySource', () => {
    it('should find scenarios by source type', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario, { ...mockDBScenario, id: 'scenario-456' }],
        rowCount: 2
      });

      const result = await repository.findBySource('yaml');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM scenarios'),
        ['yaml']
      );
      expect(result).toHaveLength(2);
      expect(result[0].sourceType).toBe('yaml');
    });

    it('should find scenarios by source type and id', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        rowCount: 1
      });

      const result = await repository.findBySource('yaml', 'source-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND source_id = $2'),
        ['yaml', 'source-123']
      );
      expect(result).toHaveLength(1);
      expect(result[0].sourceId).toBe('source-123');
    });

    it('should return empty array when no scenarios found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const result = await repository.findBySource('api');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new scenario', async () => {
      const newScenario: Omit<IScenario, 'id'> = {
        mode: 'pbl',
        status: 'draft',
        version: '1.0',
        sourceType: 'yaml',
        sourceMetadata: {},
        title: { en: 'New Scenario' },
        description: { en: 'New Description' },
        objectives: [],
        difficulty: 'beginner',
        estimatedMinutes: 60,
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
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBScenario, ...newScenario, id: 'new-scenario-id' }],
        rowCount: 1
      });

      const result = await repository.create(newScenario);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scenarios'),
        expect.arrayContaining([
          'pbl',
          'draft',
          '1.0.0', // default version
          'yaml',
          null, // sourcePath
          null, // sourceId
          '{}', // sourceMetadata
          JSON.stringify({ en: 'New Scenario' }),
          JSON.stringify({ en: 'New Description' }),
          '{}' // objectives
        ])
      );
      expect(result.id).toBe('new-scenario-id');
      expect(result.title).toEqual({ en: 'New Scenario' });
    });

    it('should use provided values for optional fields', async () => {
      const newScenario: Omit<IScenario, 'id'> = {
        mode: 'assessment',
        status: 'active',
        version: '2.0.0',
        sourceType: 'api',
        sourcePath: '/api/path',
        sourceId: 'api-123',
        sourceMetadata: { source: 'external' },
        title: { en: 'Assessment' },
        description: { en: 'Assessment Description' },
        objectives: ['Learn', 'Apply'],
        difficulty: 'advanced',
        estimatedMinutes: 90,
        prerequisites: ['math', 'logic'],
        taskTemplates: [
          {
            id: 'task-new',
            title: { en: 'New Task' },
            type: 'creation',
            status: 'active'
          } as ITaskTemplate
        ],
        taskCount: 1,
        xpRewards: { completion: 200 },
        unlockRequirements: { minLevel: 10 },
        pblData: {},
        discoveryData: {},
        assessmentData: { questionBank: [] },
        aiModules: { 'evaluator-1': { type: 'evaluator' } },
        resources: [{ type: 'video' }],
        metadata: { category: 'advanced' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBScenario, ...newScenario, id: 'new-id' }],
        rowCount: 1
      });

      const result = await repository.create(newScenario);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1][1]).toBe('active'); // status
      expect(queryCall[1][2]).toBe('2.0.0'); // version
      expect(queryCall[1][4]).toBe('/api/path'); // sourcePath
      expect(queryCall[1][5]).toBe('api-123'); // sourceId
      expect(result.version).toBe('2.0.0');
    });
  });

  describe('update', () => {
    it('should update scenario status', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBScenario, status: 'archived' }],
        rowCount: 1
      });

      const result = await repository.update('scenario-123', { status: 'archived' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scenarios'),
        expect.arrayContaining(['archived', 'scenario-123'])
      );
      expect(result.status).toBe('archived');
    });

    it('should set published_at when status becomes active', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBScenario }],
        rowCount: 1
      });

      await repository.update('scenario-123', { status: 'active' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('published_at = COALESCE(published_at, CURRENT_TIMESTAMP)'),
        expect.any(Array)
      );
    });

    it('should update multiple fields', async () => {
      const updates: Partial<IScenario> = {
        title: { en: 'Updated Title', zh: '更新標題' },
        description: { en: 'Updated Description' },
        difficulty: 'beginner',
        estimatedMinutes: 30,
        metadata: { updated: true }
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBScenario, ...updates }],
        rowCount: 1
      });

      const result = await repository.update('scenario-123', updates);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('title = $');
      expect(queryCall[0]).toContain('description = $');
      expect(queryCall[0]).toContain('difficulty = $');
      expect(queryCall[0]).toContain('estimated_minutes = $');
      expect(queryCall[0]).toContain('metadata = $');
      expect(queryCall[1]).toContain(JSON.stringify({ en: 'Updated Title', zh: '更新標題' }));
      expect(result.title).toEqual({ en: 'Updated Title', zh: '更新標題' });
    });

    it('should update source tracking fields', async () => {
      const updates: Partial<IScenario> = {
        sourceType: 'api',
        sourcePath: '/new/path',
        sourceId: 'new-source-id',
        sourceMetadata: { version: 2 }
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBScenario, ...updates }],
        rowCount: 1
      });

      await repository.update('scenario-123', updates);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('source_type = $');
      expect(queryCall[0]).toContain('source_path = $');
      expect(queryCall[0]).toContain('source_id = $');
      expect(queryCall[0]).toContain('source_metadata = $');
      expect(queryCall[1]).toContain('api');
      expect(queryCall[1]).toContain('/new/path');
      expect(queryCall[1]).toContain('new-source-id');
    });

    it('should handle empty updates', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        rowCount: 1
      });

      // Empty updates should throw an error
      await expect(repository.update('scenario-123', {})).rejects.toThrow('No fields to update');
    });
  });

  describe('findActive', () => {
    it('should find all active scenarios', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario, { ...mockDBScenario, id: 'scenario-456' }],
        rowCount: 2
      });

      const result = await repository.findActive();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'active'")
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('findByDifficulty', () => {
    it('should find scenarios by difficulty level', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        rowCount: 1
      });

      const result = await repository.findByDifficulty('intermediate');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE difficulty = $1'),
        ['intermediate']
      );
      expect(result[0].difficulty).toBe('intermediate');
    });
  });

  describe('updateStatus', () => {
    it('should update scenario status', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 1
      });

      await repository.updateStatus('scenario-123', 'archived');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scenarios'),
        ['archived', 'scenario-123']
      );
    });

    it('should set published_at when activating', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 1
      });

      await repository.updateStatus('scenario-123', 'active');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('published_at = COALESCE'),
        ['active', 'scenario-123']
      );
    });
  });

  describe('getScenariosWithStats', () => {
    it('should get scenarios with usage statistics', async () => {
      const mockRowWithStats = {
        ...mockDBScenario,
        totalPrograms: '10',
        completedPrograms: '5',
        uniqueUsers: '8',
        averageScore: '85.5',
        averageTimeSpent: '3600'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockRowWithStats],
        rowCount: 1
      });

      const result = await repository.getScenariosWithStats();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN programs')
      );
      expect(result[0]).toMatchObject({
        id: 'scenario-123',
        totalPrograms: 10,
        completedPrograms: 5,
        uniqueUsers: 8,
        averageScore: 85.5,
        averageTimeSpent: 3600
      });
    });

    it('should handle null statistics', async () => {
      const mockRowWithNullStats = {
        ...mockDBScenario,
        totalPrograms: '0',
        completedPrograms: '0',
        uniqueUsers: '0',
        averageScore: null,
        averageTimeSpent: null
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockRowWithNullStats],
        rowCount: 1
      });

      const result = await repository.getScenariosWithStats();

      expect(result[0]).toMatchObject({
        id: 'scenario-123',
        totalPrograms: 0,
        completedPrograms: 0,
        uniqueUsers: 0,
        averageScore: undefined,
        averageTimeSpent: undefined
      });
    });
  });

  describe('getCompletionRate', () => {
    it('should calculate completion rate', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ completion_rate: 0.75 }],
        rowCount: 1
      });

      const result = await repository.getCompletionRate('scenario-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(CASE WHEN status'),
        ['scenario-123']
      );
      expect(result).toBe(0.75);
    });

    it('should return 0 when no programs exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ completion_rate: null }],
        rowCount: 1
      });

      const result = await repository.getCompletionRate('scenario-123');

      expect(result).toBe(0);
    });
  });

  describe('checkPrerequisites', () => {
    it('should check if user meets prerequisites', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ meets_prerequisites: true }],
        rowCount: 1
      });

      const result = await repository.checkPrerequisites('scenario-123', 'user-456');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH scenario_prereqs'),
        ['scenario-123', 'user-456']
      );
      expect(result).toBe(true);
    });

    it('should return false when prerequisites not met', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ meets_prerequisites: false }],
        rowCount: 1
      });

      const result = await repository.checkPrerequisites('scenario-123', 'user-456');

      expect(result).toBe(false);
    });
  });

  describe('addDomainMapping', () => {
    it('should add domain mapping', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 1
      });

      await repository.addDomainMapping('scenario-123', 'domain-456', true);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scenario_domains'),
        ['scenario-123', 'domain-456', true]
      );
    });
  });

  describe('findByDomain', () => {
    it('should find scenarios by domain', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        rowCount: 1
      });

      const result = await repository.findByDomain('domain-456');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN scenario_domains'),
        ['domain-456']
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should find all scenarios without pagination', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario, { ...mockDBScenario, id: 'scenario-456' }],
        rowCount: 2
      });

      const result = await repository.findAll();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM scenarios'),
        []
      );
      expect(result).toHaveLength(2);
    });

    it('should find scenarios with pagination', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        rowCount: 1
      });

      const result = await repository.findAll({ limit: 10, offset: 20 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 20]
      );
    });
  });

  describe('findBySourcePath', () => {
    it('should find scenario by source path', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        rowCount: 1
      });

      const result = await repository.findBySourcePath('/path/to/scenario.yaml');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE source_path = $1'),
        ['/path/to/scenario.yaml']
      );
      expect(result?.sourcePath).toBe('/path/to/scenario.yaml');
    });

    it('should return null when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const result = await repository.findBySourcePath('/non-existent.yaml');

      expect(result).toBeNull();
    });
  });

  describe('findByMode', () => {
    it('should find scenarios by mode', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario, { ...mockDBScenario, id: 'scenario-456' }],
        rowCount: 2
      });

      const result = await repository.findByMode('pbl');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mode = $1'),
        ['pbl']
      );
      expect(result).toHaveLength(2);
      expect(result.every(s => s.mode === 'pbl')).toBe(true);
    });
  });


  describe('toScenario (private method)', () => {
    it('should handle missing optional fields', async () => {
      const minimalDBScenario: DBScenario = {
        ...mockDBScenario,
        source_path: null,
        source_id: null,
        published_at: null,
        task_templates: [],
        pbl_data: {},
        discovery_data: {},
        assessment_data: {},
        ai_modules: {},
        resources: []
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [minimalDBScenario],
        rowCount: 1
      });

      const result = await repository.findById('scenario-123');

      expect(result).toBeDefined();
      expect(result?.sourcePath).toBeUndefined();
      expect(result?.sourceId).toBeUndefined();
      expect(result?.publishedAt).toBeUndefined();
      expect(result?.taskTemplates).toEqual([]);
    });

    it('should handle task templates without optional fields', async () => {
      const scenarioWithMinimalTasks: DBScenario = {
        ...mockDBScenario,
        task_templates: [
          {
            id: 'task-1',
            title: 'Task 1',
            type: 'question'
            // No description or other optional fields
          }
        ]
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [scenarioWithMinimalTasks],
        rowCount: 1
      });

      const result = await repository.findById('scenario-123');

      expect(result?.taskTemplates).toHaveLength(1);
      expect(result?.taskTemplates[0]).toMatchObject({
        id: 'task-1',
        title: { en: 'Task 1' },
        type: 'question'
      });
    });
  });
});