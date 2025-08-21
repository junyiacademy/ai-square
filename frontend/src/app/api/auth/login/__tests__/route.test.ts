import { POST } from '../route';
import { createAccessToken, createRefreshToken } from '@/lib/auth/jwt';
import { getUserWithPassword, updateUserPasswordHash } from '@/lib/auth/password-utils';
import bcrypt from 'bcryptjs';

// Mock the auth module
jest.mock('@/lib/auth/jwt', () => ({
  createAccessToken: jest.fn(),
  createRefreshToken: jest.fn()
}));

// Mock session module
jest.mock('@/lib/auth/session-simple', () => ({
  createSessionToken: jest.fn().mockReturnValue('mock-session-token')
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

// Mock database pool
const mockPool = {
  query: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
};

jest.mock('@/lib/db/get-pool', () => ({
  getPool: jest.fn(() => mockPool)
}));

// Mock password utilities
jest.mock('@/lib/auth/password-utils', () => ({
  getUserWithPassword: jest.fn(),
  updateUserPasswordHash: jest.fn(),
  updateUserEmailVerified: jest.fn()
}));

// Mock PostgreSQL repository
jest.mock('@/lib/repositories/postgresql', () => ({
  PostgreSQLUserRepository: jest.fn().mockImplementation(() => ({
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((user) => Promise.resolve({
      id: '1',
      ...user
    })),
    updateLastActive: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock NextResponse to handle cookies properly
const mockCookies = {
  set: jest.fn(),
}

jest.mock('next/server', () => {
  class MockNextResponse extends Response {
    cookies = mockCookies
    
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      super(body, init)
    }
    
    static json(data: any, init?: ResponseInit) {
      const response = new MockNextResponse(JSON.stringify(data), init)
      return response
    }
  }
  
  return {
    NextRequest: jest.fn(),
    NextResponse: MockNextResponse
  }
})

// Create a mock request helper
function createMockRequest(body: any) {
  return {
    json: jest.fn().mockResolvedValue(body)
  } as any;
}

describe('/api/auth/login', () => {
  const mockCreateAccessToken = createAccessToken as jest.MockedFunction<typeof createAccessToken>;
  const mockCreateRefreshToken = createRefreshToken as jest.MockedFunction<typeof createRefreshToken>;
  const mockGetUserWithPassword = getUserWithPassword as jest.MockedFunction<typeof getUserWithPassword>;
  const mockUpdateUserPasswordHash = updateUserPasswordHash as jest.MockedFunction<typeof updateUserPasswordHash>;
  const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;
  const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.set.mockClear();
    mockCreateAccessToken.mockResolvedValue('mock-access-token');
    mockCreateRefreshToken.mockResolvedValue('mock-refresh-token');
    (mockBcryptHash as jest.Mock).mockResolvedValue('hashed-password');
  });

  describe('POST', () => {
    it('should login successfully with valid student credentials', async () => {
      // Setup mock user data
      mockGetUserWithPassword.mockResolvedValue({
        id: '1',
        email: 'student@example.com',
        name: 'Student User',
        passwordHash: 'hashed-password',
        role: 'student',
        emailVerified: true,
        onboardingCompleted: false,
        preferredLanguage: 'en',
        metadata: {}
      });
      (mockBcryptCompare as jest.Mock).mockResolvedValue(true);

      const request = createMockRequest({
        email: 'student@example.com',
        password: 'student123'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toMatchObject({
        id: '1',
        email: 'student@example.com',
        role: 'student',
        name: 'Student User'
      });

      // Check JWT creation
      expect(mockCreateAccessToken).toHaveBeenCalledWith({
        userId: 1,
        email: 'student@example.com',
        role: 'student',
        name: 'Student User'
      });
      expect(mockCreateRefreshToken).toHaveBeenCalledWith('1', false);

      // Check cookies were set
      expect(mockCookies.set).toHaveBeenCalledWith('ai_square_session', 'mock-session-token', expect.any(Object));
      expect(mockCookies.set).toHaveBeenCalledWith('ai_square_refresh', 'mock-refresh-token', expect.any(Object));
    });

    it('should login successfully with teacher credentials', async () => {
      mockGetUserWithPassword.mockResolvedValue({
        id: '2',
        email: 'teacher@example.com',
        name: 'Teacher User',
        passwordHash: 'hashed-password',
        role: 'teacher',
        emailVerified: true,
        onboardingCompleted: true,
        preferredLanguage: 'en',
        metadata: {}
      });
      (mockBcryptCompare as jest.Mock).mockResolvedValue(true);

      const request = createMockRequest({
        email: 'teacher@example.com',
        password: 'teacher123'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('teacher');
    });

    it('should login successfully with admin credentials', async () => {
      mockGetUserWithPassword.mockResolvedValue({
        id: '3',
        email: 'admin@example.com',
        name: 'Admin User',
        passwordHash: 'hashed-password',
        role: 'admin',
        emailVerified: true,
        onboardingCompleted: true,
        preferredLanguage: 'en',
        metadata: {}
      });
      (mockBcryptCompare as jest.Mock).mockResolvedValue(true);

      const request = createMockRequest({
        email: 'admin@example.com',
        password: 'admin123'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('admin');
    });

    it('should handle remember me option', async () => {
      mockGetUserWithPassword.mockResolvedValue({
        id: '1',
        email: 'student@example.com',
        name: 'Student User',
        passwordHash: 'hashed-password',
        role: 'student',
        emailVerified: true,
        onboardingCompleted: false,
        preferredLanguage: 'en',
        metadata: {}
      });
      (mockBcryptCompare as jest.Mock).mockResolvedValue(true);

      const request = createMockRequest({
        email: 'student@example.com',
        password: 'student123',
        rememberMe: true
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockCreateRefreshToken).toHaveBeenCalledWith('1', true);

      // Check cookie was set with remember me option
      expect(mockCookies.set).toHaveBeenCalledWith('ai_square_refresh', 'mock-refresh-token', 
        expect.objectContaining({
          maxAge: 90 * 24 * 60 * 60 // 90 days for remember me
        })
      );
    });

    it('should fail with missing email', async () => {
      const request = createMockRequest({
        password: 'password123'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should fail with missing password', async () => {
      const request = createMockRequest({
        email: 'test@example.com'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.toLowerCase()).toContain('required');
    });

    it('should fail with invalid credentials', async () => {
      mockGetUserWithPassword.mockResolvedValue(null);

      const request = createMockRequest({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid email or password');
    });

    it('should handle JSON parse errors', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('An error occurred');
    });

    it('should handle JWT creation errors', async () => {
      mockGetUserWithPassword.mockResolvedValue({
        id: '1',
        email: 'student@example.com',
        name: 'Student User',
        passwordHash: 'hashed-password',
        role: 'student',
        emailVerified: true,
        onboardingCompleted: false,
        preferredLanguage: 'en',
        metadata: {}
      });
      (mockBcryptCompare as jest.Mock).mockResolvedValue(true);
      mockCreateAccessToken.mockRejectedValue(new Error('JWT error'));

      const request = createMockRequest({
        email: 'student@example.com',
        password: 'student123'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('An error occurred');
    });
  });

  // OPTIONS test removed - not implemented in new route
});