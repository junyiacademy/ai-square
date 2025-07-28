/**
 * Discovery Repository Unit Tests
 * 測試 PostgreSQL Discovery Repository 實作
 */

import { Pool } from 'pg';
import { PostgreSQLDiscoveryRepository } from '../discovery-repository';
import { 
  IDiscoveryScenario, 
  IDiscoveryProgram,
  ICareerRecommendation,
  IPortfolioItem 
} from '@/types/discovery-types';
import { v4 as uuidv4 } from 'uuid';

// Mock pg module
jest.mock('pg');

describe('PostgreSQLDiscoveryRepository', () => {
  let repository: PostgreSQLDiscoveryRepository;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;

  beforeEach(() => {
    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Setup mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn(),
    } as any;

    // Create repository instance
    repository = new PostgreSQLDiscoveryRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findCareerPaths', () => {
    it('should return all discovery scenarios', async () => {
      // Arrange
      const mockScenarios = [
        {
          id: uuidv4(),
          mode: 'discovery',
          status: 'active',
          title: { en: 'Software Developer', zh: '軟體開發者' },
          description: { en: 'Build amazing software', zh: '建立優秀的軟體' },
          discovery_data: {
            careerPath: 'software-developer',
            requiredSkills: ['JavaScript', 'Python'],
            careerLevel: 'intermediate'
          }
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockScenarios });

      // Act
      const result = await repository.findCareerPaths();

      // Assert
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM scenarios'),
        expect.arrayContaining(['discovery', 'active'])
      );
      expect(result).toHaveLength(1);
      expect(result[0].discoveryData.careerPath).toBe('software-developer');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act & Assert
      await expect(repository.findCareerPaths()).rejects.toThrow('Database connection failed');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findCareerPathById', () => {
    it('should return a specific career path', async () => {
      // Arrange
      const careerId = uuidv4();
      const mockScenario = {
        id: careerId,
        mode: 'discovery',
        status: 'active',
        title: { en: 'Data Scientist' },
        discovery_data: {
          careerPath: 'data-scientist',
          requiredSkills: ['Python', 'Statistics', 'Machine Learning'],
          careerLevel: 'senior'
        }
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockScenario] });

      // Act
      const result = await repository.findCareerPathById(careerId);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [careerId]
      );
      expect(result?.id).toBe(careerId);
      expect(result?.discoveryData.careerPath).toBe('data-scientist');
    });

    it('should return null when career path not found', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await repository.findCareerPathById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getCareerRecommendations', () => {
    it('should return personalized career recommendations', async () => {
      // Arrange
      const userId = uuidv4();
      
      // Mock user skills from evaluations
      const mockUserSkills = {
        rows: [
          { skill: 'JavaScript', score: 85 },
          { skill: 'Python', score: 70 },
          { skill: 'Communication', score: 90 }
        ]
      };

      // Mock career scenarios
      const mockCareers = {
        rows: [
          {
            id: uuidv4(),
            title: { en: 'Full Stack Developer' },
            discovery_data: {
              careerPath: 'fullstack-developer',
              requiredSkills: ['JavaScript', 'Python', 'Database'],
              careerLevel: 'intermediate'
            }
          }
        ]
      };

      mockClient.query
        .mockResolvedValueOnce(mockUserSkills)
        .mockResolvedValueOnce(mockCareers);

      // Act
      const result = await repository.getCareerRecommendations(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].matchScore).toBeGreaterThan(0);
      expect(result[0].requiredSkills).toBeDefined();
    });
  });

  describe('getUserDiscoveryProgress', () => {
    it('should return user discovery progress summary', async () => {
      // Arrange
      const userId = uuidv4();

      // Mock explored careers
      mockClient.query.mockResolvedValueOnce({
        rows: [{ scenario_id: 'career-1' }, { scenario_id: 'career-2' }]
      });

      // Mock milestones
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'milestone-1',
          name: 'First Career Explored',
          achieved_at: new Date().toISOString()
        }]
      });

      // Mock portfolio items
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'portfolio-1',
          title: 'My First Project',
          created_at: new Date().toISOString()
        }]
      });

      // Act
      const result = await repository.getUserDiscoveryProgress(userId);

      // Assert
      expect(result.exploredCareers).toHaveLength(2);
      expect(result.completedMilestones).toHaveLength(1);
      expect(result.portfolioItems).toHaveLength(1);
      expect(result.overallProgress).toBeGreaterThanOrEqual(0);
      expect(result.overallProgress).toBeLessThanOrEqual(100);
    });
  });

  describe('Portfolio Management', () => {
    describe('addPortfolioItem', () => {
      it('should create a new portfolio item', async () => {
        // Arrange
        const userId = uuidv4();
        const newItem = {
          title: 'Weather App',
          description: 'A React weather application',
          taskId: uuidv4(),
          artifacts: [{
            type: 'code' as const,
            url: 'https://github.com/user/weather-app'
          }],
          skills: ['React', 'API Integration']
        };

        const mockCreatedItem = {
          id: uuidv4(),
          ...newItem,
          created_at: new Date().toISOString()
        };

        mockClient.query.mockResolvedValueOnce({ rows: [mockCreatedItem] });

        // Act
        const result = await repository.addPortfolioItem(userId, newItem);

        // Assert
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO portfolio_items'),
          expect.arrayContaining([userId, newItem.title])
        );
        expect(result.id).toBeDefined();
        expect(result.title).toBe(newItem.title);
      });
    });

    describe('updatePortfolioItem', () => {
      it('should update an existing portfolio item', async () => {
        // Arrange
        const userId = uuidv4();
        const itemId = uuidv4();
        const updates = {
          title: 'Updated Weather App',
          description: 'An improved React weather application'
        };

        const mockUpdatedItem = {
          id: itemId,
          title: updates.title,
          description: updates.description,
          updated_at: new Date().toISOString()
        };

        mockClient.query.mockResolvedValueOnce({ rows: [mockUpdatedItem] });

        // Act
        const result = await repository.updatePortfolioItem(userId, itemId, updates);

        // Assert
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE portfolio_items'),
          expect.arrayContaining([itemId, userId])
        );
        expect(result.title).toBe(updates.title);
      });
    });

    describe('deletePortfolioItem', () => {
      it('should delete a portfolio item', async () => {
        // Arrange
        const userId = uuidv4();
        const itemId = uuidv4();

        mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

        // Act
        await repository.deletePortfolioItem(userId, itemId);

        // Assert
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM portfolio_items'),
          [itemId, userId]
        );
      });

      it('should throw error when item not found', async () => {
        // Arrange
        mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

        // Act & Assert
        await expect(
          repository.deletePortfolioItem('user-id', 'non-existent-id')
        ).rejects.toThrow('Portfolio item not found');
      });
    });
  });

  describe('Career Matching Algorithm', () => {
    it('should calculate accurate match scores', async () => {
      // This is a more complex test for the matching algorithm
      // Arrange
      const userId = uuidv4();
      
      // User has strong technical skills but weak soft skills
      const mockUserProfile = {
        skills: [
          { skill: 'Python', score: 90 },
          { skill: 'Data Analysis', score: 85 },
          { skill: 'Machine Learning', score: 80 },
          { skill: 'Communication', score: 60 },
          { skill: 'Leadership', score: 55 }
        ],
        interests: ['AI', 'Technology', 'Innovation'],
        experience_level: 'intermediate'
      };

      // Career requires balanced technical and soft skills
      const mockCareer = {
        id: uuidv4(),
        title: { en: 'AI Product Manager' },
        discovery_data: {
          careerPath: 'ai-product-manager',
          requiredSkills: [
            'Python', // User: 90
            'Machine Learning', // User: 80
            'Communication', // User: 60
            'Leadership', // User: 55
            'Business Strategy' // User: 0 (missing)
          ],
          careerLevel: 'senior'
        }
      };

      // Expected match score calculation:
      // (90 + 80 + 60 + 55 + 0) / 5 = 57%
      // With level mismatch penalty: ~50%

      mockClient.query
        .mockResolvedValueOnce({ rows: mockUserProfile.skills })
        .mockResolvedValueOnce({ rows: [mockCareer] });

      // Act
      const recommendations = await repository.getCareerRecommendations(userId);

      // Assert
      const aiPmRecommendation = recommendations.find(
        r => r.careerPath === 'ai-product-manager'
      );
      
      expect(aiPmRecommendation).toBeDefined();
      expect(aiPmRecommendation!.matchScore).toBeGreaterThan(45);
      expect(aiPmRecommendation!.matchScore).toBeLessThanOrEqual(75);
      expect(aiPmRecommendation!.reasons).toContain(
        expect.stringMatching(/strong.*Python/i)
      );
      expect(aiPmRecommendation!.requiredSkills).toContainEqual(
        expect.objectContaining({
          skill: 'Business Strategy',
          userLevel: 0,
          requiredLevel: expect.any(Number)
        })
      );
    });
  });
});