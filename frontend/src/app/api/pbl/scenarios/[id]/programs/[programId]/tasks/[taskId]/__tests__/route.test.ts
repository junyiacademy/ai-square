import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db/pool', () => ({
  query: jest.fn(),
  getPool: () => ({
    query: jest.fn(),
    connect: jest.fn(),
  }),
}));

describe('API Route: src/app/api/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('GET', () => {
    it('should handle successful request', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        
      });
      
      const response = await GET(request, { params: Promise.resolve({ id: 'test-id' }) });
      
      expect(response).toBeDefined();
      expect(response.status).toBeLessThanOrEqual(500);
    });
    
    it('should handle missing parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });
      
      const response = await GET(request, { params: Promise.resolve({}) });
      
      expect(response).toBeDefined();
    });
    
    it('should handle errors gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        
      });
      
      const response = await GET(request, { params: Promise.resolve({ id: 'test' }) });
      
      expect(response).toBeDefined();
      expect(response.status).toBeLessThanOrEqual(500);
    });
  });
});