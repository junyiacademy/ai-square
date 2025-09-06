import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
import { NextRequest } from 'next/server';

// Mock unified auth
jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() => ({
    status: 401,
    json: jest.fn().mockResolvedValue({ error: 'Authentication required', success: false }),
    text: jest.fn().mockResolvedValue('{"error":"Authentication required","success":false}')
  }))
}));

// Mock cache service
jest.mock('@/lib/cache/cache-service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Create stable mock repositories
const mockProgramRepository = {
  findByUser: jest.fn(),
};

const mockTaskRepository = {
  findByProgram: jest.fn(),
};

const mockScenarioRepository = {
  findById: jest.fn(),
};

// Mock repositories
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: () => mockProgramRepository,
    getTaskRepository: () => mockTaskRepository,
    getScenarioRepository: () => mockScenarioRepository,
  },
}));

import { GET } from '../route';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';
import { cacheService } from '@/lib/cache/cache-service';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

describe('GET /api/discovery/my-programs', () => {
  const mockedGetUnifiedAuth = getUnifiedAuth as jest.MockedFunction<typeof getUnifiedAuth>;
  const mockedCacheService = cacheService as jest.Mocked<typeof cacheService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockedGetUnifiedAuth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      error: 'Authentication required',
      success: false,
    });
  });

  it('returns cached data when available', async () => {
    mockedGetUnifiedAuth.mockResolvedValue({
      user: {
        id: '123',
        email: 'test@example.com',
        role: 'student',
      },
    });

    const cachedData = [
      { id: 'scenario1', title: 'Cached Scenario' },
    ];
    mockedCacheService.get.mockResolvedValue(cachedData);

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(cachedData);
    expect(mockedCacheService.get).toHaveBeenCalledWith('discovery-my-scenarios-test@example.com');
    expect(mockProgramRepository.findByUser).not.toHaveBeenCalled();
  });

  it('returns empty array when user has no discovery programs', async () => {
    mockedGetUnifiedAuth.mockResolvedValue({
      user: {
        id: '123',
        email: 'test@example.com',
        role: 'student',
      },
    });
    mockedCacheService.get.mockResolvedValue(null);
    mockProgramRepository.findByUser.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
    expect(mockedCacheService.set).toHaveBeenCalledWith(
      'discovery-my-scenarios-test@example.com',
      [],
      { ttl: 30000 }
    );
  });

  it('filters and returns only discovery programs with scenario details', async () => {
    mockedGetUnifiedAuth.mockResolvedValue({
      user: {
        id: '123',
        email: 'test@example.com',
        role: 'student',
      },
    });
    mockedCacheService.get.mockResolvedValue(null);

    const mockPrograms = [
      {
        id: 'prog1',
        scenarioId: 'discovery-career-1',
        status: 'active',
        currentTaskIndex: 1,
        startedAt: '2024-01-01T10:00:00Z',
        metadata: { sourceType: 'discovery' },
      },
      {
        id: 'prog2',
        scenarioId: 'pbl-scenario-1',
        status: 'active',
        metadata: { sourceType: 'pbl' },
      },
      {
        id: 'prog3',
        scenarioId: 'discovery-career-2',
        status: 'completed',
        completedAt: '2024-01-02T15:00:00Z',
        metadata: { careerType: 'software-engineer' },
      },
    ];

    const mockScenarios = {
      'discovery-career-1': {
        id: 'discovery-career-1',
        title: { en: 'AI Engineer Career Path' },
        description: { en: 'Explore AI engineering' },
      },
      'discovery-career-2': {
        id: 'discovery-career-2',
        title: { en: 'Software Engineer Career Path' },
        description: { en: 'Explore software engineering' },
      },
    };

    const mockTasks = [
      { id: 'task1', status: 'completed' },
      { id: 'task2', status: 'completed' },
      { id: 'task3', status: 'active' },
      { id: 'task4', status: 'pending' },
    ];

    mockProgramRepository.findByUser.mockResolvedValue(mockPrograms);
    mockScenarioRepository.findById.mockImplementation((id: string) => 
      Promise.resolve(mockScenarios[id as keyof typeof mockScenarios] || null)
    );
    mockTaskRepository.findByProgram.mockResolvedValue(mockTasks);

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2); // Only discovery scenarios
    
    // Check first scenario (should be most recent activity)
    expect(data[0].id).toBe('discovery-career-2');
    expect(data[0].userPrograms).toMatchObject({
      total: 1,
      completed: 1,
      active: null,
    });

    // Check second scenario
    expect(data[1].id).toBe('discovery-career-1');
    expect(data[1].userPrograms).toMatchObject({
      total: 1,
      active: {
        id: 'prog1',
        progress: 50, // 2 of 4 tasks completed
        completedTasks: 2,
        totalTasks: 4,
        currentTaskIndex: 1,
      },
      completed: 0,
    });

    expect(mockedCacheService.set).toHaveBeenCalledWith(
      'discovery-my-scenarios-test@example.com',
      expect.any(Array),
      { ttl: 60000 }
    );
  });

  it('handles scenario loading errors gracefully', async () => {
    mockedGetUnifiedAuth.mockResolvedValue({
      user: {
        id: '123',
        email: 'test@example.com',
        role: 'student',
      },
    });
    mockedCacheService.get.mockResolvedValue(null);

    mockProgramRepository.findByUser.mockResolvedValue([
      {
        id: 'prog1',
        scenarioId: 'discovery-career-1',
        status: 'active',
        metadata: { sourceType: 'discovery' },
      },
    ]);

    mockScenarioRepository.findById.mockRejectedValue(new Error('Scenario not found'));

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]); // Empty array when scenarios can't be loaded
  });

  it('calculates latest activity correctly', async () => {
    mockedGetUnifiedAuth.mockResolvedValue({
      user: {
        id: '123',
        email: 'test@example.com',
        role: 'student',
      },
    });
    mockedCacheService.get.mockResolvedValue(null);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    mockProgramRepository.findByUser.mockResolvedValue([
      {
        id: 'prog1',
        scenarioId: 'discovery-career-1',
        status: 'active',
        createdAt: lastWeek.toISOString(),
        startedAt: yesterday.toISOString(),
        lastActivityAt: now.toISOString(),
        metadata: { sourceType: 'discovery' },
      },
    ]);

    mockScenarioRepository.findById.mockResolvedValue({
      id: 'discovery-career-1',
      title: { en: 'Career Path' },
    });

    mockTaskRepository.findByProgram.mockResolvedValue([
      { id: 'task1', status: 'completed', completedAt: yesterday.toISOString() },
      { id: 'task2', status: 'active', startedAt: now.toISOString() },
    ]);

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Latest activity should be the most recent of all timestamps
    expect(new Date(data[0].userPrograms.lastActivity).getTime()).toBeGreaterThanOrEqual(
      now.getTime()
    );
  });

  it('handles repository errors', async () => {
    mockedGetUnifiedAuth.mockResolvedValue({
      user: {
        id: '123',
        email: 'test@example.com',
        role: 'student',
      },
    });
    mockedCacheService.get.mockResolvedValue(null);
    mockProgramRepository.findByUser.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Internal server error',
    });
  });
});