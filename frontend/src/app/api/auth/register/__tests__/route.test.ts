import { createMockRequest } from '@/test-utils/helpers/api';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import bcrypt from 'bcryptjs';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { createMockUserRepository, createMockUser } from '@/test-utils/mocks/repository-helpers';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('bcryptjs');
jest.mock('@/lib/db/get-pool', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  }))
}));
jest.mock('@/lib/auth/password-utils', () => ({
  updateUserPasswordHash: jest.fn(),
  updateUserEmailVerified: jest.fn(),
  getUserWithPassword: jest.fn()
}));
jest.mock('@/lib/auth/auth-manager', () => ({
  AuthManager: {
    setAuthCookie: jest.fn()
  }
}));

// Mock NextResponse to handle cookies properly
const mockCookies = {
  set: jest.fn(),
};

jest.mock('next/server', () => {
  class MockNextResponse extends Response {
    cookies = mockCookies;
    
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      super(body, init);
    }
    
    static json(data: any, init?: ResponseInit) {
      const response = new MockNextResponse(JSON.stringify(data), init);
      return response;
    }
  }
  
  return {
    NextRequest: jest.requireActual('next/server').NextRequest,
    NextResponse: MockNextResponse
  };
});

const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('/api/auth/register', () => {
  let mockUserRepo: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.set.mockClear();
    mockUserRepo = createMockUserRepository();
    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);
    
    // Mock bcrypt
    mockBcrypt.hash.mockImplementation((password: string) => 
      Promise.resolve(`hashed_${password}`)
    );
  });

  describe('POST - User Registration', () => {
    it('should successfully register a new user', async () => {
      const newUser = createMockUser({
        id: 'user-123',
        email: 'newuser@example.com',
        name: 'New User',
      });
      
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(newUser);
      mockUserRepo.update.mockResolvedValue(newUser);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePass123',
          name: 'New User',
          acceptTerms: true
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Registration successful');
      expect(data.user).toEqual({
        id: 'user-123',
        email: 'newuser@example.com',
        name: 'New User',
        preferredLanguage: 'en',
        emailVerified: false
      });
      expect(data.sessionToken).toBeDefined();
      
      // Verify password was hashed
      expect(mockBcrypt.hash).toHaveBeenCalledWith('SecurePass123', 10);
      
      // Verify user was created
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        name: 'New User',
        preferredLanguage: 'en',
        learningPreferences: {
          goals: [],
          interests: [],
          learningStyle: 'visual'
        }
      });
    });

    it('should reject registration with existing email', async () => {
      const existingUser = createMockUser({
        email: 'existing@example.com',
      });
      
      mockUserRepo.findByEmail.mockResolvedValue(existingUser);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'SecurePass123',
          name: 'Test User',
          acceptTerms: true
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('An account with this email already exists');
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it('should validate password requirements', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'weak', // Too short, no uppercase, no number
          name: 'Test User',
          acceptTerms: true
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Password must be at least 8 characters');
    });

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePass123',
          name: 'Test User',
          acceptTerms: true
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid email format');
    });

    it('should require terms acceptance', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'Test User',
          acceptTerms: false
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('You must accept the terms and conditions');
    });

    it('should validate name length', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'A', // Too short
          acceptTerms: true
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Name must be at least 2 characters');
    });

    it('should set secure HTTP-only cookies', async () => {
      const newUser = createMockUser({
        id: 'user-123',
        email: 'newuser@example.com',
        name: 'New User',
      });
      
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(newUser);
      mockUserRepo.update.mockResolvedValue(newUser);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePass123',
          name: 'New User',
          acceptTerms: true
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      // Check that AuthManager.setAuthCookie was called
      const { AuthManager } = require('@/lib/auth/auth-manager');
      expect(AuthManager.setAuthCookie).toHaveBeenCalledWith(
        expect.any(Object), // response object
        expect.any(String), // sessionToken
        false // rememberMe
      );
    });

    it('should handle database errors gracefully', async () => {
      mockUserRepo.findByEmail.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'Test User',
          acceptTerms: true
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Registration failed. Please try again later.');
    });
  });

  // Email verification tests moved to /api/auth/verify-email/__tests__/route.test.ts
});