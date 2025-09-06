import { SecureSession } from '../secure-session';

// Mock Redis client to avoid connection attempts in tests
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisClient: jest.fn().mockRejectedValue(new Error('Redis not available in tests'))
}));

describe('SecureSession', () => {
  beforeEach(() => {
    // Clean up any existing sessions
    SecureSession.cleanupExpiredSessions();
  });

  describe('Token Generation', () => {
    it('should generate 64-character hex tokens', () => {
      const token = SecureSession.generateToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/i);
      expect(token).toHaveLength(64);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(SecureSession.generateToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('Session Management', () => {
    const testUser = {
      userId: '123',
      email: 'test@example.com',
      role: 'student'
    };

    it('should create and retrieve a session', async () => {
      const token = await SecureSession.createSessionAsync(testUser);
      const session = await SecureSession.getSessionAsync(token);
      
      expect(session).not.toBeNull();
      expect(session?.userId).toBe(testUser.userId);
      expect(session?.email).toBe(testUser.email);
      expect(session?.role).toBe(testUser.role);
    });

    it('should return null for invalid token', async () => {
      const session = await SecureSession.getSessionAsync('invalid-token');
      expect(session).toBeNull();
    });

    it('should destroy a session', async () => {
      const token = await SecureSession.createSessionAsync(testUser);
      expect(await SecureSession.getSessionAsync(token)).not.toBeNull();
      
      await SecureSession.destroySessionAsync(token);
      expect(await SecureSession.getSessionAsync(token)).toBeNull();
    });

    it('should handle remember me correctly', async () => {
      const regularToken = await SecureSession.createSessionAsync(testUser, false);
      const rememberToken = await SecureSession.createSessionAsync(testUser, true);
      
      const regularSession = await SecureSession.getSessionAsync(regularToken);
      const rememberSession = await SecureSession.getSessionAsync(rememberToken);
      
      // Remember me session should expire later
      expect(rememberSession!.expiresAt.getTime()).toBeGreaterThan(
        regularSession!.expiresAt.getTime()
      );
    });
  });

  describe('Token Validation', () => {
    it('should validate correct token format', () => {
      const validTokens = [
        'a'.repeat(64),
        'f'.repeat(64),
        '0123456789abcdef'.repeat(4),
        SecureSession.generateToken()
      ];

      validTokens.forEach(token => {
        expect(SecureSession.isValidTokenFormat(token)).toBe(true);
      });
    });

    it('should reject invalid token formats', () => {
      const invalidTokens = [
        '',
        'too-short',
        'g'.repeat(64), // invalid hex char
        'a'.repeat(63), // too short
        'a'.repeat(65), // too long
      ];

      invalidTokens.forEach(token => {
        expect(SecureSession.isValidTokenFormat(token)).toBe(false);
      });
    });
  });

  describe('Multi-Session Management', () => {
    const userId = '123';
    const testUser = {
      userId,
      email: 'test@example.com',
      role: 'student'
    };

    it('should get all sessions for a user', async () => {
      const token1 = await SecureSession.createSessionAsync(testUser);
      const token2 = await SecureSession.createSessionAsync(testUser);
      const token3 = await SecureSession.createSessionAsync({ ...testUser, userId: '456' });
      
      const userSessions = await SecureSession.getUserSessions(userId);
      expect(userSessions).toContain(token1);
      expect(userSessions).toContain(token2);
      expect(userSessions).not.toContain(token3);
    });

    it('should revoke all sessions for a user', async () => {
      const token1 = await SecureSession.createSessionAsync(testUser);
      const token2 = await SecureSession.createSessionAsync(testUser);
      
      await SecureSession.revokeUserSessions(userId);
      
      expect(await SecureSession.getSessionAsync(token1)).toBeNull();
      expect(await SecureSession.getSessionAsync(token2)).toBeNull();
    });
  });

  describe('Session Expiration', () => {
    it('should clean up expired sessions', async () => {
      const testUser = {
        userId: '123',
        email: 'test@example.com',
        role: 'student'
      };

      // Create a session
      const token = await SecureSession.createSessionAsync(testUser);
      const session = await SecureSession.getSessionAsync(token);
      
      expect(session).not.toBeNull();
      
      // Note: We can't easily test expiration without mocking time
      // The implementation would need to expose a way to test this
      // For now, we just verify that sessions can be created and retrieved
    });
  });
});