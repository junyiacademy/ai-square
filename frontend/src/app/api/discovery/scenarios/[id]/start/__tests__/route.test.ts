/**
 * Tests for Discovery start route with service layer integration
 * Following TDD approach
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { learningServiceFactory } from '@/lib/services/learning-service-factory';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

// Mock the dependencies
jest.mock('@/lib/services/learning-service-factory');
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');

describe('POST /api/discovery/scenarios/[id]/start', () => {
  const mockScenarioId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = 'user-123';
  const mockProgramId = 'prog-123';
  const mockTaskId = 'task-123';
  
  const mockScenario = {
    id: mockScenarioId,
    mode: 'discovery',
    title: { en: 'Software Engineer Career Path' },
    description: { en: 'Explore the world of software engineering' },
    taskTemplates: [],
    discoveryData: {
      career: {
        id: 'software-engineer',
        title: { en: 'Software Engineer' }
      },
      worldSetting: {
        name: { en: 'Tech Company' },
        challenges: []
      }
    }
  };

  const mockProgram = {
    id: mockProgramId,
    scenarioId: mockScenarioId,
    userId: mockUserId,
    mode: 'discovery',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 1,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    discoveryData: {
      totalXP: 0,
      level: 1,
      achievements: [],
      unlockedSkills: [],
      completedChallenges: []
    }
  };

  const mockTask = {
    id: mockTaskId,
    programId: mockProgramId,
    mode: 'discovery',
    taskIndex: 0,
    title: { en: 'Welcome to Your Career Journey' },
    description: { en: 'Start exploring your chosen career path' },
    type: 'chat',
    status: 'active',
    discoveryData: {
      xpReward: 50
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Using new service layer', () => {
    it('should use DiscoveryLearningService to start learning', async () => {
      // Arrange
      const mockDiscoveryService = {
        startLearning: jest.fn().mockResolvedValue(mockProgram)
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({ id: mockUserId, email: 'test@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(mockScenario)
      };
      
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue([mockTask])
      };

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com', name: 'Test User' }
      });
      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockDiscoveryService);
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);

      const request = new NextRequest('http://localhost/api/discovery/scenarios/123/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: 'en' })
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: mockScenarioId }) });
      const data = await response.json();

      // Assert
      expect(learningServiceFactory.getService).toHaveBeenCalledWith('discovery');
      expect(mockDiscoveryService.startLearning).toHaveBeenCalledWith(
        mockUserId,
        mockScenarioId,
        { language: 'en' }
      );
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.id).toBe(mockProgramId);
      expect(data.currentTaskId).toBe(mockTaskId);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockDiscoveryService = {
        startLearning: jest.fn().mockRejectedValue(new Error('Service error'))
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({ id: mockUserId, email: 'test@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(mockScenario)
      };

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });
      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockDiscoveryService);
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);

      const request = new NextRequest('http://localhost/api/discovery/scenarios/123/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: 'en' })
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: mockScenarioId }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Service error');
    });

    it('should validate scenario UUID format', async () => {
      // Arrange
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });

      const request = new NextRequest('http://localhost/api/discovery/scenarios/invalid-id/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: 'en' })
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'invalid-id' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid scenario ID format');
    });

    it('should require user authentication', async () => {
      // Arrange
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/discovery/scenarios/123/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language: 'en' })
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: mockScenarioId }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('User authentication required');
    });

    it('should create user if not exists', async () => {
      // Arrange
      const mockDiscoveryService = {
        startLearning: jest.fn().mockResolvedValue(mockProgram)
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: mockUserId, email: 'new@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(mockScenario)
      };
      
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue([mockTask])
      };

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'new@example.com', name: 'New User' }
      });
      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockDiscoveryService);
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);

      const request = new NextRequest('http://localhost/api/discovery/scenarios/123/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: 'en' })
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: mockScenarioId }) });
      const data = await response.json();

      // Assert
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'new',
        preferredLanguage: 'en'
      });
      expect(data.success).toBe(true);
    });

    it('should verify scenario is discovery type', async () => {
      // Arrange
      const nonDiscoveryScenario = {
        ...mockScenario,
        mode: 'pbl' // Not a discovery scenario
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(nonDiscoveryScenario)
      };

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);

      const request = new NextRequest('http://localhost/api/discovery/scenarios/123/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: 'en' })
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: mockScenarioId }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not a Discovery scenario');
    });
  });
});