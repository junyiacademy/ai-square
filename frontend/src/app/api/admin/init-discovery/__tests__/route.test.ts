import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// Mock the repository factory
const mockFindByMode = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: () => ({
      findByMode: mockFindByMode,
      create: mockCreate,
      update: mockUpdate,
    })
  }
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
}));

// Mock yaml
jest.mock('js-yaml', () => ({
  load: jest.fn(),
}));

import fs from 'fs/promises';
import yaml from 'js-yaml';

describe('/api/admin/init-discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should initialize Discovery scenarios from YAML files', async () => {
      // Mock directory structure
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['app_developer', 'data_analyst']) // career directories
        .mockResolvedValueOnce(['app_developer_en.yml', 'app_developer_zh.yml']) // files in first dir
        .mockResolvedValueOnce(['data_analyst_en.yml', 'data_analyst_zh.yml']); // files in second dir

      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      // Mock YAML file contents
      const mockYamlData = {
        path_id: 'app_developer',
        category: 'technology',
        difficulty_range: 'beginner_to_expert',
        metadata: {
          title: 'Digital Craftsman - App Developer',
          short_description: 'Craft life-changing applications',
          estimated_hours: 60,
          skill_focus: ['code_weaving', 'interface_sculpting']
        },
        career_path: {
          stages: [],
          milestones: []
        }
      };

      (fs.readFile as jest.Mock).mockResolvedValue('yaml content');
      (yaml.load as jest.Mock).mockReturnValue(mockYamlData);

      // Mock repository
      mockFindByMode.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ id: 'created-discovery-id' });

      const request = new NextRequest('http://localhost:3001/api/admin/init-discovery', {
        method: 'POST',
        body: JSON.stringify({ force: false })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.results.scanned).toBe(2);
      expect(result.results.created).toBe(2);
      expect(result.results.errors).toEqual([]);
    });

    it('should handle existing discovery scenarios when force is false', async () => {
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['app_developer'])
        .mockResolvedValueOnce(['app_developer_en.yml']);

      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const mockYamlData = {
        path_id: 'app_developer',
        metadata: { title: 'App Developer' }
      };

      (fs.readFile as jest.Mock).mockResolvedValue('yaml content');
      (yaml.load as jest.Mock).mockReturnValue(mockYamlData);

      // Mock existing scenario
      mockFindByMode.mockResolvedValue([
        { sourceId: 'app_developer' }
      ]);

      const request = new NextRequest('http://localhost:3001/api/admin/init-discovery', {
        method: 'POST',
        body: JSON.stringify({ force: false })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.results.existing).toBe(1);
      expect(result.results.created).toBe(0);
    });

    it('should handle missing discovery data directory', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Directory not found'));

      const request = new NextRequest('http://localhost:3001/api/admin/init-discovery', {
        method: 'POST',
        body: JSON.stringify({ force: false })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Discovery data directory not found');
    });

    it('should handle YAML parsing errors', async () => {
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['invalid_career'])
        .mockResolvedValueOnce(['invalid_career_en.yml']);

      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readFile as jest.Mock).mockResolvedValue('invalid yaml');
      (yaml.load as jest.Mock).mockReturnValue(null); // Invalid YAML

      mockFindByMode.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3001/api/admin/init-discovery', {
        method: 'POST',
        body: JSON.stringify({ force: false })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.results.errors).toHaveLength(1);
      expect(result.results.errors[0]).toContain('No path_id in invalid_career');
    });
  });

  describe('GET', () => {
    it('should return Discovery scenarios status', async () => {
      const mockScenarios = [
        {
          id: 'discovery-1',
          title: { en: 'App Developer' },
          sourcePath: 'discovery_data/app_developer',
          status: 'active'
        },
        {
          id: 'discovery-2',
          title: { en: 'Data Analyst' },
          sourcePath: 'discovery_data/data_analyst',
          status: 'active'
        }
      ];

      mockFindByMode.mockResolvedValue(mockScenarios);

      const response = await GET();
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.scenarios).toHaveLength(2);
    });

    it('should handle repository errors in GET', async () => {
      mockFindByMode.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check Discovery status');
    });
  });
});
