import { PostgreSQLEvaluationRepository } from '../evaluation-repository';
import type { Pool } from 'pg';

describe('PostgreSQLEvaluationRepository', () => {
  let pool: jest.Mocked<Pool>;
  let repo: PostgreSQLEvaluationRepository;

  beforeEach(() => {
    pool = {
      query: jest.fn(),
      connect: jest.fn() as any,
    } as unknown as jest.Mocked<Pool>;
    repo = new PostgreSQLEvaluationRepository(pool as unknown as Pool);
  });

  function dbRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'e1', user_id: 'u1', program_id: 'p1', task_id: 't1',
      mode: 'pbl', evaluation_type: 'task', evaluation_subtype: 'pbl_task',
      score: '90', max_score: '100',
      domain_scores: { K: 80 }, feedback_text: 'good', feedback_data: {},
      ai_provider: 'vertex', ai_model: 'gemini', ai_analysis: {},
          time_taken_seconds: '30',
      pbl_data: {}, discovery_data: {}, assessment_data: {},
      created_at: '2024-01-01T00:00:00Z', metadata: {},
      ...overrides,
    } as Record<string, unknown>;
  }

  it('findById should map DB row to IEvaluation (number conversions)', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [dbRow()] });
    const result = await repo.findById('e1');
    expect(result).toEqual(
      expect.objectContaining({ id: 'e1', userId: 'u1', score: 90, maxScore: 100, timeTakenSeconds: 30 })
    );
  });

  it('create should insert and return mapped evaluation', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [dbRow()] });
    const created = await repo.create({
      userId: 'u1', programId: 'p1', taskId: 't1', mode: 'pbl', evaluationType: 'task',
      score: 95, maxScore: 100, domainScores: { K: 90 }, feedbackText: 'nice', feedbackData: {},
      aiProvider: 'vertex', aiModel: 'gemini', aiAnalysis: {}, timeTakenSeconds: 10,
      pblData: {}, discoveryData: {}, assessmentData: {}, createdAt: '2024-01-01T00:00:00Z', metadata: {}
    });
    expect(pool.query).toHaveBeenCalled();
    expect(created.id).toBe('e1');
  });

  it('update should build dynamic update set and return mapped row', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [dbRow({ score: '70', feedback_text: 'ok' })] });
    const updated = await repo.update('e1', { score: 70, feedbackText: 'ok' });
    expect(pool.query).toHaveBeenCalled();
    expect(updated.score).toBe(70);
    expect(updated.feedbackText).toBe('ok' as any);
  });

  it('getLatestForTask returns the latest row', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [dbRow({ id: 'e-lt' })] });
    const latest = await repo.getLatestForTask('t1');
    expect(latest?.id).toBe('e-lt');
  });

  it('getLatestForProgram returns the latest program evaluation', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [dbRow({ id: 'e-lp', task_id: null })] });
    const latest = await repo.getLatestForProgram('p1');
    expect(latest?.id).toBe('e-lp');
  });

  it('findByType should pass subtype conditionally and map rows', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [dbRow({ id: 'e2' })] });
    const rows = await repo.findByType('task', 'pbl_task');
    expect(rows[0].id).toBe('e2');
  });
});