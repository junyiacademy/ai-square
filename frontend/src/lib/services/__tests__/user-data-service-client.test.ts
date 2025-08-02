/**
 * User Data Service Client Tests
 * 提升覆蓋率從 0% 到 80%+
 */

import { UserDataServiceClient, createUserDataServiceClient } from '../user-data-service-client';
import type { UserData, AssessmentResults, UserAchievements, AssessmentSession } from '@/lib/types/user-data';

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation()
};

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('UserDataServiceClient', () => {
  let service: UserDataServiceClient;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  const mockUserData: UserData = {
    achievements: {
      badges: ['first-assessment'],
      totalXp: 100,
      level: 2,
      completedTasks: ['task-1', 'task-2']
    },
    assessmentSessions: [
      {
        id: 'session-1',
        scenarioId: 'ai-literacy',
        startedAt: '2024-01-20T10:00:00Z',
        completedAt: '2024-01-20T10:30:00Z',
        results: {
          totalQuestions: 20,
          correctAnswers: 18,
          score: 90,
          domains: {}
        }
      }
    ],
    assessmentResults: {
      totalQuestions: 20,
      correctAnswers: 18,
      score: 90,
      domains: {}
    },
    lastUpdated: '2024-01-20T10:30:00Z',
    version: '2.0'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserDataServiceClient();
    
    // Reset mock implementations
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
    consoleSpy.warn.mockClear();
  });

  describe('loadUserData', () => {
    it('should load user data from API successfully', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-session-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUserData })
      } as Response);

      const result = await service.loadUserData();

      expect(mockFetch).toHaveBeenCalledWith('/api/user-data', {
        headers: {
          'x-session-token': 'test-session-token'
        },
        credentials: 'include'
      });
      expect(result).toEqual(mockUserData);
    });

    it('should use cache when data is fresh', async () => {
      // First load
      mockLocalStorage.getItem.mockReturnValue('test-session-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUserData })
      } as Response);

      await service.loadUserData();
      
      // Second load within cache expiry
      const result = await service.loadUserData();

      // Should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUserData);
    });

    it('should handle 401 response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response);

      const result = await service.loadUserData();

      expect(result).toBeNull();
      expect(consoleSpy.log).toHaveBeenCalledWith('User not authenticated for user data API');
    });

    it('should return null for other error responses with localStorage fallback attempt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);
      mockLocalStorage.getItem.mockReturnValue(null); // No localStorage data

      const result = await service.loadUserData();

      expect(result).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalledWith('Failed to load user data:', expect.any(Error));
    });

    it('should fall back to localStorage when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // session token
        .mockReturnValueOnce(JSON.stringify(mockUserData)); // discoveryData

      const result = await service.loadUserData();

      expect(result).toEqual(mockUserData);
      expect(consoleSpy.log).toHaveBeenCalledWith('Loaded from localStorage fallback');
    });

    it('should handle no session token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUserData })
      } as Response);

      await service.loadUserData();

      expect(mockFetch).toHaveBeenCalledWith('/api/user-data', {
        headers: {},
        credentials: 'include'
      });
    });
  });

  describe('saveUserData', () => {
    it('should save user data successfully', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-session-token');
      mockFetch.mockResolvedValueOnce({
        ok: true
      } as Response);

      await service.saveUserData(mockUserData);

      expect(mockFetch).toHaveBeenCalledWith('/api/user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': 'test-session-token'
        },
        credentials: 'include',
        body: JSON.stringify({ data: mockUserData })
      });
    });

    it('should update cache after successful save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      } as Response);

      await service.saveUserData(mockUserData);
      
      // Load should return cached data
      const result = await service.loadUserData();
      expect(result).toEqual(mockUserData);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only save, not load
    });

    it('should throw error when save fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      await expect(service.saveUserData(mockUserData)).rejects.toThrow('Failed to save user data: 500');
    });
  });

  describe('userDataExists', () => {
    it('should return true when data exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUserData })
      } as Response);

      const exists = await service.userDataExists();
      expect(exists).toBe(true);
    });

    it('should return false when data does not exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null })
      } as Response);

      const exists = await service.userDataExists();
      expect(exists).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      // Load data to populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUserData })
      } as Response);
      await service.loadUserData();

      // Clear cache
      service.clearCache();

      // Next load should hit API again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUserData })
      } as Response);
      await service.loadUserData();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      // Mock successful API responses
      mockFetch.mockImplementation(async (url, options) => {
        if (options?.method === 'POST') {
          return { ok: true } as Response;
        }
        return {
          ok: true,
          json: async () => ({ success: true, data: mockUserData })
        } as Response;
      });
    });

    it('should save assessment results', async () => {
      const newResults: AssessmentResults = {
        totalQuestions: 30,
        correctAnswers: 28,
        score: 93,
        domains: { AI_Ethics: 95 }
      };

      await service.saveAssessmentResults(newResults);

      expect(mockFetch).toHaveBeenCalledWith('/api/user-data', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"score":93')
      }));
    });

    it('should save achievements', async () => {
      const newAchievements: UserAchievements = {
        badges: ['master-learner'],
        totalXp: 500,
        level: 5,
        completedTasks: ['task-1', 'task-2', 'task-3']
      };

      await service.saveAchievements(newAchievements);

      expect(mockFetch).toHaveBeenCalledWith('/api/user-data', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"level":5')
      }));
    });

    it('should add assessment session', async () => {
      const newSession: AssessmentSession = {
        id: 'session-2',
        scenarioId: 'ai-ethics',
        startedAt: '2024-01-21T10:00:00Z',
        completedAt: '2024-01-21T10:45:00Z',
        results: {
          totalQuestions: 25,
          correctAnswers: 23,
          score: 92,
          domains: {}
        }
      };

      await service.addAssessmentSession(newSession);

      expect(mockFetch).toHaveBeenCalledWith('/api/user-data', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('session-2')
      }));
    });

    it('should update achievements partially', async () => {
      await service.updateAchievements({ level: 3, totalXp: 200 });

      expect(mockFetch).toHaveBeenCalledWith('/api/user-data', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"level":3')
      }));
    });
  });

  describe('evaluation methods', () => {
    it('should warn that evaluation save is not implemented', async () => {
      await service.saveEvaluation('', '', {});
      expect(consoleSpy.warn).toHaveBeenCalledWith('Evaluation save not implemented in client service');
    });

    it('should warn that evaluation load is not implemented', async () => {
      const result = await service.loadEvaluation('', '');
      expect(result).toBeNull();
      expect(consoleSpy.warn).toHaveBeenCalledWith('Evaluation load not implemented in client service');
    });

    it('should warn that evaluation load by type is not implemented', async () => {
      const result = await service.loadEvaluationsByType('');
      expect(result).toEqual([]);
      expect(consoleSpy.warn).toHaveBeenCalledWith('Evaluation load by type not implemented in client service');
    });

    it('should warn that evaluation delete is not implemented', async () => {
      await service.deleteEvaluation('', '');
      expect(consoleSpy.warn).toHaveBeenCalledWith('Evaluation delete not implemented in client service');
    });
  });

  describe('utility methods', () => {
    it('should export data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUserData })
      } as Response);

      const exported = await service.exportData();
      expect(exported).toEqual(mockUserData);
    });

    it('should import data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      } as Response);

      await service.importData(mockUserData);

      expect(mockFetch).toHaveBeenCalledWith('/api/user-data', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ data: mockUserData })
      }));
    });

    it('should clear all data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      } as Response);

      await service.clearAllData();

      expect(mockFetch).toHaveBeenCalledWith('/api/user-data', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"level":1') // Default data has level 1
      }));
    });
  });

  describe('migrateFromLocalStorage', () => {
    it('should skip migration if data already exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUserData })
      } as Response);

      const result = await service.migrateFromLocalStorage();

      expect(result).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith('User data already exists, skipping migration');
    });

    it('should migrate data from localStorage', async () => {
      // First load returns no data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null })
      } as Response);

      // localStorage has data
      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // session token
        .mockReturnValueOnce(JSON.stringify(mockUserData)); // discoveryData

      // Save should succeed
      mockFetch.mockResolvedValueOnce({
        ok: true
      } as Response);

      const result = await service.migrateFromLocalStorage();

      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('discoveryData');
      expect(consoleSpy.log).toHaveBeenCalledWith('Successfully migrated data from localStorage');
    });

    it('should return false if no localStorage data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null })
      } as Response);

      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await service.migrateFromLocalStorage();

      expect(result).toBe(false);
      expect(consoleSpy.log).toHaveBeenCalledWith('No localStorage data to migrate');
    });

    it('should handle migration errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null })
      } as Response);

      mockLocalStorage.getItem
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(JSON.stringify(mockUserData));

      // Save fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const result = await service.migrateFromLocalStorage();

      expect(result).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith('Failed to migrate from localStorage:', expect.any(Error));
    });
  });

  describe('loadFromLocalStorage', () => {
    it('should handle localStorage parse errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockLocalStorage.getItem
        .mockReturnValueOnce(null)
        .mockReturnValueOnce('invalid json');

      const result = await service.loadUserData();

      expect(result).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalledWith('Failed to load from localStorage:', expect.any(Error));
    });
  });

  describe('factory function', () => {
    it('should create a new service instance', () => {
      const service1 = createUserDataServiceClient();
      const service2 = createUserDataServiceClient();

      expect(service1).toBeInstanceOf(UserDataServiceClient);
      expect(service2).toBeInstanceOf(UserDataServiceClient);
      expect(service1).not.toBe(service2); // Different instances
    });
  });
});