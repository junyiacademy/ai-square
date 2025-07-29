/**
 * Tests for PBL start route with service layer integration
 * Following TDD approach - write tests first
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { learningServiceFactory } from '@/lib/services/learning-service-factory';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock the dependencies
jest.mock('@/lib/services/learning-service-factory');
jest.mock('@/lib/repositories/base/repository-factory');

describe('POST /api/pbl/scenarios/[id]/start', () => {
  const mockScenarioId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = 'user-123';
  const mockProgramId = 'prog-123';
  
  // Helper function to create request with cookie
  const createRequestWithUser = (email: string, body: Record<string, unknown> = { language: 'en' }) => {
    const request = new NextRequest('http://localhost/api/pbl/scenarios/123/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    // Mock the cookie getter
    Object.defineProperty(request, 'cookies', {
      value: {
        get: jest.fn().mockReturnValue({ value: JSON.stringify({ email }) })
      }
    });
    
    return request;
  };
  
  const mockScenario = {
    id: mockScenarioId,
    mode: 'pbl',
    title: { en: 'Test PBL Scenario' },
    description: { en: 'Test description' },
    taskTemplates: [
      {
        id: 'task-1',
        title: { en: 'Task 1' },
        type: 'chat',
        description: { en: 'First task' }
      }
    ],
    pblData: {
      ksaMappings: []
    }
  };

  const mockProgram = {
    id: mockProgramId,
    scenarioId: mockScenarioId,
    userId: mockUserId,
    mode: 'pbl',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 1,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Using new service layer', () => {
    it('should use PBLLearningService to start learning', async () => {
      // Arrange
      const mockPBLService = {
        startLearning: jest.fn().mockResolvedValue(mockProgram)
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({ id: mockUserId, email: 'test@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(mockScenario)
      };

      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockPBLService);
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);

      const request = createRequestWithUser('test@example.com');

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: mockScenarioId }) });
      const data = await response.json();

      // Assert
      expect(learningServiceFactory.getService).toHaveBeenCalledWith('pbl');
      expect(mockPBLService.startLearning).toHaveBeenCalledWith(
        mockUserId,
        mockScenarioId,
        { language: 'en' }
      );
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.program).toEqual(mockProgram);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockPBLService = {
        startLearning: jest.fn().mockRejectedValue(new Error('Service error'))
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue({ id: mockUserId, email: 'test@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(mockScenario)
      };

      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockPBLService);
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);

      const request = createRequestWithUser('test@example.com');

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
      const request = createRequestWithUser('test@example.com');

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
      const request = new NextRequest('http://localhost/api/pbl/scenarios/123/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No user cookie
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
      const mockPBLService = {
        startLearning: jest.fn().mockResolvedValue(mockProgram)
      };
      
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: mockUserId, email: 'new@example.com' })
      };
      
      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue(mockScenario)
      };

      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockPBLService);
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);

      const request = createRequestWithUser('new@example.com');

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
  });
});