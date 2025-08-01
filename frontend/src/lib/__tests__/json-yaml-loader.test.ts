import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { jsonYamlLoader } from '../json-yaml-loader';

// Mock dependencies
jest.mock('fs');
jest.mock('js-yaml');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;

describe('jsonYamlLoader', () => {
  const mockJsonData = { type: 'json', value: 'test' };
  const mockYamlData = { type: 'yaml', value: 'test' };
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('load', () => {
    it('loads JSON file when preferJson is true', async () => {
      mockFs.readFileSync.mockReturnValueOnce(JSON.stringify(mockJsonData));

      const result = await jsonYamlLoader.load('test-data.json');

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'public', 'test-data.json'),
        'utf-8'
      );
      expect(result).toEqual(mockJsonData);
    });

    it('falls back to YAML when JSON is not found', async () => {
      mockFs.readFileSync
        .mockImplementationOnce(() => {
          throw new Error('File not found');
        })
        .mockReturnValueOnce('type: yaml\nvalue: test');
      mockYaml.load.mockReturnValueOnce(mockYamlData);

      const result = await jsonYamlLoader.load('test-data.json', {
        preferJson: true,
        fallbackToYaml: true,
      });

      expect(mockFs.readFileSync).toHaveBeenCalledTimes(2);
      expect(mockYaml.load).toHaveBeenCalledWith('type: yaml\nvalue: test');
      expect(result).toEqual(mockYamlData);
    });

    it('tries .yml extension when .yaml is not found', async () => {
      mockFs.readFileSync
        .mockImplementationOnce(() => {
          throw new Error('File not found');
        })
        .mockImplementationOnce(() => {
          throw new Error('File not found');
        })
        .mockReturnValueOnce('type: yaml\nvalue: test');
      mockYaml.load.mockReturnValueOnce(mockYamlData);

      const result = await jsonYamlLoader.load('test-data', {
        preferJson: true,
        fallbackToYaml: true,
      });

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'public', 'test-data.yml'),
        'utf-8'
      );
      expect(result).toEqual(mockYamlData);
    });

    it('loads YAML first when preferJson is false', async () => {
      mockFs.readFileSync.mockReturnValueOnce('type: yaml\nvalue: test');
      mockYaml.load.mockReturnValueOnce(mockYamlData);

      const result = await jsonYamlLoader.load('test-data', {
        preferJson: false,
      });

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'public', 'test-data.yaml'),
        'utf-8'
      );
      expect(result).toEqual(mockYamlData);
    });

    it('returns null when no files are found', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await jsonYamlLoader.load('non-existent');

      expect(result).toBeNull();
    });

    it('strips file extensions from input path', async () => {
      mockFs.readFileSync.mockReturnValueOnce(JSON.stringify(mockJsonData));

      await jsonYamlLoader.load('test-data.yaml');

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'public', 'test-data.json'),
        'utf-8'
      );
    });
  });

  describe('loadJson', () => {
    it('loads and parses JSON file successfully', async () => {
      mockFs.readFileSync.mockReturnValueOnce(JSON.stringify(mockJsonData));

      const result = await jsonYamlLoader.loadJson('data.json');

      expect(result).toEqual(mockJsonData);
    });

    it('returns null on file read error', async () => {
      mockFs.readFileSync.mockImplementationOnce(() => {
        throw new Error('ENOENT: no such file');
      });

      const result = await jsonYamlLoader.loadJson('missing.json');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error loading JSON file:',
        expect.any(Error)
      );
    });

    it('returns null on JSON parse error', async () => {
      mockFs.readFileSync.mockReturnValueOnce('invalid json');

      const result = await jsonYamlLoader.loadJson('invalid.json');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error loading JSON file:',
        expect.any(Error)
      );
    });
  });

  describe('loadYaml', () => {
    it('loads and parses YAML file successfully', async () => {
      mockFs.readFileSync.mockReturnValueOnce('type: yaml\nvalue: test');
      mockYaml.load.mockReturnValueOnce(mockYamlData);

      const result = await jsonYamlLoader.loadYaml('data.yaml');

      expect(result).toEqual(mockYamlData);
    });

    it('returns null on file read error', async () => {
      mockFs.readFileSync.mockImplementationOnce(() => {
        throw new Error('ENOENT: no such file');
      });

      const result = await jsonYamlLoader.loadYaml('missing.yaml');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error loading YAML file:',
        expect.any(Error)
      );
    });

    it('returns null on YAML parse error', async () => {
      mockFs.readFileSync.mockReturnValueOnce('invalid: yaml: content');
      mockYaml.load.mockImplementationOnce(() => {
        throw new Error('YAML parse error');
      });

      const result = await jsonYamlLoader.loadYaml('invalid.yaml');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error loading YAML file:',
        expect.any(Error)
      );
    });
  });

  describe('loadAll', () => {
    it('loads all matching files from directory', async () => {
      mockFs.readdirSync.mockReturnValueOnce(['file1.json', 'file2.yaml', 'file3.yml', 'other.txt'] as any);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({ id: 1 }))
        .mockReturnValueOnce('id: 2')
        .mockReturnValueOnce('id: 3');
      mockYaml.load
        .mockReturnValueOnce({ id: 2 })
        .mockReturnValueOnce({ id: 3 });

      const result = await jsonYamlLoader.loadAll('test-dir');

      expect(mockFs.readdirSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'public', 'test-dir')
      );
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('filters out files that fail to load', async () => {
      mockFs.readdirSync.mockReturnValueOnce(['good.json', 'bad.json'] as any);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({ id: 1 }))
        .mockImplementationOnce(() => {
          throw new Error('Read error');
        });

      const result = await jsonYamlLoader.loadAll('test-dir');

      expect(result).toEqual([{ id: 1 }]);
    });

    it('returns empty array when directory does not exist', async () => {
      mockFs.readdirSync.mockImplementationOnce(() => {
        throw new Error('ENOENT: no such directory');
      });

      const result = await jsonYamlLoader.loadAll('missing-dir');

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error loading directory:',
        expect.any(Error)
      );
    });
  });
});
