import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/auth/auth-utils');
jest.mock('@/lib/repositories/base/repository-factory');

const mockGetAuthFromRequest = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

// Mock console
const mockConsoleError = createMockConsoleError();

describe('/api/user-data', () => {
  let mockUserRepo: any;
  let consoleLogSpy: jest.SpyInstance;

  const mockAuth = {
    userId: '123',
    email: 'test@example.com',
    role: 'student',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    mockUserRepo = {
      getUserData: jest.fn(),
      saveUserData: jest.fn(),
    };
    
    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET', () => {
    it('returns user data for authenticated user', async () => {
      const mockUserData = {
        id: '123',
        email: 'test@example.com',
        assessmentResults: [],
        achievements: [],
        lastUpdated: new Date().toISOString(),
      };
      
      mockGetAuthFromRequest.mockResolvedValue(mockAuth);
      mockUserRepo.getUserData.mockResolvedValue(mockUserData);
      
      const request = new NextRequest('http://localhost:3000/api/user-data', {
        headers: {
          'x-session-token': 'valid-token',
        },
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(mockGetAuthFromRequest).toHaveBeenCalledWith(request);
      expect(mockUserRepo.getUserData).toHaveBeenCalledWith('test@example.com');
      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockUserData,
      });
      expect(consoleLogSpy).toHaveBeenCalledWith('[API] GET /api/user-data - session token:', 'present');
    });

    it('logs when session token is missing', async () => {
      mockGetAuthFromRequest.mockResolvedValue(mockAuth);
      mockUserRepo.getUserData.mockResolvedValue({ email: 'test@example.com' });
      
      const request = new NextRequest('http://localhost:3000/api/user-data');
      
      await GET(request);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[API] GET /api/user-data - session token:', 'missing');
    });

    it('returns 401 when user is not authenticated', async () => {
      mockGetAuthFromRequest.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/user-data');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Authentication required' });
      expect(mockUserRepo.getUserData).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('[API] GET /api/user-data - authentication failed');
    });

    it('handles repository errors gracefully', async () => {
      mockGetAuthFromRequest.mockResolvedValue(mockAuth);
      mockUserRepo.getUserData.mockRejectedValue(new Error('Database error'));
      
      const request = new NextRequest('http://localhost:3000/api/user-data');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to get user data' });
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to get user data:', expect.any(Error));
    });
  });

  describe('POST', () => {
    it('updates user data successfully', async () => {
      const updateData = {
        assessmentResults: [
          {
            assessmentId: 'test-assessment',
            score: 85,
            timestamp: new Date().toISOString(),
          },
        ],
      };
      
      const updatedUserData = {
        id: '123',
        email: 'test@example.com',
        ...updateData,
        lastUpdated: new Date().toISOString(),
      };
      
      mockGetAuthFromRequest.mockResolvedValue(mockAuth);
      mockUserRepo.saveUserData.mockResolvedValue(updatedUserData);
      
      const request = new NextRequest('http://localhost:3000/api/user-data', {
        method: 'POST',
        headers: {
          'x-session-token': 'valid-token',
        },
        body: JSON.stringify({ data: updateData }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(mockGetAuthFromRequest).toHaveBeenCalledWith(request);
      expect(mockUserRepo.saveUserData).toHaveBeenCalledWith('test@example.com', updateData);
      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: updatedUserData,
      });
      expect(consoleLogSpy).toHaveBeenCalledWith('[API] POST /api/user-data - session token:', 'present');
    });

    it('returns 401 when user is not authenticated', async () => {
      mockGetAuthFromRequest.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/user-data', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Authentication required' });
      expect(mockUserRepo.saveUserData).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('[API] POST /api/user-data - authentication failed');
    });

    it('handles invalid JSON in request body', async () => {
      mockGetAuthFromRequest.mockResolvedValue(mockAuth);
      
      const request = new NextRequest('http://localhost:3000/api/user-data', {
        method: 'POST',
        headers: {
          'x-session-token': 'valid-token',
        },
        body: 'invalid json',
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to save user data' });
    });

    it('handles repository update errors', async () => {
      mockGetAuthFromRequest.mockResolvedValue(mockAuth);
      mockUserRepo.saveUserData.mockRejectedValue(new Error('Update failed'));
      
      const request = new NextRequest('http://localhost:3000/api/user-data', {
        method: 'POST',
        body: JSON.stringify({ data: { test: 'data' } }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to save user data' });
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to save user data:', expect.any(Error));
    });
  });
});
