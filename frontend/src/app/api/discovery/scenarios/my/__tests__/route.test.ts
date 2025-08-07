import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from '@/lib/auth/session';

// Mock auth session
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn()
}));

// Get mocked function
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

// Mock repositories
const mockFindByUser = jest.fn();
const mockFindById = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: () => ({
      findByUser: mockFindByUser,
    }),
    getScenarioRepository: () => ({
      findById: mockFindById,
    }),
  },
}));

describe('GET /api/discovery/scenarios/my', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Authentication required' });
  });

  it('returns empty array when user has no discovery programs', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByUser.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ scenarios: [] });
  });

  it('returns user discovery scenarios with active program', async () => {
    const mockPrograms = [
      {
        id: 'prog1',
        scenarioId: 'scenario1',
        mode: 'discovery',
        status: 'active',
        completedTaskCount: 3,
        totalTaskCount: 5,
        totalScore: 85,
        xpEarned: 300,
        lastActivityAt: '2024-01-05T10:00:00Z',
      },
      {
        id: 'prog2',
        scenarioId: 'scenario1',
        mode: 'discovery',
        status: 'completed',
        totalScore: 90,
        updatedAt: '2024-01-03T10:00:00Z',
      },
    ];

    const mockScenario = {
      id: 'scenario1',
      title: { en: 'Software Engineer Path', zhTW: '軟體工程師路徑' },
      description: { en: 'Learn software engineering' },
      metadata: {
        careerType: 'software-engineer',
        skillFocus: ['programming', 'debugging'],
        category: 'technology',
      },
    };

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByUser.mockResolvedValue(mockPrograms);
    mockFindById.mockResolvedValue(mockScenario);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scenarios).toHaveLength(1);
    expect(data.scenarios[0]).toMatchObject({
      scenarioId: 'scenario1',
      id: 'software-engineer',
      title: 'Software Engineer Path',
      careerType: 'software-engineer',
      primaryStatus: 'mastered',
      currentProgress: 100, // mastered because one program is completed
      stats: {
        completedCount: 1,
        activeCount: 1,
        totalAttempts: 2,
        bestScore: 90,
      },
      isActive: true,
      userPrograms: {
        active: {
          id: 'prog1',
          status: 'active',
          completedTasks: 3,
          totalTasks: 5,
          score: 85,
          xpEarned: 300,
        },
        total: 2,
      },
      skills: ['programming', 'debugging'],
      category: 'technology',
    });
  });

  it('returns mastered status for completed scenarios', async () => {
    const mockPrograms = [
      {
        id: 'prog1',
        scenarioId: 'scenario1',
        mode: 'discovery',
        status: 'completed',
        totalScore: 95,
        createdAt: '2024-01-01T10:00:00Z',
      },
    ];

    const mockScenario = {
      id: 'scenario1',
      title: 'Data Science Path',
      description: 'Master data science',
      discoveryData: {
        careerType: 'data-scientist',
      },
    };

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByUser.mockResolvedValue(mockPrograms);
    mockFindById.mockResolvedValue(mockScenario);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scenarios[0]).toMatchObject({
      primaryStatus: 'mastered',
      currentProgress: 100,
      stats: {
        completedCount: 1,
        activeCount: 0,
        bestScore: 95,
      },
      displayStatus: 'completed',
    });
  });

  it('filters out non-discovery programs', async () => {
    const mockPrograms = [
      {
        id: 'prog1',
        scenarioId: 'scenario1',
        mode: 'discovery',
        status: 'active',
      },
      {
        id: 'prog2',
        scenarioId: 'scenario2',
        mode: 'pbl',
        status: 'active',
      },
      {
        id: 'prog3',
        scenarioId: 'scenario3',
        mode: 'assessment',
        status: 'completed',
      },
    ];

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByUser.mockResolvedValue(mockPrograms);
    mockFindById.mockResolvedValue({
      id: 'scenario1',
      title: 'Discovery Scenario',
      metadata: { careerType: 'engineer' },
    });

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scenarios).toHaveLength(1);
    expect(data.scenarios[0].scenarioId).toBe('scenario1');
  });

  it('handles localization with accept-language header', async () => {
    const mockPrograms = [
      {
        id: 'prog1',
        scenarioId: 'scenario1',
        mode: 'discovery',
        status: 'active',
      },
    ];

    const mockScenario = {
      id: 'scenario1',
      title: {
        en: 'AI Engineer Path',
        zhTW: 'AI 工程師路徑',
        zhCN: 'AI 工程师路径',
      },
      description: {
        en: 'Description in English',
        zhTW: '繁體中文描述',
      },
      metadata: { careerType: 'ai-engineer' },
    };

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByUser.mockResolvedValue(mockPrograms);
    mockFindById.mockResolvedValue(mockScenario);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my', {
      headers: { 'accept-language': 'zh-TW' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scenarios[0].title).toBe('AI 工程師路徑');
    expect(data.scenarios[0].subtitle).toBe('繁體中文描述');
  });

  it('handles lang query parameter for localization', async () => {
    const mockPrograms = [
      {
        id: 'prog1',
        scenarioId: 'scenario1',
        mode: 'discovery',
        status: 'active',
      },
    ];

    const mockScenario = {
      id: 'scenario1',
      title: {
        en: 'Product Manager',
        zhCN: '产品经理',
      },
      metadata: { careerType: 'product-manager' },
    };

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByUser.mockResolvedValue(mockPrograms);
    mockFindById.mockResolvedValue(mockScenario);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my?lang=zhCN');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scenarios[0].title).toBe('产品经理');
  });

  it('sorts scenarios by last activity', async () => {
    const mockPrograms = [
      {
        id: 'prog1',
        scenarioId: 'scenario1',
        mode: 'discovery',
        status: 'active',
        lastActivityAt: '2024-01-05T10:00:00Z',
      },
      {
        id: 'prog2',
        scenarioId: 'scenario2',
        mode: 'discovery',
        status: 'active',
        updatedAt: '2024-01-10T10:00:00Z',
      },
      {
        id: 'prog3',
        scenarioId: 'scenario3',
        mode: 'discovery',
        status: 'completed',
        createdAt: '2024-01-01T10:00:00Z',
      },
    ];

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByUser.mockResolvedValue(mockPrograms);
    mockFindById
      .mockResolvedValueOnce({ id: 'scenario1', title: 'Scenario 1', metadata: { careerType: 'type1' } })
      .mockResolvedValueOnce({ id: 'scenario2', title: 'Scenario 2', metadata: { careerType: 'type2' } })
      .mockResolvedValueOnce({ id: 'scenario3', title: 'Scenario 3', metadata: { careerType: 'type3' } });

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scenarios).toHaveLength(3);
    expect(data.scenarios[0].scenarioId).toBe('scenario2'); // Most recent
    expect(data.scenarios[1].scenarioId).toBe('scenario1');
    expect(data.scenarios[2].scenarioId).toBe('scenario3'); // Oldest
  });

  it('handles missing scenario gracefully', async () => {
    const mockPrograms = [
      {
        id: 'prog1',
        scenarioId: 'scenario1',
        mode: 'discovery',
        status: 'active',
      },
      {
        id: 'prog2',
        scenarioId: 'scenario-missing',
        mode: 'discovery',
        status: 'active',
      },
    ];

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByUser.mockResolvedValue(mockPrograms);
    mockFindById
      .mockResolvedValueOnce({ id: 'scenario1', title: 'Valid Scenario', metadata: { careerType: 'valid' } })
      .mockResolvedValueOnce(null); // Missing scenario

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scenarios).toHaveLength(1);
    expect(data.scenarios[0].scenarioId).toBe('scenario1');
  });

  it('handles database errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByUser.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch scenarios' });
  });
});
