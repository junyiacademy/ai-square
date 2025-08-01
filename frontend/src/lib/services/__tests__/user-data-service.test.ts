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
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('UserDataService', () => {
  let service: UserDataService;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    service = new UserDataService();
  });

  describe('saveUserData', () => {
    it('saves user data to localStorage', async () => {
      const userData: UserData = {
        id: mockUserId,
        email: 'test@example.com',
        assessmentResults: [],
        achievements: [],
        lastUpdated: new Date().toISOString(),
        assessmentSessions: [],
      };

      await service.saveUserData(mockUserId, userData);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('discoveryData'),
        expect.any(String)
      );
    });

    it('handles circular references safely', async () => {
      const userData: UserData = {
        id: mockUserId,
        email: 'test@example.com',
        assessmentResults: [],
        achievements: [],
        lastUpdated: new Date().toISOString(),
        assessmentSessions: [],
      };

      // Create circular reference
      const circular: any = { data: userData };
      circular.self = circular;
      userData.assessmentResults = [circular];

      // Should not throw
      await expect(service.saveUserData(mockUserId, userData)).resolves.not.toThrow();
    });
  });

  describe('loadUserData', () => {
    it('loads user data from localStorage', async () => {
      const userData: UserData = {
        id: mockUserId,
        email: 'test@example.com',
        assessmentResults: [],
        achievements: [],
        lastUpdated: new Date().toISOString(),
        assessmentSessions: [],
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ [mockUserId]: userData }));

      const result = await service.loadUserData(mockUserId);
      expect(result).toEqual(userData);
    });

    it('returns null when user data does not exist', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await service.loadUserData(mockUserId);
      expect(result).toBeNull();
    });

    it('handles malformed JSON gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const result = await service.loadUserData(mockUserId);
      expect(result).toBeNull();
    });
  });

  describe('hasUserData', () => {
    it('returns true when user data exists', async () => {
      const userData: UserData = {
        id: mockUserId,
        email: 'test@example.com',
        assessmentResults: [],
        achievements: [],
        lastUpdated: new Date().toISOString(),
        assessmentSessions: [],
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ [mockUserId]: userData }));

      const result = await service.hasUserData(mockUserId);
      expect(result).toBe(true);
    });

    it('returns false when user data does not exist', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await service.hasUserData(mockUserId);
      expect(result).toBe(false);
    });
  });

  describe('saveAssessmentResults', () => {
    it('creates new user data if none exists', async () => {
      const results: AssessmentResults = {
        userId: mockUserId,
        assessmentId: 'assessment-1',
        score: 85,
        domainScores: { 'AI_Literacy': 90 },
        timestamp: new Date().toISOString(),
        answers: [],
      };

      await service.saveAssessmentResults(results);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData[mockUserId].assessmentResults).toContainEqual(results);
    });

    it('appends to existing assessment results', async () => {
      const existingData: UserData = {
        id: mockUserId,
        email: 'test@example.com',
        assessmentResults: [
          {
            userId: mockUserId,
            assessmentId: 'assessment-1',
            score: 75,
            domainScores: { 'AI_Literacy': 80 },
            timestamp: new Date().toISOString(),
            answers: [],
          },
        ],
        achievements: [],
        lastUpdated: new Date().toISOString(),
        assessmentSessions: [],
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ [mockUserId]: existingData }));

      const newResults: AssessmentResults = {
        userId: mockUserId,
        assessmentId: 'assessment-2',
        score: 85,
        domainScores: { 'AI_Literacy': 90 },
        timestamp: new Date().toISOString(),
        answers: [],
      };

      await service.saveAssessmentResults(newResults);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData[mockUserId].assessmentResults).toHaveLength(2);
      expect(savedData[mockUserId].assessmentResults[1]).toEqual(newResults);
    });
  });

  describe('saveAchievements', () => {
    it('saves achievements for user', async () => {
      const achievements: UserAchievements = {
        userId: mockUserId,
        badges: [],
        points: 100,
        level: 2,
        achievements: [
          {
            id: 'ach-1',
            name: 'First Steps',
            description: 'Complete your first assessment',
            earnedAt: new Date().toISOString(),
            type: 'milestone',
          },
        ],
      };

      await service.saveAchievements(achievements);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData[mockUserId].achievements).toEqual(achievements.achievements);
    });
  });

  describe('getLatestAssessmentResults', () => {
    it('returns the most recent assessment results', async () => {
      const oldResults: AssessmentResults = {
        userId: mockUserId,
        assessmentId: 'assessment-1',
        score: 75,
        domainScores: { 'AI_Literacy': 80 },
        timestamp: '2024-01-01T00:00:00Z',
        answers: [],
      };

      const newResults: AssessmentResults = {
        userId: mockUserId,
        assessmentId: 'assessment-2',
        score: 85,
        domainScores: { 'AI_Literacy': 90 },
        timestamp: '2024-01-02T00:00:00Z',
        answers: [],
      };

      const userData: UserData = {
        id: mockUserId,
        email: 'test@example.com',
        assessmentResults: [oldResults, newResults],
        achievements: [],
        lastUpdated: new Date().toISOString(),
        assessmentSessions: [],
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ [mockUserId]: userData }));

      const result = await service.getLatestAssessmentResults(mockUserId);
      expect(result).toEqual(newResults);
    });

    it('returns null when no assessment results exist', async () => {
      const userData: UserData = {
        id: mockUserId,
        email: 'test@example.com',
        assessmentResults: [],
        achievements: [],
        lastUpdated: new Date().toISOString(),
        assessmentSessions: [],
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ [mockUserId]: userData }));

      const result = await service.getLatestAssessmentResults(mockUserId);
      expect(result).toBeNull();
    });
  });

  describe('clearUserData', () => {
    it('removes all user data from storage', async () => {
      const userData: UserData = {
        id: mockUserId,
        email: 'test@example.com',
        assessmentResults: [],
        achievements: [],
        lastUpdated: new Date().toISOString(),
        assessmentSessions: [],
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ 
        [mockUserId]: userData,
        'other-user': { id: 'other-user' },
      }));

      await service.clearUserData(mockUserId);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData[mockUserId]).toBeUndefined();
      expect(savedData['other-user']).toBeDefined();
    });

    it('handles non-existent user gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({}));

      // Should not throw
      await expect(service.clearUserData(mockUserId)).resolves.not.toThrow();
    });
  });

  describe('exportUserData', () => {
    it('exports user data in correct format', async () => {
      const userData: UserData = {
        id: mockUserId,
        email: 'test@example.com',
        assessmentResults: [
          {
            userId: mockUserId,
            assessmentId: 'assessment-1',
            score: 85,
            domainScores: { 'AI_Literacy': 90 },
            timestamp: new Date().toISOString(),
            answers: [],
          },
        ],
        achievements: [
          {
            id: 'ach-1',
            name: 'First Steps',
            description: 'Complete your first assessment',
            earnedAt: new Date().toISOString(),
            type: 'milestone',
          },
        ],
        lastUpdated: new Date().toISOString(),
        assessmentSessions: [],
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ [mockUserId]: userData }));

      const exported = await service.exportUserData(mockUserId);
      expect(exported).toEqual(userData);
    });
  });

  describe('importUserData', () => {
    it('imports user data correctly', async () => {
      const importData: UserData = {
        id: mockUserId,
        email: 'imported@example.com',
        assessmentResults: [],
        achievements: [],
        lastUpdated: new Date().toISOString(),
        assessmentSessions: [],
      };

      await service.importUserData(mockUserId, importData);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData[mockUserId]).toEqual(importData);
    });

    it('validates imported data format', async () => {
      const invalidData = {
        // Missing required fields
        email: 'test@example.com',
      };

      // Should handle gracefully
      await service.importUserData(mockUserId, invalidData as any);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData[mockUserId].id).toBe(mockUserId);
    });
  });
});
