/**
 * @jest-environment node
 */

// @ts-ignore - Mock will be used
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { getScenarioRepository } from '@/lib/implementations/gcs-v2';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/implementations/gcs-v2');
jest.mock('@/lib/services/discovery-yaml-loader', () => ({
  DiscoveryYAMLLoader: {
    loadPath: jest.fn()
  }
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockGetScenarioRepository = getScenarioRepository as jest.MockedFunction<typeof getScenarioRepository>;

// Import the mocked module
const { DiscoveryYAMLLoader } = require('@/lib/services/discovery-yaml-loader');

describe('/api/discovery/scenarios', () => {
  const mockScenarioRepo = {
    findByType: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    listAll: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetScenarioRepository.mockReturnValue(mockScenarioRepo as any);
  });

  // Note: This route only has POST method, no GET method

  describe('POST /api/discovery/scenarios', () => {
    it('should create a new discovery scenario', async () => {
      const mockSession = {
        user: { email: 'test@example.com' }
      };
      mockGetServerSession.mockResolvedValue(mockSession as any);
      
      // Mock YAML loader to return valid data
      DiscoveryYAMLLoader.loadPath.mockResolvedValue({
        metadata: {
          title: 'YouTuber',
          long_description: 'Content creator career path',
          estimated_hours: 20
        },
        learning_objectives: ['Create engaging content', 'Build audience'],
        category: 'creative',
        difficulty_range: { min: 1, max: 3 }
      });

      const mockCreatedScenario = {
        id: 'new-scenario-id',
        title: 'YouTuber Discovery',
        sourceType: 'discovery',
        sourceRef: {
          type: 'yaml',
          sourceId: 'youtuber',
          path: 'discovery_data/youtuber/youtuber_zhTW.yml'
        }
      };
      mockScenarioRepo.create.mockResolvedValue(mockCreatedScenario);

      const requestBody = {
        careerType: 'youtuber',
        language: 'zhTW'
      };

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scenarioId).toBe(mockCreatedScenario.id);
      expect(data.scenario).toBeDefined();
      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'discovery',
          sourceRef: expect.objectContaining({
            type: 'yaml',
            sourceId: 'youtuber',
            path: expect.stringContaining('youtuber')
          }),
          title: 'YouTuber',
          description: 'Content creator career path'
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      const mockSession = {
        user: { email: 'test@example.com' }
      };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Career type required');
    });

    it('should handle YAML loading errors', async () => {
      const mockSession = {
        user: { email: 'test@example.com' }
      };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      // Mock YAML loader to throw error
      DiscoveryYAMLLoader.loadPath.mockRejectedValue(new Error('YAML not found'));

      const requestBody = {
        careerType: 'invalid_career',
        language: 'zhTW'
      };

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});