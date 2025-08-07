import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Discovery Scenario Service Tests
 * 提升覆蓋率從 0% 到 80%+
 */

import { discoveryScenarioService } from '../discovery-scenario-service';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import yaml from 'js-yaml';
import type { IScenario, ITaskTemplate } from '@/types/unified-learning';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('js-yaml');

// Mock fs module
const mockReadFile = jest.fn();
const mockAccess = jest.fn();
const mockReaddir = jest.fn();

jest.mock('fs', () => ({
  promises: {
    readFile: (...args: any[]) => mockReadFile(...args),
    access: (...args: any[]) => mockAccess(...args),
    readdir: (...args: any[]) => mockReaddir(...args)
  }
}));

describe('DiscoveryScenarioService', () => {
  let mockScenarioRepo: any;

  // Mock YAML data
  const mockYAMLData = {
    path_id: 'content_creator',
    category: 'creative',
    difficulty_range: ['beginner', 'intermediate'],
    metadata: {
      title: 'Content Creator',
      short_description: 'Create engaging content',
      long_description: 'Learn to create engaging content for various platforms',
      estimated_hours: 20,
      skill_focus: ['content creation', 'storytelling', 'editing']
    },
    world_setting: {
      name: 'Digital Studio',
      description: 'A modern digital creative studio',
      atmosphere: 'Creative and inspiring',
      visual_theme: 'Modern minimalist'
    },
    starting_scenario: {
      title: 'Your First Content Project',
      description: 'Create your first piece of content. Start with a simple blog post.',
      initial_tasks: ['understand_audience', 'create_content_plan', 'write_first_draft']
    },
    skill_tree: {
      core_skills: [
        {
          id: 'writing',
          name: 'Writing',
          description: 'Master the art of writing',
          max_level: 10
        }
      ]
    }
  };

  const mockScenario: IScenario = {
    id: 'scenario-123',
    mode: 'discovery',
    status: 'active',
    version: '1.0.0',
    sourceType: 'yaml',
    sourcePath: 'discovery_data/content_creator',
    sourceId: 'content_creator',
    sourceMetadata: {
      careerType: 'content_creator',
      language: 'en',
      originalId: 'content_creator'
    },
    title: { en: 'Content Creator' },
    description: { en: 'Create engaging content' },
    objectives: [
      'Explore the Digital Studio as a Content Creator',
      'Master content creation, storytelling, editing skills',
      'Complete challenges in 20 hours of gameplay',
      'Create your first piece of content'
    ],
    difficulty: 'beginner',
    estimatedMinutes: 1200,
    prerequisites: [],
    taskTemplates: [],
    taskCount: 0,
    xpRewards: { completion: 100, bonus: 20 },
    unlockRequirements: { level: 1 },
    discoveryData: {
      careerType: 'content_creator',
      category: 'creative',
      difficultyRange: ['beginner', 'intermediate'],
      skillFocus: ['content creation', 'storytelling', 'editing'],
      worldSetting: mockYAMLData.world_setting,
      startingScenario: mockYAMLData.starting_scenario,
      longDescription: 'Learn to create engaging content for various platforms'
    },
    pblData: {},
    assessmentData: {},
    aiModules: {},
    resources: [],
    metadata: {
      careerType: 'content_creator',
      yamlData: mockYAMLData
    },
    createdAt: expect.any(String),
    updatedAt: expect.any(String)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock date to ensure consistent timestamps
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));

    // Setup repository mock
    mockScenarioRepo = {
      create: jest.fn().mockImplementation((scenario) => 
        Promise.resolve({ ...scenario, id: 'scenario-123' })
      ),
      findBySource: jest.fn().mockResolvedValue([])
    };

    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);

    // Setup YAML mock
    (yaml.load as jest.Mock).mockReturnValue(mockYAMLData);

    // Setup fs mocks
    mockReadFile.mockResolvedValue(JSON.stringify(mockYAMLData));
    mockAccess.mockResolvedValue(undefined); // File exists
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createScenarioFromYAML', () => {
    it('should create scenario from YAML data', async () => {
      const result = await discoveryScenarioService.createScenarioFromYAML('content_creator', 'en');

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('content_creator_en.yml'),
        'utf8'
      );
      expect(yaml.load).toHaveBeenCalled();
      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'discovery',
          sourceType: 'yaml',
          sourcePath: 'discovery_data/content_creator',
          sourceId: 'content_creator',
          title: { en: 'Content Creator' }
        })
      );
      expect(result.id).toBe('scenario-123');
    });

    it('should fallback to English when language file not found', async () => {
      mockAccess.mockRejectedValueOnce(new Error('File not found')); // zh file not found

      await discoveryScenarioService.createScenarioFromYAML('content_creator', 'zh');

      expect(mockAccess).toHaveBeenCalledWith(
        expect.stringContaining('content_creator_zh.yml')
      );
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('content_creator_en.yml'),
        'utf8'
      );
    });

    it('should extract objectives from YAML data', async () => {
      const result = await discoveryScenarioService.createScenarioFromYAML('content_creator', 'en');

      expect(result.objectives).toContain('Explore the Digital Studio as a Content Creator');
      expect(result.objectives).toContain('Master content creation, storytelling, editing skills');
      expect(result.objectives).toContain('Complete challenges in 20 hours of gameplay');
      expect(result.objectives).toContain('Create your first piece of content');
    });

    it('should create task templates from initial tasks', async () => {
      const result = await discoveryScenarioService.createScenarioFromYAML('content_creator', 'en');

      const taskTemplates = (mockScenarioRepo.create as jest.Mock).mock.calls[0][0].taskTemplates;
      expect(taskTemplates).toHaveLength(3);
      expect(taskTemplates[0]).toMatchObject({
        id: 'understand_audience',
        title: { en: 'Understand Audience' },
        type: 'chat',
        metadata: {
          order: 1,
          isInitial: true,
          careerType: 'content_creator',
          taskSubtype: 'discovery'
        }
      });
    });

    it('should handle missing optional fields', async () => {
      const minimalYAMLData = {
        path_id: 'minimal',
        category: 'test',
        metadata: {
          title: 'Minimal Career',
          short_description: 'Test',
          skill_focus: []
        },
        world_setting: {
          name: 'Test World',
          description: 'Test'
        },
        starting_scenario: {
          title: 'Start',
          description: 'Begin here.',
          initial_tasks: []
        }
      };
      (yaml.load as jest.Mock).mockReturnValue(minimalYAMLData);

      const result = await discoveryScenarioService.createScenarioFromYAML('minimal', 'en');

      expect(result.difficulty).toBe('beginner'); // default
      expect(result.estimatedMinutes).toBe(60); // default 1 hour
      expect(result.taskTemplates).toEqual([]);
    });
  });

  describe('findOrCreateScenarioByCareerType', () => {
    it('should return existing scenario if found', async () => {
      const existingScenario = {
        ...mockScenario,
        id: 'existing-123'
      };
      mockScenarioRepo.findBySource.mockResolvedValue([existingScenario]);

      const result = await discoveryScenarioService.findOrCreateScenarioByCareerType('content_creator');

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith('yaml');
      expect(mockScenarioRepo.create).not.toHaveBeenCalled();
      expect(result.id).toBe('existing-123');
    });

    it('should create new scenario if not found', async () => {
      mockScenarioRepo.findBySource.mockResolvedValue([]); // No existing scenarios

      const result = await discoveryScenarioService.findOrCreateScenarioByCareerType('content_creator');

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith('yaml');
      expect(mockScenarioRepo.create).toHaveBeenCalled();
      expect(result.id).toBe('scenario-123');
    });

    it('should filter by mode and careerType correctly', async () => {
      const scenarios = [
        { ...mockScenario, mode: 'pbl' }, // Wrong mode
        { ...mockScenario, sourceMetadata: { careerType: 'other' } }, // Wrong career type
        { ...mockScenario, id: 'correct-123' } // Correct one
      ];
      mockScenarioRepo.findBySource.mockResolvedValue(scenarios);

      const result = await discoveryScenarioService.findOrCreateScenarioByCareerType('content_creator');

      expect(result.id).toBe('correct-123');
    });

    it('should handle scenarios without sourceMetadata', async () => {
      const scenariosWithoutMetadata = [
        { ...mockScenario, sourceMetadata: undefined }
      ];
      mockScenarioRepo.findBySource.mockResolvedValue(scenariosWithoutMetadata);

      const result = await discoveryScenarioService.findOrCreateScenarioByCareerType('content_creator');

      expect(mockScenarioRepo.create).toHaveBeenCalled(); // Should create new one
      expect(result.id).toBe('scenario-123');
    });
  });

  describe('listAvailableCareerTypes', () => {
    it('should list all career type directories', async () => {
      const mockDirents = [
        { name: 'content_creator', isDirectory: () => true },
        { name: 'youtuber', isDirectory: () => true },
        { name: 'some_file.txt', isDirectory: () => false }, // Should be filtered out
        { name: 'game_designer', isDirectory: () => true }
      ];
      mockReaddir.mockResolvedValue(mockDirents);

      const result = await discoveryScenarioService.listAvailableCareerTypes();

      expect(mockReaddir).toHaveBeenCalledWith(
        expect.stringContaining('discovery_data'),
        { withFileTypes: true }
      );
      expect(result).toEqual(['content_creator', 'youtuber', 'game_designer']);
    });

    it('should return empty array when directory is empty', async () => {
      mockReaddir.mockResolvedValue([]);

      const result = await discoveryScenarioService.listAvailableCareerTypes();

      expect(result).toEqual([]);
    });

    it('should handle readdir errors', async () => {
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      await expect(discoveryScenarioService.listAvailableCareerTypes())
        .rejects.toThrow('Directory not found');
    });
  });

  describe('formatTaskTitle', () => {
    it('should format snake_case to Title Case', async () => {
      const yamlWithTasks = {
        ...mockYAMLData,
        starting_scenario: {
          ...mockYAMLData.starting_scenario,
          initial_tasks: ['understand_your_audience', 'create_content_plan', 'write_first_draft']
        }
      };
      (yaml.load as jest.Mock).mockReturnValue(yamlWithTasks);

      const result = await discoveryScenarioService.createScenarioFromYAML('content_creator', 'en');

      const taskTemplates = (mockScenarioRepo.create as jest.Mock).mock.calls[0][0].taskTemplates;
      expect(taskTemplates[0].title.en).toBe('Understand Your Audience');
      expect(taskTemplates[1].title.en).toBe('Create Content Plan');
      expect(taskTemplates[2].title.en).toBe('Write First Draft');
    });
  });

  describe('difficulty handling', () => {
    it('should use first difficulty from range', async () => {
      const yamlWithDifficulty = {
        ...mockYAMLData,
        difficulty_range: ['intermediate', 'advanced']
      };
      (yaml.load as jest.Mock).mockReturnValue(yamlWithDifficulty);

      await discoveryScenarioService.createScenarioFromYAML('content_creator', 'en');

      const createdScenario = (mockScenarioRepo.create as jest.Mock).mock.calls[0][0];
      expect(createdScenario.difficulty).toBe('intermediate');
    });

    it('should default to beginner when no difficulty range', async () => {
      const yamlWithoutDifficulty = {
        ...mockYAMLData,
        difficulty_range: undefined
      };
      (yaml.load as jest.Mock).mockReturnValue(yamlWithoutDifficulty);

      await discoveryScenarioService.createScenarioFromYAML('content_creator', 'en');

      const createdScenario = (mockScenarioRepo.create as jest.Mock).mock.calls[0][0];
      expect(createdScenario.difficulty).toBe('beginner');
    });
  });

  describe('metadata preservation', () => {
    it('should preserve complete YAML data in metadata', async () => {
      await discoveryScenarioService.createScenarioFromYAML('content_creator', 'en');

      const createdScenario = (mockScenarioRepo.create as jest.Mock).mock.calls[0][0];
      expect(createdScenario.metadata.yamlData).toEqual(mockYAMLData);
      expect(createdScenario.metadata.careerType).toBe('content_creator');
    });

    it('should store career metadata in sourceMetadata', async () => {
      await discoveryScenarioService.createScenarioFromYAML('content_creator', 'zh');

      const createdScenario = (mockScenarioRepo.create as jest.Mock).mock.calls[0][0];
      expect(createdScenario.sourceMetadata).toEqual({
        careerType: 'content_creator',
        language: 'zh',
        originalId: 'content_creator'
      });
    });
  });
});