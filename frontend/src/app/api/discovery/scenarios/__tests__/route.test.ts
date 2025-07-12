/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { getScenarioRepository } from '@/lib/implementations/gcs-v2';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/implementations/gcs-v2');
jest.mock('@/lib/services/discovery-yaml-loader');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockGetScenarioRepository = getScenarioRepository as jest.MockedFunction<typeof getScenarioRepository>;

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

  describe('GET /api/discovery/scenarios', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return discovery scenarios for authenticated user', async () => {
      const mockSession = {
        user: { email: 'test@example.com' }
      };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const mockScenarios = [
        {
          id: 'scenario-1',
          title: 'Content Creator Discovery',
          sourceType: 'discovery',
          sourceRef: {
            type: 'yaml',
            sourceId: 'content_creator',
            path: 'discovery_data/content_creator/content_creator_zhTW.yml'
          }
        }
      ];
      mockScenarioRepo.findByType.mockResolvedValue(mockScenarios);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scenarios).toEqual(mockScenarios);
      expect(mockScenarioRepo.findByType).toHaveBeenCalledWith('discovery');
    });

    it('should handle repository errors gracefully', async () => {
      const mockSession = {
        user: { email: 'test@example.com' }
      };
      mockGetServerSession.mockResolvedValue(mockSession as any);
      
      mockScenarioRepo.findByType.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/discovery/scenarios', () => {
    it('should create a new discovery scenario', async () => {
      const mockSession = {
        user: { email: 'test@example.com' }
      };
      mockGetServerSession.mockResolvedValue(mockSession as any);

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

      expect(response.status).toBe(201);
      expect(data.scenario).toEqual(mockCreatedScenario);
      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'discovery',
          sourceRef: expect.objectContaining({
            type: 'yaml',
            sourceId: 'youtuber'
          })
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
      expect(data.error).toContain('careerType');
    });

    it('should handle YAML loading errors', async () => {
      const mockSession = {
        user: { email: 'test@example.com' }
      };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      // Mock YAML loader to throw error
      const { DiscoveryYAMLLoader } = require('@/lib/services/discovery-yaml-loader');
      DiscoveryYAMLLoader.loadPath = jest.fn().mockRejectedValue(new Error('YAML not found'));

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