/**
 * Guest Login API Tests (TDD)
 * Test-Driven Development approach for guest authentication
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import crypto from 'crypto';

// Mock database and auth functions
const mockQuery = jest.fn();
const mockCreateUser = jest.fn();
const mockCreateSession = jest.fn();

jest.mock('@/lib/auth/simple-auth', () => ({
  getPool: () => ({ query: mockQuery }),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  createSession: (...args: unknown[]) => mockCreateSession(...args),
}));

describe('POST /api/auth/guest-login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Guest Email Generation', () => {
    it('should generate unique guest email with correct format', async () => {
      // This test will fail initially - we haven't implemented the route yet
      const timestamp = Date.now();
      const req = new NextRequest('http://localhost/api/auth/guest-login', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing user
      mockCreateUser.mockResolvedValueOnce({
        id: 'test-user-id',
        email: `guest-${timestamp}-abc123@temp.ai-square.com`,
        name: '訪客用戶',
        role: 'student',
        metadata: { isGuest: true },
      });
      mockCreateSession.mockResolvedValueOnce('test-session-token');

      const response = await POST(req);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.user.email).toMatch(/^guest-\d+-[a-f0-9]{6}@temp\.ai-square\.com$/);
    });

    it('should generate unique emails for concurrent requests', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const emails: string[] = [];

      for (let i = 0; i < 3; i++) {
        mockCreateUser.mockResolvedValueOnce({
          id: `user-${i}`,
          email: `guest-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@temp.ai-square.com`,
          name: '訪客用戶',
          role: 'student',
          metadata: { isGuest: true },
        });
        mockCreateSession.mockResolvedValueOnce(`token-${i}`);

        const req = new NextRequest('http://localhost/api/auth/guest-login', {
          method: 'POST',
          body: JSON.stringify({}),
        });

        const response = await POST(req);
        const data = await response.json();

        emails.push(data.user.email);
      }

      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(3);
    });
  });

  describe('Guest Account Creation', () => {
    it('should create guest user with nickname', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUser.mockResolvedValueOnce({
        id: 'test-id',
        email: 'guest-1234567890-abc123@temp.ai-square.com',
        name: '小明',
        role: 'student',
        metadata: { isGuest: true },
        email_verified: true,
      });
      mockCreateSession.mockResolvedValueOnce('test-token');

      const req = new NextRequest('http://localhost/api/auth/guest-login', {
        method: 'POST',
        body: JSON.stringify({ nickname: '小明' }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.name).toBe('小明');
      expect(data.user.role).toBe('student');
      expect(data.user.isGuest).toBe(true);
    });

    it('should create guest user without nickname (default name)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUser.mockResolvedValueOnce({
        id: 'test-id',
        email: 'guest-1234567890-def456@temp.ai-square.com',
        name: '訪客用戶',
        role: 'student',
        metadata: { isGuest: true },
        email_verified: true,
      });
      mockCreateSession.mockResolvedValueOnce('test-token-2');

      const req = new NextRequest('http://localhost/api/auth/guest-login', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.name).toBe('訪客用戶');
    });

    it('should set isGuest flag in metadata to true', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUser.mockResolvedValueOnce({
        id: 'test-id',
        email: 'guest-test@temp.ai-square.com',
        name: 'Test',
        role: 'student',
        metadata: { isGuest: true },
        email_verified: true,
      });
      mockCreateSession.mockResolvedValueOnce('token');

      const req = new NextRequest('http://localhost/api/auth/guest-login', {
        method: 'POST',
        body: JSON.stringify({ nickname: 'Test' }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(data.user.isGuest).toBe(true);
    });

    it('should set email_verified to true automatically', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      let capturedUserData: Record<string, unknown> = {};
      mockCreateUser.mockImplementationOnce((userData: Record<string, unknown>) => {
        capturedUserData = userData;
        return Promise.resolve({
          ...userData,
          id: 'test-id',
        });
      });
      mockCreateSession.mockResolvedValueOnce('token');

      const req = new NextRequest('http://localhost/api/auth/guest-login', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(req);

      expect(capturedUserData.email_verified).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should create session and set sessionToken cookie', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUser.mockResolvedValueOnce({
        id: 'test-id',
        email: 'guest@temp.ai-square.com',
        name: 'Guest',
        role: 'student',
        metadata: { isGuest: true },
      });
      mockCreateSession.mockResolvedValueOnce('test-session-token-123');

      const req = new NextRequest('http://localhost/api/auth/guest-login', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      const cookies = response.cookies.getAll();

      const sessionCookie = cookies.find((c) => c.name === 'sessionToken');
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.value).toBe('test-session-token-123');
      expect(sessionCookie?.httpOnly).toBe(true);
    });

    it('should set cookie with correct expiration (7 days)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUser.mockResolvedValueOnce({
        id: 'test-id',
        email: 'guest@temp.ai-square.com',
        name: 'Guest',
        role: 'student',
        metadata: { isGuest: true },
      });
      mockCreateSession.mockResolvedValueOnce('token');

      const req = new NextRequest('http://localhost/api/auth/guest-login', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      const cookies = response.cookies.getAll();
      const sessionCookie = cookies.find((c) => c.name === 'sessionToken');

      // Cookie maxAge should be 7 days (in seconds)
      const expectedMaxAge = 7 * 24 * 60 * 60;
      expect(sessionCookie?.maxAge).toBe(expectedMaxAge);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const req = new NextRequest('http://localhost/api/auth/guest-login', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle user creation errors', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUser.mockRejectedValueOnce(new Error('User creation failed'));

      const req = new NextRequest('http://localhost/api/auth/guest-login', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should trim and validate nickname length', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUser.mockResolvedValueOnce({
        id: 'test-id',
        email: 'guest@temp.ai-square.com',
        name: '小明',
        role: 'student',
        metadata: { isGuest: true },
      });
      mockCreateSession.mockResolvedValueOnce('token');

      const req = new NextRequest('http://localhost/api/auth/guest-login', {
        method: 'POST',
        body: JSON.stringify({ nickname: '  小明  ' }), // Whitespace
      });

      const response = await POST(req);
      const data = await response.json();

      expect(data.user.name).toBe('小明'); // Trimmed
    });
  });

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUser.mockResolvedValueOnce({
        id: 'user-123',
        email: 'guest-test@temp.ai-square.com',
        name: 'TestUser',
        role: 'student',
        metadata: { isGuest: true },
      });
      mockCreateSession.mockResolvedValueOnce('session-token');

      const req = new NextRequest('http://localhost/api/auth/guest-login', {
        method: 'POST',
        body: JSON.stringify({ nickname: 'TestUser' }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('email');
      expect(data.user).toHaveProperty('name');
      expect(data.user).toHaveProperty('role');
      expect(data.user).toHaveProperty('isGuest');
    });
  });
});
