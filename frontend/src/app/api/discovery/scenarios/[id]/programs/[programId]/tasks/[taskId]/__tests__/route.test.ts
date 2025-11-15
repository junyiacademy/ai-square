/**
 * Discovery Task API Tests
 */

import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';
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
// Mock AI service to avoid real calls when needed
jest.mock('@/lib/ai/vertex-ai-service', () => {
  return {
    VertexAIService: jest.fn().mockImplementation(() => ({
      sendMessage: jest.fn(async () => ({ content: '{"feedback":"ok","completed":true,"xpEarned":50}' }))
    }))
  };
});

// Mock TranslationService for GET evaluation translation branch
jest.mock('@/lib/services/translation-service', () => {
  class MockTranslationService {
    // eslint-disable-next-line @typescript-eslint/require-await
    async translateFeedback(_text: string, _lang: string, _career: string): Promise<string> {
      return 'translated-feedback';
    }
  }
  // static helper used by route on fallback
  (MockTranslationService as unknown as { getFeedbackByLanguage?: jest.Mock }).getFeedbackByLanguage = jest
    .fn()
    .mockImplementation((versions: Record<string, string>, lang: string) => versions[lang] || versions['en'] || '');
  return { TranslationService: MockTranslationService };
});

const mockGetUnifiedAuth = getUnifiedAuth as jest.MockedFunction<typeof getUnifiedAuth>;
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
      mockGetUnifiedAuth.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 403 when program not owned by user', async () => {
      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'other', scenarioId: 's1' });
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(403);
    });

    it('returns 404 when task not found or not in program', async () => {
      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1' });
      taskRepo.getTaskWithInteractions.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 200 with task data', async () => {
      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
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

    it('translates evaluation to requested language and stores versions', async () => {
      const { TranslationService } = require('@/lib/services/translation-service');
      const translateSpy = jest.spyOn(TranslationService.prototype, 'translateFeedback');

      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1' });
      taskRepo.getTaskWithInteractions.mockResolvedValue({
        id: 't1', programId: 'p1', status: 'completed', title: { en: 'T' }, content: {}, metadata: { evaluationId: 'e1' }
      });
      scenarioRepo.findById.mockResolvedValue({ id: 's1', title: { en: 'Scenario' }, metadata: { careerType: 'data_analyst' } });
      evaluationRepo.findById.mockResolvedValue({ id: 'e1', score: 0.9, feedbackData: { en: 'Great job' }, createdAt: '2024-01-01T00:00:00Z' });

      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1?lang=es');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(200);
      expect(translateSpy).toHaveBeenCalledWith('Great job', 'es', 'data_analyst');
      expect(taskRepo.update).toHaveBeenCalledWith('t1', expect.objectContaining({
        metadata: expect.objectContaining({ evaluationFeedbackVersions: expect.objectContaining({ es: 'translated-feedback' }) })
      }));
    });

    it('falls back to existing version when translation or update fails', async () => {
      const { TranslationService } = require('@/lib/services/translation-service');
      // Make translate throw to trigger fallback path
      jest.spyOn(TranslationService.prototype, 'translateFeedback').mockImplementationOnce(async () => { throw new Error('t-fail'); });
      // Ensure static fallback picks english
      (TranslationService as unknown as { getFeedbackByLanguage: jest.Mock }).getFeedbackByLanguage.mockReturnValueOnce('Great job');

      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1' });
      taskRepo.getTaskWithInteractions.mockResolvedValue({
        id: 't1', programId: 'p1', status: 'completed', title: { en: 'T' }, content: {}, metadata: { evaluationId: 'e1' }
      });
      scenarioRepo.findById.mockResolvedValue({ id: 's1', title: { en: 'Scenario' }, metadata: { careerType: 'data_analyst' } });
      evaluationRepo.findById.mockResolvedValue({ id: 'e1', score: 0.9, feedbackData: { en: 'Great job' }, createdAt: '2024-01-01T00:00:00Z' });

      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1?lang=es');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(200);
      // On failure, update should not be required; translation fallback used instead
      expect((TranslationService as unknown as { getFeedbackByLanguage: jest.Mock }).getFeedbackByLanguage).toHaveBeenCalled();
    });

    it('returns 500 on unexpected error', async () => {
      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockRejectedValue(new Error('boom'));
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(500);
    });

    it('returns English version directly without translation when en exists', async () => {
      const { TranslationService } = require('@/lib/services/translation-service');
      const translateSpy = jest.spyOn(TranslationService.prototype, 'translateFeedback');

      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1' });
      taskRepo.getTaskWithInteractions.mockResolvedValue({
        id: 't1', programId: 'p1', status: 'completed', title: { en: 'T' }, content: {}, metadata: { evaluationId: 'e1' }
      });
      scenarioRepo.findById.mockResolvedValue({ id: 's1', title: { en: 'Scenario' }, metadata: { careerType: 'data_analyst' } });
      evaluationRepo.findById.mockResolvedValue({ id: 'e1', score: 0.9, feedbackData: { en: 'Great job' }, createdAt: '2024-01-01T00:00:00Z' });

      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1?lang=en');
      const res = await GET(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(200);
      // should not translate
      expect(translateSpy).not.toHaveBeenCalled();
      // and should not persist new versions
      expect(taskRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('PATCH', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUnifiedAuth.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1', { method: 'PATCH', body: JSON.stringify({ action: 'start' }) });
      const res = await PATCH(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 403 when program not owned by user', async () => {
      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'other', scenarioId: 's1' });
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1', { method: 'PATCH', body: JSON.stringify({ action: 'start' }) });
      const res = await PATCH(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(403);
    });

    it('returns 404 when task not found', async () => {
      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1' });
      taskRepo.getTaskWithInteractions.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1', { method: 'PATCH', body: JSON.stringify({ action: 'start' }) });
      const res = await PATCH(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(404);
    });

    it('start action returns 200 and updates status', async () => {
      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
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
      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
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

      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
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

    it('confirm-complete returns 400 when no passed ai_response exists', async () => {
      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1' });
      taskRepo.getTaskWithInteractions.mockResolvedValue({
        id: 't1', programId: 'p1', status: 'pending', // not completed and no passed ai_response
        interactions: [
          { type: 'user_input', content: 'answer', timestamp: new Date().toISOString(), metadata: {} },
          { type: 'ai_response', content: JSON.stringify({ completed: false, feedback: 'no' }), timestamp: new Date().toISOString(), metadata: {} },
        ],
        content: { xp: 100 },
        title: { en: 'T' },
        metadata: {}
      });
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1', { method: 'PATCH', body: JSON.stringify({ action: 'confirm-complete' }) });
      const res = await PATCH(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe('Task has not been passed yet');
    });

    it('regenerate-evaluation returns 403 when not in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process, 'env', { value: { ...process.env, NODE_ENV: 'test' } });
      mockGetUnifiedAuth.mockResolvedValue({ user: { email: 'u@test.com', id: 'u1' } } as any);
      programRepo.findById.mockResolvedValue({ id: 'p1', userId: 'u1', scenarioId: 's1' });
      taskRepo.getTaskWithInteractions.mockResolvedValue({ id: 't1', programId: 'p1', status: 'completed', interactions: [], content: { xp: 100 }, title: { en: 'T' }, metadata: { evaluationId: 'e1' } });
      const req = new NextRequest('http://localhost/api/discovery/scenarios/s1/programs/p1/tasks/t1', { method: 'PATCH', body: JSON.stringify({ action: 'regenerate-evaluation' }) });
      const res = await PATCH(req, { params: Promise.resolve({ id: 's1', programId: 'p1', taskId: 't1' }) });
      expect(res.status).toBe(403);
      Object.defineProperty(process, 'env', { value: { ...process.env, NODE_ENV: originalEnv } });
    });
  });
});
