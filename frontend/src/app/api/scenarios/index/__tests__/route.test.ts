/**
 * Scenarios Index API Route Tests
 * 測試情境索引 API
 */

import { GET, DELETE } from '../route';
import { NextRequest } from 'next/server';
import { scenarioIndexService } from '@/lib/services/scenario-index-service';
import { scenarioIndexBuilder } from '@/lib/services/scenario-index-builder';

// Mock dependencies
jest.mock('@/lib/services/scenario-index-service', () => ({
  scenarioIndexService: {
    getIndex: jest.fn(),
    invalidate: jest.fn(),
  },
}));

jest.mock('@/lib/services/scenario-index-builder', () => ({
  scenarioIndexBuilder: {
    buildFullIndex: jest.fn(),
    ensureIndex: jest.fn(),
    getStatus: jest.fn(),
  },
}));

// Mock console
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('/api/scenarios/index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET - Scenario Index', () => {
    const mockIndex = {
      lastUpdated: '2025-07-31T10:00:00Z',
      yamlToUuid: new Map([
        ['pbl_data/jobsearch_scenario.yaml', {
          uuid: '550e8400-e29b-41d4-a716-446655440001',
          yamlPath: 'pbl_data/jobsearch_scenario.yaml',
          mode: 'pbl' as const,
          createdAt: '2025-07-30T10:00:00Z',
        }],
        ['assessment_data/ai_literacy/ai_literacy_questions_en.yaml', {
          uuid: '550e8400-e29b-41d4-a716-446655440002',
          yamlPath: 'assessment_data/ai_literacy/ai_literacy_questions_en.yaml',
          mode: 'assessment' as const,
          createdAt: '2025-07-29T10:00:00Z',
        }],
      ]),
      uuidToYaml: new Map([
        ['550e8400-e29b-41d4-a716-446655440001', {
          uuid: '550e8400-e29b-41d4-a716-446655440001',
          yamlPath: 'pbl_data/jobsearch_scenario.yaml',
          mode: 'pbl' as const,
          createdAt: '2025-07-30T10:00:00Z',
        }],
        ['550e8400-e29b-41d4-a716-446655440002', {
          uuid: '550e8400-e29b-41d4-a716-446655440002',
          yamlPath: 'assessment_data/ai_literacy/ai_literacy_questions_en.yaml',
          mode: 'assessment' as const,
          createdAt: '2025-07-29T10:00:00Z',
        }],
      ]),
    };

    it('should return scenario index successfully', async () => {
      (scenarioIndexService.getIndex as jest.Mock).mockResolvedValue(mockIndex);
      (scenarioIndexBuilder.getStatus as jest.Mock).mockReturnValue({
        isBuilding: false,
        lastBuildTime: '2025-07-31T09:00:00Z',
        buildErrors: [],
      });

      const request = new NextRequest('http://localhost:3000/api/scenarios/index');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalMappings).toBe(2);
      expect(data.data.lastUpdated).toBe('2025-07-31T10:00:00Z');
      expect(data.data.yamlToUuid['pbl_data/jobsearch_scenario.yaml']).toEqual({
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        yamlPath: 'pbl_data/jobsearch_scenario.yaml',
        mode: 'pbl',
        createdAt: '2025-07-30T10:00:00Z',
      });
      expect(scenarioIndexBuilder.ensureIndex).toHaveBeenCalled();
      expect(scenarioIndexBuilder.buildFullIndex).not.toHaveBeenCalled();
    });

    it('should rebuild index when rebuild=true', async () => {
      (scenarioIndexService.getIndex as jest.Mock).mockResolvedValue(mockIndex);
      (scenarioIndexBuilder.getStatus as jest.Mock).mockReturnValue({
        isBuilding: false,
        lastBuildTime: Date.now(),
      });

      const request = new NextRequest('http://localhost:3000/api/scenarios/index?rebuild=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(scenarioIndexBuilder.buildFullIndex).toHaveBeenCalled();
      expect(scenarioIndexBuilder.ensureIndex).not.toHaveBeenCalled();
    });

    it('should handle empty index', async () => {
      const emptyIndex = {
        lastUpdated: '2025-07-31T10:00:00Z',
        yamlToUuid: new Map(),
        uuidToYaml: new Map(),
      };

      (scenarioIndexService.getIndex as jest.Mock).mockResolvedValue(emptyIndex);
      (scenarioIndexBuilder.getStatus as jest.Mock).mockReturnValue({
        isBuilding: false,
        lastBuildTime: null,
      });

      const request = new NextRequest('http://localhost:3000/api/scenarios/index');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalMappings).toBe(0);
      expect(data.data.yamlToUuid).toEqual({});
      expect(data.data.uuidToYaml).toEqual({});
    });

    it('should return 503 when index is not available', async () => {
      (scenarioIndexService.getIndex as jest.Mock).mockResolvedValue(null);
      (scenarioIndexBuilder.getStatus as jest.Mock).mockReturnValue({
        isBuilding: true,
        buildProgress: 0.5,
      });

      const request = new NextRequest('http://localhost:3000/api/scenarios/index');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Index not available');
      expect(data.status.isBuilding).toBe(true);
    });

    it('should handle service errors', async () => {
      const error = new Error('Index service error');
      (scenarioIndexBuilder.ensureIndex as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/scenarios/index');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to get scenario index');
      expect(data.details).toBe('Index service error');
      expect(mockConsoleError).toHaveBeenCalledWith('Error getting scenario index:', error);
    });

    it('should handle build errors during rebuild', async () => {
      const error = new Error('Build failed');
      (scenarioIndexBuilder.buildFullIndex as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/scenarios/index?rebuild=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to get scenario index');
      expect(data.details).toBe('Build failed');
    });
  });

  describe('DELETE - Invalidate Index', () => {
    it('should invalidate index successfully', async () => {
      (scenarioIndexService.invalidate as jest.Mock).mockResolvedValue(undefined);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Scenario index cache invalidated');
      expect(scenarioIndexService.invalidate).toHaveBeenCalled();
    });

    it('should handle invalidation errors', async () => {
      const error = new Error('Cache invalidation failed');
      (scenarioIndexService.invalidate as jest.Mock).mockRejectedValue(error);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to invalidate scenario index');
      expect(data.details).toBe('Cache invalidation failed');
      expect(mockConsoleError).toHaveBeenCalledWith('Error invalidating scenario index:', error);
    });
  });
});

/**
 * Scenario Index API Considerations:
 * 
 * 1. Index Management:
 *    - Maps YAML paths to UUIDs bidirectionally
 *    - Supports rebuild with query parameter
 *    - Tracks build status and progress
 * 
 * 2. Cache Operations:
 *    - GET ensures index exists before reading
 *    - DELETE invalidates cache for refresh
 *    - Handles concurrent build operations
 * 
 * 3. Data Structure:
 *    - Converts Maps to objects for JSON
 *    - Includes metadata (mode, createdAt)
 *    - Tracks last update time
 * 
 * 4. Error Handling:
 *    - 503 when index unavailable
 *    - 500 for service errors
 *    - Detailed error messages
 * 
 * 5. Performance:
 *    - Index may contain hundreds of mappings
 *    - Rebuild can be resource intensive
 *    - Consider rate limiting rebuilds
 */