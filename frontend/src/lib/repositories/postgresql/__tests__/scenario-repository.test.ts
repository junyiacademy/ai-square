/**
 * Unit tests for PostgreSQLScenarioRepository
 * Tests scenario database operations
 */

import { Pool } from 'pg';
import { PostgreSQLScenarioRepository } from '../scenario-repository';
import type { DBScenario, LearningMode, ScenarioStatus, DifficultyLevel } from '@/types/database';
import type { IScenario, ITaskTemplate } from '@/types/unified-learning';

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

  const mockTaskTemplate: ITaskTemplate = {
    id: 'task-template-1',
    title: { en: 'First Task', zh: '第一個任務' },
    type: 'chat',
    description: { en: 'Chat with AI mentor', zh: '與AI導師對話' },
    content: { instructions: 'Follow the prompts' }
  };

  const mockDBScenario: DBScenario = {
    id: 'scenario-123',
    mode: 'pbl',
    status: 'active',
    version: '1.0.0',
    source_type: 'yaml',
    source_path: '/pbl_data/sample_scenario.yaml',
    source_id: 'sample-scenario',
    source_metadata: { language: 'en' },
    title: { en: 'AI Ethics Case Study', zh: 'AI倫理案例研究' },
    description: { en: 'Learn AI ethics through problem solving', zh: '透過問題解決學習AI倫理' },
    objectives: ['understand-ai-ethics', 'apply-ethical-frameworks'],
    difficulty: 'intermediate',
    estimated_minutes: 120,
    prerequisites: [],
    task_templates: [
      {
        id: 'task-template-1',
        title: 'First Task',
        type: 'chat',
        description: 'Chat with AI mentor'
      }
    ],
    task_count: 3,
    xp_rewards: { completion: 100, bonus: 50 },
    unlock_requirements: {},
    pbl_data: {
      ksaMapping: {
        knowledge: ['K1', 'K2'],
        skills: ['S1'],
        attitudes: ['A1']
      }
    },
    discovery_data: {},
    assessment_data: {},
    ai_modules: { mentor: { enabled: true } },
    resources: [
      { type: 'document', url: '/docs/ethics.pdf' }
    ],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
    published_at: '2024-01-02T00:00:00.000Z',
    metadata: { source: 'curated' }
  };

  const expectedScenario: IScenario = {
    id: 'scenario-123',
    mode: 'pbl',
    status: 'active',
    version: '1.0.0',
    sourceType: 'yaml',
    sourcePath: '/pbl_data/sample_scenario.yaml',
    sourceId: 'sample-scenario',
    sourceMetadata: { language: 'en' },
    title: { en: 'AI Ethics Case Study', zh: 'AI倫理案例研究' },
    description: { en: 'Learn AI ethics through problem solving', zh: '透過問題解決學習AI倫理' },
    objectives: ['understand-ai-ethics', 'apply-ethical-frameworks'],
    difficulty: 'intermediate',
    estimatedMinutes: 120,
    prerequisites: [],
    taskTemplates: [
      {
        id: 'task-template-1',
        title: 'First Task',
        type: 'chat',
        description: 'Chat with AI mentor'
      }
    ],
    taskCount: 3,
    xpRewards: { completion: 100, bonus: 50 },
    unlockRequirements: {},
    pblData: {
      ksaMapping: {
        knowledge: ['K1', 'K2'],
        skills: ['S1'],
        attitudes: ['A1']
      }
    },
    discoveryData: {},
    assessmentData: {},
    aiModules: { mentor: { enabled: true } },
    resources: [
      { type: 'document', url: '/docs/ethics.pdf' }
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    publishedAt: '2024-01-02T00:00:00.000Z',
    metadata: { source: 'curated' }
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

      await repository.findBySource('yaml', 'sample-scenario');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('source_type = $1'),
        ['yaml', 'sample-scenario']
      );
    });

    it('should order by creation time descending', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.findBySource('api');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        ['api']
      );
    });

    it('should return empty array if no scenarios found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.findBySource('non-existent-type');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new scenario', async () => {
      const newScenario: Omit<IScenario, 'id'> = {
        mode: 'assessment',
        status: 'draft',
        version: '1.0.0',
        sourceType: 'manual',
        sourceMetadata: {},
        title: { en: 'New Assessment', zh: '新評估' },
        description: { en: 'Test assessment scenario', zh: '測試評估情境' },
        objectives: ['assess-knowledge'],
        difficulty: 'beginner',
        estimatedMinutes: 60,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: { assessmentType: 'diagnostic' },
        aiModules: {},
        resources: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {}
      };

      const createdScenario = {
        ...mockDBScenario,
        id: 'new-scenario-id',
        mode: 'assessment',
        status: 'draft'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [createdScenario],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.create(newScenario);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scenarios'),
        expect.arrayContaining([
          'assessment',
          'draft',
          '1.0.0',
          'manual'
        ])
      );
      expect(result.mode).toBe('assessment');
      expect(result.status).toBe('draft');
    });

    it('should use default values for optional fields', async () => {
      const minimalScenario: Omit<IScenario, 'id'> = {
        mode: 'discovery',
        sourceType: 'ai-generated',
        sourceMetadata: {},
        title: { en: 'Minimal Scenario' },
        description: { en: 'Basic scenario' },
        objectives: [],
        difficulty: 'intermediate',
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 1,
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

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBScenario, mode: 'discovery' }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.create(minimalScenario);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scenarios'),
        expect.arrayContaining([
          'discovery',
          'draft', // Default status
          '1.0.0'  // Default version
        ])
      );
    });

    it('should handle create errors', async () => {
      const scenario: Omit<IScenario, 'id'> = {
        mode: 'pbl',
        sourceType: 'yaml',
        sourceMetadata: {},
        title: { en: 'Error Scenario' },
        description: { en: 'This will fail' },
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
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {}
      };

      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Insert failed'));

      await expect(repository.create(scenario))
        .rejects.toThrow('Insert failed');
    });
  });

  describe('update', () => {
    it('should update scenario with single field', async () => {
      const updates = {
        status: 'active' as ScenarioStatus
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          ...mockDBScenario,
          status: 'active',
          published_at: new Date().toISOString()
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('scenario-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scenarios'),
        expect.arrayContaining(['active', 'scenario-123'])
      );
      expect(result.status).toBe('active');
    });

    it('should update scenario with multiple fields', async () => {
      const updates = {
        title: { en: 'Updated Title', zh: '更新標題' },
        difficulty: 'advanced' as DifficultyLevel,
        estimatedMinutes: 180
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          ...mockDBScenario,
          title: { en: 'Updated Title', zh: '更新標題' },
          difficulty: 'advanced',
          estimated_minutes: 180
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('scenario-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scenarios'),
        expect.arrayContaining([
          JSON.stringify({ en: 'Updated Title', zh: '更新標題' }),
          'advanced',
          180,
          'scenario-123'
        ])
      );
      expect(result.title).toEqual({ en: 'Updated Title', zh: '更新標題' });
      expect(result.difficulty).toBe('advanced');
      expect(result.estimatedMinutes).toBe(180);
    });

    it('should update mode-specific data', async () => {
      const updates = {
        pblData: { ksaMapping: { knowledge: ['K3'], skills: ['S2'], attitudes: [] } },
        discoveryData: { careerType: 'data-scientist' }
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBScenario, ...updates }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.update('scenario-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('pbl_data = $1'),
        expect.arrayContaining([
          JSON.stringify({ ksaMapping: { knowledge: ['K3'], skills: ['S2'], attitudes: [] } }),
          'scenario-123'
        ])
      );
    });

    it('should handle empty updates', async () => {
      const updates = {};

      await expect(repository.update('scenario-123', updates))
        .rejects.toThrow('No fields to update');
    });

    it('should handle update when scenario not found', async () => {
      const updates = { status: 'active' as ScenarioStatus };

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

    it('should set published_at when status becomes active', async () => {
      const updates = { status: 'active' as ScenarioStatus };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          ...mockDBScenario,
          status: 'active',
          published_at: '2024-01-03T00:00:00.000Z'
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.update('scenario-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('published_at = COALESCE(published_at, CURRENT_TIMESTAMP)'),
        expect.arrayContaining(['active', 'scenario-123'])
      );
    });
  });

  describe('findByMode', () => {
    it('should find active scenarios by mode', async () => {
      const pblScenario = { ...mockDBScenario, mode: 'pbl' };
      
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [pblScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findByMode('pbl');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE mode = $1 AND status = 'active'"),
        ['pbl']
      );
      expect(result).toHaveLength(1);
      expect(result[0].mode).toBe('pbl');
    });

    it('should order by creation time descending', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.findByMode('assessment');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        ['assessment']
      );
    });

    it('should return empty array for mode with no scenarios', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.findByMode('discovery');

      expect(result).toEqual([]);
    });
  });

  describe('findActive', () => {
    it('should find all active scenarios', async () => {
      const scenarios = [
        { ...mockDBScenario, mode: 'pbl' },
        { ...mockDBScenario, id: 'scenario-456', mode: 'assessment' },
        { ...mockDBScenario, id: 'scenario-789', mode: 'discovery' }
      ];
      
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: scenarios,
        command: 'SELECT',
        rowCount: 3,
        oid: 0,
        fields: []
      });

      const result = await repository.findActive();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'active'")
      );
      expect(result).toHaveLength(3);
    });

    it('should order by mode, difficulty, and creation time', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.findActive();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('mode, difficulty, created_at DESC')
      );
    });
  });

  describe('findByDifficulty', () => {
    it('should find active scenarios by difficulty', async () => {
      const intermediateScenario = { ...mockDBScenario, difficulty: 'intermediate' };
      
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [intermediateScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findByDifficulty('intermediate');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE difficulty = $1 AND status = 'active'"),
        ['intermediate']
      );
      expect(result).toHaveLength(1);
      expect(result[0].difficulty).toBe('intermediate');
    });

    it('should order by mode and creation time', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await repository.findByDifficulty('expert');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY mode, created_at DESC'),
        ['expert']
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status to active and set published_at', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.updateStatus('scenario-123', 'active');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('published_at = COALESCE(published_at, CURRENT_TIMESTAMP)'),
        ['active', 'scenario-123']
      );
    });

    it('should update status to archived without published_at', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.updateStatus('scenario-123', 'archived');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scenarios'),
        ['archived', 'scenario-123']
      );
    });
  });

  describe('getScenariosWithStats', () => {
    it('should get scenarios with usage statistics', async () => {
      const scenarioWithStats = {
        ...mockDBScenario,
        totalPrograms: 50,
        completedPrograms: 35,
        uniqueUsers: 40,
        averageScore: 87.5,
        averageTimeSpent: 3600
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [scenarioWithStats],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.getScenariosWithStats();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT p.id)')
      );
      expect(result).toHaveLength(1);
      expect(result[0].totalPrograms).toBe(50);
      expect(result[0].completedPrograms).toBe(35);
      expect(result[0].uniqueUsers).toBe(40);
      expect(result[0].averageScore).toBe(87.5);
      expect(result[0].averageTimeSpent).toBe(3600);
    });

    it('should handle scenarios with no programs', async () => {
      const scenarioNoStats = {
        ...mockDBScenario,
        totalPrograms: 0,
        completedPrograms: 0,
        uniqueUsers: 0,
        averageScore: null,
        averageTimeSpent: null
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [scenarioNoStats],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.getScenariosWithStats();

      expect(result[0].totalPrograms).toBe(0);
      expect(result[0].averageScore).toBeUndefined();
      expect(result[0].averageTimeSpent).toBeUndefined();
    });
  });

  describe('getCompletionRate', () => {
    it('should calculate completion rate for scenario', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ completion_rate: 0.7 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.getCompletionRate('scenario-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("COUNT(CASE WHEN status = 'completed' THEN 1 END)::float"),
        ['scenario-123']
      );
      expect(result).toBe(0.7);
    });

    it('should return 0 for scenario with no programs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ completion_rate: null }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.getCompletionRate('scenario-456');

      expect(result).toBe(0);
    });
  });

  describe('checkPrerequisites', () => {
    it('should return true for scenario with no prerequisites', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ meets_prerequisites: true }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.checkPrerequisites('scenario-123', 'user-456');

      expect(result).toBe(true);
    });

    it('should return false for unmet prerequisites', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ meets_prerequisites: false }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.checkPrerequisites('scenario-123', 'user-456');

      expect(result).toBe(false);
    });

    it('should return false if no data found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.checkPrerequisites('non-existent', 'user-456');

      expect(result).toBe(false);
    });
  });

  describe('addDomainMapping', () => {
    it('should add domain mapping to scenario', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.addDomainMapping('scenario-123', 'domain-456', true);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scenario_domains'),
        ['scenario-123', 'domain-456', true]
      );
    });

    it('should update existing domain mapping on conflict', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.addDomainMapping('scenario-123', 'domain-456', false);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (scenario_id, domain_id)'),
        ['scenario-123', 'domain-456', false]
      );
    });
  });

  describe('findByDomain', () => {
    it('should find active scenarios by domain', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findByDomain('domain-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN scenario_domains sd ON s.id = sd.scenario_id'),
        ['domain-123']
      );
      expect(result).toHaveLength(1);
    });

    it('should order by primary domain first', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await repository.findByDomain('domain-456');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY sd.is_primary DESC, s.created_at DESC'),
        ['domain-456']
      );
    });
  });

  describe('findAll', () => {
    it('should find all scenarios without pagination', async () => {
      const scenarios = [mockDBScenario, { ...mockDBScenario, id: 'scenario-456' }];
      
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: scenarios,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      const result = await repository.findAll();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM scenarios ORDER BY created_at DESC'),
        []
      );
      expect(result).toHaveLength(2);
    });

    it('should find all scenarios with limit', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.findAll({ limit: 10 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [10]
      );
    });

    it('should find all scenarios with limit and offset', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.findAll({ limit: 5, offset: 10 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [5, 10]
      );
    });
  });

  describe('findBySourcePath', () => {
    it('should find scenario by source path', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findBySourcePath('/pbl_data/sample_scenario.yaml');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE source_path = $1 LIMIT 1'),
        ['/pbl_data/sample_scenario.yaml']
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

      const result = await repository.findBySourcePath('/non-existent.yaml');

      expect(result).toBeNull();
    });
  });

  describe('Data conversion', () => {
    it('should handle scenarios with null optional fields', async () => {
      const dbScenarioWithNulls = {
        ...mockDBScenario,
        source_path: null,
        source_id: null,
        published_at: null,
        prerequisites: null,
        task_templates: [],
        resources: []
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
      expect(result!.publishedAt).toBeUndefined();
    });

    it('should convert task templates correctly', async () => {
      const dbScenarioWithTasks = {
        ...mockDBScenario,
        task_templates: [
          {
            id: 'task-1',
            title: { en: 'Task 1', zh: '任務1' },
            type: 'chat',
            description: { en: 'First task', zh: '第一個任務' }
          },
          {
            id: 'task-2',
            title: { en: 'Task 2' },
            type: 'analysis'
          }
        ]
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbScenarioWithTasks],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('scenario-123');

      expect(result!.taskTemplates).toHaveLength(2);
      expect(result!.taskTemplates[0].title).toEqual({ en: 'Task 1', zh: '任務1' });
      expect(result!.taskTemplates[0].type).toBe('chat');
      expect(result!.taskTemplates[1].title).toEqual({ en: 'Task 2' });
      expect(result!.taskTemplates[1].type).toBe('analysis');
    });

    it('should handle empty task templates array', async () => {
      const dbScenarioNoTasks = {
        ...mockDBScenario,
        task_templates: null
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbScenarioNoTasks],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('scenario-123');

      expect(result!.taskTemplates).toEqual([]);
    });
  });

  describe('Complex queries and edge cases', () => {
    it('should handle scenarios with different modes and data', async () => {
      const pblScenario = { 
        ...mockDBScenario, 
        mode: 'pbl',
        pbl_data: { ksaMapping: { knowledge: ['K1'] } }
      };
      const assessmentScenario = { 
        ...mockDBScenario, 
        id: 'scenario-456',
        mode: 'assessment',
        assessment_data: { assessmentType: 'diagnostic' }
      };
      const discoveryScenario = { 
        ...mockDBScenario, 
        id: 'scenario-789',
        mode: 'discovery',
        discovery_data: { careerType: 'engineer' }
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [pblScenario, assessmentScenario, discoveryScenario],
        command: 'SELECT',
        rowCount: 3,
        oid: 0,
        fields: []
      });

      const result = await repository.findActive();

      expect(result).toHaveLength(3);
      expect(result[0].mode).toBe('pbl');
      expect(result[0].pblData).toEqual({ ksaMapping: { knowledge: ['K1'] } });
      expect(result[1].mode).toBe('assessment');
      expect(result[1].assessmentData).toEqual({ assessmentType: 'diagnostic' });
      expect(result[2].mode).toBe('discovery');
      expect(result[2].discoveryData).toEqual({ careerType: 'engineer' });
    });

    it('should handle database connection errors gracefully', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      await expect(repository.findActive())
        .rejects.toThrow('Connection refused');
    });

    it('should handle JSON parsing for complex nested data', async () => {
      const complexScenario = {
        ...mockDBScenario,
        pbl_data: {
          ksaMapping: {
            knowledge: ['K1', 'K2'],
            skills: ['S1', 'S2', 'S3'],
            attitudes: ['A1']
          },
          aiMentorGuidelines: 'Be encouraging and helpful',
          customData: {
            nested: {
              deep: {
                value: 'test'
              }
            }
          }
        },
        metadata: {
          author: 'AI Curator',
          version: '2.1.0',
          tags: ['ethics', 'ai', 'problem-solving']
        }
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [complexScenario],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('scenario-123');

      expect(result!.pblData).toEqual(complexScenario.pbl_data);
      expect(result!.metadata).toEqual(complexScenario.metadata);
    });
  });
});