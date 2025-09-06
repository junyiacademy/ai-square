/**
 * Discovery Find-by-Career API Tests
 * Following TDD principles from @CLAUDE.md
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock dependencies
jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() => 
    new Response(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  )
}));
jest.mock('@/lib/repositories/base/repository-factory');

const mockGetUnifiedAuth = getUnifiedAuth as jest.MockedFunction<typeof getUnifiedAuth>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('/api/discovery/scenarios/find-by-career', () => {
  let mockScenarioRepo: any;
  let mockProgramRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock repositories
    mockScenarioRepo = {
      findByMode: jest.fn(),
    };

    mockProgramRepo = {
      findByScenario: jest.fn(),
    };

    mockRepositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUnifiedAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should return 401 when user session has no email', async () => {
      mockGetUnifiedAuth.mockResolvedValue({ user: {} } as any);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Parameter Validation', () => {
    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: 'test@example.com' }
      } as any);
    });

    it('should return 400 when career parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Career type required');
    });

    it('should return 400 when career parameter is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Career type required');
    });
  });

  describe('Career Scenario Matching', () => {
    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: 'test@example.com' }
      } as any);
    });

    it('should find existing active program for career type', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          metadata: { careerType: 'data_analyst' }
        },
        {
          id: 'scenario-2', 
          metadata: { careerType: 'app_developer' }
        }
      ];

      const mockPrograms = [
        {
          id: 'program-1',
          userId: 'test@example.com',
          scenarioId: 'scenario-1',
          status: 'active'
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
      mockProgramRepo.findByScenario.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarioId).toBe('scenario-1');
      
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledWith('discovery');
      expect(mockProgramRepo.findByScenario).toHaveBeenCalledWith('scenario-1');
    });

    it('should return null when no matching career scenarios exist', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          metadata: { careerType: 'app_developer' }
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarioId).toBe(null);
    });

    it('should return null when no active programs exist for matching career', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          metadata: { careerType: 'data_analyst' }
        }
      ];

      const mockPrograms = [
        {
          id: 'program-1',
          userId: 'test@example.com',
          scenarioId: 'scenario-1',
          status: 'completed'
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
      mockProgramRepo.findByScenario.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarioId).toBe(null);
    });

    it('should return null when programs belong to different user', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          metadata: { careerType: 'data_analyst' }
        }
      ];

      const mockPrograms = [
        {
          id: 'program-1',
          userId: 'different@example.com',
          scenarioId: 'scenario-1',
          status: 'active'
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
      mockProgramRepo.findByScenario.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarioId).toBe(null);
    });

    it('should handle multiple matching scenarios and return first active program', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          metadata: { careerType: 'data_analyst' }
        },
        {
          id: 'scenario-2',
          metadata: { careerType: 'data_analyst' }
        }
      ];

             const mockPrograms1: any[] = [];
       const mockPrograms2 = [
        {
          id: 'program-2',
          userId: 'test@example.com',
          scenarioId: 'scenario-2',
          status: 'active'
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
      mockProgramRepo.findByScenario
        .mockResolvedValueOnce(mockPrograms1)
        .mockResolvedValueOnce(mockPrograms2);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarioId).toBe('scenario-2');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: 'test@example.com' }
      } as any);
    });

    it('should handle scenarios with missing metadata gracefully', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          metadata: null
        },
        {
          id: 'scenario-2',
          metadata: {}
        },
        {
          id: 'scenario-3',
          metadata: { careerType: 'data_analyst' }
        }
      ];

             const mockPrograms: any[] = [];
       mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
      mockProgramRepo.findByScenario.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarioId).toBe(null);
      
      // Should only check scenario-3 as it's the only one with matching careerType
      expect(mockProgramRepo.findByScenario).toHaveBeenCalledTimes(1);
      expect(mockProgramRepo.findByScenario).toHaveBeenCalledWith('scenario-3');
    });

    it('should handle empty scenarios array', async () => {
      mockScenarioRepo.findByMode.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarioId).toBe(null);
      
      expect(mockProgramRepo.findByScenario).not.toHaveBeenCalled();
    });

    it('should handle null scenarios response', async () => {
      mockScenarioRepo.findByMode.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarioId).toBe(null);
    });

    it('should handle empty programs array', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          metadata: { careerType: 'data_analyst' }
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
      mockProgramRepo.findByScenario.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarioId).toBe(null);
    });

    it('should handle null programs response', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          metadata: { careerType: 'data_analyst' }
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
      mockProgramRepo.findByScenario.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarioId).toBe(null);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: 'test@example.com' }
      } as any);
    });

    it('should handle scenario repository errors', async () => {
      mockScenarioRepo.findByMode.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle program repository errors', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          metadata: { careerType: 'data_analyst' }
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
      mockProgramRepo.findByScenario.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle session service errors', async () => {
      mockGetUnifiedAuth.mockRejectedValue(new Error('Session error'));

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Business Logic Integration', () => {
    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: 'test@example.com' }
      } as any);
    });

    it('should validate career type matching logic', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          metadata: { careerType: 'data_analyst', other: 'field' }
        },
        {
          id: 'scenario-2',
          metadata: { careerType: 'app_developer', category: 'tech' }
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
      mockProgramRepo.findByScenario.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      
      // Verify only the matching scenario was checked for programs
      expect(mockProgramRepo.findByScenario).toHaveBeenCalledTimes(1);
      expect(mockProgramRepo.findByScenario).toHaveBeenCalledWith('scenario-1');
    });

    it('should verify program filtering by user and status', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          metadata: { careerType: 'data_analyst' }
        }
      ];

      const mockPrograms = [
        {
          id: 'program-1',
          userId: 'test@example.com',
          status: 'pending'
        },
        {
          id: 'program-2',
          userId: 'test@example.com',
          status: 'active'
        },
        {
          id: 'program-3',
          userId: 'other@example.com',
          status: 'active'
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
      mockProgramRepo.findByScenario.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data_analyst');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarioId).toBe('scenario-1');
    });
  });
}); 