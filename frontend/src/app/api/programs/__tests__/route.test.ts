/**
 * Programs API Route Tests
 * Testing the unified programs endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from '@/lib/auth/session';
import type { IProgram } from '@/types/unified-learning';
import { mockConsoleError } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/auth/session');

// Mock console methods
const mockError = mockConsoleError();

// Mock repositories
const mockProgramRepo = {
  findByUser: jest.fn(),
  findById: jest.fn(),
  update: jest.fn()
};

const mockUserRepo = {
  findByEmail: jest.fn()
};

const mockScenarioRepo = {
  findById: jest.fn()
};

// Mock the repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: () => mockProgramRepo,
    getUserRepository: () => mockUserRepo,
    getScenarioRepository: () => mockScenarioRepo
  }
}));

describe('GET /api/programs', () => {
  // Mock data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    profile: {},
    preferences: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const mockScenarios = {
    'scenario-1': {
      id: 'scenario-1',
      mode: 'pbl',
      title: { en: 'PBL Scenario', zh: 'PBL 情境' },
      description: { en: 'Learn by doing', zh: '實作學習' },
      difficulty: 'beginner',
      estimatedMinutes: 45
    },
    'scenario-2': {
      id: 'scenario-2',
      mode: 'assessment',
      title: { en: 'Assessment', zh: '評估' },
      description: { en: 'Test your knowledge', zh: '測試知識' },
      difficulty: 'intermediate',
      estimatedMinutes: 30
    },
    'scenario-3': {
      id: 'scenario-3',
      mode: 'discovery',
      title: { en: 'Discovery Path', zh: '探索路徑' },
      description: { en: 'Explore careers', zh: '探索職業' },
      difficulty: 'beginner',
      estimatedMinutes: 60
    }
  };

  const mockPrograms: IProgram[] = [
    {
      id: 'prog-1',
      scenarioId: 'scenario-1',
      userId: 'user-123',
      mode: 'pbl',
      status: 'active',
      currentTaskIndex: 1,
      completedTaskCount: 1,
      totalTaskCount: 3,
      totalScore: 80,
      domainScores: {},
      xpEarned: 50,
      badgesEarned: [],
      timeSpentSeconds: 900,
      lastActivityAt: '2024-01-15T10:00:00Z',
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'prog-2',
      scenarioId: 'scenario-2',
      userId: 'user-123',
      mode: 'assessment',
      status: 'completed',
      currentTaskIndex: 10,
      completedTaskCount: 10,
      totalTaskCount: 10,
      totalScore: 90,
      domainScores: {
        'Creating with AI': 85,
        'Managing AI': 95
      },
      xpEarned: 200,
      badgesEarned: [{ type: 'assessment-complete', earnedAt: '2024-01-10T00:00:00Z' }],
      timeSpentSeconds: 1800,
      lastActivityAt: '2024-01-10T00:00:00Z',
      completedAt: '2024-01-10T00:00:00Z',
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {},
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z'
    },
    {
      id: 'prog-3',
      scenarioId: 'scenario-3',
      userId: 'user-123',
      mode: 'discovery',
      status: 'pending',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: 5,
      totalScore: 0,
      domainScores: {},
      xpEarned: 0,
      badgesEarned: [],
      timeSpentSeconds: 0,
      lastActivityAt: '2024-01-20T00:00:00Z',
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {},
      createdAt: '2024-01-20T00:00:00Z',
      updatedAt: '2024-01-20T00:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' }
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);
    
    // Mock scenario lookups
    mockScenarioRepo.findById.mockImplementation((id: string) => {
      return Promise.resolve(mockScenarios[id as keyof typeof mockScenarios] || null);
    });
  });

  afterEach(() => {
    mockError.mockClear();
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
      expect(data.success).toBe(false);
    });

    it('should return 401 when session has no user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 when user not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
      expect(data.success).toBe(false);
    });
  });

  describe('Query Parameters', () => {
    it('should return all programs when no filters provided', async () => {
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.programs).toHaveLength(3);
      expect(data.total).toBe(3);
    });

    it('should filter by mode', async () => {
      const request = new NextRequest('http://localhost/api/programs?mode=pbl');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs).toHaveLength(1);
      expect(data.programs[0].mode).toBe('pbl');
    });

    it('should filter by status', async () => {
      const request = new NextRequest('http://localhost/api/programs?status=completed');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs).toHaveLength(1);
      expect(data.programs[0].status).toBe('completed');
    });

    it('should filter by multiple parameters', async () => {
      const request = new NextRequest('http://localhost/api/programs?mode=assessment&status=completed');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs).toHaveLength(1);
      expect(data.programs[0].mode).toBe('assessment');
      expect(data.programs[0].status).toBe('completed');
    });

    it('should handle includeScenario parameter', async () => {
      const request = new NextRequest('http://localhost/api/programs?includeScenario=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs[0]).toHaveProperty('scenario');
      expect(data.programs[0].scenario).toEqual(mockScenarios['scenario-1']);
    });

    it('should not include scenarios by default', async () => {
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs[0]).not.toHaveProperty('scenario');
    });
  });

  describe('Sorting', () => {
    it('should sort by createdAt descending by default', async () => {
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs[0].id).toBe('prog-3'); // Most recent
      expect(data.programs[2].id).toBe('prog-1'); // Oldest
    });

    it('should sort by lastActivityAt when specified', async () => {
      const request = new NextRequest('http://localhost/api/programs?sortBy=lastActivityAt');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs[0].id).toBe('prog-1'); // Most recent activity
    });

    it('should sort by totalScore', async () => {
      const request = new NextRequest('http://localhost/api/programs?sortBy=totalScore');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs[0].totalScore).toBe(90); // Highest score
      expect(data.programs[2].totalScore).toBe(0); // Lowest score
    });

    it('should handle ascending order', async () => {
      const request = new NextRequest('http://localhost/api/programs?sortBy=createdAt&order=asc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs[0].id).toBe('prog-1'); // Oldest first
      expect(data.programs[2].id).toBe('prog-3'); // Most recent last
    });
  });

  describe('Pagination', () => {
    it('should apply default pagination', async () => {
      // Create many programs
      const manyPrograms = Array.from({ length: 25 }, (_, i) => ({
        ...mockPrograms[0],
        id: `prog-${i}`,
        createdAt: new Date(2024, 0, 25 - i).toISOString()
      }));
      mockProgramRepo.findByUser.mockResolvedValue(manyPrograms);

      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs).toHaveLength(20); // Default limit
      expect(data.total).toBe(25);
      expect(data.page).toBe(1);
      expect(data.totalPages).toBe(2);
    });

    it('should handle custom page size', async () => {
      const request = new NextRequest('http://localhost/api/programs?limit=2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs).toHaveLength(2);
      expect(data.total).toBe(3);
      expect(data.totalPages).toBe(2);
    });

    it('should handle page navigation', async () => {
      const request = new NextRequest('http://localhost/api/programs?page=2&limit=2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs).toHaveLength(1); // Only 1 program on page 2
      expect(data.page).toBe(2);
    });

    it('should handle out of range page', async () => {
      const request = new NextRequest('http://localhost/api/programs?page=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs).toEqual([]);
      expect(data.page).toBe(10);
    });
  });

  describe('Response Format', () => {
    it('should include all required fields', async () => {
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('programs');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('totalPages');
      expect(data).toHaveProperty('limit');
    });

    it('should calculate progress correctly', async () => {
      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      const data = await response.json();

      const activeProgram = data.programs.find((p: any) => p.id === 'prog-1');
      expect(activeProgram.progress).toBe(33); // 1/3 tasks = 33%

      const completedProgram = data.programs.find((p: any) => p.id === 'prog-2');
      expect(completedProgram.progress).toBe(100);

      const pendingProgram = data.programs.find((p: any) => p.id === 'prog-3');
      expect(pendingProgram.progress).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors', async () => {
      mockProgramRepo.findByUser.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch programs');
      expect(data.success).toBe(false);
      expect(mockError).toHaveBeenCalledWith('Error fetching programs:', expect.any(Error));
    });

    it('should handle scenario fetch errors gracefully', async () => {
      mockScenarioRepo.findById.mockRejectedValue(new Error('Scenario fetch failed'));

      const request = new NextRequest('http://localhost/api/programs?includeScenario=true');
      const response = await GET(request);
      const data = await response.json();

      // Should still return programs but without scenarios
      expect(response.status).toBe(200);
      expect(data.programs).toHaveLength(3);
      expect(data.programs[0]).not.toHaveProperty('scenario');
    });

    it('should handle invalid query parameters', async () => {
      const request = new NextRequest('http://localhost/api/programs?limit=invalid');
      const response = await GET(request);
      const data = await response.json();

      // Should use default values for invalid params
      expect(response.status).toBe(200);
      expect(data.limit).toBe(20); // Default limit
    });
  });

  describe('Empty States', () => {
    it('should handle no programs', async () => {
      mockProgramRepo.findByUser.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.programs).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.totalPages).toBe(0);
    });

    it('should handle filter with no results', async () => {
      const request = new NextRequest('http://localhost/api/programs?mode=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs).toEqual([]);
      expect(data.total).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex query with all parameters', async () => {
      const request = new NextRequest(
        'http://localhost/api/programs?mode=pbl&status=active&includeScenario=true&sortBy=totalScore&order=desc&page=1&limit=10'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs).toHaveLength(1);
      expect(data.programs[0].mode).toBe('pbl');
      expect(data.programs[0].status).toBe('active');
      expect(data.programs[0]).toHaveProperty('scenario');
      expect(data.limit).toBe(10);
    });

    it('should properly format multilingual scenario data', async () => {
      const request = new NextRequest('http://localhost/api/programs?includeScenario=true&mode=pbl');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const program = data.programs[0];
      expect(program.scenario.title).toEqual({ en: 'PBL Scenario', zh: 'PBL 情境' });
      expect(program.scenario.description).toEqual({ en: 'Learn by doing', zh: '實作學習' });
    });
  });
});