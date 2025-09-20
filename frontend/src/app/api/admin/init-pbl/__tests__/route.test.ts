import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// Mock the repository factory
const mockFindByMode = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockTaskCreate = jest.fn();
const mockTaskFindByScenario = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: () => ({
      findByMode: mockFindByMode,
      create: mockCreate,
      update: mockUpdate,
    }),
    getTaskRepository: () => ({
      create: mockTaskCreate,
      findByScenario: mockTaskFindByScenario,
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

describe('/api/admin/init-pbl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default task repository behavior
    mockTaskFindByScenario.mockResolvedValue([]);
    mockTaskCreate.mockResolvedValue({ id: 'created-task-id' });
  });

  describe('POST', () => {
    it('should initialize PBL scenarios from YAML files', async () => {
      // Mock directory structure
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['ai_job_search', 'ai_education']) // main directories
        .mockResolvedValueOnce(['ai_job_search_en.yaml', 'ai_job_search_zh.yaml']) // files in first dir
        .mockResolvedValueOnce(['ai_education_en.yaml', 'ai_education_zh.yaml']); // files in second dir

      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      // Mock YAML file contents
      const mockYamlData = {
        scenario_info: {
          id: 'test-scenario',
          title: 'Test Scenario',
          description: 'Test Description',
          learning_objectives: ['Learn AI basics'],
        },
        tasks: [
          { id: 'task1', title: { en: 'Task 1' }, type: 'question' }
        ],
      };

      (fs.readFile as jest.Mock).mockResolvedValue('yaml content');
      (yaml.load as jest.Mock).mockReturnValue(mockYamlData);

      // Mock repository
      mockFindByMode.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ id: 'created-scenario-id' });

      const request = new NextRequest('http://localhost:3001/api/admin/init-pbl', {
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

    it('should handle existing scenarios when force is false', async () => {
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['ai_job_search'])
        .mockResolvedValueOnce(['ai_job_search_en.yaml']);

      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const mockYamlData = {
        scenario_info: {
          id: 'existing-scenario',
          title: 'Existing Scenario',
          description: 'Test Description',
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue('yaml content');
      (yaml.load as jest.Mock).mockReturnValue(mockYamlData);

      // Mock existing scenario - need to return it on findByMode call
      mockFindByMode.mockResolvedValue([
        { sourceId: 'existing-scenario' }
      ]);

      const request = new NextRequest('http://localhost:3001/api/admin/init-pbl', {
        method: 'POST',
        body: JSON.stringify({ force: false })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.results.existing).toBe(1);
      expect(result.results.created).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Directory not found'));

      const request = new NextRequest('http://localhost:3001/api/admin/init-pbl', {
        method: 'POST',
        body: JSON.stringify({ force: false })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
    });
  });

  describe('GET', () => {
    it('should return PBL scenarios status', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          sourceId: 'test-scenario',
          title: { en: 'Test Scenario' },
          sourcePath: 'pbl_data/scenarios/test',
          status: 'active',
          metadata: { languagesAvailable: ['en', 'zh'] }
        }
      ];

      mockFindByMode.mockResolvedValue(mockScenarios);

      const response = await GET();
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.scenarios).toHaveLength(1);
      expect(result.scenarios[0].languages).toEqual(['en', 'zh']);
    });

    it('should handle repository errors', async () => {
      // Mock findByMode to throw an error
      mockFindByMode.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check PBL status');
    });
  });
});
