import { NextRequest } from "next/server";
import { GET } from "../route";

// Mocks for repositoryFactory when USE_POSTGRES=true
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getUserRepository: jest.fn(),
    getEvaluationRepository: jest.fn(),
  }
}));

const { repositoryFactory } = jest.requireMock('@/lib/repositories/base/repository-factory');

describe("/api/assessment/results/[id]", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 400 when userId is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/assessment/results/eval123");
    const response = await GET(request, { params: Promise.resolve({'id':'test-id'}) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("userId is required");
  });

  it('returns 200 with local file result when Postgres disabled', async () => {
    delete process.env.DB_HOST;
    delete process.env.DB_NAME;

    const userId = 'userA@example.com';
    const evalId = 'eval-1';

    // Mock fs read via injecting process.cwd() data folder by spying on readFile through jest.mock not needed here;
    // Instead, rely on route's memoized loader and replace global readFile using jest.mock for fs/promises
    jest.resetModules();
    jest.doMock('fs/promises', () => ({
      readFile: jest.fn(async () => JSON.stringify({
        results: [
          { user_id: userId, assessment_id: evalId, score: 88 }
        ]
      }))
    }));
    const { GET: LocalGET } = require('../route');

    const request = new NextRequest(`http://localhost:3000/api/assessment/results/${evalId}?userId=${encodeURIComponent(userId)}`);
    const response = await LocalGET(request, { params: Promise.resolve({ id: evalId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessment_id).toBe(evalId);
    expect(data.user_id).toBe(userId);
    expect(data.score).toBe(88);
  });

  it('returns 404-ish error wrapped as 500 when local file missing result', async () => {
    delete process.env.DB_HOST;
    delete process.env.DB_NAME;

    jest.resetModules();
    jest.doMock('fs/promises', () => ({
      readFile: jest.fn(async () => JSON.stringify({ results: [] }))
    }));
    const { GET: LocalGET } = require('../route');

    const request = new NextRequest('http://localhost:3000/api/assessment/results/xx?userId=u');
    await expect(LocalGET(request, { params: Promise.resolve({ id: 'xx' }) })).rejects.toThrow('Assessment not found');
  });

  it('returns 200 with Postgres evaluation when enabled', async () => {
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_NAME = 'ai_square_db';

    const userRepo = { findByEmail: jest.fn(async () => ({ id: 'u1', email: 'u@e.com' })), findById: jest.fn() };
    const evalRepo = { findById: jest.fn(async () => ({
      id: 'e1', userId: 'u1', score: 90, maxScore: 100,
      metadata: { scenarioId: 'sc1' },
      createdAt: '2024-01-01T00:00:00Z',
      domainScores: { K: 80 },
      feedbackText: 'Great',
    })) };

    repositoryFactory.getUserRepository.mockReturnValue(userRepo);
    repositoryFactory.getEvaluationRepository.mockReturnValue(evalRepo);

    const req = new NextRequest('http://localhost:3000/api/assessment/results/e1?userId=u@e.com');
    const res = await GET(req, { params: Promise.resolve({ id: 'e1' }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.assessment_id).toBe('e1');
    expect(data.user_id).toBe('u@e.com');
    expect(data.ksa_scores).toEqual({ K: 80 });
  });

  it('returns 500 when Postgres user not found', async () => {
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_NAME = 'ai_square_db';

    const userRepo = { findByEmail: jest.fn(async () => null), findById: jest.fn() };
    const evalRepo = { findById: jest.fn() };
    repositoryFactory.getUserRepository.mockReturnValue(userRepo);
    repositoryFactory.getEvaluationRepository.mockReturnValue(evalRepo);

    // Use different ID to avoid cache key collision with previous success test
    const req = new NextRequest('http://localhost:3000/api/assessment/results/e2?userId=nouser@example.com');
    await expect(GET(req, { params: Promise.resolve({ id: 'e2' }) })).rejects.toThrow('User not found');
  });

  it('throws when evaluation belongs to another user (Postgres)', async () => {
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_NAME = 'ai_square_db';

    const userRepo = {
      findByEmail: jest.fn(async () => ({ id: 'u1', email: 'u@e.com' })),
      findById: jest.fn()
    };
    const evalRepo = {
      findById: jest.fn(async () => ({
        id: 'e3', userId: 'u2', // different owner
        score: 70, maxScore: 100,
        metadata: {}, createdAt: '2024-01-01T00:00:00Z', domainScores: {}, feedbackText: 'ok'
      }))
    };
    repositoryFactory.getUserRepository.mockReturnValue(userRepo);
    repositoryFactory.getEvaluationRepository.mockReturnValue(evalRepo);

    const req = new NextRequest('http://localhost:3000/api/assessment/results/e3?userId=u@e.com');
    await expect(GET(req, { params: Promise.resolve({ id: 'e3' }) })).rejects.toThrow('Assessment not found');
    expect(userRepo.findByEmail).toHaveBeenCalledWith('u@e.com');
  });

  it('returns 200 using userId lookup (non-email) in Postgres path', async () => {
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_NAME = 'ai_square_db';

    const userRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(async () => ({ id: 'u9', email: 'user9@example.com' }))
    };
    const evalRepo = {
      findById: jest.fn(async () => ({
        id: 'e9', userId: 'u9', score: 95, maxScore: 100,
        metadata: { scenarioId: 'sc9' }, createdAt: '2024-01-02T00:00:00Z', domainScores: { A: 90 }, feedbackText: 'great'
      }))
    };
    repositoryFactory.getUserRepository.mockReturnValue(userRepo);
    repositoryFactory.getEvaluationRepository.mockReturnValue(evalRepo);

    const req = new NextRequest('http://localhost:3000/api/assessment/results/e9?userId=u9');
    const res = await GET(req, { params: Promise.resolve({ id: 'e9' }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.assessment_id).toBe('e9');
    expect(userRepo.findById).toHaveBeenCalledWith('u9');
    expect(userRepo.findByEmail).not.toHaveBeenCalled();
  });

  it('uses memoized local results (readFile called once for repeated request)', async () => {
    delete process.env.DB_HOST;
    delete process.env.DB_NAME;

    const userId = 'memo@example.com';
    const evalId = 'eval-memo-1';

    jest.resetModules();
    const readFileMock = jest.fn(async () => JSON.stringify({
      results: [{ user_id: userId, assessment_id: evalId, score: 77 }]
    }));
    jest.doMock('fs/promises', () => ({ readFile: readFileMock }));
    const { GET: LocalGET } = require('../route');

    const url = `http://localhost:3000/api/assessment/results/${evalId}?userId=${encodeURIComponent(userId)}`;
    const req1 = new NextRequest(url);
    const res1 = await LocalGET(req1, { params: Promise.resolve({ id: evalId }) });
    expect(res1.status).toBe(200);

    // second call should hit memoized cache and not call readFile again
    const req2 = new NextRequest(url);
    const res2 = await LocalGET(req2, { params: Promise.resolve({ id: evalId }) });
    expect(res2.status).toBe(200);
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });
});
