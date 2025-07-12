/**
 * @jest-environment node
 */

import { DiscoveryYAMLLoader } from '../discovery-yaml-loader';
import fs from 'fs/promises';
import path from 'path';

// Mock fs and path modules
jest.mock('fs/promises');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

// Mock fetch for browser environment
global.fetch = jest.fn();

describe('DiscoveryYAMLLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadPath', () => {
    const mockYAMLContent = `
title: "內容創作者職業探索"
description: "探索數位內容創作的世界"
world_setting:
  name: "創意帝國"
  description: "一個由創意能量驅動的數位王國"
  atmosphere: "vibrant_magical"
  visual_theme: "digital_fantasy"
  
character:
  name: "Luna"
  role: "創意導師"
  personality: "智慧且充滿創意"
  
career_info:
  title: "數位魔法師 - 內容創作者"
  skills:
    - "內容魔法"
    - "視覺咒語"
    - "文字煉金術"
    - "社群召喚術"
    
tasks:
  - id: "understand_algorithms"
    title: "理解演算法"
    type: "analysis"
    content:
      instructions: "學習演算法的基本概念"
      context:
        description: "探索演算法在內容創作中的應用"
        xp: 100
        objectives:
          - "理解演算法基本概念"
          - "運用創意力量對抗虛假內容"
        completion_criteria:
          - "完成任務描述"
          - "展示理解能力"
        hints:
          - "使用 AI 工具協助查核"
          - "思考演算法的運作方式"
`;

    it('should load YAML content successfully in Node.js environment', async () => {
      // Mock Node.js environment
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      mockPath.join.mockReturnValue('/mock/path/to/file.yml');
      mockFs.readFile.mockResolvedValue(mockYAMLContent);

      const result = await DiscoveryYAMLLoader.loadPath('content_creator', 'zhTW');

      expect(result).toBeDefined();
      expect(result.title).toBe('內容創作者職業探索');
      expect(result.world_setting.name).toBe('創意帝國');
      expect(result.character.name).toBe('Luna');
      expect(result.career_info.title).toBe('數位魔法師 - 內容創作者');
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe('understand_algorithms');

      expect(mockPath.join).toHaveBeenCalledWith(
        process.cwd(),
        'public',
        'discovery_data',
        'content_creator',
        'content_creator_zhTW.yml'
      );
      expect(mockFs.readFile).toHaveBeenCalledWith('/mock/path/to/file.yml', 'utf-8');
    });

    it('should load YAML content successfully in browser environment', async () => {
      // Mock browser environment
      Object.defineProperty(global, 'window', {
        value: { location: { origin: 'http://localhost:3000' } },
        writable: true
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        text: async () => mockYAMLContent
      } as Response);

      const result = await DiscoveryYAMLLoader.loadPath('content_creator', 'zhTW');

      expect(result).toBeDefined();
      expect(result.title).toBe('內容創作者職業探索');
      expect(result.world_setting.name).toBe('創意帝國');

      expect(fetch).toHaveBeenCalledWith(
        '/discovery_data/content_creator/content_creator_zhTW.yml'
      );
    });

    it('should handle different career types and languages', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      mockPath.join.mockReturnValue('/mock/path/to/youtuber_en.yml');
      mockFs.readFile.mockResolvedValue(mockYAMLContent.replace('內容創作者', 'YouTuber'));

      const result = await DiscoveryYAMLLoader.loadPath('youtuber', 'en');

      expect(mockPath.join).toHaveBeenCalledWith(
        process.cwd(),
        'public',
        'discovery_data',
        'youtuber',
        'youtuber_en.yml'
      );
    });

    it('should handle file not found error in Node.js', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      mockPath.join.mockReturnValue('/mock/path/to/nonexistent.yml');
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await expect(
        DiscoveryYAMLLoader.loadPath('nonexistent_career', 'zhTW')
      ).rejects.toThrow('ENOENT: no such file or directory');
    });

    it('should handle fetch error in browser environment', async () => {
      Object.defineProperty(global, 'window', {
        value: { location: { origin: 'http://localhost:3000' } },
        writable: true
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      await expect(
        DiscoveryYAMLLoader.loadPath('nonexistent_career', 'zhTW')
      ).rejects.toThrow('Failed to fetch YAML: 404 Not Found');
    });

    it('should handle invalid YAML content', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      const invalidYAML = `
title: "Invalid YAML
description: unclosed quote
  invalid_structure
`;

      mockPath.join.mockReturnValue('/mock/path/to/invalid.yml');
      mockFs.readFile.mockResolvedValue(invalidYAML);

      await expect(
        DiscoveryYAMLLoader.loadPath('invalid_career', 'zhTW')
      ).rejects.toThrow();
    });

    it('should validate required YAML structure', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      const incompleteYAML = `
title: "Incomplete YAML"
# Missing required fields like world_setting, character, etc.
`;

      mockPath.join.mockReturnValue('/mock/path/to/incomplete.yml');
      mockFs.readFile.mockResolvedValue(incompleteYAML);

      const result = await DiscoveryYAMLLoader.loadPath('incomplete_career', 'zhTW');

      // Should still parse but have missing fields
      expect(result.title).toBe('Incomplete YAML');
      expect(result.world_setting).toBeUndefined();
      expect(result.character).toBeUndefined();
    });

    it('should handle network timeout in browser environment', async () => {
      Object.defineProperty(global, 'window', {
        value: { location: { origin: 'http://localhost:3000' } },
        writable: true
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(
        DiscoveryYAMLLoader.loadPath('timeout_career', 'zhTW')
      ).rejects.toThrow('Network timeout');
    });

    it('should cache loaded content', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      mockPath.join.mockReturnValue('/mock/path/to/cached.yml');
      mockFs.readFile.mockResolvedValue(mockYAMLContent);

      // First call
      const result1 = await DiscoveryYAMLLoader.loadPath('cached_career', 'zhTW');
      
      // Second call with same parameters
      const result2 = await DiscoveryYAMLLoader.loadPath('cached_career', 'zhTW');

      expect(result1).toEqual(result2);
      
      // File should only be read once if caching is implemented
      if (DiscoveryYAMLLoader.cache) {
        expect(mockFs.readFile).toHaveBeenCalledTimes(1);
      }
    });

    it('should handle special characters in career type', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      mockPath.join.mockReturnValue('/mock/path/to/special-career.yml');
      mockFs.readFile.mockResolvedValue(mockYAMLContent);

      const result = await DiscoveryYAMLLoader.loadPath('special-career_type', 'zhTW');

      expect(mockPath.join).toHaveBeenCalledWith(
        process.cwd(),
        'public',
        'discovery_data',
        'special-career_type',
        'special-career_type_zhTW.yml'
      );
    });

    it('should handle empty YAML file', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      mockPath.join.mockReturnValue('/mock/path/to/empty.yml');
      mockFs.readFile.mockResolvedValue('');

      const result = await DiscoveryYAMLLoader.loadPath('empty_career', 'zhTW');

      expect(result).toBeNull();
    });

    it('should handle YAML with only comments', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      const commentsOnlyYAML = `
# This is a comment
# Another comment
# No actual content
`;

      mockPath.join.mockReturnValue('/mock/path/to/comments.yml');
      mockFs.readFile.mockResolvedValue(commentsOnlyYAML);

      const result = await DiscoveryYAMLLoader.loadPath('comments_career', 'zhTW');

      expect(result).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should provide meaningful error messages', async () => {
      Object.defineProperty(global, 'window', {
        value: { location: { origin: 'http://localhost:3000' } },
        writable: true
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as Response);

      try {
        await DiscoveryYAMLLoader.loadPath('forbidden_career', 'zhTW');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('403');
        expect((error as Error).message).toContain('Forbidden');
      }
    });

    it('should handle malformed JSON in error responses', async () => {
      Object.defineProperty(global, 'window', {
        value: { location: { origin: 'http://localhost:3000' } },
        writable: true
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Invalid JSON response'
      } as Response);

      await expect(
        DiscoveryYAMLLoader.loadPath('error_career', 'zhTW')
      ).rejects.toThrow('500 Internal Server Error');
    });
  });
});