import { SecureSession } from '../secure-session';

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

    it('should create and retrieve a session', () => {
      const token = SecureSession.createSession(testUser);
      const session = SecureSession.getSession(token);
      
      expect(session).not.toBeNull();
      expect(session?.userId).toBe(testUser.userId);
      expect(session?.email).toBe(testUser.email);
      expect(session?.role).toBe(testUser.role);
    });

    it('should return null for invalid token', () => {
      const session = SecureSession.getSession('invalid-token');
      expect(session).toBeNull();
    });

    it('should destroy a session', () => {
      const token = SecureSession.createSession(testUser);
      expect(SecureSession.getSession(token)).not.toBeNull();
      
      SecureSession.destroySession(token);
      expect(SecureSession.getSession(token)).toBeNull();
    });

    it('should handle remember me correctly', () => {
      const regularToken = SecureSession.createSession(testUser, false);
      const rememberToken = SecureSession.createSession(testUser, true);
      
      const regularSession = SecureSession.getSession(regularToken);
      const rememberSession = SecureSession.getSession(rememberToken);
      
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

    it('should get all sessions for a user', () => {
      const token1 = SecureSession.createSession(testUser);
      const token2 = SecureSession.createSession(testUser);
      const token3 = SecureSession.createSession({ ...testUser, userId: '456' });
      
      const userSessions = SecureSession.getUserSessions(userId);
      expect(userSessions).toContain(token1);
      expect(userSessions).toContain(token2);
      expect(userSessions).not.toContain(token3);
    });

    it('should revoke all sessions for a user', () => {
      const token1 = SecureSession.createSession(testUser);
      const token2 = SecureSession.createSession(testUser);
      
      SecureSession.revokeUserSessions(userId);
      
      expect(SecureSession.getSession(token1)).toBeNull();
      expect(SecureSession.getSession(token2)).toBeNull();
    });
  });

  describe('Session Expiration', () => {
    it('should clean up expired sessions', () => {
      const testUser = {
        userId: '123',
        email: 'test@example.com',
        role: 'student'
      };

      // Create a session and manually expire it
      const token = SecureSession.createSession(testUser);
      const session = SecureSession.getSession(token);
      
      // Manually set expiration to past
      if (session) {
        session.expiresAt = new Date(Date.now() - 1000);
      }
      
      // Should return null for expired session
      expect(SecureSession.getSession(token)).toBeNull();
    });
  });
});