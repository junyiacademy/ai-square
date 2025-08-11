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

  it('getUserProgress should aggregate stats and map achievements with aliases', async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    (pool.connect as unknown as jest.Mock).mockResolvedValue(client);

    // program stats
    ;(client.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ total: '3', completed: '2' }] })
      // task stats
      .mockResolvedValueOnce({ rows: [{ total: '10', completed: '7', avg_score: '82.5', total_time: '3600' }] })
      // xp data
      .mockResolvedValueOnce({ rows: [{ total_xp: 420 }] })
      // achievements (DB columns use snake_case)
      .mockResolvedValueOnce({ rows: [
        { id: 'a1', code: 'ACH_1', name: 'Ach One', description: 'desc', xp_reward: 50, earned_at: '2024-01-02T00:00:00Z' },
        { id: 'a2', code: 'ACH_2', name: 'Ach Two', description: 'desc2', xp_reward: 25, earned_at: '2024-01-03T00:00:00Z' },
      ] });

    const result = await repo.getUserProgress('u1');
    expect(result).toEqual(
      expect.objectContaining({
        totalPrograms: 3,
        completedPrograms: 2,
        totalTasks: 10,
        completedTasks: 7,
        averageScore: 82.5,
        timeSpentSeconds: 3600,
        totalXpEarned: 420,
      })
    );
    expect(result.achievements?.length).toBe(2);
    expect(result.achievements?.[0]).toEqual(
      expect.objectContaining({ id: 'a1', code: 'ACH_1', xpReward: 50, type: 'achievement', earnedAt: new Date('2024-01-02T00:00:00Z') })
    );
  });

  it('getDetailedEvaluations should map joined fields', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [
      { ...dbRow({ id: 'e3' }), scenario_mode: 'assessment', scenario_difficulty: 'intermediate', task_type: 'question', task_index: 2 }
    ] });
    const res = await repo.getDetailedEvaluations('u1', 5);
    expect(res[0]).toEqual(expect.objectContaining({
      id: 'e3', scenarioMode: 'assessment', scenarioDifficulty: 'intermediate', taskType: 'question', taskIndex: 2
    }));
  });

  it('getDimensionProgress should return date/score series without dimension', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [
      { date: '2024-01-01', domain_scores: { K: 80 } },
      { date: '2024-01-02', domain_scores: { K: 85 } },
    ] });
    const res = await repo.getDimensionProgress('u1');
    expect(res).toEqual([
      { date: '2024-01-01', scores: { K: 80 } },
      { date: '2024-01-02', scores: { K: 85 } },
    ]);
  });

  it('getDimensionProgress should use dimension filter when provided', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [
      { date: '2024-01-01', domain_scores: { K: 80 } }
    ] });
    const res = await repo.getDimensionProgress('u1', 'K');
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = $1'), ['u1', 'K']);
    expect(res[0].scores.K).toBe(80);
  });

  it('findByDateRange should use ISO strings and map rows', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [dbRow({ id: 'e4' })] });
    const res = await repo.findByDateRange('u1', new Date('2024-01-01'), new Date('2024-01-31'));
    expect(res[0].id).toBe('e4');
    // Verify dates were passed as ISO (string compare presence of 'T')
    const args = (pool.query as jest.Mock).mock.calls[0][1] as string[];
    expect(args[1]).toContain('T');
    expect(args[2]).toContain('T');
  });

  it('getAverageScoresByType should parse numeric fields', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [
      { evaluation_type: 'task', evaluation_subtype: 'pbl_task', avg_score: '88.5', count: '12' }
    ] });
    const res = await repo.getAverageScoresByType('u1');
    expect(res[0]).toEqual({ evaluationType: 'task', evaluationSubtype: 'pbl_task', avgScore: 88.5, count: 12 });
  });

  it('update with empty updates should return existing evaluation', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [dbRow({ id: 'e5' })] });
    const res = await repo.update('e5', {} as any);
    expect(res.id).toBe('e5');
  });
});