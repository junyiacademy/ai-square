/**
 * Discovery Program Evaluation API Tests
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() => ({
    json: () => Promise.resolve({ success: false, error: 'Authentication required' }),
    status: 401
  }))
}));
jest.mock('@/lib/repositories/base/repository-factory');

const mockGetUnifiedAuth = getUnifiedAuth as jest.MockedFunction<typeof getUnifiedAuth>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('/api/discovery/programs/[programId]/evaluation', () => {
  let programRepo: any;
  let evaluationRepo: any;
  let taskRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    programRepo = { findById: jest.fn() };
    evaluationRepo = { findByProgram: jest.fn() };
    taskRepo = { findByProgram: jest.fn() };

    mockRepositoryFactory.getProgramRepository.mockReturnValue(programRepo);
    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(evaluationRepo);
    mockRepositoryFactory.getTaskRepository.mockReturnValue(taskRepo);
  });

  it('returns 401 when unauthenticated and no userEmail provided', async () => {
    mockGetUnifiedAuth.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/discovery/programs/p1/evaluation');
    const res = await GET(req, { params: Promise.resolve({ programId: 'p1' }) });
    expect(res.status).toBe(401);
  });

  it('accepts userEmail query param when no session and returns 200 if program matches', async () => {
    mockGetUnifiedAuth.mockResolvedValue(null);
    programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'guest@example.com' });
    taskRepo.findByProgram.mockResolvedValue([]);
    evaluationRepo.findByProgram.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/discovery/programs/p1/evaluation?userEmail=guest@example.com');
    const res = await GET(req, { params: Promise.resolve({ programId: 'p1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.evaluation).toBeDefined();
    expect(data.evaluation.isNew).toBe(true);
  });

  it('returns 404 when program not found or access denied', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ user: { id: 'u1', email: 'u@test.com', role: 'student' } } as any);
    programRepo.findById.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/discovery/programs/p1/evaluation');
    const res = await GET(req, { params: Promise.resolve({ programId: 'p1' }) });
    expect(res.status).toBe(404);
  });

  it('returns synthetic evaluation when none exists', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ user: { id: 'u1', email: 'u@test.com', role: 'student' } } as any);
    programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', createdAt: '2024-01-01T00:00:00Z' });

    const tasks = [
      {
        id: 't1', status: 'completed', title: { en: 'Task 1' },
        metadata: { evaluation: { xpEarned: 80, score: 80, skillsImproved: ['analysis'] } },
        interactions: [{ type: 'user_input' }], completedAt: '2024-01-02T00:00:00Z'
      },
      {
        id: 't2', status: 'completed', title: { en: 'Task 2' },
        metadata: { evaluation: { xpEarned: 60, score: 60 } },
        interactions: [{ type: 'user_input' }], completedAt: '2024-01-03T00:00:00Z'
      },
      { id: 't3', status: 'pending', title: { en: 'Task 3' }, metadata: {}, interactions: [] }
    ];
    taskRepo.findByProgram.mockResolvedValue(tasks);
    evaluationRepo.findByProgram.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/discovery/programs/p1/evaluation', {
      headers: { 'accept-language': 'en' }
    } as any);
    const res = await GET(req, { params: Promise.resolve({ programId: 'p1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.evaluation).toMatchObject({
      programId: 'p1',
      evaluationType: 'discovery_complete',
      totalTasks: 3,
      completedTasks: 2,
      isNew: true
    });
    // totalXP 80+60, avg score 70
    expect(data.evaluation.totalXP).toBe(140);
    expect(data.evaluation.overallScore).toBe(70);
    expect(Array.isArray(data.evaluation.taskEvaluations)).toBe(true);
  });

  it('returns existing evaluation when found and exposes metadata fields', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ user: { id: 'u1', email: 'u@test.com', role: 'student' } } as any);
    programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', metadata: { totalXP: 200 } });

    const evaluation = {
      id: 'eval1',
      evaluationType: 'discovery_complete',
      score: 85,
      metadata: {
        overallScore: 85,
        totalXP: 200,
        totalTasks: 6,
        completedTasks: 6,
        timeSpentSeconds: 3600,
        daysUsed: 3,
        taskEvaluations: [{ taskId: 't1', score: 80 }]
      }
    };

    taskRepo.findByProgram.mockResolvedValue([]);
    evaluationRepo.findByProgram.mockResolvedValue([evaluation]);

    const req = new NextRequest('http://localhost/api/discovery/programs/p1/evaluation');
    const res = await GET(req, { params: Promise.resolve({ programId: 'p1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.evaluation.overallScore).toBe(85);
    expect(data.evaluation.totalXP).toBe(200);
    expect(data.evaluation.completedTasks).toBe(6);
    expect(data.evaluation.taskEvaluations).toHaveLength(1);
  });

  it('returns 500 on unexpected error', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ user: { id: 'u1', email: 'u@test.com', role: 'student' } } as any);
    programRepo.findById.mockRejectedValue(new Error('db down'));
    const req = new NextRequest('http://localhost/api/discovery/programs/p1/evaluation');
    const res = await GET(req, { params: Promise.resolve({ programId: 'p1' }) });
    expect(res.status).toBe(500);
  });
});
