/**
 * Discovery Scenario Programs API Tests
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('/api/discovery/scenarios/[id]/programs', () => {
  let programRepo: any;
  let scenarioRepo: any;
  let taskRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    programRepo = {
      findByUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    scenarioRepo = {
      findById: jest.fn(),
    };
    taskRepo = {
      findByProgram: jest.fn(),
      create: jest.fn(),
    };

    mockRepositoryFactory.getProgramRepository.mockReturnValue(programRepo);
    mockRepositoryFactory.getScenarioRepository.mockReturnValue(scenarioRepo);
    mockRepositoryFactory.getTaskRepository.mockReturnValue(taskRepo);
  });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/discovery/scenarios/abc/programs');
      const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 when scenario not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } } as any);
      scenarioRepo.findById.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/discovery/scenarios/abc/programs');
      const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(404);
    });

    it('returns user programs with progress and sorted by createdAt desc', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } } as any);
      scenarioRepo.findById.mockResolvedValue({ id: 'abc', title: { en: 'Title' }, description: { en: 'Desc' } });

      const progs = [
        { id: 'p1', scenarioId: 'abc', createdAt: '2024-01-01T00:00:00Z', metadata: {} },
        { id: 'p2', scenarioId: 'abc', createdAt: '2024-01-03T00:00:00Z', metadata: {} },
        { id: 'p3', scenarioId: 'xyz', createdAt: '2024-01-02T00:00:00Z', metadata: {} }, // filtered out
      ];
      programRepo.findByUser.mockResolvedValue(progs);

      // tasks for each program
      taskRepo.findByProgram.mockImplementation(async (pid: string) => {
        if (pid === 'p1') {
          return [
            { id: 't11', status: 'completed', metadata: { xpEarned: 40 } },
            { id: 't12', status: 'pending', metadata: { xpEarned: 0 } },
          ];
        }
        if (pid === 'p2') {
          return [
            { id: 't21', status: 'completed', metadata: { xpEarned: 50 } },
            { id: 't22', status: 'completed', metadata: { xpEarned: 30 } },
          ];
        }
        return [];
      });

      const req = new NextRequest('http://localhost/api/discovery/scenarios/abc/programs');
      const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(200);
      const data = await res.json();

      // only p1 and p2 for scenario abc
      expect(data.programs).toHaveLength(2);
      // sorted desc => p2 first (2024-01-03)
      expect(data.programs[0].id).toBe('p2');

      // progress fields present
      const p2 = data.programs[0];
      expect(p2.metadata.totalTasks).toBe(2);
      expect(p2.metadata.completedTasks).toBe(2);
      expect(p2.metadata.totalXP).toBe(80);

      const p1 = data.programs[1];
      expect(p1.metadata.totalTasks).toBe(2);
      expect(p1.metadata.completedTasks).toBe(1);
      expect(p1.metadata.totalXP).toBe(40);

      expect(data.scenario).toEqual({ id: 'abc', title: { en: 'Title' }, description: { en: 'Desc' } });
    });

    it('returns 500 when repository throws', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } } as any);
      scenarioRepo.findById.mockResolvedValue({ id: 'abc' });
      programRepo.findByUser.mockRejectedValue(new Error('db error'));

      const req = new NextRequest('http://localhost/api/discovery/scenarios/abc/programs');
      const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(500);
    });
  });

  describe('POST (simplified)', () => {
    it('returns 401 when no session email', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } } as any);
      const req = new NextRequest('http://localhost/api/discovery/scenarios/abc/programs', { method: 'POST' });
      const res = await POST(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 when scenario not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'u1', email: 'u1@test.com' } } as any);
      scenarioRepo.findById.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/discovery/scenarios/abc/programs', { method: 'POST' });
      const res = await POST(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(404);
    });

    it('creates fallback simple task when no templates', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'u1', email: 'u1@test.com' } } as any);
      scenarioRepo.findById.mockResolvedValue({ id: 'abc', sourceId: 'career_x', title: { en: 'S' }, taskTemplates: [] });

      const program = { id: 'prog1', scenarioId: 'abc', status: 'active', metadata: {} };
      programRepo.create.mockResolvedValue(program);

      const createdTask = { id: 'task-fallback', status: 'active', content: { xp: 100 } };
      taskRepo.create.mockResolvedValue(createdTask);
      taskRepo.findByProgram.mockResolvedValue([createdTask]);

      const req = new NextRequest('http://localhost/api/discovery/scenarios/abc/programs', { method: 'POST' });
      const res = await POST(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.id).toBe('prog1');
      expect(data.currentTaskId).toBe('task-fallback');
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].xp).toBe(100);
      expect(data.totalTasks).toBe(1);
    });

    it('returns 500 when creation flow throws', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'u1', email: 'u1@test.com' } } as any);
      scenarioRepo.findById.mockResolvedValue({ id: 'abc', title: { en: 'S' }, taskTemplates: [] });
      programRepo.create.mockRejectedValue(new Error('db error'));

      const req = new NextRequest('http://localhost/api/discovery/scenarios/abc/programs', { method: 'POST' });
      const res = await POST(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(500);
    });
  });
}); 