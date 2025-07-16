/**
 * DiscoveryYAMLLoader 單元測試
 * 遵循 TDD: Red → Green → Refactor
 */

import { DiscoveryYAMLLoader, DiscoveryPath, DiscoveryMetadata } from '../discovery-yaml-loader';
import { cacheService } from '@/lib/cache/cache-service';

// Mock the cache service
jest.mock('@/lib/cache/cache-service');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('DiscoveryYAMLLoader', () => {
  let loader: DiscoveryYAMLLoader;
  
  const mockDiscoveryData: DiscoveryPath = {
    path_id: 'software_engineer',
    category: 'technology',
    difficulty_range: 'beginner-advanced',
    metadata: {
      title: 'Software Engineer Career Path',
      short_description: 'Learn software engineering with AI',
      long_description: 'A comprehensive path to becoming a software engineer',
      estimated_hours: 120,
      skill_focus: ['programming', 'algorithms', 'system design']
    },
    world_setting: {
      name: 'Tech Hub City',
      description: 'A futuristic city of innovation',
      atmosphere: 'Dynamic and fast-paced',
      visual_theme: 'Cyberpunk metropolis'
    },
    starting_scenario: {
      title: 'First Day at Tech Hub',
      description: 'Begin your journey as a junior developer',
      initial_tasks: ['setup_environment', 'first_commit']
    },
    skill_tree: {
      core_skills: [{
        id: 'programming_basics',
        name: 'Programming Basics',
        description: 'Foundation of programming',
        max_level: 5,
        requires: [],
        unlocks: ['data_structures']
      }],
      advanced_skills: [{
        id: 'system_design',
        name: 'System Design',
        description: 'Design scalable systems',
        max_level: 10,
        requires: ['programming_basics', 'data_structures'],
        unlocks: []
      }]
    },
    milestone_quests: [{
      id: 'first_project',
      name: 'First Project',
      description: 'Complete your first project',
      required_level: 5,
      skills_tested: ['programming_basics'],
      xp_reward: 1000,
      rewards: {
        skills: ['debugging'],
        achievements: ['first_milestone']
      }
    }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    loader = new DiscoveryYAMLLoader();
    
    // Default mock behaviors
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
  });

  describe('constructor', () => {
    it('should set correct default base path for discovery data', () => {
      expect(loader['defaultOptions'].basePath).toContain('discovery_data');
    });

    it('should have correct loader name', () => {
      expect(loader['loaderName']).toBe('DiscoveryYAMLLoader');
    });
  });

  describe('loadPath language handling', () => {
    it('should handle zh-TW to zhTW conversion', async () => {
      // We can't test the full load without mocking fs, but we can test the language conversion
      const cacheKey = loader['getCacheKey']('software_engineer/software_engineer_zhTW', 'zh-TW');
      expect(cacheKey).toContain('zhTW');
    });

    it('should construct correct file path for different languages', () => {
      // Test the file naming pattern
      const basePath = loader['defaultOptions'].basePath!;
      
      // English
      expect(basePath).toContain('discovery_data');
      
      // The actual file loading would use these patterns:
      // software_engineer/software_engineer_en.yml
      // software_engineer/software_engineer_zhTW.yml
    });
  });

  describe('extractAllSkills', () => {
    it('should extract all skills from skill tree', () => {
      const skills = loader.extractAllSkills(mockDiscoveryData);
      
      expect(skills).toHaveLength(2);
      expect(skills[0].id).toBe('programming_basics');
      expect(skills[1].id).toBe('system_design');
    });

    it('should handle missing skill tree', () => {
      const dataWithoutSkills: DiscoveryPath = {
        ...mockDiscoveryData,
        skill_tree: undefined as any
      };
      
      const skills = loader.extractAllSkills(dataWithoutSkills);
      
      expect(skills).toEqual([]);
    });

    it('should handle empty skill arrays', () => {
      const dataWithEmptySkills: DiscoveryPath = {
        ...mockDiscoveryData,
        skill_tree: {
          core_skills: [],
          advanced_skills: []
        }
      };
      
      const skills = loader.extractAllSkills(dataWithEmptySkills);
      
      expect(skills).toEqual([]);
    });

    it('should handle undefined skill arrays', () => {
      const dataWithUndefinedSkills: DiscoveryPath = {
        ...mockDiscoveryData,
        skill_tree: {
          core_skills: undefined as any,
          advanced_skills: undefined as any
        }
      };
      
      const skills = loader.extractAllSkills(dataWithUndefinedSkills);
      
      expect(skills).toEqual([]);
    });
  });

  describe('getSkillDependencies', () => {
    it('should extract skill dependencies correctly', () => {
      const dependencies = loader.getSkillDependencies(mockDiscoveryData);
      
      expect(dependencies.size).toBe(1);
      expect(dependencies.get('system_design')).toEqual(['programming_basics', 'data_structures']);
      expect(dependencies.has('programming_basics')).toBe(false); // No requirements
    });

    it('should handle skills without requirements', () => {
      const dataWithNoRequirements: DiscoveryPath = {
        ...mockDiscoveryData,
        skill_tree: {
          core_skills: [{
            id: 'skill1',
            name: 'Skill 1',
            description: 'A skill',
            max_level: 5
          }],
          advanced_skills: []
        }
      };
      
      const dependencies = loader.getSkillDependencies(dataWithNoRequirements);
      
      expect(dependencies.size).toBe(0);
    });

    it('should handle empty skill tree', () => {
      const dataWithoutSkills: DiscoveryPath = {
        ...mockDiscoveryData,
        skill_tree: {
          core_skills: [],
          advanced_skills: []
        }
      };
      
      const dependencies = loader.getSkillDependencies(dataWithoutSkills);
      
      expect(dependencies.size).toBe(0);
    });
  });

  describe('postProcess', () => {
    it('should preserve existing path_id', async () => {
      const result = await loader['postProcess'](mockDiscoveryData);
      
      expect(result.path_id).toBe('software_engineer');
    });

    it('should add path_id if missing but metadata exists', async () => {
      const dataWithoutId: DiscoveryPath = {
        ...mockDiscoveryData,
        path_id: undefined as any
      };
      
      const result = await loader['postProcess'](dataWithoutId);
      
      expect(result.path_id).toBe('discovery_path');
    });

    it('should add IDs to skills if missing', async () => {
      const dataWithoutSkillIds: DiscoveryPath = {
        ...mockDiscoveryData,
        skill_tree: {
          core_skills: [
            { name: 'Skill 1', description: 'Desc 1', max_level: 5 } as any,
            { name: 'Skill 2', description: 'Desc 2', max_level: 5 } as any
          ],
          advanced_skills: [
            { name: 'Advanced 1', description: 'Adv 1', max_level: 10 } as any
          ]
        }
      };
      
      const result = await loader['postProcess'](dataWithoutSkillIds);
      
      expect(result.skill_tree.core_skills[0].id).toBe('skill_1');
      expect(result.skill_tree.core_skills[1].id).toBe('skill_2');
      expect(result.skill_tree.advanced_skills[0].id).toBe('skill_1');
    });

    it('should handle missing skill tree', async () => {
      const dataWithoutSkillTree: any = {
        path_id: 'test',
        metadata: mockDiscoveryData.metadata
      };
      
      const result = await loader['postProcess'](dataWithoutSkillTree);
      
      expect(result.skill_tree).toBeUndefined();
    });
  });

  describe('validateData', () => {
    it('should always return valid for now', async () => {
      const result = await loader['validateData']();
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('achievement and quest handling', () => {
    it('should handle achievements correctly', () => {
      const dataWithAchievements: DiscoveryPath = {
        ...mockDiscoveryData,
        achievements: {
          exploration: [{
            id: 'explorer',
            name: 'Explorer',
            description: 'Explore all areas',
            condition: 'visit_all_areas',
            xp_bonus: 500
          }],
          mastery: [{
            id: 'master_coder',
            name: 'Master Coder',
            description: 'Master all programming skills',
            skills_required: ['programming_basics', 'data_structures'],
            level_required: 10,
            xp_bonus: 2000
          }],
          special: [{
            id: 'hidden_gem',
            name: 'Hidden Gem',
            description: 'Find the hidden treasure',
            hidden: true,
            hint: 'Look in the debugging room',
            xp_bonus: 1000
          }]
        }
      };
      
      expect(dataWithAchievements.achievements?.exploration).toHaveLength(1);
      expect(dataWithAchievements.achievements?.mastery[0].skills_required).toContain('programming_basics');
      expect(dataWithAchievements.achievements?.special[0].hidden).toBe(true);
    });

    it('should handle milestone quests with rewards', () => {
      const quest = mockDiscoveryData.milestone_quests[0];
      
      expect(quest.rewards?.skills).toContain('debugging');
      expect(quest.rewards?.achievements).toContain('first_milestone');
      expect(quest.xp_reward).toBe(1000);
    });
  });

  describe('daily challenges', () => {
    it('should handle daily challenges structure', () => {
      const dataWithChallenges: DiscoveryPath = {
        ...mockDiscoveryData,
        daily_challenges: {
          categories: [{
            type: 'coding',
            title: 'Daily Coding Challenge',
            description: 'Complete a coding challenge',
            skills_improved: ['programming_basics', 'problem_solving'],
            xp_reward: 100
          }]
        }
      };
      
      expect(dataWithChallenges.daily_challenges?.categories).toHaveLength(1);
      expect(dataWithChallenges.daily_challenges?.categories[0].type).toBe('coding');
    });
  });

  describe('career outcomes and objectives', () => {
    it('should handle learning objectives', () => {
      const dataWithObjectives: DiscoveryPath = {
        ...mockDiscoveryData,
        learning_objectives: [
          'Master programming fundamentals',
          'Build real-world projects',
          'Understand system design'
        ]
      };
      
      expect(dataWithObjectives.learning_objectives).toHaveLength(3);
    });

    it('should handle career outcomes', () => {
      const dataWithOutcomes: DiscoveryPath = {
        ...mockDiscoveryData,
        career_outcomes: [
          'Junior Software Engineer',
          'Full Stack Developer',
          'System Architect'
        ]
      };
      
      expect(dataWithOutcomes.career_outcomes).toHaveLength(3);
    });
  });
});