import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock auth utils
const mockGetAuthFromRequest = jest.fn();
jest.mock('@/lib/auth/auth-utils', () => ({
  getAuthFromRequest: mockGetAuthFromRequest,
}));

// Mock cache service
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();
jest.mock('@/lib/cache/cache-service', () => ({
  cacheService: {
    get: mockCacheGet,
    set: mockCacheSet,
  },
}));

// Mock repositories
const mockFindByUser = jest.fn();
const mockFindByProgram = jest.fn();
const mockFindById = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: () => ({
      findByUser: mockFindByUser,
    }),
    getTaskRepository: () => ({
      findByProgram: mockFindByProgram,
    }),
    getScenarioRepository: () => ({
      findById: mockFindById,
    }),
  },
}));

describe('GET /api/discovery/my-programs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      error: 'Unauthorized',
    });
  });

  it('returns cached data when available', async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
    });

    const cachedData = [
      { id: 'scenario1', title: 'Cached Scenario' },
    ];
    mockCacheGet.mockResolvedValue(cachedData);

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(cachedData);
    expect(mockCacheGet).toHaveBeenCalledWith('discovery-my-scenarios-test@example.com');
    expect(mockFindByUser).not.toHaveBeenCalled();
  });

  it('returns empty array when user has no discovery programs', async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
    });
    mockCacheGet.mockResolvedValue(null);
    mockFindByUser.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
    expect(mockCacheSet).toHaveBeenCalledWith(
      'discovery-my-scenarios-test@example.com',
      [],
      { ttl: 30000 }
    );
  });

  it('filters and returns only discovery programs with scenario details', async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
    });
    mockCacheGet.mockResolvedValue(null);

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

    mockFindByUser.mockResolvedValue(mockPrograms);
    mockFindById.mockImplementation((id) => 
      Promise.resolve(mockScenarios[id] || null)
    );
    mockFindByProgram.mockResolvedValue(mockTasks);

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

    expect(mockCacheSet).toHaveBeenCalledWith(
      'discovery-my-scenarios-test@example.com',
      expect.any(Array),
      { ttl: 60000 }
    );
  });

  it('handles scenario loading errors gracefully', async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
    });
    mockCacheGet.mockResolvedValue(null);

    mockFindByUser.mockResolvedValue([
      {
        id: 'prog1',
        scenarioId: 'discovery-career-1',
        status: 'active',
        metadata: { sourceType: 'discovery' },
      },
    ]);

    mockFindById.mockRejectedValue(new Error('Scenario not found'));

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]); // Empty array when scenarios can't be loaded
  });

  it('calculates latest activity correctly', async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
    });
    mockCacheGet.mockResolvedValue(null);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    mockFindByUser.mockResolvedValue([
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

    mockFindById.mockResolvedValue({
      id: 'discovery-career-1',
      title: { en: 'Career Path' },
    });

    mockFindByProgram.mockResolvedValue([
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
    mockGetAuthFromRequest.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
    });
    mockCacheGet.mockResolvedValue(null);
    mockFindByUser.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Internal server error',
    });
  });
});