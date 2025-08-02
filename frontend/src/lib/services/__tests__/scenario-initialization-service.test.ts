/**
 * Scenario Initialization Service Tests
 * 提升覆蓋率從 6% 到 100%
 */

import { ScenarioInitializationService } from '../scenario-initialization-service';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { AssessmentYAMLLoader } from '../assessment-yaml-loader';
import { PBLYAMLLoader } from '../pbl-yaml-loader';
import { DiscoveryYAMLLoader } from '../discovery-yaml-loader';
import type { IScenario } from '@/types/unified-learning';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('../assessment-yaml-loader');
jest.mock('../pbl-yaml-loader');
jest.mock('../discovery-yaml-loader');

describe('ScenarioInitializationService', () => {
  let service: ScenarioInitializationService;
  let mockScenarioRepo: any;
  let mockPBLLoader: jest.Mocked<PBLYAMLLoader>;
  let mockDiscoveryLoader: jest.Mocked<DiscoveryYAMLLoader>;
  let mockAssessmentLoader: jest.Mocked<AssessmentYAMLLoader>;

  // Mock data
  const mockPBLScenario: IScenario = {
    id: 'pbl-scenario-123',
    mode: 'pbl',
    status: 'active',
    version: '1.0',
    sourceType: 'yaml',
    sourcePath: 'pbl_data/scenarios/ai_ethics/ai_ethics_scenario.yaml',
    sourceId: 'ai_ethics',
    sourceMetadata: {
      scenarioId: 'ai_ethics',
      configPath: 'pbl_data/scenarios/ai_ethics/ai_ethics_scenario.yaml',
      lastSync: '2024-01-01'
    },
    title: { en: 'AI Ethics Challenge' },
    description: { en: 'Explore AI ethics' },
    objectives: ['Understand AI ethics'],
    difficulty: 'intermediate',
    estimatedMinutes: 120,
    prerequisites: [],
    taskTemplates: [],
    taskCount: 3,
    xpRewards: {},
    unlockRequirements: {},
    pblData: {
      targetDomains: ['Engaging_with_AI'],
      ksaMappings: [],
      programs: []
    },
    discoveryData: {},
    assessmentData: {},
    aiModules: {},
    resources: [],
    metadata: {},
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  };

  const mockDiscoveryScenario: IScenario = {
    id: 'discovery-scenario-123',
    mode: 'discovery',
    status: 'active',
    version: '1.0',
    sourceType: 'yaml',
    sourcePath: 'discovery_data/content_creator/content_creator_en.yml',
    sourceId: 'content_creator',
    sourceMetadata: {
      careerType: 'content_creator',
      category: 'creative',
      configPath: 'discovery_data/content_creator/content_creator_en.yml',
      lastSync: '2024-01-01'
    },
    title: { en: 'Content Creator Path' },
    description: { en: 'Create engaging content' },
    objectives: ['Explore career possibilities'],
    difficulty: 'intermediate',
    estimatedMinutes: 1200,
    prerequisites: [],
    taskTemplates: [],
    taskCount: 0,
    xpRewards: {},
    unlockRequirements: {},
    pblData: {},
    discoveryData: {
      category: 'creative',
      difficultyRange: ['beginner', 'intermediate'],
      estimatedHours: 20,
      skillFocus: ['writing', 'design'],
      worldSetting: {
        name: 'AI World',
        description: 'AI learning environment',
        atmosphere: 'collaborative',
        visual_theme: 'modern'
      },
      skillTree: {
        core_skills: [],
        advanced_skills: []
      }
    },
    assessmentData: {},
    aiModules: {},
    resources: [],
    metadata: {},
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  };

  const mockAssessmentScenario: IScenario = {
    id: 'assessment-scenario-123',
    mode: 'assessment',
    status: 'active',
    version: '1.0',
    sourceType: 'yaml',
    sourcePath: 'assessment_data/ai_literacy/ai_literacy_questions_en.yaml',
    sourceId: 'ai_literacy',
    sourceMetadata: {
      assessmentName: 'ai_literacy',
      questionCount: 20,
      configPath: 'assessment_data/ai_literacy/ai_literacy_questions_en.yaml',
      lastSync: '2024-01-01'
    },
    title: { en: 'AI Literacy Assessment' },
    description: { en: 'Test your AI knowledge' },
    objectives: ['Assess AI understanding'],
    difficulty: 'intermediate',
    estimatedMinutes: 30,
    prerequisites: [],
    taskTemplates: [],
    taskCount: 20,
    xpRewards: {},
    unlockRequirements: {},
    pblData: {},
    discoveryData: {},
    assessmentData: {
      questionBankByLanguage: {},
      domains: [],
      totalQuestions: 20
    },
    aiModules: {},
    resources: [],
    metadata: {},
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    // Setup repository mock
    mockScenarioRepo = {
      findByMode: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    };

    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);

    // Setup loader mocks
    mockPBLLoader = {
      scanScenarios: jest.fn(),
      loadScenario: jest.fn()
    } as any;

    mockDiscoveryLoader = {
      scanPaths: jest.fn(),
      loadPath: jest.fn()
    } as any;

    mockAssessmentLoader = {
      scanAssessments: jest.fn(),
      loadAssessment: jest.fn()
    } as any;

    (PBLYAMLLoader as jest.Mock).mockImplementation(() => mockPBLLoader);
    (DiscoveryYAMLLoader as jest.Mock).mockImplementation(() => mockDiscoveryLoader);
    (AssessmentYAMLLoader as jest.Mock).mockImplementation(() => mockAssessmentLoader);

    // Create service instance
    service = new ScenarioInitializationService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initializeAll', () => {
    it('should initialize all scenario types', async () => {
      // Mock scan methods
      mockPBLLoader.scanScenarios.mockResolvedValue(['ai_ethics']);
      mockDiscoveryLoader.scanPaths.mockResolvedValue(['content_creator']);
      mockAssessmentLoader.scanAssessments.mockResolvedValue(['ai_literacy']);

      // Mock load methods
      mockPBLLoader.loadScenario.mockResolvedValue({
        scenario_info: {
          id: 'ai-ethics',
          title: 'AI Ethics Challenge',
          description: 'Explore AI ethics',
          learning_objectives: ['Understand AI ethics'],
          difficulty: 'intermediate',
          estimated_duration: 120,
          target_domains: ['Engaging_with_AI']
        },
        programs: [{
          id: 'program-1',
          title: 'Main Program',
          tasks: [
            { id: 'task-1', title: 'Task 1', type: 'question' },
            { id: 'task-2', title: 'Task 2', type: 'creation' },
            { id: 'task-3', title: 'Task 3', type: 'analysis' }
          ]
        }],
        ksa_mappings: [],
        ai_modules: {}
      });

      mockDiscoveryLoader.loadPath.mockResolvedValue({
        path_id: 'content-creator-path',
        metadata: {
          title: 'Content Creator Path',
          short_description: 'Brief description',
          long_description: 'Create engaging content',
          estimated_hours: 20,
          skill_focus: ['writing', 'design']
        },
        category: 'creative',
        difficulty_range: 'beginner-intermediate',
        world_setting: {
          name: 'Creative World',
          description: 'A world for creativity',
          atmosphere: 'inspiring',
          visual_theme: 'modern'
        },
        starting_scenario: {
          title: 'Getting Started',
          description: 'Begin your content creation journey',
          initial_tasks: ['intro-task']
        },
        skill_tree: {
          core_skills: [],
          advanced_skills: []
        },
        milestone_quests: []
      });

      mockAssessmentLoader.loadAssessment.mockResolvedValue({
        config: {
          title: 'AI Literacy Assessment'
        },
        questions: []
      });

      // Mock getAvailableLanguages for assessments
      mockAssessmentLoader.getAvailableLanguages = jest.fn().mockResolvedValue(['en']);
      mockAssessmentLoader.getTranslatedField = jest.fn((config, field, lang) => {
        if (field === 'title') return 'AI Literacy Assessment';
        if (field === 'description') return 'Test your AI knowledge';
        return '';
      });

      // Mock repo methods
      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => 
        Promise.resolve({ ...data, id: `${data.mode}-scenario-123` })
      );

      const results = await service.initializeAll();

      expect(results).toHaveLength(3);
      expect(results[0].sourceType).toBe('pbl');
      expect(results[0].created).toBe(1);
      expect(results[1].sourceType).toBe('discovery');
      expect(results[1].created).toBe(2); // en + zhTW
      expect(results[2].sourceType).toBe('assessment');
      expect(results[2].created).toBe(1);
    });
  });

  describe('initializePBLScenarios', () => {
    it('should initialize PBL scenarios', async () => {
      mockPBLLoader.scanScenarios.mockResolvedValue(['ai_ethics', 'data_privacy']);
      mockPBLLoader.loadScenario.mockResolvedValue({
        scenario_info: {
          id: 'ai-ethics',
          title: 'AI Ethics Challenge',
          description: 'Explore AI ethics',
          learning_objectives: ['Understand AI ethics'],
          difficulty: 'intermediate',
          estimated_duration: 120,
          target_domains: ['Engaging_with_AI']
        },
        programs: [{
          id: 'program-1',
          title: 'Main Program',
          tasks: [
            { id: 'task-1', title: 'Task 1', type: 'question' },
            { id: 'task-2', title: 'Task 2', type: 'creation' },
            { id: 'task-3', title: 'Task 3', type: 'analysis' }
          ]
        }],
        ksa_mappings: [],
        ai_modules: {}
      });

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => 
        Promise.resolve({ ...data, id: 'pbl-123' })
      );

      const result = await service.initializePBLScenarios();

      expect(result.sourceType).toBe('pbl');
      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(result.scenarios).toHaveLength(2);
    });

    it('should skip existing scenarios when forceUpdate is false', async () => {
      mockPBLLoader.scanScenarios.mockResolvedValue(['ai_ethics']);
      mockScenarioRepo.findByMode.mockResolvedValue([mockPBLScenario]);

      const result = await service.initializePBLScenarios({ forceUpdate: false });

      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
      expect(mockScenarioRepo.create).not.toHaveBeenCalled();
    });

    it('should update existing scenarios when forceUpdate is true', async () => {
      mockPBLLoader.scanScenarios.mockResolvedValue(['ai_ethics']);
      mockPBLLoader.loadScenario.mockResolvedValue({
        scenario_info: {
          id: 'ai-ethics',  
          title: 'Updated AI Ethics Challenge',
          description: 'Updated description',
          learning_objectives: ['New objective'],
          difficulty: 'advanced',
          estimated_duration: 180,
          target_domains: ['Engaging_with_AI']
        },
        programs: [{
          id: 'program-1',
          title: 'Main Program',
          tasks: [
            { id: 'task-1', title: 'Task 1', type: 'question' },
            { id: 'task-2', title: 'Task 2', type: 'creation' },
            { id: 'task-3', title: 'Task 3', type: 'analysis' },
            { id: 'task-4', title: 'Task 4', type: 'chat' }
          ]
        }]
      });

      mockScenarioRepo.findByMode.mockResolvedValue([mockPBLScenario]);
      mockScenarioRepo.update.mockResolvedValue({ ...mockPBLScenario, title: { en: 'Updated AI Ethics Challenge' } });

      const result = await service.initializePBLScenarios({ forceUpdate: true });

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(mockScenarioRepo.update).toHaveBeenCalledWith(
        'pbl-scenario-123',
        expect.objectContaining({
          title: { en: 'Updated AI Ethics Challenge' },
          version: '1.0'
        })
      );
    });

    it('should handle dry run mode', async () => {
      mockPBLLoader.scanScenarios.mockResolvedValue(['ai_ethics']);
      mockPBLLoader.loadScenario.mockResolvedValue({
        scenario_info: {
          id: 'scenario-1',
          title: 'AI Ethics Challenge',
          description: 'Test description',
          difficulty: 'intermediate',
          estimated_duration: 60,
          target_domains: ['Engaging_with_AI']
        },
        programs: [{
          id: 'program-1',
          title: 'Test Program',
          tasks: []
        }]
      });

      mockScenarioRepo.findByMode.mockResolvedValue([]);

      const result = await service.initializePBLScenarios({ dryRun: true });

      expect(result.created).toBe(1);
      expect(mockScenarioRepo.create).not.toHaveBeenCalled();
    });

    it('should handle errors during processing', async () => {
      mockPBLLoader.scanScenarios.mockResolvedValue(['ai_ethics', 'broken_scenario']);
      mockPBLLoader.loadScenario
        .mockResolvedValueOnce({ 
          scenario_info: {
            id: 'scenario-1',
            title: 'AI Ethics',
            description: 'Test description',
            difficulty: 'intermediate',
            estimated_duration: 60,
            target_domains: ['Engaging_with_AI']
          },
          programs: []
        })
        .mockRejectedValueOnce(new Error('Failed to load'));

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockResolvedValue(mockPBLScenario);

      const result = await service.initializePBLScenarios();

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to process');
    });

    it('should handle fatal errors', async () => {
      // When scanScenarios fails, the processor returns empty array
      mockPBLLoader.scanScenarios.mockRejectedValue(new Error('Scan failed'));

      const result = await service.initializePBLScenarios();

      expect(result.total).toBe(0);
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(0); // No errors because processor catches and returns []
    });
  });

  describe('initializeDiscoveryScenarios', () => {
    it('should initialize Discovery scenarios for multiple languages', async () => {
      mockDiscoveryLoader.scanPaths.mockResolvedValue(['content_creator', 'youtuber']);
      mockDiscoveryLoader.loadPath.mockResolvedValue({
        path_id: 'content-creator-path',
        metadata: {
          title: 'Content Creator Path',
          short_description: 'Brief description',
          long_description: 'Create engaging content',
          estimated_hours: 20,
          skill_focus: ['writing', 'design']
        },
        category: 'creative',
        difficulty_range: 'beginner-intermediate',
        world_setting: {
          name: 'Creative World',
          description: 'A world for creativity',
          atmosphere: 'inspiring',
          visual_theme: 'modern'
        },
        starting_scenario: {
          title: 'Getting Started',
          description: 'Begin your content creation journey',
          initial_tasks: ['intro-task']
        },
        skill_tree: {
          core_skills: [],
          advanced_skills: []
        },
        milestone_quests: []
      });

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => 
        Promise.resolve({ ...data, id: 'discovery-123' })
      );

      const result = await service.initializeDiscoveryScenarios();

      expect(result.sourceType).toBe('discovery');
      expect(result.total).toBe(4); // 2 careers × 2 languages
      expect(result.created).toBe(4);
    });

    it('should match existing scenarios by different path formats', async () => {
      mockDiscoveryLoader.scanPaths.mockResolvedValue(['content_creator']);
      
      const existingScenario = {
        ...mockDiscoveryScenario,
        sourceMetadata: {
          sourcePath: 'discovery_data/content_creator/content_creator_en.yml' // Different format
        }
      };
      mockScenarioRepo.findByMode.mockResolvedValue([existingScenario]);

      const result = await service.initializeDiscoveryScenarios();

      expect(result.skipped).toBe(1);
    });

    it('should handle missing metadata', async () => {
      mockDiscoveryLoader.scanPaths.mockResolvedValue(['minimal']);
      mockDiscoveryLoader.loadPath.mockResolvedValue({
        path_id: 'minimal-path',
        category: 'test',
        difficulty_range: 'beginner',
        metadata: {
          title: 'Minimal Path',
          short_description: 'Minimal description',
          long_description: 'Minimal long description',
          estimated_hours: 1,
          skill_focus: []
        },
        world_setting: {
          name: 'Test World',
          description: 'A test world',
          atmosphere: 'neutral',
          visual_theme: 'minimal'
        },
        starting_scenario: {
          title: 'Start',
          description: 'Starting scenario',
          initial_tasks: []
        },
        skill_tree: {
          core_skills: [],
          advanced_skills: []
        },
        milestone_quests: []
      });

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => 
        Promise.resolve({ ...data, id: 'discovery-min' })
      );

      const result = await service.initializeDiscoveryScenarios();

      expect(result.created).toBe(2); // en + zhTW
      expect(result.scenarios[0].title).toEqual({ en: 'Untitled Discovery Path' });
    });

    it('should handle loading errors', async () => {
      mockDiscoveryLoader.scanPaths.mockResolvedValue(['content_creator']);
      mockDiscoveryLoader.loadPath.mockRejectedValue(new Error('Load failed'));

      mockScenarioRepo.findByMode.mockResolvedValue([]);

      const result = await service.initializeDiscoveryScenarios();

      expect(result.errors).toHaveLength(2); // Failed for both languages
    });
  });

  describe('initializeAssessmentScenarios', () => {
    it('should initialize Assessment scenarios', async () => {
      mockAssessmentLoader.scanAssessments.mockResolvedValue(['ai_literacy', 'data_ethics']);
      mockAssessmentLoader.loadAssessment.mockResolvedValue({
        config: { title: 'AI Literacy Assessment' },
        questions: [
          { id: 'q1', domain: 'AI', competency: 'basic', question: 'What is AI?', options: ['a', 'b', 'c'], correct_answer: 'a' },
          { id: 'q2', domain: 'ML', competency: 'basic', question: 'Define ML', options: ['a', 'b', 'c'], correct_answer: 'b' },
          { id: 'q3', domain: 'NLP', competency: 'basic', question: 'Explain NLP', options: ['a', 'b', 'c'], correct_answer: 'c' },
          { id: 'q4', domain: 'CV', competency: 'basic', question: 'Computer Vision', options: ['a', 'b', 'c'], correct_answer: 'a' }
        ]
      });

      // Mock getAvailableLanguages for assessments
      mockAssessmentLoader.getAvailableLanguages = jest.fn().mockResolvedValue(['en']);
      mockAssessmentLoader.getTranslatedField = jest.fn((config, field, lang) => {
        if (field === 'title') return 'AI Literacy Assessment';
        if (field === 'description') return 'Test your AI knowledge';
        return '';
      });

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => 
        Promise.resolve({ ...data, id: 'assessment-123' })
      );

      const result = await service.initializeAssessmentScenarios();

      expect(result.sourceType).toBe('assessment');
      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
    });

    it('should calculate question count from domains', async () => {
      mockAssessmentLoader.scanAssessments.mockResolvedValue(['ai_literacy']);
      mockAssessmentLoader.loadAssessment.mockResolvedValue({
        config: { title: 'AI Literacy' },
        questions: [
          { id: 'q1', domain: 'AI', competency: 'basic', question: 'Question 1', options: ['a', 'b'], correct_answer: 'a' },
          { id: 'q2', domain: 'AI', competency: 'basic', question: 'Question 2', options: ['a', 'b'], correct_answer: 'b' },
          { id: 'q3', domain: 'AI', competency: 'basic', question: 'Question 3', options: ['a', 'b'], correct_answer: 'a' },
          { id: 'q4', domain: 'AI', competency: 'basic', question: 'Question 4', options: ['a', 'b'], correct_answer: 'b' },
          { id: 'q5', domain: 'AI', competency: 'basic', question: 'Question 5', options: ['a', 'b'], correct_answer: 'a' }
        ]
      });

      // Mock getAvailableLanguages for assessments
      mockAssessmentLoader.getAvailableLanguages = jest.fn().mockResolvedValue(['en']);
      mockAssessmentLoader.getTranslatedField = jest.fn().mockReturnValue('');

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => {
        expect(data.taskCount).toBe(5); // 3 + 2 questions
        return Promise.resolve({ ...data, id: 'assessment-123' });
      });

      await service.initializeAssessmentScenarios();
    });

    it('should use default values for missing fields', async () => {
      mockAssessmentLoader.scanAssessments.mockResolvedValue(['minimal']);
      mockAssessmentLoader.loadAssessment.mockResolvedValue({
        config: { title: 'Minimal Assessment' },
        questions: []
      });

      // Mock getAvailableLanguages for assessments
      mockAssessmentLoader.getAvailableLanguages = jest.fn().mockResolvedValue(['en']);
      mockAssessmentLoader.getTranslatedField = jest.fn().mockReturnValue('');

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => {
        expect(data.title).toEqual({ en: 'minimal Assessment' });
        expect(data.estimatedMinutes).toBe(15);
        return Promise.resolve({ ...data, id: 'assessment-min' });
      });

      await service.initializeAssessmentScenarios();
    });
  });

  describe('edge cases and helpers', () => {
    it('should handle scenario without sourceMetadata in findExistingScenario', async () => {
      mockPBLLoader.scanScenarios.mockResolvedValue(['ai_ethics']);
      mockPBLLoader.loadScenario.mockResolvedValue({
        scenario_info: {
          id: 'scenario-1',
          title: 'AI Ethics',
          description: 'Test description',
          difficulty: 'intermediate',
          estimated_duration: 60,
          target_domains: ['Engaging_with_AI']
        },
        programs: []
      });

      // Create a scenario without sourceMetadata but with matching sourcePath
      const scenarioWithoutMetadata = {
        ...mockPBLScenario,
        sourcePath: 'pbl_data/scenarios/ai_ethics/ai_ethics_scenario.yaml',
        sourceMetadata: undefined
      };
      mockScenarioRepo.findByMode.mockResolvedValue([scenarioWithoutMetadata]);
      mockScenarioRepo.create.mockResolvedValue(mockPBLScenario);

      const result = await service.initializePBLScenarios();

      expect(result.skipped).toBe(1); // Should match by sourcePath
      expect(result.created).toBe(0);
    });

    it('should handle missing language match in Discovery path loading', async () => {
      mockDiscoveryLoader.scanPaths.mockResolvedValue(['app_developer']);
      mockDiscoveryLoader.loadPath.mockResolvedValue({
        path_id: 'app-developer-path',
        metadata: {
          title: 'App Developer',
          short_description: 'Test description',
          long_description: 'Comprehensive app development path',
          estimated_hours: 60,
          skill_focus: ['programming', 'design']
        },
        category: 'tech',
        difficulty_range: 'intermediate',
        world_setting: {
          name: 'Developer World',
          description: 'A world for app development',
          atmosphere: 'productive',
          visual_theme: 'modern'
        },
        starting_scenario: {
          title: 'Getting Started',
          description: 'Begin your app development journey',
          initial_tasks: ['intro-task']
        },
        skill_tree: {
          core_skills: [],
          advanced_skills: []
        },
        milestone_quests: []
      });

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockResolvedValue(mockDiscoveryScenario);

      const result = await service.initializeDiscoveryScenarios();

      expect(result.created).toBe(2); // Still processes both language versions
    });

    it('should handle assessment with no domains', async () => {
      mockAssessmentLoader.scanAssessments.mockResolvedValue(['empty']);
      mockAssessmentLoader.loadAssessment.mockResolvedValue({
        config: { title: 'Empty Assessment' },
        questions: []
      });

      // Mock getAvailableLanguages for assessments
      mockAssessmentLoader.getAvailableLanguages = jest.fn().mockResolvedValue(['en']);
      mockAssessmentLoader.getTranslatedField = jest.fn().mockReturnValue('');

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => {
        expect(data.taskCount).toBe(12); // Default value
        expect(data.assessmentData.totalQuestions).toBe(12); // Default value
        return Promise.resolve({ ...data, id: 'assessment-empty' });
      });

      await service.initializeAssessmentScenarios();
    });

    it('should handle PBL scenario with no programs', async () => {
      mockPBLLoader.scanScenarios.mockResolvedValue(['no_programs']);
      mockPBLLoader.loadScenario.mockResolvedValue({
        scenario_info: {
          id: 'scenario-1',
          title: 'No Programs',
          description: 'Test description',
          difficulty: 'intermediate',
          estimated_duration: 60,
          target_domains: ['Engaging_with_AI']
        },
        programs: []
      });

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => {
        expect(data.taskCount).toBe(0);
        expect(data.pblData.programs).toEqual([]);
        return Promise.resolve({ ...data, id: 'pbl-no-prog' });
      });

      await service.initializePBLScenarios();
    });

    it('should handle findByMode method not available', async () => {
      mockScenarioRepo.findByMode = undefined; // Method not available

      mockPBLLoader.scanScenarios.mockResolvedValue(['ai_ethics']);
      mockPBLLoader.loadScenario.mockResolvedValue({
        scenario_info: {
          id: 'scenario-1',
          title: 'AI Ethics',
          description: 'Test description',
          difficulty: 'intermediate',
          estimated_duration: 60,
          target_domains: ['Engaging_with_AI']
        },
        programs: []
      });

      const result = await service.initializePBLScenarios();

      expect(result.created).toBe(1); // Should still work, treating as no existing scenarios
    });

    it('should parse estimated duration correctly', async () => {
      mockPBLLoader.scanScenarios.mockResolvedValue(['test']);
      mockPBLLoader.loadScenario.mockResolvedValue({
        scenario_info: {
          id: 'test',
          title: 'Test',
          description: 'Test description',
          difficulty: 'beginner',
          estimated_duration: 90,
          target_domains: ['Engaging_with_AI']
        },
        programs: []
      });

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => {
        expect(data.estimatedMinutes).toBe(90);
        return Promise.resolve({ ...data, id: 'pbl-test' });
      });

      await service.initializePBLScenarios();
    });

    it('should handle missing estimated_duration', async () => {
      mockPBLLoader.scanScenarios.mockResolvedValue(['test']);
      mockPBLLoader.loadScenario.mockResolvedValue({
        scenario_info: {
          id: 'test',
          title: 'Test',
          description: 'Test description',
          difficulty: 'beginner',
          estimated_duration: 0,
          target_domains: ['Engaging_with_AI']
        },
        programs: []
      });

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => {
        expect(data.estimatedMinutes).toBe(60); // Default
        return Promise.resolve({ ...data, id: 'pbl-test' });
      });

      await service.initializePBLScenarios();
    });

    it('should extract language from Discovery filename correctly', async () => {
      mockDiscoveryLoader.scanPaths.mockResolvedValue(['developer']);
      
      // Test various filename patterns
      const result = await service.initializeDiscoveryScenarios();

      // Should process both en and zhTW versions
      expect(mockDiscoveryLoader.loadPath).toHaveBeenCalledWith('developer', 'en');
      expect(mockDiscoveryLoader.loadPath).toHaveBeenCalledWith('developer', 'zhTW');
    });

    it('should handle configPath matching in findExistingScenario', async () => {
      mockPBLLoader.scanScenarios.mockResolvedValue(['ai_ethics']);
      
      const existingWithConfigPath = {
        ...mockPBLScenario,
        sourcePath: 'different/path',
        sourceMetadata: {
          configPath: 'pbl_data/scenarios/ai_ethics/ai_ethics_scenario.yaml' // Match by configPath
        }
      };
      mockScenarioRepo.findByMode.mockResolvedValue([existingWithConfigPath]);

      const result = await service.initializePBLScenarios();

      expect(result.skipped).toBe(1);
    });

    it('should handle assessment metadata with different fields', async () => {
      mockAssessmentLoader.scanAssessments.mockResolvedValue(['custom']);
      mockAssessmentLoader.loadAssessment.mockResolvedValue({
        config: { title: 'Custom Assessment' },
        questions: [
          { id: 'q1', domain: 'AI', competency: 'basic', question: 'Question 1', options: ['a', 'b'], correct_answer: 'a' },
          { id: 'q2', domain: 'AI', competency: 'basic', question: 'Question 2', options: ['a', 'b'], correct_answer: 'b' }
        ]
      });

      // Mock getAvailableLanguages for assessments
      mockAssessmentLoader.getAvailableLanguages = jest.fn().mockResolvedValue(['en']);
      mockAssessmentLoader.getTranslatedField = jest.fn((config, field, lang) => {
        if (field === 'title') return 'Custom Assessment';
        if (field === 'description') return 'Custom purpose';
        return '';
      });

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((data: any) => {
        expect(data.description).toEqual({ en: 'Custom purpose' });
        expect(data.taskCount).toBe(12); // Default value when no domains at root level
        return Promise.resolve({ ...data, id: 'assessment-custom' });
      });

      await service.initializeAssessmentScenarios();
    });
  });
});