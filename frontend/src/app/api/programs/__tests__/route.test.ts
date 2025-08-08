import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');

const mockPrograms = [
  {
    id: 'program-1',
    scenarioId: 'scenario-1',
    userId: 'test@example.com',
    mode: 'pbl',
    status: 'active',
    totalScore: 85,
    timeSpentSeconds: 3600,
    startedAt: new Date('2023-01-01'),
    createdAt: new Date('2023-01-01')
  },
  {
    id: 'program-2',
    scenarioId: 'scenario-2',
    userId: 'test@example.com',
    mode: 'assessment',
    status: 'completed',
    totalScore: 92,
    timeSpentSeconds: 1800,
    startedAt: new Date('2023-01-02'),
    completedAt: new Date('2023-01-02'),
    createdAt: new Date('2023-01-02')
  }
];

const mockProgramRepo = {
  findByUser: jest.fn().mockResolvedValue(mockPrograms),
  findByScenario: jest.fn().mockResolvedValue(mockPrograms),
  getActivePrograms: jest.fn().mockResolvedValue([mockPrograms[0]]),
  getCompletedPrograms: jest.fn().mockResolvedValue([mockPrograms[1]])
};

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock repositories - repositoryFactory is an object instance, not a function
  const mockFactory = require('@/lib/repositories/base/repository-factory');
  mockFactory.repositoryFactory.getProgramRepository = jest.fn().mockReturnValue(mockProgramRepo);
});

describe('/api/programs', () => {
  describe('GET', () => {
    it('should return 400 when no userId or scenarioId provided', async () => {
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('userId or scenarioId is required');
    });

    it('should return programs for specific user', async () => {
      const request = new NextRequest('http://localhost/api/programs?userId=test@example.com');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveLength(2);
      expect(data[0].id).toBe('program-1');
      expect(data[1].id).toBe('program-2');
    });

    it('should return programs for specific scenario', async () => {
      const request = new NextRequest('http://localhost/api/programs?scenarioId=scenario-1');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveLength(2);
    });

    it('should filter active programs when status=active', async () => {
      const request = new NextRequest('http://localhost/api/programs?userId=test@example.com&status=active');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(mockProgramRepo.getActivePrograms).toHaveBeenCalledWith('test@example.com');
      
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].status).toBe('active');
    });

    it('should filter completed programs when status=completed', async () => {
      const request = new NextRequest('http://localhost/api/programs?userId=test@example.com&status=completed');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(mockProgramRepo.getCompletedPrograms).toHaveBeenCalledWith('test@example.com');
      
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].status).toBe('completed');
    });

    it('should handle repository errors gracefully', async () => {
      mockProgramRepo.findByUser.mockRejectedValue(new Error('Database error'));
      
      const request = new NextRequest('http://localhost/api/programs?userId=test@example.com');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should return empty array when user has no programs', async () => {
      mockProgramRepo.findByUser.mockResolvedValue([]);
      
      const request = new NextRequest('http://localhost/api/programs?userId=test@example.com');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should handle undefined repository methods gracefully', async () => {
      // Simulate repository method not being available
      delete (mockProgramRepo as any).getActivePrograms;
      
      const request = new NextRequest('http://localhost/api/programs?userId=test@example.com&status=active');
      const response = await GET(request);
      
      // Should fallback to undefined which API handles
      expect(response.status).toBe(200);
    });
  });
});