/**
 * Tests for ChatContextBuilderService
 * Builds context from user data, progress, and recommendations
 */

import { ChatContextBuilderService, type UserContext } from '../chat-context-builder.service';

// Mock Storage
const mockBucket = {
  file: jest.fn()
};

const mockFile = {
  exists: jest.fn(),
  download: jest.fn()
};

describe('ChatContextBuilderService', () => {
  let service: ChatContextBuilderService;

  beforeEach(() => {
    service = new ChatContextBuilderService(mockBucket as never);
    jest.clearAllMocks();
    mockBucket.file.mockReturnValue(mockFile);
  });

  describe('buildContext', () => {
    it('should build complete user context', async () => {
      const userData = {
        identity: 'teacher',
        goals: ['Learn AI basics', 'Integrate AI in teaching'],
        assessmentResult: {
          overallScore: 75,
          domainScores: {
            engaging_with_ai: 80,
            creating_with_ai: 70,
            understanding_ai: 55,
            ethics_of_ai: 85
          }
        },
        completedPBLs: ['pbl1', 'pbl2']
      };

      const memory = {
        shortTerm: {
          recentActivities: [{ type: 'assessment', timestamp: '2024-01-01T00:00:00Z' }],
          currentProgress: { currentPBL: 'pbl3' },
          recentTopics: ['Machine Learning', 'Neural Networks'],
          lastUpdated: '2024-01-01T00:00:00Z'
        },
        longTerm: {
          profile: { name: 'John' },
          learningStyle: 'visual',
          achievements: ['completed_assessment'],
          preferences: { language: 'zh' },
          lastUpdated: '2024-01-01T00:00:00Z'
        }
      };

      // Create separate mock files for each file access
      const userDataFile = {
        exists: jest.fn().mockResolvedValue([true]),
        download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify(userData))])
      };

      const shortTermFile = {
        exists: jest.fn().mockResolvedValue([true]),
        download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify(memory.shortTerm))])
      };

      const longTermFile = {
        exists: jest.fn().mockResolvedValue([true]),
        download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify(memory.longTerm))])
      };

      // Mock bucket.file to return appropriate mock based on path
      mockBucket.file.mockImplementation((path: string) => {
        if (path.includes('user_data.json')) return userDataFile;
        if (path.includes('short_term.json')) return shortTermFile;
        if (path.includes('long_term.json')) return longTermFile;
        return mockFile;
      });

      const result = await service.buildContext('user@test.com');

      expect(result).not.toBeNull();
      expect(result?.identity).toBe('teacher');
      expect(result?.goals).toEqual(['Learn AI basics', 'Integrate AI in teaching']);
      expect(result?.assessmentScore).toBe(75);
      expect(result?.domainScores).toEqual({
        engaging_with_ai: 80,
        creating_with_ai: 70,
        understanding_ai: 55,
        ethics_of_ai: 85
      });
      expect(result?.weakDomains).toEqual(['understanding_ai']); // < 60
      expect(result?.learningStyle).toBe('visual');
      expect(result?.completedPBLs).toEqual(['pbl1', 'pbl2']);
    });

    it('should identify weak domains correctly', async () => {
      const userData = {
        identity: 'student',
        goals: [],
        assessmentResult: {
          overallScore: 55,
          domainScores: {
            engaging_with_ai: 45,
            creating_with_ai: 58,
            understanding_ai: 62,
            ethics_of_ai: 75
          }
        }
      };

      mockFile.exists.mockResolvedValueOnce([true]); // user_data.json
      mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(userData))]);

      mockFile.exists.mockResolvedValueOnce([false]); // short_term.json
      mockFile.exists.mockResolvedValueOnce([false]); // long_term.json

      const result = await service.buildContext('user@test.com');

      expect(result?.weakDomains).toEqual(['engaging_with_ai', 'creating_with_ai']); // < 60
    });

    it('should return null if user data not found', async () => {
      mockFile.exists.mockResolvedValue([false]);

      const result = await service.buildContext('user@test.com');

      expect(result).toBeNull();
    });

    it('should handle missing assessment result', async () => {
      const userData = {
        identity: 'learner',
        goals: ['Explore AI']
      };

      mockFile.exists.mockResolvedValueOnce([true]); // user_data.json
      mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(userData))]);

      mockFile.exists.mockResolvedValueOnce([false]); // short_term.json
      mockFile.exists.mockResolvedValueOnce([false]); // long_term.json

      const result = await service.buildContext('user@test.com');

      expect(result).not.toBeNull();
      expect(result?.assessmentScore).toBeNull();
      expect(result?.domainScores).toEqual({});
      expect(result?.weakDomains).toEqual([]);
    });

    it('should use default values for missing memory', async () => {
      const userData = {
        identity: 'professional',
        goals: ['AI for business']
      };

      mockFile.exists.mockResolvedValueOnce([true]); // user_data.json
      mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(userData))]);

      mockFile.exists.mockResolvedValueOnce([false]); // short_term.json
      mockFile.exists.mockResolvedValueOnce([false]); // long_term.json

      const result = await service.buildContext('user@test.com');

      expect(result?.recentActivities).toEqual([]);
      expect(result?.learningStyle).toBe('balanced');
      expect(result?.completedPBLs).toEqual([]);
      expect(result?.currentProgress).toEqual({});
    });

    it('should handle partial memory data', async () => {
      const userData = {
        identity: 'student',
        goals: []
      };

      const partialMemory = {
        shortTerm: {
          recentActivities: [{ type: 'pbl' }],
          currentProgress: {},
          recentTopics: ['AI Ethics'],
          lastUpdated: '2024-01-01T00:00:00Z'
        }
      };

      mockFile.exists.mockResolvedValueOnce([true]); // user_data.json
      mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(userData))]);

      mockFile.exists.mockResolvedValueOnce([true]); // short_term.json
      mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(partialMemory.shortTerm))]);

      mockFile.exists.mockResolvedValueOnce([false]); // long_term.json

      const result = await service.buildContext('user@test.com');

      expect(result?.recentActivities).toEqual([{ type: 'pbl' }]);
      expect(result?.learningStyle).toBe('balanced'); // default from missing long-term
    });

    it('should handle download errors gracefully', async () => {
      mockFile.exists.mockResolvedValueOnce([true]); // user_data.json
      mockFile.download.mockRejectedValueOnce(new Error('Download failed'));

      const result = await service.buildContext('user@test.com');

      expect(result).toBeNull();
    });
  });

  describe('buildSystemPrompt', () => {
    it('should build comprehensive system prompt', () => {
      const context: UserContext = {
        identity: 'teacher',
        goals: ['Integrate AI in teaching', 'Learn AI tools'],
        assessmentScore: 75,
        domainScores: {
          engaging_with_ai: 80,
          creating_with_ai: 70,
          understanding_ai: 65,
          ethics_of_ai: 85
        },
        weakDomains: ['understanding_ai'],
        recentActivities: [],
        learningStyle: 'visual',
        completedPBLs: ['pbl1'],
        currentProgress: {}
      };

      const prompt = service.buildSystemPrompt(context);

      expect(prompt).toContain('AI learning advisor');
      expect(prompt).toContain('Identity: teacher');
      expect(prompt).toContain('Integrate AI in teaching, Learn AI tools');
      expect(prompt).toContain('75%');
      expect(prompt).toContain('understanding_ai');
      expect(prompt).toContain('visual');
      expect(prompt).toContain('supportive and encouraging');
    });

    it('should handle empty weak domains', () => {
      const context: UserContext = {
        identity: 'student',
        goals: [],
        assessmentScore: 90,
        domainScores: {
          engaging_with_ai: 95,
          creating_with_ai: 92,
          understanding_ai: 88,
          ethics_of_ai: 85
        },
        weakDomains: [],
        recentActivities: [],
        learningStyle: 'balanced',
        completedPBLs: [],
        currentProgress: {}
      };

      const prompt = service.buildSystemPrompt(context);

      expect(prompt).toContain('Weak Domains: None - all domains are strong!');
    });

    it('should handle null assessment score', () => {
      const context: UserContext = {
        identity: 'learner',
        goals: ['Start learning'],
        assessmentScore: null,
        domainScores: {},
        weakDomains: [],
        recentActivities: [],
        learningStyle: 'balanced',
        completedPBLs: [],
        currentProgress: {}
      };

      const prompt = service.buildSystemPrompt(context);

      expect(prompt).toContain('Not yet assessed');
    });
  });
});
