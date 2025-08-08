import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
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
const mockFindByEmail = jest.fn();
const mockCreate = jest.fn();
const mockFindByProgram = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: () => ({
      findByUser: mockFindByUser,
    }),
    getScenarioRepository: () => ({
      findById: mockFindById,
    }),
    getUserRepository: () => ({
      findByEmail: mockFindByEmail,
      create: mockCreate,
    }),
    getEvaluationRepository: () => ({
      findById: mockFindById,
    }),
    getTaskRepository: () => ({
      findByProgram: mockFindByProgram,
    }),
  },
}));

// Mock learning service
const mockStartLearning = jest.fn();
jest.mock('@/lib/services/learning-service-factory', () => ({
  learningServiceFactory: {
    getService: () => ({
      startLearning: mockStartLearning,
    }),
  },
}));

describe('Assessment Scenarios Programs API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/assessment/scenarios/[id]/programs', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/scenario123/programs');
      const response = await GET(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Authentication required',
      });
    });

    it('returns 404 when user not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
      mockFindByEmail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/scenario123/programs');
      const response = await GET(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'User not found' });
    });

    it('returns empty array when user has no programs', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
      mockFindByEmail.mockResolvedValue({ id: 'user123', email: 'test@example.com' });
      mockFindByUser.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/scenario123/programs');
      const response = await GET(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        programs: [],
        totalCount: 0,
      });
    });

    it('returns user programs for specific scenario', async () => {
      const mockPrograms = [
        {
          id: 'prog1',
          scenarioId: 'scenario123',
          status: 'completed',
          metadata: { evaluationId: 'eval1', score: 85 },
          startedAt: '2024-01-02',
        },
        {
          id: 'prog2',
          scenarioId: 'scenario456',
          status: 'active',
          startedAt: '2024-01-03',
        },
        {
          id: 'prog3',
          scenarioId: 'scenario123',
          status: 'active',
          metadata: { questionsAnswered: 5 },
          startedAt: '2024-01-04',
        },
      ];

      const mockEvaluation = {
        id: 'eval1',
        score: 85,
        metadata: {
          totalQuestions: 20,
          correctAnswers: 17,
          level: 'advanced',
          completionTime: 1200,
          domainScores: { domain1: 90, domain2: 80 },
        },
      };

      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
      mockFindByEmail.mockResolvedValue({ id: 'user123', email: 'test@example.com' });
      mockFindByUser.mockResolvedValue(mockPrograms);
      mockFindById.mockResolvedValue(mockEvaluation); // For evaluation lookup

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/scenario123/programs');
      const response = await GET(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs).toHaveLength(2); // Only programs for scenario123
      expect(data.programs[0].id).toBe('prog3'); // Most recent first
      expect(data.programs[1].id).toBe('prog1');
      expect(data.programs[1].score || data.programs[1].metadata?.score).toBe(85);
      expect(data.programs[1].metadata?.totalQuestions).toBe(20);
      expect(data.totalCount).toBe(2);
    });

    it('handles missing evaluations gracefully', async () => {
      const mockPrograms = [
        {
          id: 'prog1',
          scenarioId: 'scenario123',
          status: 'completed',
          metadata: { evaluationId: 'missing-eval' },
        },
      ];

      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
      mockFindByEmail.mockResolvedValue({ id: 'user123', email: 'test@example.com' });
      mockFindByUser.mockResolvedValue(mockPrograms);
      mockFindById.mockResolvedValue(null); // Evaluation not found

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/scenario123/programs');
      const response = await GET(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.programs[0].score || data.programs[0].metadata?.score || 0).toBe(0);
      expect(data.programs[0].metadata?.totalQuestions).toBeUndefined();
    });
  });

  describe('POST /api/assessment/scenarios/[id]/programs', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/scenario123/programs', {
        method: 'POST',
        body: JSON.stringify({ action: 'start' }),
      });

      const response = await POST(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Authentication required' });
    });

    it('returns 400 for invalid action', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/scenario123/programs', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid' }),
      });

      const response = await POST(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Invalid action' });
    });

    it('creates new user if not exists', async () => {
      const mockScenario = {
        id: 'scenario123',
        mode: 'assessment',
        title: 'Assessment Scenario',
      };

      const mockNewUser = {
        id: 'user-new',
        email: 'newuser@example.com',
        name: 'newuser',
      };

      const mockProgram = {
        id: 'prog-new',
        scenarioId: 'scenario123',
        status: 'active',
      };

      const mockTasks = [
        { id: 'task1', content: { questions: [1, 2, 3] } },
        { id: 'task2', content: { questions: [4, 5] } },
      ];

      mockGetServerSession.mockResolvedValue({ user: { id: 'newuser123', email: 'newuser@example.com' } });
      mockFindByEmail.mockResolvedValueOnce(null); // User doesn't exist
      mockCreate.mockResolvedValue(mockNewUser); // Create user
      mockFindById.mockResolvedValue(mockScenario);
      mockFindByUser.mockResolvedValue([]);
      mockStartLearning.mockResolvedValue(mockProgram);
      mockFindByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/scenario123/programs', {
        method: 'POST',
        body: JSON.stringify({ action: 'start', language: 'zh' }),
      });

      const response = await POST(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockCreate).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        name: 'newuser',
        preferredLanguage: 'zh',
      });
      expect(data.program).toBeDefined();
      expect(data.tasks).toHaveLength(2);
      expect(data.questionsCount).toBe(5);
    });

    it('returns existing active program', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      const mockScenario = { id: 'scenario123', mode: 'assessment' };
      const mockExistingProgram = {
        id: 'prog-existing',
        scenarioId: 'scenario123',
        status: 'active',
      };
      const mockTasks = [
        { id: 'task1', content: { questions: [1, 2] } },
      ];

      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
      mockFindByEmail.mockResolvedValue(mockUser);
      mockFindById.mockResolvedValue(mockScenario);
      mockFindByUser.mockResolvedValue([mockExistingProgram]);
      mockFindByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/scenario123/programs', {
        method: 'POST',
        body: JSON.stringify({ action: 'start' }),
      });

      const response = await POST(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.existing).toBe(true);
      expect(data.program.id).toBe('prog-existing');
      expect(mockStartLearning).not.toHaveBeenCalled();
    });

    it('returns 404 when scenario not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
      mockFindByEmail.mockResolvedValue({ id: 'user123', email: 'test@example.com' });
      mockFindById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/nonexistent/programs', {
        method: 'POST',
        body: JSON.stringify({ action: 'start' }),
      });

      const response = await POST(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Scenario not found' });
    });

    it('returns 400 when scenario is not assessment type', async () => {
      const mockScenario = { id: 'scenario123', mode: 'pbl' }; // Not assessment

      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
      mockFindByEmail.mockResolvedValue({ id: 'user123', email: 'test@example.com' });
      mockFindById.mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/scenario123/programs', {
        method: 'POST',
        body: JSON.stringify({ action: 'start' }),
      });

      const response = await POST(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Scenario is not an assessment scenario' });
    });

    it('handles errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
      mockFindByEmail.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios/scenario123/programs', {
        method: 'POST',
        body: JSON.stringify({ action: 'start' }),
      });

      const response = await POST(request, { params: Promise.resolve({'id':'scenario123'}) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ 
        error: 'Failed to create program',
        details: 'Database error'
      });
    });
  });
});
