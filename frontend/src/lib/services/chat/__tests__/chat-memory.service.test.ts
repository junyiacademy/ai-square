/**
 * Tests for ChatMemoryService
 * Manages user conversation memory and history
 */

import { ChatMemoryService } from '../chat-memory.service';

// Mock Storage
const mockBucket = {
  file: jest.fn()
};

const mockFile = {
  exists: jest.fn(),
  download: jest.fn(),
  save: jest.fn()
};

describe('ChatMemoryService', () => {
  let service: ChatMemoryService;

  beforeEach(() => {
    service = new ChatMemoryService(mockBucket as never);
    jest.clearAllMocks();
    mockBucket.file.mockReturnValue(mockFile);
  });

  describe('updateShortTermMemory', () => {
    it('should add new topic to recent topics', async () => {
      const existingMemory = {
        recentActivities: [],
        currentProgress: {},
        recentTopics: ['Topic 1', 'Topic 2'],
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      mockFile.exists.mockResolvedValueOnce([true]); // short_term.json
      mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(existingMemory))]);

      mockFile.exists.mockResolvedValueOnce([false]); // long_term.json (for getUserMemory)
      mockFile.save.mockResolvedValue(undefined);

      await service.updateShortTermMemory('user@test.com', 'New AI topic discussion');

      expect(mockFile.save).toHaveBeenCalled();
      const savedData = JSON.parse(mockFile.save.mock.calls[0][0]);
      expect(savedData.recentTopics).toHaveLength(3);
      expect(savedData.recentTopics[0]).toBe('New AI topic discussion');
      expect(savedData.recentTopics).toContain('Topic 1');
      expect(savedData.recentTopics).toContain('Topic 2');
    });

    it('should truncate message to 100 chars', async () => {
      const existingMemory = {
        recentActivities: [],
        currentProgress: {},
        recentTopics: [],
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      mockFile.exists.mockResolvedValueOnce([true]);
      mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(existingMemory))]);
      mockFile.exists.mockResolvedValueOnce([false]); // long_term.json
      mockFile.save.mockResolvedValue(undefined);

      const longMessage = 'a'.repeat(200);
      await service.updateShortTermMemory('user@test.com', longMessage);

      const savedData = JSON.parse(mockFile.save.mock.calls[0][0]);
      expect(savedData.recentTopics[0]).toHaveLength(100);
      expect(savedData.recentTopics[0]).toBe('a'.repeat(100));
    });

    it('should limit recent topics to 10', async () => {
      const existingMemory = {
        recentActivities: [],
        currentProgress: {},
        recentTopics: Array.from({ length: 10 }, (_, i) => `Topic ${i + 1}`),
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      mockFile.exists.mockResolvedValueOnce([true]);
      mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(existingMemory))]);
      mockFile.exists.mockResolvedValueOnce([false]); // long_term.json
      mockFile.save.mockResolvedValue(undefined);

      await service.updateShortTermMemory('user@test.com', 'New Topic');

      const savedData = JSON.parse(mockFile.save.mock.calls[0][0]);
      expect(savedData.recentTopics).toHaveLength(10);
      expect(savedData.recentTopics[0]).toBe('New Topic');
      expect(savedData.recentTopics).not.toContain('Topic 10'); // Oldest removed
    });

    it('should create new memory if not exists', async () => {
      mockFile.exists.mockResolvedValue([false]);
      mockFile.save.mockResolvedValue(undefined);

      await service.updateShortTermMemory('user@test.com', 'First topic');

      expect(mockFile.save).toHaveBeenCalled();
      const savedData = JSON.parse(mockFile.save.mock.calls[0][0]);
      expect(savedData.recentTopics).toEqual(['First topic']);
      expect(savedData.recentActivities).toEqual([]);
      expect(savedData.currentProgress).toEqual({});
    });

    it('should update lastUpdated timestamp', async () => {
      const existingMemory = {
        recentActivities: [],
        currentProgress: {},
        recentTopics: [],
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      mockFile.exists.mockResolvedValueOnce([true]);
      mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(existingMemory))]);
      mockFile.exists.mockResolvedValueOnce([false]); // long_term.json
      mockFile.save.mockResolvedValue(undefined);

      const beforeTime = new Date().toISOString();
      await service.updateShortTermMemory('user@test.com', 'Test');
      const afterTime = new Date().toISOString();

      const savedData = JSON.parse(mockFile.save.mock.calls[0][0]);
      expect(savedData.lastUpdated).toBeDefined();
      expect(savedData.lastUpdated >= beforeTime).toBe(true);
      expect(savedData.lastUpdated <= afterTime).toBe(true);
    });

    it('should handle storage errors gracefully', async () => {
      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(
        service.updateShortTermMemory('user@test.com', 'Test')
      ).resolves.not.toThrow();
    });
  });

  describe('getUserMemory', () => {
    it('should retrieve both short-term and long-term memory', async () => {
      const shortTerm = {
        recentActivities: [{ type: 'chat' }],
        currentProgress: { pbl: 'pbl1' },
        recentTopics: ['AI'],
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      const longTerm = {
        profile: { name: 'John' },
        learningStyle: 'visual',
        achievements: ['badge1'],
        preferences: { lang: 'zh' },
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      // Create separate mocks for each file
      const shortTermFile = {
        exists: jest.fn().mockResolvedValue([true]),
        download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify(shortTerm))])
      };

      const longTermFile = {
        exists: jest.fn().mockResolvedValue([true]),
        download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify(longTerm))])
      };

      mockBucket.file.mockImplementation((path: string) => {
        if (path.includes('short_term.json')) return shortTermFile;
        if (path.includes('long_term.json')) return longTermFile;
        return mockFile;
      });

      const result = await service.getUserMemory('user@test.com');

      expect(result).not.toBeNull();
      expect(result?.shortTerm).toEqual(shortTerm);
      expect(result?.longTerm).toEqual(longTerm);
    });

    it('should use default values for missing memory files', async () => {
      mockFile.exists.mockResolvedValue([false]);

      const result = await service.getUserMemory('user@test.com');

      expect(result).not.toBeNull();
      expect(result?.shortTerm.recentActivities).toEqual([]);
      expect(result?.shortTerm.recentTopics).toEqual([]);
      expect(result?.longTerm.learningStyle).toBe('');
      expect(result?.longTerm.achievements).toEqual([]);
    });

    it('should handle partial memory data', async () => {
      const shortTerm = {
        recentActivities: [{ type: 'assessment' }],
        currentProgress: {},
        recentTopics: [],
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      // Create separate mocks
      const shortTermFile = {
        exists: jest.fn().mockResolvedValue([true]),
        download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify(shortTerm))])
      };

      const longTermFile = {
        exists: jest.fn().mockResolvedValue([false]),
        download: jest.fn()
      };

      mockBucket.file.mockImplementation((path: string) => {
        if (path.includes('short_term.json')) return shortTermFile;
        if (path.includes('long_term.json')) return longTermFile;
        return mockFile;
      });

      const result = await service.getUserMemory('user@test.com');

      expect(result?.shortTerm).toEqual(shortTerm);
      expect(result?.longTerm.achievements).toEqual([]);
    });

    it('should return null on error', async () => {
      mockFile.exists.mockRejectedValue(new Error('Storage error'));

      const result = await service.getUserMemory('user@test.com');

      expect(result).toBeNull();
    });
  });

  describe('sanitizeEmail', () => {
    it('should sanitize email for file path', () => {
      // Access private method through type assertion
      const sanitized = (service as unknown as { sanitizeEmail: (email: string) => string }).sanitizeEmail('user@test.com');
      expect(sanitized).toBe('user_at_test_com');
    });

    it('should handle multiple dots', () => {
      const sanitized = (service as unknown as { sanitizeEmail: (email: string) => string }).sanitizeEmail('user.name@test.co.uk');
      expect(sanitized).toBe('user_name_at_test_co_uk');
    });
  });
});
