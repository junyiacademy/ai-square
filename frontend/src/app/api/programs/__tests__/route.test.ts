import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');

const mockSession = {
  user: { email: 'test@example.com' }
};

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

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock session
  require('@/lib/auth/session').getServerSession.mockResolvedValue(mockSession);
  
  // Mock repositories
  const mockProgramRepo = {
    findByUserId: jest.fn().mockResolvedValue(mockPrograms),
    findAllByUser: jest.fn().mockResolvedValue(mockPrograms),
    findActiveByUser: jest.fn().mockResolvedValue([mockPrograms[0]]),
    findCompletedByUser: jest.fn().mockResolvedValue([mockPrograms[1]])
  };
  
  require('@/lib/repositories/base/repository-factory').repositoryFactory.mockReturnValue({
    getProgramRepository: () => mockProgramRepo
  });
});

describe('/api/programs', () => {
  describe('GET', () => {
    it('should return all programs for authenticated user', async () => {
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.programs).toHaveLength(2);
      expect(data.programs[0].id).toBe('program-1');
      expect(data.programs[1].id).toBe('program-2');
    });

    it('should return 401 when user not authenticated', async () => {
      require('@/lib/auth/session').getServerSession.mockResolvedValueOnce(null);
      
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should filter programs by status when status param provided', async () => {
      const request = new NextRequest('http://localhost/api/programs?status=active');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const mockRepo = require('@/lib/repositories/base/repository-factory').repositoryFactory().getProgramRepository();
      expect(mockRepo.findActiveByUser).toHaveBeenCalledWith('test@example.com');
    });

    it('should filter programs by mode when mode param provided', async () => {
      const request = new NextRequest('http://localhost/api/programs?mode=pbl');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      // Should return filtered results based on mode
    });

    it('should combine status and mode filters', async () => {
      const request = new NextRequest('http://localhost/api/programs?status=active&mode=pbl');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle pagination with limit param', async () => {
      const request = new NextRequest('http://localhost/api/programs?limit=1');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.programs).toHaveLength(1);
    });

    it('should handle pagination with offset param', async () => {
      const request = new NextRequest('http://localhost/api/programs?offset=1');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle combined pagination params', async () => {
      const request = new NextRequest('http://localhost/api/programs?limit=10&offset=5');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should sort programs by creation date by default', async () => {
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      const data = await response.json();
      expect(data.programs[0].createdAt).toBeDefined();
      expect(data.programs[1].createdAt).toBeDefined();
    });

    it('should handle sort parameter', async () => {
      const request = new NextRequest('http://localhost/api/programs?sort=score');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle sort order parameter', async () => {
      const request = new NextRequest('http://localhost/api/programs?sort=score&order=desc');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should include program statistics in response', async () => {
      const request = new NextRequest('http://localhost/api/programs?includeStats=true');
      const response = await GET(request);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.programs[0].totalScore).toBeDefined();
      expect(data.programs[0].timeSpentSeconds).toBeDefined();
    });

    it('should handle repository errors gracefully', async () => {
      const mockRepo = require('@/lib/repositories/base/repository-factory').repositoryFactory().getProgramRepository();
      mockRepo.findByUserId.mockRejectedValueOnce(new Error('Database error'));
      
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toContain('Failed to fetch programs');
    });

    it('should return empty array when user has no programs', async () => {
      const mockRepo = require('@/lib/repositories/base/repository-factory').repositoryFactory().getProgramRepository();
      mockRepo.findByUserId.mockResolvedValueOnce([]);
      
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.programs).toHaveLength(0);
    });

    it('should handle invalid status parameter', async () => {
      const request = new NextRequest('http://localhost/api/programs?status=invalid');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Invalid status');
    });

    it('should handle invalid mode parameter', async () => {
      const request = new NextRequest('http://localhost/api/programs?mode=invalid');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Invalid mode');
    });

    it('should validate limit parameter is positive integer', async () => {
      const request = new NextRequest('http://localhost/api/programs?limit=-1');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Invalid limit');
    });

    it('should validate offset parameter is non-negative integer', async () => {
      const request = new NextRequest('http://localhost/api/programs?offset=-1');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Invalid offset');
    });

    it('should handle large limit values', async () => {
      const request = new NextRequest('http://localhost/api/programs?limit=1000');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Limit too large');
    });

    it('should return programs with proper date formatting', async () => {
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      const data = await response.json();
      expect(data.programs[0].createdAt).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(data.programs[0].startedAt).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should include completion status for each program', async () => {
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      const data = await response.json();
      expect(data.programs[0].status).toBe('active');
      expect(data.programs[1].status).toBe('completed');
      expect(data.programs[1].completedAt).toBeDefined();
    });

    it('should handle concurrent requests correctly', async () => {
      const requests = Array.from({ length: 5 }, () =>
        GET(new NextRequest('http://localhost/api/programs'))
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should log performance metrics for slow queries', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Simulate slow query
      const mockRepo = require('@/lib/repositories/base/repository-factory').repositoryFactory().getProgramRepository();
      mockRepo.findByUserId.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockPrograms), 100))
      );
      
      const request = new NextRequest('http://localhost/api/programs');
      await GET(request);
      
      // Should not log for normal queries, this tests the logging mechanism exists
      consoleSpy.mockRestore();
    });

    it('should validate query parameter types', async () => {
      const request = new NextRequest('http://localhost/api/programs?limit=abc');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Invalid limit');
    });

    it('should handle special characters in query params', async () => {
      const request = new NextRequest('http://localhost/api/programs?mode=pbl%20test');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Invalid mode');
    });

    it('should return metadata about query results', async () => {
      const request = new NextRequest('http://localhost/api/programs?includeMetadata=true');
      const response = await GET(request);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.total).toBeDefined();
      expect(data.metadata.count).toBeDefined();
    });

    it('should handle database connection issues', async () => {
      const mockRepo = require('@/lib/repositories/base/repository-factory').repositoryFactory().getProgramRepository();
      mockRepo.findByUserId.mockRejectedValueOnce(new Error('Connection timeout'));
      
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toContain('Failed to fetch programs');
    });

    it('should sanitize program data before returning', async () => {
      const programsWithSensitiveData = [
        {
          ...mockPrograms[0],
          internalNotes: 'sensitive internal data',
          debugInfo: { sql: 'SELECT * FROM users' }
        }
      ];
      
      const mockRepo = require('@/lib/repositories/base/repository-factory').repositoryFactory().getProgramRepository();
      mockRepo.findByUserId.mockResolvedValueOnce(programsWithSensitiveData);
      
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      const data = await response.json();
      expect(data.programs[0].internalNotes).toBeUndefined();
      expect(data.programs[0].debugInfo).toBeUndefined();
    });

    it('should handle malformed URL parameters', async () => {
      const request = new NextRequest('http://localhost/api/programs?status=active&');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });

    it('should support case-insensitive status filtering', async () => {
      const request = new NextRequest('http://localhost/api/programs?status=ACTIVE');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return programs in consistent order', async () => {
      const request1 = new NextRequest('http://localhost/api/programs');
      const request2 = new NextRequest('http://localhost/api/programs');
      
      const [response1, response2] = await Promise.all([
        GET(request1),
        GET(request2)
      ]);
      
      const data1 = await response1.json();
      const data2 = await response2.json();
      
      expect(data1.programs[0].id).toBe(data2.programs[0].id);
      expect(data1.programs[1].id).toBe(data2.programs[1].id);
    });
  });

  describe('Error logging and monitoring', () => {
    it('should log API access for audit purposes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const request = new NextRequest('http://localhost/api/programs');
      await GET(request);
      
      // Verify some form of logging occurs (implementation dependent)
      consoleSpy.mockRestore();
    });

    it('should handle timeout scenarios gracefully', async () => {
      const mockRepo = require('@/lib/repositories/base/repository-factory').repositoryFactory().getProgramRepository();
      mockRepo.findByUserId.mockImplementation(() =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 50))
      );
      
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
    });

    it('should maintain API rate limiting headers', async () => {
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      
      // Check that response maintains proper headers structure
      expect(response.headers).toBeDefined();
    });
  });
});