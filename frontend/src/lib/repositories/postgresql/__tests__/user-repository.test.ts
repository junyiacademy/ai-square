/**
 * Unit tests for PostgreSQLUserRepository
 * Tests user database operations
 */

import { Pool } from 'pg';
import { PostgreSQLUserRepository } from '../user-repository';
import type { User, CreateUserDto, UpdateUserDto, UserDataInput } from '../../interfaces';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }))
}));

describe('PostgreSQLUserRepository', () => {
  let repository: PostgreSQLUserRepository;
  let mockPool: jest.Mocked<Pool>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    preferredLanguage: 'en',
    level: 1,
    totalXp: 100,
    learningPreferences: { learningStyle: 'intermediate' },
    onboardingCompleted: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    lastActiveAt: new Date('2024-01-03'),
    metadata: { source: 'registration' },
    role: 'student',
    emailVerified: true,
    emailVerifiedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    } as unknown as jest.Mocked<Pool>;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
    repository = new PostgreSQLUserRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['user-123']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(repository.findById('user-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockUser, passwordHash: 'hashed-password' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findByEmail('test@example.com');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE LOWER(email) = LOWER($1)'),
        ['test@example.com']
      );
      expect(result).toBeDefined();
      expect(result!.email).toBe('test@example.com');
    });

    it('should be case insensitive for email search', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await repository.findByEmail('TEST@EXAMPLE.COM');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE LOWER(email) = LOWER($1)'),
        ['TEST@EXAMPLE.COM']
      );
    });

    it('should return null if user not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createData: CreateUserDto = {
        email: 'newuser@example.com',
        name: 'New User',
        preferredLanguage: 'zh',
        learningPreferences: { learningStyle: 'beginner' }
      };

      const createdUser = {
        ...mockUser,
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: 'New User',
        preferredLanguage: 'zh'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [createdUser],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.create(createData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [
          'newuser@example.com', // Email should be lowercased
          'New User',
          'zh',
          JSON.stringify({ learningStyle: 'beginner' })
        ]
      );
      expect(result).toEqual(createdUser);
    });

    it('should use default values for optional fields', async () => {
      const minimalData: CreateUserDto = {
        email: 'MINIMAL@EXAMPLE.COM',
        name: 'Minimal User'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockUser, email: 'minimal@example.com' }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.create(minimalData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [
          'minimal@example.com', // Should be lowercased
          'Minimal User',
          'en', // Default language
          '{}' // Default empty learning preferences
        ]
      );
    });

    it('should handle create errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Duplicate email'));

      const createData: CreateUserDto = {
        email: 'duplicate@example.com',
        name: 'Duplicate User'
      };

      await expect(repository.create(createData))
        .rejects.toThrow('Duplicate email');
    });
  });

  describe('update', () => {
    it('should update user with single field', async () => {
      const updates: UpdateUserDto = {
        name: 'Updated Name'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockUser, name: 'Updated Name' }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('user-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['Updated Name', 'user-123']
      );
      expect(result.name).toBe('Updated Name');
    });

    it('should update user with multiple fields', async () => {
      const updates: UpdateUserDto = {
        name: 'New Name',
        preferredLanguage: 'fr',
        level: 5,
        totalXp: 500
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockUser, ...updates }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('user-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['New Name', 'fr', 5, 500, 'user-123']
      );
      expect(result.name).toBe('New Name');
      expect(result.preferredLanguage).toBe('fr');
    });

    it('should handle learning preferences update', async () => {
      const updates: UpdateUserDto = {
        learningPreferences: { learningStyle: 'visual' }
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockUser, ...updates }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.update('user-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('learning_preferences = $1'),
        [JSON.stringify({ learningStyle: 'visual' }), 'user-123']
      );
    });

    it('should handle empty updates', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('user-123', {});

      // Should perform an UPDATE even with no fields, updating timestamp
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['user-123']
      );
      expect(result).toEqual(mockUser);
    });

    it('should handle update when user not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await expect(repository.update('non-existent', { name: 'New Name' }))
        .rejects.toThrow('User not found');
    });
  });

  describe('delete', () => {
    it('should delete user by ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'DELETE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.delete('user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users WHERE id = $1'),
        ['user-123']
      );
    });

    it('should handle delete when user not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'DELETE',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should find all users with default options', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-456', email: 'user2@example.com' }];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: users,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      const result = await repository.findAll();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        [100, 0] // Default limit and offset
      );
      expect(result).toHaveLength(2);
    });

    it('should find all users with custom options', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.findAll({
        limit: 10,
        offset: 20,
        orderBy: 'email',
        order: 'ASC'
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY email ASC'),
        [10, 20]
      );
    });

    it('should handle empty results', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('updateLastActive', () => {
    it('should update last active timestamp', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.updateLastActive('user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET last_active_date = CURRENT_DATE'),
        ['user-123']
      );
    });

    it('should handle update when user not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      // Should not throw error even if user not found
      await repository.updateLastActive('non-existent');
    });
  });

  describe('addAchievement', () => {
    it('should add achievement to user and update XP', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect = jest.fn().mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN' }) // Transaction start
        .mockResolvedValueOnce({
          rows: [{ id: 'achievement-123', xp_reward: 50 }],
          command: 'SELECT'
        }) // Achievement lookup
        .mockResolvedValueOnce({ rows: [], command: 'INSERT' }) // User achievement insert
        .mockResolvedValueOnce({ rows: [], command: 'UPDATE' }) // User XP update
        .mockResolvedValueOnce({ rows: [], command: 'COMMIT' }); // Transaction commit

      await repository.addAchievement('user-123', 'achievement-123');

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, xp_reward FROM achievements'),
        ['achievement-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_achievements'),
        ['user-123', 'achievement-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [50, 'user-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle duplicate achievement gracefully', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect = jest.fn().mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN' })
        .mockResolvedValueOnce({
          rows: [{ id: 'achievement-123', xp_reward: 30 }],
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ rows: [], command: 'INSERT' }) // ON CONFLICT DO NOTHING
        .mockResolvedValueOnce({ rows: [], command: 'UPDATE' })
        .mockResolvedValueOnce({ rows: [], command: 'COMMIT' });

      await repository.addAchievement('user-123', 'achievement-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (user_id, achievement_id) DO NOTHING'),
        ['user-123', 'achievement-123']
      );
    });

    it('should handle achievement not found error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect = jest.fn().mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN' })
        .mockResolvedValueOnce({ rows: [], command: 'SELECT' }) // No achievement found
        .mockResolvedValueOnce({ rows: [], command: 'ROLLBACK' });

      await expect(repository.addAchievement('user-123', 'non-existent-achievement'))
        .rejects.toThrow('Achievement not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect = jest.fn().mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN' })
        .mockResolvedValueOnce({
          rows: [{ id: 'achievement-123', xp_reward: 25 }],
          command: 'SELECT'
        })
        .mockRejectedValueOnce(new Error('Database constraint error'))
        .mockResolvedValueOnce({ rows: [], command: 'ROLLBACK' });

      await expect(repository.addAchievement('user-123', 'achievement-123'))
        .rejects.toThrow('Database constraint error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('saveAssessmentSession', () => {
    it('should save assessment session to evaluations table', async () => {
      const sessionData = {
        sessionKey: 'session-123',
        techScore: 85,
        creativeScore: 90,
        businessScore: 80,
        answers: { q1: ['answer1'], q2: ['answer2'] },
        generatedPaths: ['path1', 'path2']
      };

      // Mock finding task and creating evaluation
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'task-123' }],
          command: 'SELECT',
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'evaluation-123',
            userId: 'user-123',
            createdAt: '2024-01-01T00:00:00.000Z',
            overallScore: 85,
            feedback: JSON.stringify({
              techScore: 85,
              creativeScore: 90,
              businessScore: 80
            }),
            metadata: JSON.stringify({ sessionKey: 'session-123' })
          }],
          command: 'INSERT',
          rowCount: 1
        });

      const result = await repository.saveAssessmentSession('user-123', sessionData);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('evaluation-123');
      expect(result.sessionKey).toBe('session-123');
      expect(result.techScore).toBe(85);
    });

    it('should handle missing task gracefully', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'evaluation-123',
            userId: 'user-123',
            createdAt: '2024-01-01T00:00:00.000Z',
            overallScore: 80,
            feedback: '{}',
            metadata: '{}'
          }],
          command: 'INSERT',
          rowCount: 1
        });

      const sessionData = {
        sessionKey: 'session-456',
        techScore: 75,
        creativeScore: 85,
        businessScore: 80
      };

      const result = await repository.saveAssessmentSession('user-123', sessionData);

      expect(result.id).toBe('evaluation-123');
    });
  });

  describe('getAssessmentSessions', () => {
    it('should return empty array (TODO implementation)', async () => {
      const result = await repository.getAssessmentSessions();
      expect(result).toEqual([]);
    });
  });

  describe('getLatestAssessmentResults', () => {
    it('should return null (TODO implementation)', async () => {
      const result = await repository.getLatestAssessmentResults();
      expect(result).toBeNull();
    });
  });

  describe('addBadge', () => {
    it('should add badge to user', async () => {
      const badgeData = {
        badgeId: 'badge-123',
        name: 'First Steps',
        description: 'Completed first learning module',
        imageUrl: '/badges/first-steps.png',
        category: 'learning' as const,
        xpReward: 25
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'user-badge-123',
          userId: 'user-123',
          badgeId: 'badge-123',
          name: 'First Steps',
          description: 'Completed first learning module',
          imageUrl: '/badges/first-steps.png',
          category: 'progress',
          xpReward: 25,
          unlockedAt: '2024-01-01T00:00:00.000Z',
          metadata: {}
        }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.addBadge('user-123', badgeData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_badges'),
        [
          'user-123',
          'badge-123',
          'First Steps',
          'Completed first learning module',
          '/badges/first-steps.png',
          'learning',
          25
        ]
      );

      expect(result.badgeId).toBe('badge-123');
      expect(result.name).toBe('First Steps');
      expect(result.xpReward).toBe(25);
    });

    it('should handle duplicate badge with upsert', async () => {
      const badgeData = {
        badgeId: 'existing-badge',
        name: 'Updated Badge',
        description: 'Updated description',
        imageUrl: '/badges/updated.png',
        category: 'mastery' as const,
        xpReward: 50
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'user-badge-456',
          userId: 'user-123',
          badgeId: 'existing-badge',
          name: 'Updated Badge',
          description: 'Updated description',
          imageUrl: '/badges/updated.png',
          category: 'achievement',
          xpReward: 50,
          unlockedAt: '2024-01-01T00:00:00.000Z',
          metadata: {}
        }],
        command: 'INSERT',
        rowCount: 1
      });

      await repository.addBadge('user-123', badgeData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (user_id, badge_id) DO UPDATE SET'),
        expect.arrayContaining(['user-123', 'existing-badge'])
      );
    });
  });

  describe('getUserBadges', () => {
    it('should return empty array (TODO implementation)', async () => {
      const result = await repository.getUserBadges();
      expect(result).toEqual([]);
    });
  });

  describe('getUserData', () => {
    it('should get complete user data', async () => {
      // Mock user exists
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser],
        command: 'SELECT',
        rowCount: 1
      });

      const result = await repository.getUserData('test@example.com');

      expect(result).toBeDefined();
      expect(result!.version).toBe('3.0');
      expect(result!.achievements.totalXp).toBe(mockUser.totalXp);
      expect(result!.achievements.level).toBe(mockUser.level);
      expect(result!.achievements.badges).toEqual([]);
      expect(result!.assessmentSessions).toEqual([]);
    });

    it('should auto-create user if not exists', async () => {
      // Mock user not found, then created
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0
        })
        .mockResolvedValueOnce({
          rows: [{
            ...mockUser,
            email: 'newuser@example.com',
            name: 'newuser'
          }],
          command: 'INSERT',
          rowCount: 1
        });

      const result = await repository.getUserData('newuser@example.com');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['newuser@example.com', 'newuser'])
      );

      expect(result).toBeDefined();
    });
  });

  describe('saveUserData', () => {
    it('should save complete user data with transaction', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect = jest.fn().mockResolvedValue(mockClient);

      const userDataInput: UserDataInput = {
        achievements: {
          totalXp: 1000,
          level: 5,
          badges: [],
          completedTasks: []
        },
        assessmentSessions: [],
        currentView: 'dashboard',
        lastUpdated: new Date().toISOString(),
        version: '3.0'
      };

      // Mock transaction flow
      mockClient.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN' })
        .mockResolvedValueOnce({ rows: [], command: 'COMMIT' });

      // Mock user operations
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [mockUser],
          command: 'SELECT',
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{ ...mockUser, level: 5, totalXp: 1000 }],
          command: 'UPDATE',
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{ ...mockUser, level: 5, totalXp: 1000 }],
          command: 'SELECT',
          rowCount: 1
        });

      const result = await repository.saveUserData('test@example.com', userDataInput);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      expect(result).toBeDefined();
      expect(result.version).toBe('3.0');
    });

    it('should rollback transaction on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect = jest.fn().mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN' })
        .mockRejectedValueOnce(new Error('Save failed'))
        .mockResolvedValueOnce({ rows: [], command: 'ROLLBACK' });

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser],
        command: 'SELECT',
        rowCount: 1
      });

      const userDataInput: UserDataInput = {
        achievements: { totalXp: 500, level: 3, badges: [], completedTasks: [] },
        assessmentSessions: [],
        currentView: 'dashboard',
        lastUpdated: new Date().toISOString(),
        version: '3.0'
      };

      await expect(repository.saveUserData('test@example.com', userDataInput))
        .rejects.toThrow('Save failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteUserData', () => {
    it('should delete user data', async () => {
      // Mock user exists
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [mockUser],
          command: 'SELECT',
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'DELETE',
          rowCount: 1
        });

      const result = await repository.deleteUserData('test@example.com');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users WHERE id = $1'),
        [mockUser.id]
      );
    });

    it('should return false if user not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0
      });

      const result = await repository.deleteUserData('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      await expect(repository.findAll())
        .rejects.toThrow('Connection refused');
    });

    it('should handle malformed JSON in learning preferences', async () => {
      const userWithBadJson = {
        ...mockUser,
        learningPreferences: 'invalid json string'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [userWithBadJson],
        command: 'SELECT',
        rowCount: 1
      });

      const result = await repository.findById('user-123');

      expect(result).toBeDefined();
      // The actual behavior depends on how PostgreSQL handles invalid JSON
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com';

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0
      });

      const result = await repository.findByEmail(longEmail);
      expect(result).toBeNull();
    });

    it('should handle special characters in user data', async () => {
      const specialUser: CreateUserDto = {
        email: 'test+special@example.com',
        name: "O'Connor-Smith (Jr.)",
        preferredLanguage: 'zh-TW',
        learningPreferences: {
          learningStyle: "visual"
        }
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockUser, ...specialUser }],
        command: 'INSERT',
        rowCount: 1
      });

      const result = await repository.create(specialUser);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          'test+special@example.com',
          "O'Connor-Smith (Jr.)",
          'zh-TW',
          JSON.stringify(specialUser.learningPreferences)
        ])
      );

      expect(result.name).toBe("O'Connor-Smith (Jr.)");
    });

    it('should handle concurrent updates gracefully', async () => {
      // Simulate concurrent update scenario
      (mockPool.query as jest.Mock)
        .mockRejectedValueOnce(new Error('Concurrent modification detected'));

      await expect(
        repository.update('user-123', { name: 'Updated Name' })
      ).rejects.toThrow('Concurrent modification detected');
    });

    it('should handle null and undefined values correctly', async () => {
      const userWithNulls = {
        ...mockUser,
        learningPreferences: null,
        metadata: null,
        lastActiveAt: null,
        emailVerifiedAt: null
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [userWithNulls],
        command: 'SELECT',
        rowCount: 1
      });

      const result = await repository.findById('user-123');

      expect(result).toBeDefined();
      expect(result!.learningPreferences).toBeNull();
      expect(result!.metadata).toBeNull();
    });
  });
});
