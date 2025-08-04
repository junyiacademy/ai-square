/**
 * Tests for scenarios API route
 * Following TDD approach
 */

import { NextRequest } from 'next/server';
import { GET } from '../index/route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';
import { cacheService } from '@/lib/cache/cache-service';
import { scenarioIndexService } from '@/lib/services/scenario-index-service';
import { scenarioIndexBuilder } from '@/lib/services/scenario-index-builder';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');
jest.mock('@/lib/cache/cache-service');
jest.mock('@/lib/services/scenario-index-service');
jest.mock('@/lib/services/scenario-index-builder');

// Mock console
const mockConsoleError = createMockConsoleError();

describe('/api/scenarios', () => {
  const mockScenarioRepo = {
    findAll: jest.fn(),
    create: jest.fn(),
    findByMode: jest.fn(),
  };

  const mockScenarios = [
    {
      id: 'scenario-1',
      mode: 'pbl',
      status: 'active',
      title: { en: 'AI Ethics', zh: 'AI 倫理' },
      description: { en: 'Learn about AI ethics', zh: '學習 AI 倫理' },
      objectives: ['Understand AI ethics', 'Apply ethical principles'],
      taskTemplates: [],
      sourceType: 'yaml',
      sourcePath: 'ai_ethics_scenario.yaml',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'scenario-2',
      mode: 'assessment',
      status: 'active',
      title: { en: 'AI Literacy Test', zh: 'AI 素養測試' },
      description: { en: 'Test your AI knowledge', zh: '測試您的 AI 知識' },
      objectives: ['Evaluate AI understanding'],
      taskTemplates: [],
      sourceType: 'yaml',
      sourcePath: 'ai_literacy_assessment.yaml',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup repository factory mock
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    
    // Setup cache service mock
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (cacheService.set as jest.Mock).mockResolvedValue(undefined);

    // Setup scenario service mocks - these are needed for the index route
    (scenarioIndexService.getIndex as jest.Mock).mockResolvedValue({
      scenarios: mockScenarios,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    });
    (scenarioIndexBuilder.buildFullIndex as jest.Mock).mockResolvedValue(undefined);
    (scenarioIndexBuilder.ensureIndex as jest.Mock).mockResolvedValue(undefined);
    (scenarioIndexBuilder.getStatus as jest.Mock).mockReturnValue({
      isBuilding: false,
      lastBuildTime: new Date(),
      totalScenarios: 2
    });
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET /api/scenarios', () => {
    it('should return all scenarios successfully', async () => {
      (mockScenarioRepo.findAll as jest.Mock).mockResolvedValue(mockScenarios);

      const request = new NextRequest('http://localhost/api/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('scenarios');
      expect(data.scenarios).toHaveLength(2);
      expect(data.scenarios[0]).toMatchObject({
        id: 'scenario-1',
        mode: 'pbl',
        title: { en: 'AI Ethics', zh: 'AI 倫理' },
      });
    });

    it('should filter scenarios by mode', async () => {
      const pblScenarios = mockScenarios.filter(s => s.mode === 'pbl');
      mockScenarioRepo.findByMode?.mockResolvedValue(pblScenarios);

      const request = new NextRequest('http://localhost/api/scenarios?mode=pbl');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledWith('pbl');
      expect(data.scenarios).toHaveLength(1);
      expect(data.scenarios[0].mode).toBe('pbl');
    });

    it('should filter scenarios by status', async () => {
      const activeScenarios = mockScenarios.filter(s => s.status === 'active');
      (mockScenarioRepo.findAll as jest.Mock).mockResolvedValue(activeScenarios);

      const request = new NextRequest('http://localhost/api/scenarios?status=active');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scenarios).toHaveLength(2);
      expect(data.scenarios.every((s: { status: string }) => s.status === 'active')).toBe(true);
    });

    it('should support language parameter', async () => {
      (mockScenarioRepo.findAll as jest.Mock).mockResolvedValue(mockScenarios);

      const request = new NextRequest('http://localhost/api/scenarios?lang=zh');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(cacheService.get).toHaveBeenCalledWith('scenarios:all:zh');
    });

    it('should return cached data when available', async () => {
      const cachedData = { scenarios: mockScenarios };
      (cacheService.get as jest.Mock).mockResolvedValue(cachedData);

      const request = new NextRequest('http://localhost/api/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Cache')).toBe('HIT');
      expect(data).toEqual(cachedData);
      expect(mockScenarioRepo.findAll).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database connection failed');
      (mockScenarioRepo.findAll as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost/api/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch scenarios');
      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching scenarios:', error);
    });

    it('should handle missing findByMode method', async () => {
      (mockScenarioRepo as Partial<typeof mockScenarioRepo>).findByMode = undefined;
      (mockScenarioRepo.findAll as jest.Mock).mockResolvedValue(mockScenarios);

      const request = new NextRequest('http://localhost/api/scenarios?mode=pbl');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should fall back to findAll and filter manually
      expect(mockScenarioRepo.findAll).toHaveBeenCalled();
    });
  });

  // TODO: POST method doesn't exist on this route
  /*
  describe('POST /api/scenarios', () => {
    const newScenario = {
      mode: 'pbl',
      title: { en: 'New Scenario' },
      description: { en: 'A new scenario' },
      objectives: ['Learn something new'],
      sourceType: 'api',
      status: 'draft',
    };

    it('should create scenario successfully for authenticated users', async () => {
      // Mock authenticated session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'admin@example.com', role: 'admin' },
      });

      const createdScenario = {
        id: 'new-scenario-id',
        ...newScenario,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockScenarioRepo.create as jest.Mock).mockResolvedValue(createdScenario);

      const request = new NextRequest('http://localhost/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newScenario),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('scenario');
      expect(data.scenario).toMatchObject({
        id: 'new-scenario-id',
        title: { en: 'New Scenario' },
      });
      expect(mockScenarioRepo.create).toHaveBeenCalledWith(newScenario);
    });

    it('should reject unauthenticated requests', async () => {
      // Mock no session
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/scenarios', {
        method: 'POST',
        body: JSON.stringify(newScenario),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
      expect(mockScenarioRepo.create).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      // Mock authenticated session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'admin@example.com', role: 'admin' },
      });

      const invalidScenario = {
        // Missing required fields: mode, title
        description: { en: 'A scenario without title' },
      };

      const request = new NextRequest('http://localhost/api/scenarios', {
        method: 'POST',
        body: JSON.stringify(invalidScenario),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
      expect(mockScenarioRepo.create).not.toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      // Mock authenticated session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'admin@example.com', role: 'admin' },
      });

      const error = new Error('Database error');
      (mockScenarioRepo.create as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost/api/scenarios', {
        method: 'POST',
        body: JSON.stringify(newScenario),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create scenario');
      expect(mockConsoleError).toHaveBeenCalledWith('Error creating scenario:', error);
    });
  });
  */
});

/**
 * Scenarios API Considerations:
 * 
 * 1. Query Support:
 *    - Filter by mode (pbl, assessment, discovery)
 *    - Filter by status (draft, active, archived)
 *    - Language parameter for translations
 * 
 * 2. Caching:
 *    - Cache results by query parameters
 *    - Return cache headers
 * 
 * 3. Authentication:
 *    - GET: Public access
 *    - POST: Requires authentication
 * 
 * 4. Error Handling:
 *    - Graceful fallback for missing methods
 *    - Detailed error messages
 */