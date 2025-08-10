/**
 * Discovery Task API Tests
 */

import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');
// Mock AI service to avoid real calls when needed
jest.mock('@/lib/ai/vertex-ai-service', () => {
  return {
    VertexAIService: jest.fn().mockImplementation(() => ({
      sendMessage: jest.fn(async () => ({ content: '{"feedback":"ok","completed":true,"xpEarned":50}' }))
    }))
  };
});

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('/api/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]', () => {
  let programRepo: any;
  let taskRepo: any;
  let scenarioRepo: any;
  let evaluationRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    programRepo = { findById: jest.fn(), update: jest.fn() };
    taskRepo = {
      findByProgram: jest.fn(),
      getTaskWithInteractions: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      updateInteractions: jest.fn(),
      recordAttempt: jest.fn()
    };
    scenarioRepo = { findById: jest.fn() };
    evaluationRepo = { findById: jest.fn(), create: jest.fn(), findByProgram: jest.fn() };

    mockRepositoryFactory.getProgramRepository.mockReturnValue(programRepo);
    mockRepositoryFactory.getTaskRepository.mockReturnValue(taskRepo);
    mockRepositoryFactory.getScenarioRepository.mockReturnValue(scenarioRepo);
    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(evaluationRepo);
  });

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 403 when program not owned by user', async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'other', scenarioId: 's1' });
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(403);
    });

    it('returns 404 when task not found or not in program', async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1' });
      taskRepo.getTaskWithInteractions.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 200 with task data', async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1', metadata: { language: 'en' } });
      taskRepo.getTaskWithInteractions.mockResolvedValue({
        id: 't1',
        programId: 'p1',
        title: { en: 'Task Title' },
        content: { description: { en: 'Desc' }, instructions: { en: 'Do it' }, xp: 100 },
        status: 'pending',
        interactions: []
      });
      scenarioRepo.findById.mockResolvedValue({ id: 's1', title: { en: 'Scenario' }, metadata: { careerType: 'data_analyst' } });

      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1?lang=en');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('t1');
      expect(data.title).toBe('Task Title');
      expect(data.careerType).toBe('data_analyst');
      expect(data.content.description).toBe('Desc');
    });

    it('returns 500 on unexpected error', async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockRejectedValue(new Error('boom'));
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(500);
    });
  });

  describe('PATCH', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1', { method: 'PATCH', body: JSON.stringify({ action: 'start' }) });
      const res = await PATCH(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 403 when program not owned by user', async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'other', scenarioId: 's1' });
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1', { method: 'PATCH', body: JSON.stringify({ action: 'start' }) });
      const res = await PATCH(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(403);
    });

    it('returns 404 when task not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1' });
      taskRepo.getTaskWithInteractions.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1', { method: 'PATCH', body: JSON.stringify({ action: 'start' }) });
      const res = await PATCH(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(404);
    });

    it('start action returns 200 and updates status', async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1', metadata: {} });
      taskRepo.getTaskWithInteractions.mockResolvedValue({ id: 't1', programId: 'p1', status: 'pending', interactions: [], content: {}, title: { en: 'T' } });
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1', { method: 'PATCH', body: JSON.stringify({ action: 'start' }) });
      const res = await PATCH(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ success: true, status: 'active' });
      expect(taskRepo.updateStatus).toHaveBeenCalledWith('t1', 'active');
    });

    it('invalid action returns 400', async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1' });
      taskRepo.getTaskWithInteractions.mockResolvedValue({ id: 't1', programId: 'p1', status: 'pending', interactions: [], content: {}, title: { en: 'T' } });
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1', { method: 'PATCH', body: JSON.stringify({ action: 'unknown' }) });
      const res = await PATCH(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(400);
    });

    it('submit with AI error returns success:false payload (200)', async () => {
      const { VertexAIService } = require('@/lib/ai/vertex-ai-service');
      (VertexAIService as jest.Mock).mockImplementationOnce(() => ({
        sendMessage: jest.fn(async () => { throw new Error('AI down'); })
      }));

      mockGetServerSession.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1', metadata: { language: 'en' } });
      taskRepo.getTaskWithInteractions.mockResolvedValue({ id: 't1', programId: 'p1', status: 'pending', interactions: [], content: { xp: 100 }, title: { en: 'T' }, metadata: {} });

      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'submit', content: { response: 'hello', timeSpent: 5 } })
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('AI evaluation failed');
    });
  });
}); 