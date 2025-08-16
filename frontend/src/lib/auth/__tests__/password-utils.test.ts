/**
 * Password Utilities Test Suite
 * 
 * Comprehensive tests for password management utilities including database operations,
 * user authentication, and email verification functionality
 */

import { Pool } from 'pg';
import {
  updateUserPasswordHash,
  updateUserEmailVerified,
  getUserWithPassword
} from '../password-utils';

// Mock pg Pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
} as unknown as Pool;

describe('Password Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUserPasswordHash', () => {
    it('should update user password hash with default role', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const userId = 'user-123';
      const passwordHash = '$2b$12$hashedPasswordExample';
      
      await updateUserPasswordHash(mockPool, userId, passwordHash);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users[\s\S]*SET password = \$1, role = \$2, updated_at = CURRENT_TIMESTAMP[\s\S]*WHERE id = \$3/),
        [passwordHash, 'student', userId]
      );
    });

    it('should update user password hash with custom role', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const userId = 'admin-456';
      const passwordHash = '$2b$12$anotherHashedPassword';
      const role = 'admin';
      
      await updateUserPasswordHash(mockPool, userId, passwordHash, role);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users[\s\S]*SET password = \$1, role = \$2, updated_at = CURRENT_TIMESTAMP[\s\S]*WHERE id = \$3/),
        [passwordHash, role, userId]
      );
    });

    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query = jest.fn().mockRejectedValue(dbError);
      
      await expect(
        updateUserPasswordHash(mockPool, 'user-123', 'hash')
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle empty userId', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      
      await updateUserPasswordHash(mockPool, '', 'hash');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['hash', 'student', '']
      );
    });

    it('should handle empty password hash', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      await updateUserPasswordHash(mockPool, 'user-123', '');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['', 'student', 'user-123']
      );
    });

    it('should handle various role types', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const roles = ['student', 'teacher', 'admin', 'moderator', 'guest'];
      const userId = 'user-123';
      const passwordHash = 'hash123';
      
      for (const role of roles) {
        await updateUserPasswordHash(mockPool, userId, passwordHash, role);
        expect(mockPool.query).toHaveBeenLastCalledWith(
          expect.any(String),
          [passwordHash, role, userId]
        );
      }
    });

    it('should handle special characters in inputs', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const userId = 'user-with-special@#$%';
      const passwordHash = '$2b$12$hash.with/special+chars';
      const role = 'admin-role';
      
      await updateUserPasswordHash(mockPool, userId, passwordHash, role);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [passwordHash, role, userId]
      );
    });

    it('should use SQL parameterized queries to prevent injection', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const maliciousUserId = "'; DROP TABLE users; --";
      const passwordHash = 'hash123';
      
      await updateUserPasswordHash(mockPool, maliciousUserId, passwordHash);
      
      // Verify parameterized query is used (parameters passed separately)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [passwordHash, 'student', maliciousUserId]
      );
    });

    it('should handle null values gracefully', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      await updateUserPasswordHash(mockPool, 'user-123', null as any);
      await updateUserPasswordHash(mockPool, null as any, 'hash');
      
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateUserEmailVerified', () => {
    it('should update user email verification status', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const userId = 'user-789';
      
      await updateUserEmailVerified(mockPool, userId);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users[\s\S]*SET email_verified = true, email_verified_at = CURRENT_TIMESTAMP[\s\S]*WHERE id = \$1/),
        [userId]
      );
    });

    it('should handle database errors during email verification', async () => {
      const dbError = new Error('Database update failed');
      mockPool.query = jest.fn().mockRejectedValue(dbError);
      
      await expect(
        updateUserEmailVerified(mockPool, 'user-789')
      ).rejects.toThrow('Database update failed');
    });

    it('should handle empty userId for email verification', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      
      await updateUserEmailVerified(mockPool, '');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['']
      );
    });

    it('should handle null userId for email verification', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      
      await updateUserEmailVerified(mockPool, null as any);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [null]
      );
    });

    it('should handle special characters in userId for email verification', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const specialUserId = 'user-with@special#chars$123';
      
      await updateUserEmailVerified(mockPool, specialUserId);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [specialUserId]
      );
    });

    it('should use parameterized query for email verification', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const maliciousUserId = "'; DROP TABLE users; --";
      
      await updateUserEmailVerified(mockPool, maliciousUserId);
      
      // Verify parameterized query is used
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousUserId]
      );
    });
  });

  describe('getUserWithPassword', () => {
    it('should retrieve user with password hash by email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: '$2b$12$hashedPassword',
        role: 'student',
        emailVerified: true,
        onboardingCompleted: true,
        preferredLanguage: 'en',
        metadata: { theme: 'dark' }
      };
      
      mockPool.query = jest.fn().mockResolvedValue({ rows: [mockUser] });
      
      const result = await getUserWithPassword(mockPool, 'test@example.com');
      
      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT[\s\S]*FROM users[\s\S]*WHERE LOWER\(email\) = LOWER\(\$1\)/),
        ['test@example.com']
      );
    });

    it('should return null when user not found', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });
      
      const result = await getUserWithPassword(mockPool, 'nonexistent@example.com');
      
      expect(result).toBeNull();
    });

    it('should handle case-insensitive email lookup', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'Test@Example.Com',
        name: 'Test User',
        passwordHash: '$2b$12$hashedPassword',
        role: 'student',
        emailVerified: true,
        onboardingCompleted: true,
        preferredLanguage: 'en',
        metadata: {}
      };
      
      mockPool.query = jest.fn().mockResolvedValue({ rows: [mockUser] });
      
      // Test different case variations
      const testEmails = [
        'test@example.com',
        'Test@Example.Com',
        'TEST@EXAMPLE.COM',
        'tEsT@ExAmPlE.cOm'
      ];
      
      for (const email of testEmails) {
        const result = await getUserWithPassword(mockPool, email);
        expect(result).toEqual(mockUser);
        expect(mockPool.query).toHaveBeenLastCalledWith(
          expect.stringMatching(/LOWER\(email\) = LOWER\(\$1\)/),
          [email]
        );
      }
    });

    it('should handle user with null values', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'user@example.com',
        name: 'User Name',
        passwordHash: null,
        role: null,
        emailVerified: false,
        onboardingCompleted: false,
        preferredLanguage: 'en',
        metadata: {}
      };
      
      mockPool.query = jest.fn().mockResolvedValue({ rows: [mockUser] });
      
      const result = await getUserWithPassword(mockPool, 'user@example.com');
      
      expect(result).toEqual(mockUser);
      expect(result?.passwordHash).toBeNull();
      expect(result?.role).toBeNull();
    });

    it('should handle complex metadata objects', async () => {
      const complexMetadata = {
        preferences: {
          theme: 'dark',
          language: 'zh-TW',
          notifications: {
            email: true,
            push: false,
            sms: true
          }
        },
        profile: {
          avatar: 'https://example.com/avatar.jpg',
          bio: 'Software developer',
          skills: ['JavaScript', 'TypeScript', 'React']
        },
        statistics: {
          loginCount: 42,
          lastLogin: '2024-01-01T12:00:00Z',
          achievementCount: 15
        }
      };
      
      const mockUser = {
        id: 'user-complex',
        email: 'complex@example.com',
        name: 'Complex User',
        passwordHash: '$2b$12$complexHash',
        role: 'advanced',
        emailVerified: true,
        onboardingCompleted: true,
        preferredLanguage: 'zh-TW',
        metadata: complexMetadata
      };
      
      mockPool.query = jest.fn().mockResolvedValue({ rows: [mockUser] });
      
      const result = await getUserWithPassword(mockPool, 'complex@example.com');
      
      expect(result).toEqual(mockUser);
      expect(result?.metadata).toEqual(complexMetadata);
      expect((result?.metadata as any).preferences.theme).toBe('dark');
    });

    it('should handle database errors during user retrieval', async () => {
      const dbError = new Error('Database query failed');
      mockPool.query = jest.fn().mockRejectedValue(dbError);
      
      await expect(
        getUserWithPassword(mockPool, 'test@example.com')
      ).rejects.toThrow('Database query failed');
    });

    it('should handle empty email input', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });
      
      const result = await getUserWithPassword(mockPool, '');
      
      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['']
      );
    });

    it('should handle special characters in email', async () => {
      const specialEmails = [
        'user+test@example.com',
        'user.name@sub.example.co.uk',
        'user_123@example-site.org',
        'user@ex-ample.com',
        'test.email+tag+sorting@example.co.uk'
      ];
      
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });
      
      for (const email of specialEmails) {
        await getUserWithPassword(mockPool, email);
        expect(mockPool.query).toHaveBeenLastCalledWith(
          expect.any(String),
          [email]
        );
      }
    });

    it('should handle unicode characters in email', async () => {
      const unicodeEmails = [
        'tëst@example.com',
        'ñoño@example.com',
        'üser@example.com',
        'test@éxample.com'
      ];
      
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });
      
      for (const email of unicodeEmails) {
        await getUserWithPassword(mockPool, email);
        expect(mockPool.query).toHaveBeenLastCalledWith(
          expect.any(String),
          [email]
        );
      }
    });

    it('should use parameterized query for email lookup', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });
      
      const maliciousEmail = "test@example.com'; DROP TABLE users; --";
      
      await getUserWithPassword(mockPool, maliciousEmail);
      
      // Verify parameterized query is used
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousEmail]
      );
    });

    it('should return first row when multiple users found (edge case)', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'duplicate@example.com',
          name: 'User One',
          passwordHash: '$2b$12$hash1',
          role: 'student',
          emailVerified: true,
          onboardingCompleted: true,
          preferredLanguage: 'en',
          metadata: {}
        },
        {
          id: 'user-2',
          email: 'duplicate@example.com',
          name: 'User Two',
          passwordHash: '$2b$12$hash2',
          role: 'admin',
          emailVerified: false,
          onboardingCompleted: false,
          preferredLanguage: 'es',
          metadata: { duplicate: true }
        }
      ];
      
      mockPool.query = jest.fn().mockResolvedValue({ rows: mockUsers });
      
      const result = await getUserWithPassword(mockPool, 'duplicate@example.com');
      
      expect(result).toEqual(mockUsers[0]); // Should return first user
      expect(result?.id).toBe('user-1');
    });

    it('should handle different user roles', async () => {
      const roles = ['student', 'teacher', 'admin', 'moderator', 'guest', 'premium'];
      
      for (const role of roles) {
        const mockUser = {
          id: `user-${role}`,
          email: `${role}@example.com`,
          name: `${role} User`,
          passwordHash: `$2b$12$hash${role}`,
          role: role,
          emailVerified: true,
          onboardingCompleted: true,
          preferredLanguage: 'en',
          metadata: { role: role }
        };
        
        mockPool.query = jest.fn().mockResolvedValue({ rows: [mockUser] });
        
        const result = await getUserWithPassword(mockPool, `${role}@example.com`);
        
        expect(result).toEqual(mockUser);
        expect(result?.role).toBe(role);
      }
    });

    it('should handle different languages', async () => {
      const languages = ['en', 'zh-TW', 'zh-CN', 'es', 'fr', 'de', 'ja', 'ko'];
      
      for (const lang of languages) {
        const mockUser = {
          id: `user-${lang}`,
          email: `user-${lang}@example.com`,
          name: `User ${lang}`,
          passwordHash: '$2b$12$hashexample',
          role: 'student',
          emailVerified: true,
          onboardingCompleted: true,
          preferredLanguage: lang,
          metadata: { language: lang }
        };
        
        mockPool.query = jest.fn().mockResolvedValue({ rows: [mockUser] });
        
        const result = await getUserWithPassword(mockPool, `user-${lang}@example.com`);
        
        expect(result).toEqual(mockUser);
        expect(result?.preferredLanguage).toBe(lang);
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should use parameterized queries in all functions', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM admin_users --",
        "'; UPDATE users SET role='admin' --",
        "' OR 1=1 --"
      ];
      
      // Test all functions with malicious inputs
      for (const input of maliciousInputs) {
        await updateUserPasswordHash(mockPool, input, 'hash', 'role');
        await updateUserEmailVerified(mockPool, input);
        await getUserWithPassword(mockPool, input);
      }
      
      // Verify all calls used parameterized queries (inputs passed as parameters, not in SQL)
      const calls = (mockPool.query as jest.Mock).mock.calls;
      calls.forEach(call => {
        expect(call[0]).not.toContain("'; DROP TABLE");
        expect(call[0]).not.toContain('UNION SELECT');
        expect(call[0]).not.toContain('OR 1=1');
        // Parameters should be in second argument
        expect(call[1]).toBeDefined();
        expect(Array.isArray(call[1])).toBe(true);
      });
    });
  });

  describe('Database Connection and Performance', () => {
    it('should handle connection timeouts', async () => {
      const timeoutError = new Error('connection timeout');
      timeoutError.name = 'TimeoutError';
      
      mockPool.query = jest.fn().mockRejectedValue(timeoutError);
      
      await expect(
        updateUserPasswordHash(mockPool, 'user-123', 'hash')
      ).rejects.toThrow('connection timeout');
      
      await expect(
        updateUserEmailVerified(mockPool, 'user-123')
      ).rejects.toThrow('connection timeout');
      
      await expect(
        getUserWithPassword(mockPool, 'test@example.com')
      ).rejects.toThrow('connection timeout');
    });

    it('should handle concurrent database operations', async () => {
      mockPool.query = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [], rowCount: 1 }), 10))
      );
      
      // Simulate concurrent operations
      const promises = [
        updateUserPasswordHash(mockPool, 'user-1', 'hash1'),
        updateUserPasswordHash(mockPool, 'user-2', 'hash2'),
        updateUserEmailVerified(mockPool, 'user-3'),
        getUserWithPassword(mockPool, 'test1@example.com'),
        getUserWithPassword(mockPool, 'test2@example.com')
      ];
      
      await expect(Promise.all(promises)).resolves.not.toThrow();
      expect(mockPool.query).toHaveBeenCalledTimes(5);
    });
  });

  describe('Edge Cases and Boundary Values', () => {
    it('should handle extremely long inputs', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const longUserId = 'user-' + 'a'.repeat(1000);
      const longPasswordHash = '$2b$12$' + 'hash'.repeat(100);
      const longRole = 'role-' + 'x'.repeat(500);
      const longEmail = 'user' + 'y'.repeat(500) + '@example.com';
      
      await updateUserPasswordHash(mockPool, longUserId, longPasswordHash, longRole);
      await updateUserEmailVerified(mockPool, longUserId);
      await getUserWithPassword(mockPool, longEmail);
      
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    it('should handle empty and whitespace inputs', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const whitespaceInputs = ['', ' ', '\t', '\n', '\r\n', '   '];
      
      for (const input of whitespaceInputs) {
        await updateUserPasswordHash(mockPool, input, 'hash');
        await updateUserEmailVerified(mockPool, input);
        await getUserWithPassword(mockPool, input);
      }
      
      expect(mockPool.query).toHaveBeenCalledTimes(whitespaceInputs.length * 3);
    });

    it('should handle various character encodings', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      
      const encodingTests = [
        '用戶@例子.com',
        'пользователь@пример.com',
        'utilisateur@exemple.com',
        'usuario@ejemplo.com',
        'ユーザー@例.com'
      ];
      
      for (const email of encodingTests) {
        await getUserWithPassword(mockPool, email);
      }
      
      expect(mockPool.query).toHaveBeenCalledTimes(encodingTests.length);
    });
  });
});
