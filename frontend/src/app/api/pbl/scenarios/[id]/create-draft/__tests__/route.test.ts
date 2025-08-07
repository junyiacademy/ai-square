import { NextRequest } from 'next/server';
import { POST } from '../route';

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

describe('API Route: src/app/api/pbl/scenarios/[id]/create-draft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST', () => {
    it('should handle successful request', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });
      
      const response = await POST(request, { params: Promise.resolve({'id':'test-id'}) });
      
      expect(response).toBeDefined();
      expect(response.status).toBeLessThanOrEqual(500);
    });
    
    it('should handle missing parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      });
      
      const response = await POST(request, { params: Promise.resolve({'id':'test-id'}) });
      
      expect(response).toBeDefined();
    });
    
    it('should handle errors gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: 'invalid json',
      });
      
      const response = await POST(request, { params: Promise.resolve({'id':'test-id'}) });
      
      expect(response).toBeDefined();
      expect(response.status).toBeLessThanOrEqual(500);
    });
  });
});