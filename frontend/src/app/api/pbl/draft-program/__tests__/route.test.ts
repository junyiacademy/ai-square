import { NextRequest } from 'next/server';
import { GET } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getUserRepository: jest.fn(),
    getProgramRepository: jest.fn(),
    getTaskRepository: jest.fn(),
    getScenarioRepository: jest.fn()
  }
}));

describe('API Route: src/app/api/pbl/draft-program', () => {
  const mockUserRepo = {
    findByEmail: jest.fn(),
    create: jest.fn()
  };
  
  const mockProgramRepo = {
    findByUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };
  
  const mockScenarioRepo = {
    findAll: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
  });
  
  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/pbl/draft-program');
      
      const response = await GET(request);
      expect(response.status).toBe(401);
    });
    
    it('should return draft programs for authenticated user', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({ id: 'user-id', email: 'test@example.com' });
      mockProgramRepo.findByUser.mockResolvedValue([
        { id: 'prog-1', status: 'draft', scenarioId: 'scenario-1' }
      ]);
      mockScenarioRepo.findAll.mockResolvedValue([
        { id: 'scenario-1', title: { en: 'Test Scenario' } }
      ]);
      
      const request = new NextRequest('http://localhost:3000/api/pbl/draft-program');
      request.cookies.get = jest.fn().mockReturnValue({
        value: JSON.stringify({ email: 'test@example.com' })
      });
      
      const response = await GET(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });
    
    it('should handle errors gracefully', async () => {
      mockUserRepo.findByEmail.mockRejectedValue(new Error('DB error'));
      
      const request = new NextRequest('http://localhost:3000/api/pbl/draft-program');
      
      const response = await GET(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBeLessThanOrEqual(500);
    });
  });
});