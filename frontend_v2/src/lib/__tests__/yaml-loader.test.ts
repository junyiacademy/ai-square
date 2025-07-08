import { yamlLoader } from '../yaml-loader';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('js-yaml');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;
const mockPath = path as jest.Mocked<typeof path>;

describe('YAMLLoader', () => {
  const mockYamlContent = `
domains:
  test_domain:
    name: Test Domain
    description: Test description
`;

  const mockParsedData = {
    domains: {
      test_domain: {
        name: 'Test Domain',
        description: 'Test description'
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    yamlLoader.clearCache();
    
    // Setup default mocks
    mockPath.join.mockImplementation((...args) => args.join('/'));
    process.cwd = jest.fn().mockReturnValue('/test/project');
  });

  describe('load', () => {
    it('should load and parse YAML file successfully', async () => {
      mockFs.readFile.mockResolvedValue(mockYamlContent);
      mockYaml.load.mockReturnValue(mockParsedData);

      const result = await yamlLoader.load('test.yaml');

      expect(mockPath.join).toHaveBeenCalledWith('/test/project', 'public', 'rubrics_data', 'test.yaml');
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/project/public/rubrics_data/test.yaml', 'utf-8');
      expect(mockYaml.load).toHaveBeenCalledWith(mockYamlContent);
      expect(result).toEqual(mockParsedData);
    });

    it('should return cached data on subsequent calls', async () => {
      mockFs.readFile.mockResolvedValue(mockYamlContent);
      mockYaml.load.mockReturnValue(mockParsedData);

      // First call
      const result1 = await yamlLoader.load('test.yaml');
      // Second call
      const result2 = await yamlLoader.load('test.yaml');

      expect(mockFs.readFile).toHaveBeenCalledTimes(1); // Only called once
      expect(result1).toBe(result2); // Same reference
    });

    it('should handle multiple concurrent requests for the same file', async () => {
      let resolveRead: (value: string) => void;
      const readPromise = new Promise<string>((resolve) => {
        resolveRead = resolve;
      });
      
      mockFs.readFile.mockReturnValue(readPromise);
      mockYaml.load.mockReturnValue(mockParsedData);

      // Start multiple concurrent loads
      const promise1 = yamlLoader.load('concurrent.yaml');
      const promise2 = yamlLoader.load('concurrent.yaml');
      const promise3 = yamlLoader.load('concurrent.yaml');

      // Resolve the read
      resolveRead!(mockYamlContent);

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // Should only read file once
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should handle file read errors', async () => {
      const error = new Error('File not found');
      mockFs.readFile.mockRejectedValue(error);

      await expect(yamlLoader.load('missing.yaml')).rejects.toThrow('File not found');
    });

    it('should handle YAML parse errors', async () => {
      mockFs.readFile.mockResolvedValue('invalid: yaml: content:');
      mockYaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      await expect(yamlLoader.load('invalid.yaml')).rejects.toThrow('Invalid YAML');
    });
  });

  describe('clearCache', () => {
    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(mockYamlContent);
      mockYaml.load.mockReturnValue(mockParsedData);
      
      // Load some data into cache
      await yamlLoader.load('test1.yaml');
      await yamlLoader.load('test2.yaml');
    });

    it('should clear specific file from cache', async () => {
      yamlLoader.clearCache('test1.yaml');

      // test1.yaml should be reloaded
      await yamlLoader.load('test1.yaml');
      expect(mockFs.readFile).toHaveBeenCalledTimes(3); // 2 initial + 1 reload

      // test2.yaml should still be cached
      await yamlLoader.load('test2.yaml');
      expect(mockFs.readFile).toHaveBeenCalledTimes(3); // No additional read
    });

    it('should clear all cache when no filename provided', async () => {
      yamlLoader.clearCache();

      // Both files should be reloaded
      await yamlLoader.load('test1.yaml');
      await yamlLoader.load('test2.yaml');
      
      expect(mockFs.readFile).toHaveBeenCalledTimes(4); // 2 initial + 2 reloads
    });
  });

  describe('preload', () => {
    it('should load multiple files in parallel', async () => {
      mockFs.readFile.mockResolvedValue(mockYamlContent);
      mockYaml.load.mockReturnValue(mockParsedData);

      const fileNames = ['file1.yaml', 'file2.yaml', 'file3.yaml'];
      await yamlLoader.preload(fileNames);

      expect(mockFs.readFile).toHaveBeenCalledTimes(3);
      fileNames.forEach(fileName => {
        expect(mockFs.readFile).toHaveBeenCalledWith(
          `/test/project/public/rubrics_data/${fileName}`,
          'utf-8'
        );
      });
    });

    it('should handle partial failures in preload', async () => {
      mockFs.readFile
        .mockResolvedValueOnce(mockYamlContent)
        .mockRejectedValueOnce(new Error('File not found'))
        .mockResolvedValueOnce(mockYamlContent);
      mockYaml.load.mockReturnValue(mockParsedData);

      await expect(yamlLoader.preload(['file1.yaml', 'missing.yaml', 'file3.yaml']))
        .rejects.toThrow('File not found');

      // Should still have loaded the successful files
      const result1 = await yamlLoader.load('file1.yaml');
      expect(result1).toEqual(mockParsedData);
      expect(mockFs.readFile).toHaveBeenCalledTimes(3); // 3 from preload, file1 was cached
    });

    it('should handle empty array', async () => {
      await yamlLoader.preload([]);
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('production preload', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should not preload in non-production environment', () => {
      process.env.NODE_ENV = 'development';
      
      // Re-import to trigger module initialization
      jest.resetModules();
      require('../yaml-loader');
      
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });
  });
});