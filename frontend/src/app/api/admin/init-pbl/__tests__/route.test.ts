import { NextRequest } from 'next/server';

// Mock the repository factory - declare mocks before imports
const mockFindByMode = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockTaskCreate = jest.fn();
const mockTaskFindByScenario = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: () => ({
      findByMode: (...args: unknown[]) => mockFindByMode(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    }),
    getTaskRepository: () => ({
      create: (...args: unknown[]) => mockTaskCreate(...args),
      findByScenario: (...args: unknown[]) => mockTaskFindByScenario(...args),
    })
  }
}));

// Import route AFTER mocks are set up
import { POST, GET } from '../route';

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

    it('should handle multilingual prerequisites correctly', async () => {
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['semiconductor_adventure'])
        .mockResolvedValueOnce(['semiconductor_adventure_en.yaml', 'semiconductor_adventure_zhTW.yaml']);

      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      // Mock English YAML
      const mockEnYamlData = {
        scenario_info: {
          id: 'semiconductor-adventure',
          title: 'My Semiconductor Adventure',
          description: 'Explore semiconductors',
          prerequisites: [
            'Basic understanding of elements and compounds',
            'Familiarity with electricity and electrical devices',
            'Recommended: Watch this introductory video - https://youtu.be/cxf6eexA4f0'
          ],
        },
        tasks: [],
      };

      // Mock Traditional Chinese YAML
      const mockZhTwYamlData = {
        scenario_info: {
          id: 'semiconductor-adventure',
          title: '我的半導體冒險',
          description: '探索半導體',
          prerequisites: [
            '對元素和化合物有基本認識',
            '熟悉電力和電子設備',
            '建議：觀看此介紹影片 - https://youtu.be/cxf6eexA4f0'
          ],
        },
        tasks: [],
      };

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce('en yaml content')     // Primary file (en)
        .mockResolvedValueOnce('en yaml content')     // Loop iteration 1 (en)
        .mockResolvedValueOnce('zhTW yaml content');  // Loop iteration 2 (zhTW)

      (yaml.load as jest.Mock)
        .mockReturnValueOnce(mockEnYamlData)    // Primary file load
        .mockReturnValueOnce(mockEnYamlData)    // Loop iteration 1 load
        .mockReturnValueOnce(mockZhTwYamlData); // Loop iteration 2 load

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

      // Verify that create was called with multilingual prerequisites in metadata
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            multilingualPrerequisites: {
              en: mockEnYamlData.scenario_info.prerequisites,
              zhTW: mockZhTwYamlData.scenario_info.prerequisites
            }
          })
        })
      );
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
