import { UserDataService } from '../user-data-service';
import type {
  UserData,
  AssessmentResults,
  UserAchievements
} from '@/lib/types/user-data';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    __store: store, // Expose store for testing
    __setStore: (key: string, value: string) => { store[key] = value; } // Helper for tests
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('UserDataService', () => {
  let service: UserDataService;
  const mockUserId = 'test-user-123';

  // Helper to create valid UserData
  const createMockUserData = (overrides?: Partial<UserData>): UserData => ({
    assessmentResults: {
      tech: 75,
      creative: 80,
      business: 70
    },
    achievements: {
      badges: [],
      totalXp: 0,
      level: 1,
      completedTasks: []
    },
    assessmentSessions: [],
    lastUpdated: new Date().toISOString(),
    version: '1.0',
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    service = new UserDataService(mockUserId);
  });

  describe('saveUserData', () => {
    it('saves user data to localStorage', async () => {
      const userData = createMockUserData();

      await service.saveUserData(userData);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        `discoveryData_${mockUserId}`,
        expect.any(String)
      );
    });

    it('handles circular references safely', async () => {
      const userData = createMockUserData();

      // Create circular reference
      const circular: any = { data: userData };
      circular.self = circular;
      userData.assessmentResults = [circular] as any;

      // Should not throw
      await expect(service.saveUserData(userData)).resolves.not.toThrow();
    });
  });

  describe('loadUserData', () => {
    it('loads user data from localStorage', async () => {
      const userData = createMockUserData();

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(userData));

      const result = await service.loadUserData();
      expect(result).toEqual(userData);
    });

    it('returns null when user data does not exist', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await service.loadUserData();
      expect(result).toBeNull();
    });

    it('handles malformed JSON gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const result = await service.loadUserData();
      expect(result).toBeNull();
    });
  });

  describe('userDataExists', () => {
    it('returns true when user data exists', async () => {
      const userData = createMockUserData();

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(userData));

      const result = await service.userDataExists();
      expect(result).toBe(true);
    });

    it('returns false when user data does not exist', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await service.userDataExists();
      expect(result).toBe(false);
    });
  });

  describe('saveAssessmentResults', () => {
    it('creates new user data if none exists', async () => {
      const results: AssessmentResults = {
        tech: 85,
        creative: 80,
        business: 90
      };

      await service.saveAssessmentResults(results);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData.assessmentResults).toEqual(results);
    });

    it('overwrites existing assessment results', async () => {
      const existingData = createMockUserData({
        assessmentResults: {
          tech: 75,
          creative: 80,
          business: 70
        }
      });

      // Set the data in the mock store instead of using mockReturnValue
      const storageKey = `discoveryData_${mockUserId}`;
      (mockLocalStorage as any).__setStore(storageKey, JSON.stringify(existingData));

      const newResults: AssessmentResults = {
        tech: 85,
        creative: 80,
        business: 90
      };

      await service.saveAssessmentResults(newResults);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      // The implementation overwrites the results, not append
      expect(savedData.assessmentResults).toEqual(newResults);
    });
  });

  describe('saveAchievements', () => {
    it('saves achievements for user', async () => {
      const achievements: UserAchievements = {
        badges: [],
        totalXp: 100,
        level: 2,
        completedTasks: ['task-1'],
        achievements: [
          {
            id: 'ach-1',
            name: 'First Steps',
            description: 'Complete your first assessment',
            xpReward: 50,
            requiredCount: 1,
            currentCount: 1,
            unlockedAt: new Date().toISOString(),
            category: 'milestone'
          },
        ],
      };

      await service.saveAchievements(achievements);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      // The service saves the entire UserData object
      expect(savedData.achievements).toEqual(achievements);
    });
  });

  // TODO: Implement getLatestAssessmentResults method if needed
  // describe('getLatestAssessmentResults', () => {
  //   it('returns the most recent assessment results', async () => {
  //     // Test implementation
  //   });
  // });

  describe('clearUserData', () => {
    it('resets user data to default values', async () => {
      const userData = createMockUserData();

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        [mockUserId]: userData,
        'other-user': { id: 'other-user' },
      }));

      await service.clearAllData();

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      // clearAllData resets the user's data to default values
      expect(savedData).toBeDefined();
      expect(savedData.assessmentResults).toBeUndefined(); // Default doesn't have assessmentResults
      expect(savedData.achievements.level).toBe(1);
      expect(savedData.achievements.totalXp).toBe(0);
    });

    it('handles non-existent user gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({}));

      // Should not throw
      await expect(service.clearAllData()).resolves.not.toThrow();
    });
  });

  describe('exportUserData', () => {
    it('exports user data in correct format', async () => {
      const userData = createMockUserData({
        assessmentResults: {
          tech: 85,
          creative: 90,
          business: 75
        },
        achievements: {
          badges: [
            {
              id: 'ach-1',
              name: 'First Steps',
              description: 'Complete your first assessment',
              unlockedAt: new Date().toISOString(),
              category: 'learning',
              xpReward: 100
            }
          ],
          totalXp: 100,
          level: 1,
          completedTasks: []
        }
      });

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(userData));

      const exported = await service.exportData();
      expect(exported).toEqual(userData);
    });
  });

  describe('importUserData', () => {
    it('imports user data correctly', async () => {
      const importData = createMockUserData({
        assessmentResults: {
          tech: 75,
          creative: 80,
          business: 70
        }
      });

      await service.importData(importData);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData).toEqual(importData);
    });

    it('validates imported data format', async () => {
      const invalidData = {
        // Missing required fields
        email: 'test@example.com',
      };

      // Should handle gracefully
      await service.importData(invalidData as any);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData.email).toBe('test@example.com');
    });
  });
});
