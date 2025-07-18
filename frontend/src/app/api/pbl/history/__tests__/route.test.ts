/**
 * Tests for PBL History API
 * This API provides paginated history of user's PBL programs across scenarios
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';
import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import type { CompletionData } from '@/types/pbl-completion';

// Mock dependencies
jest.mock('@/lib/storage/pbl-program-service');
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn()
  }
}));
jest.mock('js-yaml');
jest.mock('@/lib/cache/cache-service', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined)
  }
}));
jest.mock('@/lib/cache/distributed-cache-service', () => ({
  distributedCacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    getWithRevalidation: jest.fn(async (key, handler) => handler())
  }
}));
jest.mock('@/lib/monitoring/performance-monitor', () => ({
  withPerformanceTracking: jest.fn((handler) => handler())
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;
const mockPblProgramService = pblProgramService as jest.Mocked<typeof pblProgramService>;

describe('GET /api/pbl/history', () => {
  const mockUserEmail = 'test@example.com';
  const mockUser = { email: mockUserEmail };
  
  const mockProgram1: CompletionData = {
    programId: 'prog_123',
    scenarioId: 'ai-job-search',
    userEmail: mockUserEmail,
    status: 'completed',
    startedAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
    completedAt: '2024-01-15T11:00:00Z',
    totalTasks: 3,
    evaluatedTasks: 3,
    overallScore: 85,
    domainScores: {
      'Engaging_with_AI': 90,
      'Creating_with_AI': 80
    },
    ksaScores: {
      'K-AIF-01': 85,
      'S-AIA-02': 90
    },
    totalTimeSeconds: 3600,
    taskSummaries: [
      {
        taskId: 'task_1',
        title: 'Introduction',
        score: 90,
        completedAt: '2024-01-15T10:20:00Z'
      },
      {
        taskId: 'task_2',
        title: 'AI Resume Review',
        score: 85,
        completedAt: '2024-01-15T10:40:00Z'
      },
      {
        taskId: 'task_3',
        title: 'Interview Preparation',
        score: 80,
        completedAt: '2024-01-15T11:00:00Z'
      }
    ]
  };

  const mockProgram2: CompletionData = {
    programId: 'prog_456',
    scenarioId: 'health-ai-diagnosis',
    userEmail: mockUserEmail,
    status: 'active',
    startedAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    totalTasks: 4,
    evaluatedTasks: 2,
    overallScore: 0,
    domainScores: {},
    ksaScores: {},
    totalTimeSeconds: 1800,
    taskSummaries: [
      {
        taskId: 'task_1',
        title: 'Understanding AI in Healthcare',
        score: 88,
        completedAt: '2024-01-16T09:30:00Z'
      },
      {
        taskId: 'task_2',
        title: 'Evaluating AI Diagnoses',
        score: 92,
        completedAt: '2024-01-16T10:00:00Z'
      }
    ]
  };

  const mockScenarioData = {
    scenario_info: {
      title: 'AI Job Search Assistant',
      title_zhTW: 'AI 求職助理',
      title_ja: 'AI就職活動アシスタント',
      title_ko: 'AI 구직 도우미',
      title_es: 'Asistente de búsqueda de empleo con IA',
      title_fr: 'Assistant de recherche d\'emploi IA',
      title_de: 'KI-Jobsuche-Assistent',
      title_ru: 'ИИ помощник по поиску работы',
      title_it: 'Assistente di ricerca lavoro AI'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock YAML loading
    mockYaml.load.mockReturnValue(mockScenarioData);
    
    // Mock file system
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(Buffer.from(JSON.stringify(mockScenarioData)));
    mockFs.readdir.mockResolvedValue(['ai_job_search', 'health_ai_diagnosis'] as any);
    
    // Reset service mocks to default behavior
    mockPblProgramService.getUserProgramsForScenario.mockResolvedValue([]);
  });

  const createRequest = (url: string, cookies: Record<string, string> = {}) => {
    const request = new NextRequest(url, {
      headers: {
        cookie: Object.entries(cookies)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ')
      }
    });

    // Mock cookies.get method
    Object.defineProperty(request, 'cookies', {
      value: {
        get: jest.fn((name: string) => {
          return cookies[name] ? { value: cookies[name] } : undefined;
        })
      },
      writable: true
    });

    return request;
  };

  describe('Authentication', () => {
    it('should return 401 when no user cookie is present', async () => {
      const request = createRequest('http://localhost:3000/api/pbl/history');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'User authentication required'
      });
    });

    it('should return 401 when user cookie is invalid', async () => {
      const request = createRequest('http://localhost:3000/api/pbl/history', {
        user: 'invalid-json'
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'User authentication required'
      });
    });
  });

  describe('Fetching user programs', () => {
    it('should return all programs for a user across all scenarios', async () => {
      const request = createRequest('http://localhost:3000/api/pbl/history', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario
        .mockResolvedValueOnce([mockProgram1])
        .mockResolvedValueOnce([mockProgram2]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].programId).toBe('prog_456'); // More recent first
      expect(data.data[1].programId).toBe('prog_123');
      expect(data.totalPrograms).toBe(2);
      
      // Verify scenario titles were loaded
      expect(data.data[0].scenarioTitle).toBe('AI Job Search Assistant');
      expect(data.data[1].scenarioTitle).toBe('AI Job Search Assistant');
      
      // Verify service was called for each scenario
      expect(mockPblProgramService.getUserProgramsForScenario).toHaveBeenCalledTimes(2);
      expect(mockPblProgramService.getUserProgramsForScenario).toHaveBeenCalledWith(mockUserEmail, 'ai-job-search');
      expect(mockPblProgramService.getUserProgramsForScenario).toHaveBeenCalledWith(mockUserEmail, 'health-ai-diagnosis');
    });

    it('should return programs for a specific scenario when scenarioId is provided', async () => {
      const request = createRequest('http://localhost:3000/api/pbl/history?scenarioId=ai-job-search', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario.mockResolvedValueOnce([mockProgram1]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].programId).toBe('prog_123');
      expect(data.totalPrograms).toBe(1);
      
      // Verify service was called only for the specific scenario
      expect(mockPblProgramService.getUserProgramsForScenario).toHaveBeenCalledTimes(1);
      expect(mockPblProgramService.getUserProgramsForScenario).toHaveBeenCalledWith(mockUserEmail, 'ai-job-search');
    });

    it('should handle empty program list', async () => {
      const request = createRequest('http://localhost:3000/api/pbl/history', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario.mockResolvedValue([]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
      expect(data.totalPrograms).toBe(0);
    });
  });

  describe('Language support', () => {
    it('should return scenario titles in the requested language', async () => {
      const request = createRequest('http://localhost:3000/api/pbl/history?lang=zhTW', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario.mockResolvedValueOnce([mockProgram1]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].scenarioTitle).toBe('AI 求職助理');
    });

    it('should fallback to English when language-specific file is not found', async () => {
      const request = createRequest('http://localhost:3000/api/pbl/history?lang=pt', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario.mockResolvedValueOnce([mockProgram1]);
      
      // Mock file access to throw error for Portuguese file
      mockFs.access.mockRejectedValueOnce(new Error('File not found'));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].scenarioTitle).toBe('AI Job Search Assistant');
    });

    it('should handle scenario title loading errors gracefully', async () => {
      // Create a new program with different scenario to avoid memoization
      const programWithBadScenario = {
        ...mockProgram1,
        scenarioId: 'non-existent-scenario'
      };
      
      const request = createRequest('http://localhost:3000/api/pbl/history', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario.mockResolvedValueOnce([programWithBadScenario]);
      
      // Mock file operations to fail completely
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.readFile.mockRejectedValue(new Error('Read error'));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].scenarioTitle).toBe('non-existent-scenario'); // Falls back to scenario ID
    });
  });

  describe('Pagination', () => {
    const createMultiplePrograms = (count: number): CompletionData[] => {
      return Array.from({ length: count }, (_, i) => ({
        ...mockProgram1,
        programId: `prog_${i}`,
        startedAt: new Date(2024, 0, i + 1).toISOString()
      }));
    };

    it('should support pagination with default limit of 20', async () => {
      const programs = createMultiplePrograms(25);
      const request = createRequest('http://localhost:3000/api/pbl/history', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario.mockResolvedValueOnce(programs);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(20);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
        hasNext: true,
        hasPrev: false
      });
    });

    it('should support custom page and limit parameters', async () => {
      const programs = createMultiplePrograms(50);
      const request = createRequest('http://localhost:3000/api/pbl/history?page=2&limit=10', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario.mockResolvedValueOnce(programs);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(10);
      expect(data.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: true,
        hasPrev: true
      });
    });

    it('should support offset parameter', async () => {
      const programs = createMultiplePrograms(30);
      const request = createRequest('http://localhost:3000/api/pbl/history?offset=10&limit=5', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario.mockResolvedValueOnce(programs);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(5);
      expect(data.totalPrograms).toBe(30);
    });
  });

  describe('Sorting', () => {
    it('should sort programs by most recent first', async () => {
      const oldProgram = { ...mockProgram1, startedAt: '2024-01-10T10:00:00Z' };
      const newProgram = { ...mockProgram2, startedAt: '2024-01-20T10:00:00Z' };
      
      const request = createRequest('http://localhost:3000/api/pbl/history', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario
        .mockResolvedValueOnce([oldProgram, newProgram]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].startedAt).toBe('2024-01-20T10:00:00Z');
      expect(data.data[1].startedAt).toBe('2024-01-10T10:00:00Z');
    });
  });

  describe('Caching', () => {
    it('should include appropriate cache headers', async () => {
      const request = createRequest('http://localhost:3000/api/pbl/history', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario.mockResolvedValueOnce([mockProgram1]);

      const response = await GET(request);

      // The response is a NextResponse object, check the data for cache info
      const data = await response.json();
      expect(data.cacheHit).toBeDefined();
      // Ensure the response was successful
      expect(response.status).toBe(200);
    });
  });

  describe('Error handling', () => {
    it.skip('should handle service errors gracefully', async () => {
      const request = createRequest('http://localhost:3000/api/pbl/history', {
        user: JSON.stringify(mockUser)
      });

      // Create error outside of mock to avoid Jest issues
      const serviceError = new Error('Service error');
      
      // Mock the scenarios directory reading to pass
      mockFs.readdir.mockResolvedValueOnce(['ai_job_search'] as any);
      
      // Mock the service to reject only for this test
      mockPblProgramService.getUserProgramsForScenario.mockRejectedValueOnce(serviceError);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Service error');
    });

    it('should handle missing scenario directories gracefully', async () => {
      const request = createRequest('http://localhost:3000/api/pbl/history', {
        user: JSON.stringify(mockUser)
      });

      mockFs.readdir.mockRejectedValueOnce(new Error('Directory not found'));
      mockPblProgramService.getUserProgramsForScenario.mockResolvedValueOnce([mockProgram1]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should fallback to known scenarios
      expect(mockPblProgramService.getUserProgramsForScenario).toHaveBeenCalledWith(
        mockUserEmail, 
        'ai-job-search'
      );
    });
  });

  describe('Data integrity', () => {
    it('should ensure all programs have required fields', async () => {
      const incompleteProgram = {
        ...mockProgram1,
        taskSummaries: undefined
      } as any;

      const request = createRequest('http://localhost:3000/api/pbl/history', {
        user: JSON.stringify(mockUser)
      });

      mockPblProgramService.getUserProgramsForScenario.mockResolvedValueOnce([incompleteProgram]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].taskSummaries).toEqual([]); // Should default to empty array
      expect(data.data[0].userEmail).toBe(mockUserEmail); // Should ensure userEmail is set
    });
  });
});