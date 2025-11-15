/**
 * Discovery Program Detail API Tests
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() =>
    new Response(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  )
}));
jest.mock('@/lib/repositories/base/repository-factory');

const mockGetUnifiedAuth = getUnifiedAuth as jest.MockedFunction<typeof getUnifiedAuth>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('/api/discovery/scenarios/[id]/programs/[programId]', () => {
  let programRepo: any;
  let taskRepo: any;
  let scenarioRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    programRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    taskRepo = {
      findByProgram: jest.fn(),
    };
    scenarioRepo = {
      findById: jest.fn(),
    };

    mockRepositoryFactory.getProgramRepository.mockReturnValue(programRepo);
    mockRepositoryFactory.getTaskRepository.mockReturnValue(taskRepo);
    mockRepositoryFactory.getScenarioRepository.mockReturnValue(scenarioRepo);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUnifiedAuth.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1');
    const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when program not found', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
    programRepo.findById.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1');
    const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when program does not belong to user/scenario', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
    programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'other', scenarioId: 's1' });
    const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1');
    const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1' }) });
    expect(res.status).toBe(403);
  });

  it('returns program details with tasks summary (200)', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
    const program = {
      id: 'p1',
      userId: 'u1',
      scenarioId: 's1',
      status: 'active',
      metadata: { taskIds: ['t1', 't2'], totalXP: 0 },
      createdAt: '2024-01-01T00:00:00Z'
    };
    programRepo.findById.mockResolvedValue(program);

    const tasks = [
      {
        id: 't1',
        title: { en: 'Task 1' },
        content: { xp: 100, description: { en: 'Desc 1' } },
        status: 'completed',
        interactions: [
          { type: 'user_input' },
          { type: 'ai_response', content: { completed: true, xpEarned: 80 } },
        ],
      },
      {
        id: 't2',
        title: { en: 'Task 2' },
        content: { xp: 50, description: { en: 'Desc 2' } },
        status: 'pending',
        interactions: [],
      }
    ];

    taskRepo.findByProgram.mockResolvedValue(tasks);
    scenarioRepo.findById.mockResolvedValue({ id: 's1', title: { en: 'Scenario' }, sourceMetadata: { careerType: 'data_analyst' } });

    const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1?lang=en');
    const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('p1');
    expect(data.totalTasks).toBe(2);
    expect(data.completedTasks).toBe(1);
    expect(data.totalXP).toBe(80); // from completed task actualXP
    expect(data.tasks[0]).toMatchObject({ id: 't1', title: 'Task 1', status: 'completed' });
    expect(data.tasks[1]).toMatchObject({ id: 't2', title: 'Task 2', status: 'available' });
    expect(data.careerType).toBe('data_analyst');
  });

  it('returns 500 on unexpected error', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
    programRepo.findById.mockRejectedValue(new Error('boom'));
    const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1');
    const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1' }) });
    expect(res.status).toBe(500);
  });
});
