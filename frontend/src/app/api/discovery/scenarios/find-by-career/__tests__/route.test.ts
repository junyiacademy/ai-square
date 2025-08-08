import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock auth session
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn()
}));

// Mock repositories
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: jest.fn(),
    getProgramRepository: jest.fn(),
  },
}));

// Get mocked functions
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockGetScenarioRepository = repositoryFactory.getScenarioRepository as jest.MockedFunction<typeof repositoryFactory.getScenarioRepository>;
const mockGetProgramRepository = repositoryFactory.getProgramRepository as jest.MockedFunction<typeof repositoryFactory.getProgramRepository>;

describe('GET /api/discovery/scenarios/find-by-career', () => {
  // Mock repository implementations
  const mockFindByMode = jest.fn();
  const mockFindByScenario = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup repository mocks
    mockGetScenarioRepository.mockReturnValue({
      findByMode: mockFindByMode,
    } as any);
    
    mockGetProgramRepository.mockReturnValue({
      findByScenario: mockFindByScenario,
    } as any);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=software-engineer');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when career type is missing', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Career type required' });
  });

  it('returns null when no scenarios found for career type', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByMode.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data-scientist');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ scenarioId: null });
    expect(mockFindByMode).toHaveBeenCalledWith('discovery');
  });

  it('returns scenario id when user has active program', async () => {
    const mockScenarios = [
      {
        id: 'scenario1',
        metadata: { careerType: 'software-engineer' },
      },
      {
        id: 'scenario2',
        metadata: { careerType: 'data-scientist' },
      },
    ];

    const mockPrograms = [
      {
        id: 'prog1',
        userId: 'test@example.com',
        status: 'active',
      },
    ];

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByMode.mockResolvedValue(mockScenarios);
    mockFindByScenario.mockResolvedValue(mockPrograms);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=software-engineer');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ scenarioId: 'scenario1' });
    expect(mockFindByScenario).toHaveBeenCalledWith('scenario1');
  });

  it('returns null when user has only completed programs', async () => {
    const mockScenarios = [
      {
        id: 'scenario1',
        metadata: { careerType: 'software-engineer' },
      },
    ];

    const mockPrograms = [
      {
        id: 'prog1',
        userId: 'test@example.com',
        status: 'completed',
      },
    ];

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByMode.mockResolvedValue(mockScenarios);
    mockFindByScenario.mockResolvedValue(mockPrograms);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=software-engineer');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ scenarioId: null });
  });

  it('returns scenario id for correct career type only', async () => {
    const mockScenarios = [
      {
        id: 'scenario1',
        metadata: { careerType: 'software-engineer' },
      },
      {
        id: 'scenario2',
        metadata: { careerType: 'data-scientist' },
      },
    ];

    const mockProgramsSE: Array<{ id: string; userId: string; status: string }> = [];
    const mockProgramsDS = [
      {
        id: 'prog2',
        userId: 'test@example.com',
        status: 'active',
      },
    ];

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByMode.mockResolvedValue(mockScenarios);
    mockFindByScenario
      .mockResolvedValueOnce(mockProgramsDS) // First call for data-scientist
      .mockResolvedValueOnce(mockProgramsSE); // Won't be called as we filter first

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=data-scientist');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ scenarioId: 'scenario2' });
    expect(mockFindByScenario).toHaveBeenCalledWith('scenario2');
    expect(mockFindByScenario).toHaveBeenCalledTimes(1);
  });

  it('returns scenario for first user-owned active program', async () => {
    const mockScenarios = [
      {
        id: 'scenario1',
        metadata: { careerType: 'software-engineer' },
      },
      {
        id: 'scenario2',
        metadata: { careerType: 'software-engineer' },
      },
    ];

    const mockPrograms1 = [
      {
        id: 'prog1',
        userId: 'other@example.com',
        status: 'active',
      },
      {
        id: 'prog2',
        userId: 'test@example.com',
        status: 'completed',
      },
    ];

    const mockPrograms2 = [
      {
        id: 'prog3',
        userId: 'test@example.com',
        status: 'active',
      },
    ];

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByMode.mockResolvedValue(mockScenarios);
    mockFindByScenario.mockImplementation((scenarioId) => {
      if (scenarioId === 'scenario1') return mockPrograms1;
      if (scenarioId === 'scenario2') return mockPrograms2;
      return [];
    });

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=software-engineer');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ scenarioId: 'scenario2' });
    expect(mockFindByScenario).toHaveBeenCalledTimes(2);
  });

  it('handles repository errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByMode.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=software-engineer');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('handles scenarios without metadata gracefully', async () => {
    const mockScenarios = [
      {
        id: 'scenario1',
        // No metadata
      },
      {
        id: 'scenario2',
        metadata: { careerType: 'software-engineer' },
      },
    ];

    const mockPrograms = [
      {
        id: 'prog1',
        userId: 'test@example.com',
        status: 'active',
      },
    ];

    mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
    mockFindByMode.mockResolvedValue(mockScenarios);
    mockFindByScenario.mockResolvedValue(mockPrograms);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/find-by-career?career=software-engineer');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ scenarioId: 'scenario2' });
    expect(mockFindByScenario).toHaveBeenCalledWith('scenario2');
    expect(mockFindByScenario).toHaveBeenCalledTimes(1);
  });
});