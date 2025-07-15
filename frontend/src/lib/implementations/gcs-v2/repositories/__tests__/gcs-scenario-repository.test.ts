/**
 * TDD Test: GCS Scenario Repository
 * Tests for unified learning architecture - Scenario stage
 */

import { GCSScenarioRepository } from '../gcs-scenario-repository';
import { IScenario } from '@/types/unified-learning';
import { jest } from '@jest/globals';

// Mock GCS dependencies
jest.mock('@google-cloud/storage');
jest.mock('@/lib/config/gcs.config', () => ({
  GCS_CONFIG: {
    paths: {
      scenarios: 'test-scenarios/'
    }
  }
}));

describe('GCSScenarioRepository - Unified Learning Architecture', () => {
  let repository: GCSScenarioRepository;
  let mockSaveEntity: jest.Mock;
  let mockLoadEntity: jest.Mock;
  let mockListAllEntities: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    repository = new GCSScenarioRepository();
    
    // Mock the base repository methods
    mockSaveEntity = jest.fn();
    mockLoadEntity = jest.fn();
    mockListAllEntities = jest.fn();
    
    (repository as any).saveEntity = mockSaveEntity;
    (repository as any).loadEntity = mockLoadEntity;
    (repository as any).listAllEntities = mockListAllEntities;
    (repository as any).generateId = jest.fn(() => 'test-uuid-1234');
  });

  describe('create() - Content Source → Scenario transformation', () => {
    it('should create PBL scenario from YAML content source', async () => {
      // Red: Write failing test first
      const pblScenarioData: Omit<IScenario, 'id'> = {
        sourceType: 'pbl',
        sourceRef: {
          type: 'yaml',
          path: 'pbl_data/scenarios/ai_education_design/ai_education_design_scenario.yaml',
          metadata: {
            yamlId: 'ai-education-design',
            language: 'en'
          }
        },
        title: 'AI Education Design Challenge',
        description: 'Design an AI-powered educational tool',
        objectives: ['Understand AI in education', 'Design user-friendly interfaces'],
        taskTemplates: [
          {
            id: 'task-1',
            title: 'Research Phase',
            type: 'chat',
            description: 'Research existing AI education tools'
          }
        ],
        metadata: {
          difficulty: 'intermediate',
          estimatedDuration: 120,
          ksaMapping: ['K1', 'S2', 'A1']
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const expectedScenario: IScenario = {
        ...pblScenarioData,
        id: 'test-uuid-1234',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      };

      mockSaveEntity.mockResolvedValue(expectedScenario);

      // Green: Make test pass
      const result = await repository.create(pblScenarioData);

      expect(result).toEqual(expectedScenario);
      expect(mockSaveEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          ...pblScenarioData,
          id: 'test-uuid-1234',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        })
      );
    });

    it('should create Discovery scenario from YAML content source', async () => {
      const discoveryScenarioData: Omit<IScenario, 'id'> = {
        sourceType: 'discovery',
        sourceRef: {
          type: 'yaml',
          path: 'discovery_data/app_developer/app_developer_en.yml',
          metadata: {
            careerType: 'app_developer',
            category: 'technology'
          }
        },
        title: 'App Developer Career Path',
        description: 'Explore the world of mobile app development',
        objectives: ['Learn programming basics', 'Build first app'],
        taskTemplates: [],
        metadata: {
          worldSetting: 'Tech Hub City',
          skillTree: {
            core_skills: ['programming', 'ui_design'],
            advanced_skills: ['performance_optimization']
          }
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const expectedScenario: IScenario = {
        ...discoveryScenarioData,
        id: 'test-uuid-1234',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      };

      mockSaveEntity.mockResolvedValue(expectedScenario);

      const result = await repository.create(discoveryScenarioData);

      expect(result).toEqual(expectedScenario);
      expect(result.sourceType).toBe('discovery');
      expect(result.sourceRef.type).toBe('yaml');
    });

    it('should create Assessment scenario from YAML content source', async () => {
      const assessmentScenarioData: Omit<IScenario, 'id'> = {
        sourceType: 'assessment',
        sourceRef: {
          type: 'yaml',
          path: 'assessment_data/ai_literacy/ai_literacy_questions_en.yaml',
          metadata: {
            assessmentType: 'ai_literacy',
            language: 'en'
          }
        },
        title: 'AI Literacy Assessment',
        description: 'Test your understanding of AI concepts',
        objectives: ['Evaluate AI knowledge', 'Identify learning gaps'],
        taskTemplates: [
          {
            id: 'assessment-task',
            title: 'AI Literacy Questions',
            type: 'question'
          }
        ],
        metadata: {
          totalQuestions: 20,
          timeLimit: 15,
          passingScore: 70,
          domains: ['Engaging_with_AI', 'Creating_with_AI']
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const expectedScenario: IScenario = {
        ...assessmentScenarioData,
        id: 'test-uuid-1234',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      };

      mockSaveEntity.mockResolvedValue(expectedScenario);

      const result = await repository.create(assessmentScenarioData);

      expect(result).toEqual(expectedScenario);
      expect(result.sourceType).toBe('assessment');
      expect(result.metadata?.totalQuestions).toBe(20);
    });
  });

  describe('findById() - Scenario retrieval', () => {
    it('should find scenario by UUID', async () => {
      const scenarioId = 'test-uuid-1234';
      const expectedScenario: IScenario = {
        id: scenarioId,
        sourceType: 'pbl',
        sourceRef: {
          type: 'yaml',
          path: 'pbl_data/scenarios/test.yaml',
          metadata: {}
        },
        title: 'Test Scenario',
        description: 'Test description',
        objectives: ['Test objective'],
        taskTemplates: [],
        metadata: {},
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockLoadEntity.mockResolvedValue(expectedScenario);

      const result = await repository.findById(scenarioId);

      expect(result).toEqual(expectedScenario);
      expect(mockLoadEntity).toHaveBeenCalledWith(scenarioId);
    });

    it('should return null for non-existent scenario', async () => {
      mockLoadEntity.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findBySource() - Content Source filtering', () => {
    it('should find scenarios by source type', async () => {
      const mockScenarios: IScenario[] = [
        {
          id: 'pbl-1',
          sourceType: 'pbl',
          sourceRef: { type: 'yaml', path: 'pbl1.yaml', metadata: {} },
          title: 'PBL Scenario 1',
          description: 'PBL Description 1',
          objectives: [],
          taskTemplates: [],
          metadata: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'discovery-1',
          sourceType: 'discovery',
          sourceRef: { type: 'yaml', path: 'discovery1.yaml', metadata: {} },
          title: 'Discovery Scenario 1',
          description: 'Discovery Description 1',
          objectives: [],
          taskTemplates: [],
          metadata: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockListAllEntities.mockResolvedValue(mockScenarios);

      const result = await repository.findBySource('pbl');

      expect(result).toHaveLength(1);
      expect(result[0].sourceType).toBe('pbl');
      expect(result[0].id).toBe('pbl-1');
    });

    it('should find scenarios by source type and source ID', async () => {
      const mockScenarios: IScenario[] = [
        {
          id: 'scenario-1',
          sourceType: 'pbl',
          sourceRef: { 
            type: 'yaml', 
            path: 'pbl1.yaml', 
            sourceId: 'pbl-ai-education',
            metadata: {} 
          },
          title: 'PBL Scenario 1',
          description: 'PBL Description 1',
          objectives: [],
          taskTemplates: [],
          metadata: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockListAllEntities.mockResolvedValue(mockScenarios);

      const result = await repository.findBySource('pbl', 'pbl-ai-education');

      expect(result).toHaveLength(1);
      expect(result[0].sourceRef.sourceId).toBe('pbl-ai-education');
    });
  });

  describe('update() - Scenario modification', () => {
    it('should update scenario with new content', async () => {
      const scenarioId = 'test-uuid-1234';
      const updates = {
        title: 'Updated Title',
        description: 'Updated Description'
      };

      const updatedScenario: IScenario = {
        id: scenarioId,
        sourceType: 'pbl',
        sourceRef: {
          type: 'yaml',
          path: 'pbl_data/scenarios/test.yaml',
          metadata: {}
        },
        title: 'Updated Title',
        description: 'Updated Description',
        objectives: ['Test objective'],
        taskTemplates: [],
        metadata: {},
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z'
      };

      const mockUpdateEntity = jest.fn().mockResolvedValue(updatedScenario);
      (repository as any).updateEntity = mockUpdateEntity;

      const result = await repository.update(scenarioId, updates);

      expect(result).toEqual(updatedScenario);
      expect(mockUpdateEntity).toHaveBeenCalledWith(scenarioId, {
        ...updates,
        updatedAt: expect.any(String)
      });
    });
  });

  describe('Unified Architecture Compliance', () => {
    it('should ensure all scenarios follow IScenario interface', async () => {
      const testScenarios = [
        { sourceType: 'pbl', expectedFields: ['ksaMapping', 'programs'] },
        { sourceType: 'discovery', expectedFields: ['worldSetting', 'skillTree'] },
        { sourceType: 'assessment', expectedFields: ['totalQuestions', 'domains'] }
      ];

      for (const testCase of testScenarios) {
        const scenarioData: Omit<IScenario, 'id'> = {
          sourceType: testCase.sourceType as any,
          sourceRef: {
            type: 'yaml',
            path: `${testCase.sourceType}_test.yaml`,
            metadata: {}
          },
          title: `${testCase.sourceType} Test`,
          description: `Test ${testCase.sourceType} scenario`,
          objectives: ['Test objective'],
          taskTemplates: [],
          metadata: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        };

        const expectedScenario = {
          ...scenarioData,
          id: 'test-uuid-1234',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        };

        mockSaveEntity.mockResolvedValue(expectedScenario);

        const result = await repository.create(scenarioData);

        // Verify unified interface compliance
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('sourceType');
        expect(result).toHaveProperty('sourceRef');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('description');
        expect(result).toHaveProperty('objectives');
        expect(result).toHaveProperty('taskTemplates');
        expect(result).toHaveProperty('metadata');
        expect(result).toHaveProperty('createdAt');
        expect(result).toHaveProperty('updatedAt');
      }
    });
  });
});