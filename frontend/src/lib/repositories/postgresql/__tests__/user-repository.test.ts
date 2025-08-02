import { PostgreSQLUserRepository } from '../user-repository';
import type { User } from '@/lib/repositories/interfaces';
import type { Pool } from 'pg';

// Mock Pool
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery
} as unknown as Pool;

describe('PostgreSQLUserRepository', () => {
  let repository: PostgreSQLUserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PostgreSQLUserRepository(mockPool);
  });

  const mockUserRow = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashed',
    role: 'student',
    username: 'testuser',
    name: 'Test User',
    preferred_language: 'en',
    achievements: ['ach1', 'ach2'],
    metadata: { theme: 'dark' },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed',
    role: 'student',
    username: 'testuser',
    name: 'Test User',
    preferredLanguage: 'en',
    achievements: ['ach1', 'ach2'],
    metadata: { theme: 'dark' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  };

  describe('findById', () => {
    it('finds user by id', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow] });

      const result = await repository.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE id = $1'),
        ['user-123']
      );
    });

    it('returns null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById('invalid');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('finds user by email', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow] });

      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE email = $1'),
        ['test@example.com']
      );
    });

    it('returns null when email not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a new user', async () => {
      const newUser = {
        email: 'new@example.com',
        passwordHash: 'newhash',
        role: 'student' as const,
        name: 'New User'
      };

      mockQuery.mockResolvedValue({ rows: [{ ...mockUserRow, ...newUser }] });

      const result = await repository.create(newUser);

      expect(result.email).toBe(newUser.email);
      expect(result.role).toBe(newUser.role);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([newUser.email, newUser.passwordHash])
      );
    });

    it('handles database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Unique constraint violation'));

      await expect(repository.create({
        email: 'duplicate@example.com',
        passwordHash: 'hash',
        role: 'student'
      })).rejects.toThrow('Unique constraint violation');
    });
  });

  describe('update', () => {
    it('updates user fields', async () => {
      const updates = {
        name: 'Updated Name',
        preferredLanguage: 'zh'
      };

      mockQuery.mockResolvedValue({ 
        rows: [{ ...mockUserRow, name: updates.name, preferred_language: updates.preferredLanguage }] 
      });

      const result = await repository.update?.('user-123', updates);

      expect(result?.name).toBe(updates.name);
      expect(result?.preferredLanguage).toBe(updates.preferredLanguage);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET'),
        expect.arrayContaining(['user-123'])
      );
    });

    it('returns null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.update?.('invalid', { name: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('verifies correct password', async () => {
      mockQuery.mockResolvedValue({ rows: [{ password_hash: 'hashed' }] });

      const result = await repository.verifyPassword?.('test@example.com', 'hashed');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT password_hash FROM users WHERE email = $1'),
        ['test@example.com']
      );
    });

    it('returns false for incorrect password', async () => {
      mockQuery.mockResolvedValue({ rows: [{ password_hash: 'hashed' }] });

      const result = await repository.verifyPassword?.('test@example.com', 'wronghash');

      expect(result).toBe(false);
    });

    it('returns false when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.verifyPassword?.('notfound@example.com', 'hash');

      expect(result).toBe(false);
    });
  });

  describe('updateLoginTime', () => {
    it('updates last login time', async () => {
      await repository.updateLoginTime?.('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET last_login = NOW()'),
        ['user-123']
      );
    });
  });

  describe('error handling', () => {
    it('handles query errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Connection lost'));

      await expect(repository.findById('user-123'))
        .rejects.toThrow('Connection lost');
    });

    it('handles invalid data types', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [{ ...mockUserRow, achievements: 'not-an-array' }] 
      });

      const result = await repository.findById('user-123');

      expect(result?.achievements).toEqual([]);
    });
  });
});