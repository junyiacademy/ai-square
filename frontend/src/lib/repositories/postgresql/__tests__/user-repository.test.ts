/**
 * PostgreSQL User Repository Tests
 * 提升覆蓋率從 28.18% 到 80%+
 */

import { PostgreSQLUserRepository } from '../user-repository';
import type { User, CreateUserDto, UpdateUserDto, CreateAssessmentSessionDto, CreateBadgeDto } from '@/lib/repositories/interfaces';
import type { Pool } from 'pg';

// Mock Pool
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};
const mockPool = {
  query: mockQuery,
  connect: mockConnect
} as unknown as Pool;

describe('PostgreSQLUserRepository', () => {
  let repository: PostgreSQLUserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(mockClient);
    repository = new PostgreSQLUserRepository(mockPool);
  });

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    preferredLanguage: 'en',
    level: 1,
    totalXp: 0,
    learningPreferences: { style: 'visual' },
    onboardingCompleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    lastActiveAt: '2024-01-02T00:00:00Z',
    metadata: { theme: 'dark' }
  };

  describe('findById', () => {
    it('finds user by id', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await repository.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
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
    it('finds user by email case-insensitively', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await repository.findByEmail('TEST@EXAMPLE.COM');

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(email) = LOWER($1)'),
        ['TEST@EXAMPLE.COM']
      );
    });

    it('returns null when email not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a new user with all fields', async () => {
      const newUser: CreateUserDto = {
        email: 'NEW@EXAMPLE.COM',
        name: 'New User',
        preferredLanguage: 'zh',
        learningPreferences: { style: 'audio' }
      };

      mockQuery.mockResolvedValue({ 
        rows: [{ ...mockUser, ...newUser, email: 'new@example.com' }] 
      });

      const result = await repository.create(newUser);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['new@example.com', 'New User', 'zh', JSON.stringify({ style: 'audio' })]
      );
      expect(result.email).toBe('new@example.com');
    });

    it('creates user with default values', async () => {
      const newUser: CreateUserDto = {
        email: 'simple@example.com',
        name: 'Simple User'
      };

      mockQuery.mockResolvedValue({ rows: [{ ...mockUser, ...newUser }] });

      await repository.create(newUser);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['simple@example.com', 'Simple User', 'en', '{}']
      );
    });
  });

  describe('update', () => {
    it('updates user name', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [{ ...mockUser, name: 'Updated Name' }] 
      });

      const result = await repository.update('user-123', { name: 'Updated Name' });

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('name = $1');
      expect(queryCall[0]).toContain('updated_at = CURRENT_TIMESTAMP');
      expect(queryCall[1]).toContain('Updated Name');
      expect(result.name).toBe('Updated Name');
    });

    it('updates preferred language', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [{ ...mockUser, preferredLanguage: 'ja' }] 
      });

      await repository.update('user-123', { preferredLanguage: 'ja' });

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('preferred_language = $');
      expect(queryCall[1]).toContain('ja');
    });

    it('updates level', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [{ ...mockUser, level: 5 }] 
      });

      await repository.update('user-123', { level: 5 });

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('level = $');
      expect(queryCall[1]).toContain(5);
    });

    it('updates totalXp', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [{ ...mockUser, totalXp: 1500 }] 
      });

      await repository.update('user-123', { totalXp: 1500 });

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('total_xp = $');
      expect(queryCall[1]).toContain(1500);
    });

    it('updates learning preferences', async () => {
      const newPreferences = { style: 'kinesthetic', pace: 'slow' };
      mockQuery.mockResolvedValue({ 
        rows: [{ ...mockUser, learningPreferences: newPreferences }] 
      });

      await repository.update('user-123', { learningPreferences: newPreferences });

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('learning_preferences = $');
      expect(queryCall[1]).toContain(JSON.stringify(newPreferences));
    });

    it('updates onboarding completed', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [{ ...mockUser, onboardingCompleted: true }] 
      });

      await repository.update('user-123', { onboardingCompleted: true });

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('onboarding_completed = $');
      expect(queryCall[1]).toContain(true);
    });

    it('throws error when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repository.update('invalid', { name: 'Test' }))
        .rejects.toThrow('User not found');
    });
  });

  describe('delete', () => {
    it('deletes user and returns true', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repository.delete('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1',
        ['user-123']
      );
      expect(result).toBe(true);
    });

    it('returns false when user not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repository.delete('invalid');

      expect(result).toBe(false);
    });

    it('handles null rowCount', async () => {
      mockQuery.mockResolvedValue({ rowCount: null });

      const result = await repository.delete('user-123');

      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('finds all users with default options', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [mockUser, { ...mockUser, id: 'user-456' }] 
      });

      const result = await repository.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        [100, 0]
      );
      expect(result).toHaveLength(2);
    });

    it('finds users with custom options', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      await repository.findAll({
        limit: 50,
        offset: 10,
        orderBy: 'level',
        order: 'ASC'
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY level ASC'),
        [50, 10]
      );
    });
  });

  describe('updateLastActive', () => {
    it('updates last active timestamp', async () => {
      await repository.updateLastActive('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET last_active_at = CURRENT_TIMESTAMP'),
        ['user-123']
      );
    });
  });

  describe('addAchievement', () => {
    it('adds achievement and updates XP', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'ach-123', xp_reward: 100 }] }) // achievement exists
        .mockResolvedValueOnce({}) // insert user achievement
        .mockResolvedValueOnce({}) // update user XP
        .mockResolvedValueOnce({}); // COMMIT

      await repository.addAchievement('user-123', 'ach-123');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, xp_reward FROM achievements'),
        ['ach-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_achievements'),
        ['user-123', 'ach-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [100, 'user-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rollbacks on achievement not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // achievement not found

      await expect(repository.addAchievement('user-123', 'invalid'))
        .rejects.toThrow('Achievement not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rollbacks on database error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'ach-123', xp_reward: 100 }] })
        .mockRejectedValueOnce(new Error('DB Error'));

      await expect(repository.addAchievement('user-123', 'ach-123'))
        .rejects.toThrow('DB Error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('saveAssessmentSession', () => {
    it('saves assessment session with task', async () => {
      const session: CreateAssessmentSessionDto = {
        sessionKey: 'session-123',
        techScore: 85,
        creativeScore: 90,
        businessScore: 88,
        answers: { q1: 'a' },
        generatedPaths: ['path1']
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'task-123' }] }) // find task
        .mockResolvedValueOnce({ // insert evaluation
          rows: [{
            id: 'eval-123',
            userId: 'user-123',
            createdAt: '2024-01-20T10:00:00Z',
            overallScore: 87.67,
            feedback: {},
            metadata: { sessionKey: 'session-123' }
          }]
        });

      const result = await repository.saveAssessmentSession('user-123', session);

      expect(result).toMatchObject({
        id: 'eval-123',
        userId: 'user-123',
        sessionKey: 'session-123',
        techScore: 85,
        creativeScore: 90,
        businessScore: 88
      });
    });

    it('saves assessment session without task', async () => {
      const session: CreateAssessmentSessionDto = {
        sessionKey: 'session-123',
        techScore: 80,
        creativeScore: 85,
        businessScore: 82
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // no task found
        .mockResolvedValueOnce({ 
          rows: [{
            id: 'eval-123',
            userId: 'user-123',
            createdAt: '2024-01-20T10:00:00Z',
            overallScore: 82.33,
            feedback: {},
            metadata: {}
          }]
        });

      const result = await repository.saveAssessmentSession('user-123', session);

      expect(result.id).toBe('eval-123');
    });
  });

  describe('getAssessmentSessions', () => {
    it('returns empty array (TODO)', async () => {
      const result = await repository.getAssessmentSessions();
      expect(result).toEqual([]);
    });
  });

  describe('getLatestAssessmentResults', () => {
    it('returns null (TODO)', async () => {
      const result = await repository.getLatestAssessmentResults();
      expect(result).toBeNull();
    });
  });

  describe('addBadge', () => {
    it('adds badge to user', async () => {
      const badge: CreateBadgeDto = {
        badgeId: 'badge-123',
        name: 'First Steps',
        description: 'Complete first task',
        imageUrl: '/badges/first.png',
        category: 'progress',
        xpReward: 50
      };

      mockQuery.mockResolvedValue({
        rows: [{
          id: 'user-badge-123',
          userId: 'user-123',
          badgeId: 'badge-123',
          name: 'First Steps',
          description: 'Complete first task',
          imageUrl: '/badges/first.png',
          category: 'progress',
          xpReward: 50,
          unlockedAt: '2024-01-20T10:00:00Z',
          metadata: {}
        }]
      });

      const result = await repository.addBadge('user-123', badge);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_badges'),
        ['user-123', 'badge-123', 'First Steps', 'Complete first task', '/badges/first.png', 'progress', 50]
      );
      expect(result.name).toBe('First Steps');
    });
  });

  describe('getUserBadges', () => {
    it('returns empty array (TODO)', async () => {
      const result = await repository.getUserBadges();
      expect(result).toEqual([]);
    });
  });

  describe('getUserData', () => {
    it('gets existing user data', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      jest.spyOn(repository, 'getAssessmentSessions').mockResolvedValue([]);
      jest.spyOn(repository, 'getLatestAssessmentResults').mockResolvedValue(null);
      jest.spyOn(repository, 'getUserBadges').mockResolvedValue([]);

      const result = await repository.getUserData('test@example.com');

      expect(result).toBeDefined();
      expect(result?.version).toBe('3.0');
      expect(result?.achievements.totalXp).toBe(0);
      expect(result?.achievements.level).toBe(1);
    });

    it('auto-creates user if not exists', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // user not found
        .mockResolvedValueOnce({ rows: [{ ...mockUser, email: 'new@example.com', name: 'new' }] }); // created

      jest.spyOn(repository, 'getAssessmentSessions').mockResolvedValue([]);
      jest.spyOn(repository, 'getLatestAssessmentResults').mockResolvedValue(null);
      jest.spyOn(repository, 'getUserBadges').mockResolvedValue([]);

      const result = await repository.getUserData('new@example.com');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['new@example.com', 'new', 'en', '{}']
      );
      expect(result).toBeDefined();
    });
  });

  describe('saveUserData', () => {
    it('saves complete user data', async () => {
      const userData = {
        achievements: {
          level: 5,
          totalXp: 1500,
          badges: [{
            id: 'badge-123',
            name: 'Master',
            description: 'Master badge',
            imageUrl: '/badges/master.png',
            category: 'skill',
            xpReward: 500,
            unlockedAt: '2024-01-20T10:00:00Z'
          }]
        },
        assessmentSessions: [{
          id: 'session-123',
          results: {
            tech: 90,
            creative: 85,
            business: 88
          },
          answers: { q1: 'a' },
          generatedPaths: ['path1']
        }]
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] }); // find user
      mockClient.query.mockResolvedValue({}); // all operations succeed

      jest.spyOn(repository, 'update').mockResolvedValue({ ...mockUser, level: 5, totalXp: 1500 });
      jest.spyOn(repository, 'saveAssessmentSession').mockResolvedValue({
        id: 'eval-123',
        userId: 'user-123',
        sessionKey: 'session-123',
        techScore: 90,
        creativeScore: 85,
        businessScore: 88,
        answers: { q1: 'a' },
        generatedPaths: ['path1'],
        createdAt: '2024-01-20T10:00:00Z',
        metadata: {}
      });
      jest.spyOn(repository, 'addBadge').mockResolvedValue({
        id: 'user-badge-123',
        userId: 'user-123',
        badgeId: 'badge-123',
        name: 'Master',
        description: 'Master badge',
        imageUrl: '/badges/master.png',
        category: 'skill',
        xpReward: 500,
        unlockedAt: '2024-01-20T10:00:00Z',
        metadata: {}
      });
      jest.spyOn(repository, 'getUserData').mockResolvedValue({
        assessmentResults: null,
        achievements: {
          badges: [],
          totalXp: 1500,
          level: 5,
          completedTasks: [],
          achievements: []
        },
        assessmentSessions: [],
        lastUpdated: new Date().toISOString(),
        version: '3.0'
      });

      const result = await repository.saveUserData('test@example.com', userData);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result.version).toBe('3.0');
    });

    it('creates user if not exists', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // user not found
        .mockResolvedValueOnce({ rows: [mockUser] }); // created

      mockClient.query.mockResolvedValue({});
      jest.spyOn(repository, 'update').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'getUserData').mockResolvedValue({
        assessmentResults: null,
        achievements: {
          badges: [],
          totalXp: 0,
          level: 1,
          completedTasks: [],
          achievements: []
        },
        assessmentSessions: [],
        lastUpdated: new Date().toISOString(),
        version: '3.0'
      });

      await repository.saveUserData('new@example.com', {});

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['new@example.com', 'new', 'en', '{}']
      );
    });

    it('rollbacks on error', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
      jest.spyOn(repository, 'update').mockRejectedValue(new Error('Update failed'));

      await expect(repository.saveUserData('test@example.com', {
        achievements: { level: 5, totalXp: 1500 }
      })).rejects.toThrow('Update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteUserData', () => {
    it('deletes user data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
      jest.spyOn(repository, 'delete').mockResolvedValue(true);

      const result = await repository.deleteUserData('test@example.com');

      expect(result).toBe(true);
    });

    it('returns false when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.deleteUserData('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('handles query errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Connection lost'));

      await expect(repository.findById('user-123'))
        .rejects.toThrow('Connection lost');
    });
  });
});