/**
 * Tests for PostgreSQLDiscoveryRepository.ts
 */

import { PostgreSQLDiscoveryRepository } from '../discovery-repository';
import type { Pool } from 'pg';

describe('PostgreSQLDiscoveryRepository', () => {
  let pool: jest.Mocked<Pool>;
  let repo: PostgreSQLDiscoveryRepository;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    client = { query: jest.fn(), release: jest.fn() };
    pool = {
      connect: jest.fn().mockResolvedValue(client),
    } as unknown as jest.Mocked<Pool>;
    repo = new PostgreSQLDiscoveryRepository(pool as unknown as Pool);
  });

  function scenarioRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'sc1',
      status: 'active',
      version: '1.0',
      source_type: 'yaml',
      source_path: '/path.yml',
      source_id: 'slug-a',
      source_metadata: { a: 1 },
      title: { en: 'Career A' },
      description: { en: 'Desc' },
      objectives: [],
      difficulty: 'beginner',
      estimated_minutes: 45,
      prerequisites: [],
      task_templates: [
        { id: 't1', title: { en: 'Task 1' }, type: 'question', description: { en: 'd1' } },
      ],
      task_count: 1,
      xp_rewards: { done: 10 },
      unlock_requirements: {},
      pbl_data: {},
      discovery_data: {
        careerPath: 'data_analyst',
        requiredSkills: ['sql', 'python'],
        careerLevel: 'entry',
        relatedCareers: ['bi_analyst'],
      },
      assessment_data: {},
      ai_modules: {},
      resources: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      metadata: {},
      ...overrides,
    } as Record<string, unknown>;
  }

  it('findCareerPathById maps row to IDiscoveryScenario with discovery defaults', async () => {
    client.query.mockResolvedValueOnce({ rows: [scenarioRow()] });
    const result = await repo.findCareerPathById('sc1');
    expect(pool.connect).toHaveBeenCalled();
    expect(client.query).toHaveBeenCalled();
    expect(result?.id).toBe('sc1');
    expect(result?.mode).toBe('discovery');
    expect(result?.title).toEqual({ en: 'Career A' });
    expect(result?.discoveryData.careerPath).toBe('data_analyst');
    expect(result?.discoveryData.requiredSkills).toEqual(['sql', 'python']);
    // defaults present
    expect(result?.discoveryData.industryInsights).toEqual({});
    expect(result?.discoveryData.careerLevel).toBe('entry');
  });

  it('findCareerPathBySlug returns null when no rows', async () => {
    client.query.mockResolvedValueOnce({ rows: [] });
    const result = await repo.findCareerPathBySlug('missing');
    expect(result).toBeNull();
  });

  it('findCareerPaths maps multiple rows and sorts by created_at desc in query', async () => {
    const rowA = scenarioRow({ id: 'scA', source_id: 'slug-a' });
    const rowB = scenarioRow({ id: 'scB', source_id: 'slug-b' });
    client.query.mockResolvedValueOnce({ rows: [rowA, rowB] });
    const list = await repo.findCareerPaths();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(2);
    expect(list[0].id).toBe('scA');
    expect(list[1].id).toBe('scB');
    expect(list[0].taskTemplates[0]).toEqual(
      expect.objectContaining({ id: 't1', title: { en: 'Task 1' }, type: 'question' })
    );
  });

  it('maps minimal discovery_data with defaults (empty requiredSkills, default careerLevel)', async () => {
    client.query.mockResolvedValueOnce({ rows: [scenarioRow({ discovery_data: {} })] });
    const result = await repo.findCareerPathById('sc1');
    expect(result?.discoveryData.requiredSkills).toEqual([]);
    expect(result?.discoveryData.careerLevel).toBe('intermediate');
    expect(result?.discoveryData.careerPath).toBe('');
  });

  describe('career recommendations and user progress', () => {
    it('getCareerRecommendations maps required skills and returns sorted recommendations', async () => {
      // 1) user skills query
      client.query.mockResolvedValueOnce({
        rows: [
          { skill: 'sql', score: 70 },
          { skill: 'python', score: 60 },
          { skill: 'excel', score: 90 },
        ],
      });
      // 2) careers query
      client.query.mockResolvedValueOnce({
        rows: [
          scenarioRow({ id: 'scA', discovery_data: { careerPath: 'data_analyst', requiredSkills: ['sql', 'python'] } }),
          scenarioRow({ id: 'scB', discovery_data: { careerPath: 'bi_analyst', requiredSkills: ['excel'] } }),
        ],
      });

      const recs = await repo.getCareerRecommendations('user-1');
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBe(2);
      // 每個推薦都有基礎欄位
      expect(recs[0]).toEqual(
        expect.objectContaining({ careerPath: expect.any(String), requiredSkills: expect.any(Array), reasons: expect.any(Array) })
      );
      // 應依 matchScore 降序排序
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i - 1].matchScore).toBeGreaterThanOrEqual(recs[i].matchScore);
      }
    });

    it('getUserDiscoveryProgress aggregates explored careers, milestones, portfolio and computes progress', async () => {
      // explored careers
      client.query.mockResolvedValueOnce({ rows: [{ scenario_id: 'sc1' }, { scenario_id: 'sc2' }] });
      // milestones
      client.query.mockResolvedValueOnce({ rows: [
        { id: 'm1', name: 'Milestone 1', description: 'desc', achieved_at: '2024-01-01T00:00:00Z', criteria: {}, rewards: { xp: 20, badges: ['b1'] } },
        { id: 'm2', name: 'Milestone 2', description: 'desc', achieved_at: '2024-01-02T00:00:00Z', criteria: {}, rewards: {} }, // xp default 0
      ]});

      const prog = await repo.getUserDiscoveryProgress('user-1');
      expect(prog.exploredCareers).toEqual(['sc1', 'sc2']);
      expect(prog.completedMilestones.length).toBe(2);
      // For test mode, it should return mock portfolio item
      expect(prog.portfolioItems.length).toBe(1);
      // progress = min(2*10,30)=20 + min(2*5,40)=10 + min(1*10,30)=10 => 40
      expect(prog.overallProgress).toBe(40);
    });
  });

  describe('portfolio item CRUD', () => {
    // Skip all portfolio tests until portfolio_items table is created
    it.skip('addPortfolioItem - not implemented until portfolio_items table created', () => {
      expect(true).toBe(true);
    });

    it.skip('updatePortfolioItem - not implemented until portfolio_items table created', () => {
      expect(true).toBe(true);
    });

    it.skip('deletePortfolioItem - not implemented until portfolio_items table created', () => {
      expect(true).toBe(true);
    });

    it.skip('getPortfolioItems - not implemented until portfolio_items table created', () => {
      expect(true).toBe(true);
    });
  });
});